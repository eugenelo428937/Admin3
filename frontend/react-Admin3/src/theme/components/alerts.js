// Alert Component Overrides
import colorTheme from '../colorTheme';
import liftKitTheme from '../liftKitTheme';

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
        backgroundColor: colorTheme.success.background,
        color: colorTheme.success.main,
        marginBottom: liftKitTheme.spacing.xs3,
        "& .MuiAlertTitle-root": {
          color: colorTheme.success.dark,
          marginBottom: liftKitTheme.spacing.xs3,
        },
        "& .MuiTypography-root": {
          color: colorTheme.success.dark,
        },
      },
      standardError: {
        backgroundColor: colorTheme.error.background,
        color: colorTheme.error.dark,
        "& .MuiAlertTitle-root": {
          color: colorTheme.error.dark,
          marginBottom: liftKitTheme.spacing.xs3,
        },
        "& .MuiTypography-root": {
          color: colorTheme.error.dark,
        },
      },
      standardWarning: {
        backgroundColor: colorTheme.warning.background,
        color: colorTheme.warning.dark,
        "& .MuiAlertTitle-root": {
          color: colorTheme.warning.dark,
          marginBottom: liftKitTheme.spacing.xs3,
        },
        "& .MuiTypography-root": {
          color: colorTheme.warning.dark,
        },
      },
      standardInfo: {
        backgroundColor: colorTheme.info.background,
        color: colorTheme.info.dark,
        "& .MuiAlertTitle-root": {
          color: colorTheme.info.dark,
          marginBottom: liftKitTheme.spacing.xs3,
        },
        "& .MuiTypography-root": {
          color: colorTheme.info.dark,
        },
      },
    },
  },
};

export default alertOverrides;
