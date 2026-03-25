import React from 'react';
import { Loader2 } from 'lucide-react';
import { AdminErrorAlert } from '@/components/admin/composed';
import { Button } from '@/components/admin/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/admin/ui/dialog';
import useStepMaterialsVM from './useStepMaterialsVM';
import SessionProductsSummary from './SessionProductsSummary';
import SessionBundlesSummary from './SessionBundlesSummary';

interface StepMaterialsProps {
  sessionId: number | null;
  sessionCode: string;
  onComplete: () => void;
}

const StepMaterials: React.FC<StepMaterialsProps> = ({
  sessionId,
  sessionCode: _sessionCode,
  onComplete,
}) => {
  const vm = useStepMaterialsVM({ sessionId, sessionCode: _sessionCode, onComplete });

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
        Step 3: Materials &amp; Marking
      </h2>

      {/* Copy Dialog */}
      <Dialog open={vm.dialogOpen} onOpenChange={() => {}}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>
              {vm.previousSession
                ? `Copy from ${vm.previousSession.session_code}`
                : 'No Previous Session'}
            </DialogTitle>
            <DialogDescription>
              {vm.previousSession ? (
                <>
                  Copy products, prices, and create bundles from session{' '}
                  <strong>{vm.previousSession.session_code}</strong> to the new session?
                </>
              ) : (
                'No previous session found. You can set up materials manually later.'
              )}
            </DialogDescription>
          </DialogHeader>
          {vm.error && <AdminErrorAlert message={vm.error} />}
          <DialogFooter>
            <Button variant="outline" onClick={vm.handleSetupLater} disabled={vm.copying}>
              Set up later
            </Button>
            {vm.previousSession && (
              <Button onClick={vm.handleProceed} disabled={vm.copying}>
                {vm.copying ? 'Copying...' : 'Proceed'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Summary */}
      {vm.result && (
        <div>
          <div
            className="tw:mb-4 tw:rounded-md tw:border tw:border-admin-success/30 tw:bg-admin-success/10 tw:p-3 tw:text-sm tw:text-admin-success"
            role="alert"
          >
            {vm.result.message}
          </div>

          <div className="tw:space-y-1 tw:text-sm">
            <p>
              Products created: <strong>{vm.result.products_created}</strong>
            </p>
            <p>
              Prices created: <strong>{vm.result.prices_created}</strong>
            </p>
            <p>
              Bundles created: <strong>{vm.result.bundles_created}</strong>
            </p>
            <p>
              Bundle products created:{' '}
              <strong>{vm.result.bundle_products_created}</strong>
            </p>
            {vm.result.skipped_subjects && vm.result.skipped_subjects.length > 0 && (
              <p className="tw:text-admin-fg-muted">
                Skipped subjects: {vm.result.skipped_subjects.join(', ')}
              </p>
            )}
          </div>

          {/* Products and Bundles created for this session */}
          <h3 className="tw:mt-6 tw:mb-3 tw:text-lg tw:font-medium tw:text-admin-fg">
            Products Created
          </h3>
          <SessionProductsSummary sessionId={sessionId} />

          <h3 className="tw:mt-6 tw:mb-3 tw:text-lg tw:font-medium tw:text-admin-fg">
            Bundles Created
          </h3>
          <SessionBundlesSummary sessionId={sessionId} />

          <div className="tw:mt-6 tw:flex tw:justify-end">
            <Button onClick={vm.handleContinue}>Continue</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StepMaterials;
