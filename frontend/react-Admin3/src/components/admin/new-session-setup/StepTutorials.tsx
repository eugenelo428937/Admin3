import React from 'react';
import { Button } from '@/components/admin/ui/button';

interface StepTutorialsProps {
  onComplete: () => void;
}

const StepTutorials: React.FC<StepTutorialsProps> = ({ onComplete }) => {
  return (
    <div className="tw:rounded-admin tw:border tw:border-admin-border tw:bg-admin-card tw:p-6">
      <h2 className="tw:mb-4 tw:text-xl tw:font-semibold tw:text-admin-fg">
        Step 4: Tutorials
      </h2>
      <p className="tw:mb-4 tw:text-sm tw:text-admin-fg-muted">
        Tutorial setup will be available in a future release. You can set up tutorials
        later from the admin panel.
      </p>
      <div className="tw:flex tw:gap-3">
        <span title="Coming Soon">
          <Button disabled>Upload</Button>
        </span>
        <Button variant="outline" onClick={onComplete}>
          Set up later
        </Button>
      </div>
    </div>
  );
};

export default StepTutorials;
