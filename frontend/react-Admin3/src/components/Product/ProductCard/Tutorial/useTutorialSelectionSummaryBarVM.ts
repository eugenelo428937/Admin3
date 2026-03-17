import { useState, useEffect } from 'react';
import { useTheme, useMediaQuery } from '@mui/material';
import type { Theme } from '@mui/material';
import { useTutorialChoice } from '../../../../contexts/TutorialChoiceContext.js';
import type { TutorialChoiceData, ChoiceLevel } from '../../../../types/browse';

// ─── Choice Detail ──────────────────────────────────────────────

export interface ChoiceDetail {
  level: string;
  location: string | undefined;
  eventCode: string | undefined;
  isDraft: boolean | undefined;
}

// ─── ViewModel Interface ────────────────────────────────────────

export interface TutorialSelectionSummaryBarVM {
  // Theme / responsive
  theme: Theme;
  isMobile: boolean;

  // State
  isCollapsed: boolean;

  // Derived data
  hasAnyChoices: boolean;
  firstChoice: TutorialChoiceData | undefined;
  subjectName: string;
  choiceDetails: ChoiceDetail[];

  // Actions
  handleCollapse: () => void;
  handleExpand: () => void;
}

// ─── ViewModel Hook ─────────────────────────────────────────────

const useTutorialSelectionSummaryBarVM = (
  subjectCode: string,
): TutorialSelectionSummaryBarVM => {
  const theme = useTheme();
  const { getSubjectChoices, getDraftChoices, hasCartedChoices } =
    useTutorialChoice();

  // T013: Detect mobile viewport (< 900px)
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // T014: Collapsed by default on mobile, expanded on desktop
  const [isCollapsed, setIsCollapsed] = useState(isMobile);

  // Get all choices for this subject
  const subjectChoices = getSubjectChoices(subjectCode) as Record<ChoiceLevel, TutorialChoiceData>;
  const draftChoices = getDraftChoices(subjectCode);
  const hasCarted = hasCartedChoices(subjectCode);

  // Determine visibility - show if any choices exist
  const hasAnyChoices = Object.keys(subjectChoices).length > 0;

  // Handle collapse button click
  const handleCollapse = (): void => {
    setIsCollapsed(true);
  };

  // Handle expand (clicking on collapsed bar or adding new choice)
  const handleExpand = (): void => {
    setIsCollapsed(false);
  };

  // Auto-expand when new choices are added (desktop only - mobile stays collapsed)
  useEffect(() => {
    if (hasAnyChoices && !isMobile) {
      setIsCollapsed(false);
    }
  }, [Object.keys(subjectChoices).length, isMobile, hasAnyChoices]);

  // Get subject name from first choice (all choices have same subject)
  const firstChoice = Object.values(subjectChoices)[0] as TutorialChoiceData | undefined;
  const subjectName =
    firstChoice?.subjectName || `${subjectCode} - Actuarial Modelling`;

  // Sort and format choice details
  const choiceOrder: ChoiceLevel[] = ['1st', '2nd', '3rd'];
  const choiceDetails: ChoiceDetail[] = choiceOrder
    .filter((level) => subjectChoices[level])
    .map((level) => {
      const choice = subjectChoices[level];
      return {
        level,
        location: choice.location,
        eventCode: choice.eventCode,
        isDraft: choice.isDraft,
      };
    });

  return {
    theme,
    isMobile,
    isCollapsed,
    hasAnyChoices,
    firstChoice,
    subjectName,
    choiceDetails,
    handleCollapse,
    handleExpand,
  };
};

export default useTutorialSelectionSummaryBarVM;
