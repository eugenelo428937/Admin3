import { createTheme } from '@mui/material/styles';

// Create a custom theme with Inter font
const theme = createTheme({
	typography: {
		fontFamily: [
			"DM Sans Variable",
			"Inter Variable",
			"Poppins",
			"-apple-system",
			"BlinkMacSystemFont",
			'"Segoe UI"',
			"Roboto",
			'"Helvetica Neue"',
			"Arial",
			"sans-serif",
			'"Apple Color Emoji"',
			'"Segoe UI Emoji"',
			'"Segoe UI Symbol"',
		].join(","),

		// Customize font weights and sizes
		h1: {
			fontFamily: "Poppins,Inter Variable,san-serif",
			fontWeight: 400,
			fontSize:
				"calc(1em * var(--wholestep) * var(--wholestep) * var(--wholestep))",
			lineHeight: "var(--quarterstep)",
			letterSpacing: "-0.022em",
		},
		h2: {
			fontFamily: "Poppins,Inter Variable,san-serif",
			fontWeight: 400,
			fontSize: "calc(1em * var(--wholestep) * var(--wholestep))",
			lineHeight: "var(--halfstep)",
			letterSpacing: "-0.022em",
		},
		h3: {
			fontFamily: "Poppins,Inter Variable,san-serif",
			fontWeight: 400,
			fontSize: "calc(1em * var(--wholestep) * var(--halfstep))",
			lineHeight: "var(--halfstep)",
			letterSpacing: "-0.022em",
		},
		h4: {
			fontFamily: "Poppins,Inter Variable,san-serif",
			fontWeight: 400,
			fontSize: "calc(1em * var(--wholestep))",
			lineHeight: "var(--halfstep)",
			letterSpacing: "-0.02em",
		},
		h5: {
			fontFamily: "Poppins,Inter Variable,san-serif",
			fontWeight: 400,
			fontSize: "calc(1em * var(--halfstep))",
			lineHeight: "var(--halfstep)",
			letterSpacing: "-0.017em",
		},
		h6: {
			fontFamily: "Poppins,Inter Variable,san-serif",
			fontWeight: 600,
			fontSize: "calc(1em * var(--quarterstep))",
			lineHeight: "var(--halfstep)",
			letterSpacing: "-0.014em",
		},
		subtitle1: {
			fontFamily: "Poppins,Inter Variable,san-serif",
			fontWeight: 400,
			fontSize: "calc(1em / var(--quarterstep))",
			lineHeight: "var(--halfstep)",
			letterSpacing: "-0.007em",
		},
		subtitle2: {
			fontFamily: "Poppins,Inter Variable,san-serif",
			fontWeight: 400,
			fontSize: "calc(1em / var(--halfstep))",
			lineHeight: "var(--halfstep)",
			letterSpacing: "-0.007em",
		},
		body1: {
			fontFamily: "Poppins,Inter Variable,san-serif",
			fontWeight: 400,
			fontSize: "1em",
			lineHeight: "var(--wholestep)",
			letterSpacing: "-0.011em",
		},
		body2: {
			fontFamily: "Poppins,Inter Variable,san-serif",
			fontWeight: 400,
			fontSize: "calc(1em / var(--quarterstep))",
			lineHeight: "calc(var(--wholestep) / var(--quarterstep))",
			letterSpacing: "-0.011em",
		},
		button: {
			fontFamily: "Poppins,Inter Variable,san-serif",
			fontWeight: 600,
			fontSize: "calc((1em / var(--quarterstep)) / var(--eighthstep))",
			lineHeight: "var(--halfstep)",
			letterSpacing: "-0.004em",
			position: "static",
			top: "6.235em",
		},
		caption: {
			fontFamily: "Poppins,Inter Variable,san-serif",
			fontWeight: 400,
			fontSize: "calc(1em / var(--halfstep))",
			lineHeight: "var(--halfstep)",
			letterSpacing: "-0.007em",
		},
		overline: {
			fontFamily: "Poppins,Inter Variable,san-serif",
			fontWeight: 400,
			fontSize: "calc(1em / var(--halfstep))",
			lineHeight: "var(--halfstep)",
			letterSpacing: "0.0618em",
			textTransform: "uppercase",
		},
	},

	// Optional: Customize palette to complement Inter font
	palette: {
		primary: {
			main: "#1976d2", // Material-UI default blue
			light: "#42a5f5",
			dark: "#1565c0",
			contrastText: "#fff",
		},
		secondary: {
			main: "#dc004e",
			light: "#f5325b",
			dark: "#9a0036",
			contrastText: "#fff",
		},
		text: {
			primary: "rgba(0, 0, 0, 0.87)",
			secondary: "rgba(0, 0, 0, 0.6)",
		},
	},

	// Optional: Customize components to better use Inter
	components: {
		MuiButton: {
			styleOverrides: {
				root: {
					fontFamily: "Poppins,Inter Variable,san-serif",
					fontWeight: 500,
					textTransform: "none", // Remove uppercase transformation for better readability
					borderRadius: 6,
					color: "var(--light__onsurface_lkv)",
				},
			},
		},
		MuiTypography: {
			styleOverrides: {
				root: {
					fontFamily: "Poppins,Inter Variable,san-serif",
				},
			},
		},
		MuiInputBase: {
			styleOverrides: {
				root: {
					fontFamily: "Poppins,Inter Variable,san-serif",
				},
			},
		},
		MuiMenuItem: {
			styleOverrides: {
				root: {
					fontFamily: "Poppins,Inter Variable,san-serif",
				},
			},
		},
	},
});

export default theme;