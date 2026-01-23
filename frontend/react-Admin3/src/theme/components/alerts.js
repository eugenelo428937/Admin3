// Alert Component Overrides
import { statusColors } from '../tokens/colors';
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
        backgroundColor: statusColors.success.background,
        color: statusColors.success.main,
        marginBottom: spacing.xs3,
        "& .MuiAlertTitle-root": {
          color: statusColors.success.dark,
          marginBottom: spacing.xs3,
        },
        "& .MuiTypography-root": {
          color: statusColors.success.dark,
        },
      },
      standardError: {
        backgroundColor: statusColors.error.background,
        color: statusColors.error.dark,
        "& .MuiAlertTitle-root": {
          color: statusColors.error.dark,
          marginBottom: spacing.xs3,
        },
        "& .MuiTypography-root": {
          color: statusColors.error.dark,
        },
      },
      standardWarning: {
        backgroundColor: statusColors.warning.background,
        color: statusColors.warning.dark,
        "& .MuiAlertTitle-root": {
          color: statusColors.warning.dark,
          marginBottom: spacing.xs3,
        },
        "& .MuiTypography-root": {
          color: statusColors.warning.dark,
        },
      },
      standardInfo: {
        backgroundColor: statusColors.info.background,
        color: statusColors.info.dark,
        "& .MuiAlertTitle-root": {
          color: statusColors.info.dark,
          marginBottom: spacing.xs3,
        },
        "& .MuiTypography-root": {
          color: statusColors.info.dark,
        },
      },
    },
  },
};

export default alertOverrides;
