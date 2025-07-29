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
				"calc(1em * var(--wholestep) * var(--wholestep) * var(--wholestep)) !important",
			lineHeight: "var(--quarterstep) !important",
			letterSpacing: "-0.022em !important",
		},
		h2: {
			fontFamily: "Poppins,Inter Variable,san-serif",
			fontWeight: 400,
			fontSize: "calc(1em * var(--wholestep) * var(--wholestep)) !important",
			lineHeight: "var(--halfstep) !important",
			letterSpacing: "-0.022em !important",
		},
		h3: {
			fontFamily: "Poppins,Inter Variable,san-serif",
			fontWeight: 400,
			fontSize: "calc(1em * var(--wholestep) * var(--halfstep)) !important",
			lineHeight: "var(--halfstep) !important",
			letterSpacing: "-0.022em !important",
		},
		h4: {
			fontFamily: "Poppins,Inter Variable,san-serif",
			fontWeight: 400,
			fontSize: "calc(1em * var(--wholestep)) !important",
			lineHeight: "var(--halfstep) !important",
			letterSpacing: "-0.02em !important",
		},
		h5: {
			fontFamily: "Poppins,Inter Variable,san-serif",
			fontWeight: 400,
			fontSize: "calc(1em * var(--halfstep)) !important",
			lineHeight: "var(--halfstep) !important",
			letterSpacing: "-0.017em !important",
		},
		h6: {
			fontFamily: "Poppins,Inter Variable,san-serif",
			fontWeight: 600,
			fontSize: "calc(1em * var(--quarterstep)) !important",
			lineHeight: "var(--halfstep) !important",
			letterSpacing: "-0.014em !important",
		},
		subtitle1: {
			fontFamily: "Poppins,Inter Variable,san-serif",
			fontWeight: 400,
			fontSize: "calc(1em / var(--quarterstep)) !important",
			lineHeight: "var(--halfstep) !important",
			letterSpacing: "-0.007em !important",
		},
		subtitle2: {
			fontFamily: "Poppins,Inter Variable,san-serif",
			fontWeight: 400,
			fontSize: "calc(1em / var(--halfstep)) !important",
			lineHeight: "var(--halfstep) !important",
			letterSpacing: "-0.007em !important",
		},
		body1: {
			fontFamily: "Poppins,Inter Variable,san-serif",
			fontWeight: 400,
			fontSize: "1em !important",
			lineHeight: "var(--wholestep) !important",
			letterSpacing: "-0.011em !important",
		},
		body2: {
			fontFamily: "Poppins,Inter Variable,san-serif",
			fontWeight: 400,
			fontSize: "calc(1em / var(--quarterstep)) !important",
			lineHeight: "calc(var(--wholestep) / var(--quarterstep)) !important",
			letterSpacing: "-0.011em !important",
		},
		button: {
			fontFamily: "Poppins,Inter Variable,san-serif",
			fontWeight: 600,
			fontSize: "calc((1em / var(--quarterstep)) / var(--eighthstep)) !important",
			lineHeight: "var(--halfstep) !important",
			letterSpacing: "-0.004em !important",
			position: "static",
			top: "6.235em",
		},
		caption: {
			fontFamily: "Poppins,Inter Variable,san-serif",
			fontWeight: 400,
			fontSize: "calc(1em / var(--halfstep)) !important",
			lineHeight: "var(--halfstep) !important",
			letterSpacing: "-0.007em !important",
			
		},
		overline: {
			fontFamily: "Poppins,Inter Variable,san-serif",
			fontWeight: 400,
			fontSize: "calc(1em / var(--halfstep)) !important",
			lineHeight: "var(--halfstep) !important",
			letterSpacing: "0.0618em !important",
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
		MuiTabs: {
			styleOverrides: {
				root: {
					fontFamily: "Poppins,Inter Variable,san-serif",
					minHeight: "48px",
					"& .MuiTabs-flexContainer": {
						display: "flex !important",
						alignItems: "center !important",
					},
					"& .MuiTabs-indicator": {
						backgroundColor: "#1976d2 !important",
						height: "3px !important",
						display: "block !important",
					},
				},
			},
		},
		MuiTab: {
			styleOverrides: {
				root: {
					fontFamily: "Poppins,Inter Variable,san-serif",
					display: "flex !important",
					alignItems: "center !important",
					justifyContent: "center !important",
					minHeight: "48px !important",
					height: "48px !important",
					padding: "12px 16px !important",
					color: "#666666 !important",
					fontSize: "14px !important",
					fontWeight: "500 !important",
					textTransform: "none !important",
					border: "none !important",
					background: "transparent !important",
					cursor: "pointer !important",
					transition: "all 0.2s ease !important",
					boxSizing: "border-box !important",
					visibility: "visible !important",
					opacity: "1 !important",
					position: "relative !important",
					"&.Mui-selected": {
						color: "#1976d2 !important",
						fontWeight: "600 !important",
						backgroundColor: "transparent !important",
					},
					"&:hover": {
						color: "#1976d2 !important",
						backgroundColor: "rgba(25, 118, 210, 0.04) !important",
					},
				},
			},
		},
	},
});

export default theme;