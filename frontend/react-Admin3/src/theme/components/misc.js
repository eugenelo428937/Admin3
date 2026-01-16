// Miscellaneous Component Overrides
import colorTheme from '../colorTheme';
import liftKitTheme from '../liftKitTheme';

export const miscOverrides = {
  MuiDivider: {
    styleOverrides: {
      root: {
        borderColor: colorTheme.palette.granite["050"],
        opacity: 0.5,
      },
    },
  },
  MuiTypography: {
    styleOverrides: {
      root: {
        fontFamily: "'Inter', 'Poppins', sans-serif",
      },
    },
  },
  MuiSpeedDial: {
    styleOverrides: {
      root: {
        "& .MuiFab-root": {
          minWidth: liftKitTheme.spacing.xl15,
          minHeight: liftKitTheme.spacing.xl15,
          width: liftKitTheme.spacing.xl15,
          height: liftKitTheme.spacing.xl15,
        },
      },
      variants: [
        {
          props: { variant: "product-card-speeddial" },
          style: {},
        },
      ],
    },
  },
  MuiBackdrop: {
    styleOverrides: {
      root: {
        backgroundColor: "rgba(0, 0, 0, 0.75)",
      },
    },
  },
};

export default miscOverrides;
