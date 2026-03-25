import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/components/admin/styles/cn';
import { AdminErrorAlert } from '@/components/admin/composed';
import { Button } from '@/components/admin/ui/button';
import { Checkbox } from '@/components/admin/ui/checkbox';
import { ScrollArea } from '@/components/admin/ui/scroll-area';
import { Separator } from '@/components/admin/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/admin/ui/dialog';
import useStepSubjectsVM, { Subject } from './useStepSubjectsVM';

interface StepSubjectsProps {
  sessionId: number | null;
  sessionCode: string;
  isExistingSession: boolean;
  onComplete: () => void;
}

const SubjectList: React.FC<{
  items: Subject[];
  title: string;
  checked: number[];
  handleToggle: (id: number) => void;
}> = ({ items, title, checked, handleToggle }) => (
  <div className="tw:rounded-md tw:border tw:border-admin-border tw:bg-admin-card">
    <div className="tw:bg-admin-accent/50 tw:px-3 tw:py-2 tw:text-sm tw:font-medium">
      {title} ({items.length})
    </div>
    <Separator />
    <ScrollArea className="tw:h-[300px]">
      <div role="list">
        {items.map((subject) => (
          <div
            key={subject.id}
            role="listitem"
            onClick={() => handleToggle(subject.id)}
            className="tw:flex tw:w-full tw:cursor-pointer tw:items-center tw:gap-3 tw:px-3 tw:py-2 tw:text-left tw:text-sm tw:hover:bg-admin-accent/50"
          >
            <Checkbox
              checked={checked.includes(subject.id)}
              tabIndex={-1}
              onCheckedChange={() => handleToggle(subject.id)}
            />
            <span>{subject.code} - {subject.description}</span>
          </div>
        ))}
      </div>
    </ScrollArea>
  </div>
);

const StepSubjects: React.FC<StepSubjectsProps> = ({
  sessionId,
  sessionCode,
  isExistingSession,
  onComplete,
}) => {
  const vm = useStepSubjectsVM({ sessionId, sessionCode, isExistingSession, onComplete });

  if (vm.loading) {
    return (
      <div className="tw:flex tw:items-center tw:justify-center tw:py-12">
        <Loader2 className="tw:size-6 tw:animate-spin tw:text-admin-primary" />
      </div>
    );
  }

  return (
    <div className="tw:rounded-md tw:border tw:border-admin-border tw:bg-admin-card tw:p-6">
      <h2 className="tw:mb-4 tw:text-xl tw:font-semibold tw:text-admin-fg">
        Step 2: Assign Subjects
      </h2>

      <AdminErrorAlert message={vm.error} className="tw:mb-4" />

      {/* Warning dialog for existing sessions with data */}
      <Dialog open={vm.showWarningDialog} onOpenChange={() => {}}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Existing Data Found</DialogTitle>
            <DialogDescription asChild>
              <div>
                <div
                  className="tw:mb-3 tw:rounded-md tw:border tw:border-yellow-500/30 tw:bg-yellow-500/10 tw:p-3 tw:text-sm tw:text-yellow-700"
                  role="alert"
                >
                  There are related subjects and products associated with Exam Session{' '}
                  <strong>{sessionCode}</strong>.
                </div>
                <p className="tw:mb-1 tw:text-sm">This session already has:</p>
                <ul className="tw:ml-4 tw:list-disc tw:text-sm tw:space-y-0.5">
                  <li>{vm.sessionDataCounts?.exam_session_subjects} subject assignments</li>
                  <li>{vm.sessionDataCounts?.products} products</li>
                  <li>{vm.sessionDataCounts?.bundles} bundles</li>
                </ul>
                <p className="tw:mt-3 tw:text-sm tw:font-bold">
                  Proceed if you want to clear all associated subjects and products for{' '}
                  {sessionCode}.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={vm.handleCancelWarning}
              disabled={vm.deactivating}
            >
              Cancel
            </Button>
            <Button
              onClick={vm.handleDeactivateAndProceed}
              disabled={vm.deactivating}
            >
              {vm.deactivating ? 'Clearing...' : 'Proceed'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer list */}
      <div className="tw:grid tw:grid-cols-[1fr_auto_1fr] tw:gap-4 tw:items-center">
        <SubjectList
          items={vm.available}
          title="Available Subjects"
          checked={vm.checked}
          handleToggle={vm.handleToggle}
        />

        <div className="tw:flex tw:flex-col tw:items-center tw:gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={vm.handleAllRight}
            disabled={vm.available.length === 0}
            aria-label="move all right"
          >
            &gt;&gt;
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={vm.handleCheckedRight}
            disabled={vm.leftChecked.length === 0}
            aria-label="move selected right"
          >
            &gt;
          </Button>
          {vm.previousSession && (
            <Button
              size="sm"
              onClick={vm.handleCopyFromPrevious}
              aria-label={`copy from ${vm.previousSession.session_code}`}
            >
              Copy from {vm.previousSession.session_code}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={vm.handleCheckedLeft}
            disabled={vm.rightChecked.length === 0}
            aria-label="move selected left"
          >
            &lt;
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={vm.handleAllLeft}
            disabled={vm.assigned.length === 0}
            aria-label="move all left"
          >
            &lt;&lt;
          </Button>
        </div>

        <SubjectList
          items={vm.assigned}
          title="Assigned Subjects"
          checked={vm.checked}
          handleToggle={vm.handleToggle}
        />
      </div>

      <div className="tw:mt-6 tw:flex tw:justify-end">
        <Button
          onClick={vm.handleSave}
          disabled={vm.saving || vm.assigned.length === 0}
        >
          {vm.saving ? 'Saving...' : 'Save & Continue'}
        </Button>
      </div>
    </div>
  );
};

export default StepSubjects;
