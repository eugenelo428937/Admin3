/**
 * Alert Component Overrides
 *
 * Defines MUI Alert component style overrides with semantic status colors.
 * Uses status tokens from semantic/common.js for consistent messaging colors.
 *
 * @module theme/components/alerts
 *
 * ## Severity Styles
 *
 * @severity success - Green theme (status.successContainer, status.onSuccessContainer)
 * @severity error - Red theme (status.errorContainer, status.onErrorContainer)
 * @severity warning - Yellow/amber theme (status.warningContainer, status.onWarningContainer)
 * @severity info - Blue theme (status.infoContainer, status.onInfoContainer)
 *
 * @example
 * // Standard MUI Alert with severity prop
 * <Alert severity="success">Operation completed</Alert>
 * <Alert severity="error">An error occurred</Alert>
 * <Alert severity="warning">Please review before proceeding</Alert>
 * <Alert severity="info">Information about this feature</Alert>
 *
 * @example
 * // With title
 * <Alert severity="success">
 *   <AlertTitle>Success</AlertTitle>
 *   Your changes have been saved.
 * </Alert>
 *
 * @note All alerts have maxWidth: 20rem and left-aligned text with pre-line wrapping
 */

import { status } from '../semantic/common';
import { spacing } from '../tokens/spacing';

export const alertOverrides = {
  MuiAlert: {
    styleOverrides: {
      root: {
        maxWidth: "20rem",
        "& .MuiAlert-message": {
          textAlign: "start",
          whiteSpace: "pre-line",
        },
      },
      standardSuccess: {
        backgroundColor: status.successContainer,
        color: status.success,
        marginBottom: spacing.xs3,
        "& .MuiAlertTitle-root": {
          color: status.onSuccessContainer,
          marginBottom: spacing.xs3,
        },
        "& .MuiTypography-root": {
          color: status.onSuccessContainer,
        },
      },
      standardError: {
        backgroundColor: status.errorContainer,
        color: status.onErrorContainer,
        "& .MuiAlertTitle-root": {
          color: status.onErrorContainer,
          marginBottom: spacing.xs3,
        },
        "& .MuiTypography-root": {
          color: status.onErrorContainer,
        },
      },
      standardWarning: {
        backgroundColor: status.warningContainer,
        color: status.onWarningContainer,
        "& .MuiAlertTitle-root": {
          color: status.onWarningContainer,
          marginBottom: spacing.xs3,
        },
        "& .MuiTypography-root": {
          color: status.onWarningContainer,
        },
      },
      standardInfo: {
        backgroundColor: status.infoContainer,
        color: status.onInfoContainer,
        "& .MuiAlertTitle-root": {
          color: status.onInfoContainer,
          marginBottom: spacing.xs3,
        },
        "& .MuiTypography-root": {
          color: status.onInfoContainer,
        },
      },
    },
  },
};

export default alertOverrides;
