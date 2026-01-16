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
        backgroundColor: colorTheme.palette.success.background,
        color: colorTheme.palette.success.main,
        marginBottom: liftKitTheme.spacing.xs3,
        "& .MuiAlertTitle-root": {
          color: colorTheme.palette.success.dark,
          marginBottom: liftKitTheme.spacing.xs3,
        },
        "& .MuiTypography-root": {
          color: colorTheme.palette.success.dark,
        },
      },
      standardError: {
        backgroundColor: colorTheme.palette.error.background,
        color: colorTheme.palette.error.dark,
        "& .MuiAlertTitle-root": {
          color: colorTheme.palette.error.dark,
          marginBottom: liftKitTheme.spacing.xs3,
        },
        "& .MuiTypography-root": {
          color: colorTheme.palette.error.dark,
        },
      },
      standardWarning: {
        backgroundColor: colorTheme.palette.warning.background,
        color: colorTheme.palette.warning.dark,
        "& .MuiAlertTitle-root": {
          color: colorTheme.palette.warning.dark,
          marginBottom: liftKitTheme.spacing.xs3,
        },
        "& .MuiTypography-root": {
          color: colorTheme.palette.warning.dark,
        },
      },
      standardInfo: {
        backgroundColor: colorTheme.palette.info.background,
        color: colorTheme.palette.info.dark,
        "& .MuiAlertTitle-root": {
          color: colorTheme.palette.info.dark,
          marginBottom: liftKitTheme.spacing.xs3,
        },
        "& .MuiTypography-root": {
          color: colorTheme.palette.info.dark,
        },
      },
    },
  },
};

export default alertOverrides;
