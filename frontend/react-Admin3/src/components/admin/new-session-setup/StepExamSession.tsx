import React, { useState, useRef, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/components/admin/styles/cn';
import { AdminErrorAlert, AdminFormField } from '@/components/admin/composed';
import { Button } from '@/components/admin/ui/button';
import { Input } from '@/components/admin/ui/input';
import { Separator } from '@/components/admin/ui/separator';
import type { ExamSession } from '../../../types/examSession/examSession.types';
import useStepExamSessionVM from './useStepExamSessionVM';
import type { StepExamSessionProps } from './useStepExamSessionVM';

const StepExamSession: React.FC<StepExamSessionProps> = ({ onSessionCreated }) => {
  const vm = useStepExamSessionVM({ onSessionCreated });

  const {
    error,
    isSubmitting,
    allSessions,
    loadingSessions,
    selectedSession,
    formData,
    handleChange,
    handleSelectExisting,
    handleSubmit,
    formatDate,
  } = vm;

  // Local autocomplete state
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [localSelected, setLocalSelected] = useState<ExamSession | null>(selectedSession);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filtered = query
    ? allSessions.filter((s) =>
        s.session_code.toLowerCase().includes(query.toLowerCase()),
      )
    : allSessions;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (session: ExamSession) => {
    setLocalSelected(session);
    setQuery(session.session_code);
    setIsOpen(false);
    // Trigger VM autocomplete change
    vm.handleAutocompleteChange({} as React.SyntheticEvent, session);
  };

  return (
    <div className="tw:rounded-md tw:border tw:border-admin-border tw:bg-admin-card tw:p-6">
      <h2 className="tw:mb-4 tw:text-xl tw:font-semibold tw:text-admin-fg">
        Step 1: Exam Session
      </h2>

      <AdminErrorAlert message={error} className="tw:mb-4" />

      {/* Select existing session */}
      <h3 className="tw:mb-2 tw:text-lg tw:font-medium tw:text-admin-fg">
        Select Existing Session
      </h3>

      <div ref={wrapperRef} className="tw:relative tw:mb-4">
        <Input
          aria-label="Search by session code"
          placeholder="e.g., 2026-04"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            if (!e.target.value) {
              setLocalSelected(null);
              vm.handleAutocompleteChange({} as React.SyntheticEvent, null);
            }
          }}
          onFocus={() => setIsOpen(true)}
        />
        {loadingSessions && (
          <div className="tw:absolute tw:right-3 tw:top-2">
            <Loader2 className="tw:size-4 tw:animate-spin tw:text-admin-fg-muted" />
          </div>
        )}
        {isOpen && filtered.length > 0 && (
          <div className="tw:absolute tw:z-50 tw:mt-1 tw:max-h-60 tw:w-full tw:overflow-auto tw:rounded-md tw:border tw:border-admin-border tw:bg-admin-card tw:shadow-md">
            {filtered.map((session) => (
              <button
                key={session.id}
                type="button"
                className="tw:w-full tw:px-3 tw:py-2 tw:text-left tw:hover:bg-admin-accent tw:text-sm"
                onClick={() => handleSelect(session)}
              >
                <div className="tw:font-medium">{session.session_code}</div>
                <div className="tw:text-xs tw:text-admin-fg-muted">
                  {formatDate(session.start_date)} - {formatDate(session.end_date)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {localSelected && (
        <div className="tw:mb-4 tw:rounded-md tw:bg-admin-accent/50 tw:p-4">
          <p className="tw:mb-1 tw:text-sm">
            <strong>Session:</strong> {localSelected.session_code}
          </p>
          <p className="tw:mb-1 tw:text-sm">
            <strong>Start:</strong> {formatDate(localSelected.start_date)}
          </p>
          <p className="tw:mb-3 tw:text-sm">
            <strong>End:</strong> {formatDate(localSelected.end_date)}
          </p>
          <Button onClick={handleSelectExisting}>Use This Session</Button>
        </div>
      )}

      {/* Divider */}
      <div className="tw:relative tw:my-6 tw:flex tw:items-center tw:justify-center">
        <Separator className="tw:absolute tw:w-full" />
        <span className="tw:relative tw:bg-admin-card tw:px-3 tw:text-sm tw:text-admin-fg-muted">
          OR
        </span>
      </div>

      {/* Create new session */}
      <h3 className="tw:mb-4 tw:text-lg tw:font-medium tw:text-admin-fg">
        Create New Session
      </h3>
      <form onSubmit={handleSubmit} className="tw:space-y-4">
        <AdminFormField label="Session Code" required>
          <Input
            name="session_code"
            value={formData.session_code}
            onChange={handleChange}
            required
            disabled={isSubmitting}
            placeholder="e.g., 2026-09"
          />
        </AdminFormField>
        <AdminFormField label="Start Date" required>
          <Input
            type="datetime-local"
            name="start_date"
            value={formData.start_date}
            onChange={handleChange}
            required
            disabled={isSubmitting}
          />
        </AdminFormField>
        <AdminFormField label="End Date" required>
          <Input
            type="datetime-local"
            name="end_date"
            value={formData.end_date}
            onChange={handleChange}
            required
            disabled={isSubmitting}
          />
        </AdminFormField>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create & Continue'}
        </Button>
      </form>
    </div>
  );
};

export default StepExamSession;
