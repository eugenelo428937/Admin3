import { createTheme } from "@mui/material/styles";
import "../styles/liftkit-css/globals.css";
import colorTheme from "./colorTheme.js";
import liftKitTheme from "./liftKitTheme.js";

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
			fontSize:
				"calc((1em / var(--quarterstep)) / var(--eighthstep)) !important",
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

	// Enhanced palette with BPP Color System, Material Design 3, and Liftkit colors
	palette: {
		// Core Material-UI palette using Liftkit colors
		primary: colorTheme.primary,
		secondary: colorTheme.secondary,
		tertiary: colorTheme.tertiary,
		error: colorTheme.error,
		warning: colorTheme.warning,
		info: colorTheme.info,
		success: colorTheme.success,
		background: colorTheme.background,
		surface: colorTheme.surface,
		text: colorTheme.text,

		// BPP Color System
		bpp: colorTheme.bpp,

		// Material Design 3 System Colors
		md3: colorTheme.md3,

		// Liftkit Light Theme
		liftkit: colorTheme.liftkit,
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
		// Product Card Variants
		MuiCard: {
			styleOverrides: {
				root: {
					backgroundColor:
						"var(--md-sys-color-surface-container-lowest_lkv)",
				},
			},
			variants: [
				// Bundle Product Card Variant
				{
					props: { variant: "bundle-product" },
					style: {
						minWidth: "20rem",
						maxWidth: "21rem",
						height: "fit-content",
						overflow: "hidden",
						aspectRatio: "2/3",

						// Bundle-specific header styling
						"& .MuiCardHeader-root": {
							backgroundColor: "var(--product-card-header-bg-color)", // rgb(0,22,0) converted to hex
							color: "#ffffff",
							height: "7.43rem",
							padding: "1rem",

							"& .MuiCardHeader-title": {
								color: "#ffffff",
							},
							"& .MuiCardHeader-subheader": {
								color: "rgba(255, 255, 255, 0.8)",
							},
							"& .MuiAvatar-root": {
								backgroundColor: "rgba(255, 255, 255, 0.2)",
							},
						},

						// Bundle-specific content styling
						"& .MuiCardContent-root": {
							// Chips section height
							"& .product-chips": {
								height: "2.83rem",
							},
							// Variations section height
							"& .product-variations": {
								height: "4.59rem",
							},
						},

						// Bundle-specific actions styling
						"& .MuiCardActions-root": {
							height: "12.03rem !important",
							backgroundColor: "#f5fafb",
							// Show discount options for bundles
							"& .discount-options": {
								display: "block",
							},
						},
					},
				},

				// Marking Product Card Variant
				{
					props: { variant: "marking-product" },
					style: {
						minWidth: "20rem",
						maxWidth: "21rem",
						height: "fit-content",
						overflow: "hidden",
						aspectRatio: "2/3",

						// Marking-specific header styling
						"& .MuiCardHeader-root": {
							backgroundColor: "#006d3d", // Success green for marking
							color: "#ffffff",
							height: "7.43rem",
							padding: liftKitTheme.spacing.md,
							display: "flex",
							flexDirection: "row",
							alignItems: "center",
							justifyContent: "flex-start",
							"& .MuiCardHeader-avatar": {
								order: 2,
								marginLeft: "auto",
								marginRight: "0",
								"& .MuiAvatar-root": {
									backgroundColor: "rgba(255, 255, 255, 0.2)",
								},
							},
							"& .MuiCardHeader-content": {
								order: 1,
								flex: "1",
							},
						},

						// Marking-specific content styling
						"& .MuiCardContent-root": {
							// Chips section height
							"& .product-chips": {
								height: "2.83rem",
							},
							// Variations section height
							"& .product-variations": {
								height: "4.59rem",
							},
						},

						// Marking-specific actions styling
						"& .MuiCardActions-root": {
							height: "8.5rem !important", // Smaller height - no discount options
							backgroundColor: "#dbfaed", // Light green background
							// Hide discount options for marking products
							"& .discount-options": {
								display: "none",
							},
						},
					},
				},

				// Tutorial Product Card Variant
				{
					props: { variant: "tutorial-product" },
					style: {
						minWidth: "20rem",
						maxWidth: "21rem",
						height: "fit-content",
						overflow: "hidden",
						aspectRatio: "2/3",
						boxShadow: "var(--Paper-shadow)",
						//  header styling
						"& .MuiCardHeader-root": {
							backgroundColor: colorTheme.bpp.mint["010"],
							color: "#ffffff",
							height: "7.43rem",
							padding: "1rem",
							boxShadow: "var(--shadow-sm)",
							display: "flex",
							flexDirection: "row",
							alignItems: "center",
							justifyContent: "flex-start",
							"& .MuiCardHeader-avatar": {
								order: 2,
								marginLeft: "auto",
								marginRight: "0",
								"& .MuiAvatar-root": {
									fontSize: "1.5rem",
									color: colorTheme.bpp.mint["090"],
									backgroundColor: colorTheme.bpp.mint["020"],
									boxShadow: "var(--Paper-shadow)",
								},
							},

							"& .MuiCardHeader-content": {
								order: 1,
								flex: "1",
								"& .MuiTypography-subtitle1": {
									color: colorTheme.bpp.sky["100"],
								},
								"& .MuiTypography-h5": {
									color: colorTheme.bpp.sky["090"],
								},
							},
						},

						//  content styling
						"& .MuiCardContent-root": {
							padding: liftKitTheme.spacing.md,
							// Chips section
							"& .product-chips": {
								display: "flex",
								gap: liftKitTheme.spacing.sm,
								marginBottom: liftKitTheme.spacing.md,

								"& .MuiChip-root": {
									boxShadow: "var(--Paper-shadow)",
									"& .MuiChip-label": {
										fontWeight:
											liftKitTheme.typography.overline.fontWeight,
										paddingX: liftKitTheme.spacing.md,
										paddingY: liftKitTheme.spacing.xs,
									},
								},
							},
							// Variations section height
							"& .product-variations": {
								padding: liftKitTheme.spacing.sm,
								paddingLeft: liftKitTheme.spacing.md,
								boxShadow: "var(--shadow-sm)",
								backgroundColor:
									"rgb(from " +
									colorTheme.bpp.sky["010"] +
									" r g b / 0.25);",
								transition: "all 0.2s ease",
								"& .MuiTypography-root": {
									marginBottom: 0,
								},
								"& .MuiFormGroup-root": {
									display: "flex",
									flexDirection: "column",
									alignItems: "flex-start",
									justifyContent: "flex-start",
									marginTop: liftKitTheme.spacing.xs2,
									"& .MuiFormControlLabel-root": {
										paddingLeft: liftKitTheme.spacing.md,
										width: "100%",
										"&:hover": {
											boxShadow: "var(--Paper-shadow)",
											backgroundColor:
												"rgb(from " +
												colorTheme.bpp.sky["010"] +
												" r g b / 0.65);",
										},
										"& .MuiSvgIcon-root": { fontSize: "1.2rem" },
										"& .MuiCheckbox-root": {
											padding: "0.4rem",
											width: "1.5rem",
										},
										"& .MuiTypography-root": {
											marginLeft: liftKitTheme.spacing.xs,
										},
									},
								},
							},
						},

						//  actions styling
						"& .MuiCardActions-root": {
							height: "9.7rem !important",
							backgroundColor: colorTheme.bpp.granite["020"],
							boxShadow: "var(--shadow-lg)",
							// Show discount options for materials
							"& .discount-options": {
								display: "block",
							},
						},
					},
				},

				// Material Product Card Variant (default)
				{
					props: { variant: "material-product" },
					style: {
						minWidth: "20rem",
						maxWidth: "21rem",
						height: "fit-content",
						overflow: "hidden",
						aspectRatio: "2/3",
						boxShadow: "var(--Paper-shadow)",
						//  header styling
						"& .MuiCardHeader-root": {
							backgroundColor: colorTheme.bpp.sky["010"],
							color: "#ffffff",
							height: "7.43rem",
							padding: "1rem",
							boxShadow: "var(--shadow-sm)",
							display: "flex",
							flexDirection: "row",
							alignItems: "center",
							justifyContent: "flex-start",
							"& .MuiCardHeader-avatar": {
								order: 2,
								marginLeft: "auto",
								marginRight: "0",
								"& .MuiAvatar-root": {
									fontSize: "1.5rem",
									color: colorTheme.bpp.sky["090"],
									backgroundColor: colorTheme.bpp.sky["020"],
									boxShadow: "var(--Paper-shadow)",
								},
							},

							"& .MuiCardHeader-content": {
								order: 1,
								flex: "1",
								"& .MuiTypography-subtitle1": {
									color: colorTheme.bpp.sky["100"],
								},
								"& .MuiTypography-h5": {
									color: colorTheme.bpp.sky["090"],
								},
							},
						},

						//  content styling
						"& .MuiCardContent-root": {
							padding: liftKitTheme.spacing.md,
							// Chips section
							"& .product-chips": {
								display: "flex",
								gap: liftKitTheme.spacing.sm,
								marginBottom: liftKitTheme.spacing.md,

								"& .MuiChip-root": {
									boxShadow: "var(--Paper-shadow)",
									"& .MuiChip-label": {
										fontWeight:
											liftKitTheme.typography.overline.fontWeight,
										paddingX: liftKitTheme.spacing.md,
										paddingY: liftKitTheme.spacing.xs,
									},
								},
							},
							// Variations section height
							"& .product-variations": {
								padding: liftKitTheme.spacing.sm,
								paddingLeft: liftKitTheme.spacing.md,
								boxShadow: "var(--shadow-sm)",
								backgroundColor:
									"rgb(from " +
									colorTheme.bpp.sky["010"] +
									" r g b / 0.25);",
								transition: "all 0.2s ease",
								"& .MuiTypography-root": {
									marginBottom: 0,
								},
								"& .MuiFormGroup-root": {
									display: "flex",
									flexDirection: "column",
									alignItems: "flex-start",
									justifyContent: "flex-start",
									marginTop: liftKitTheme.spacing.xs2,
									"& .MuiFormControlLabel-root": {
										paddingLeft: liftKitTheme.spacing.md,
										width: "100%",
										"&:hover": {
											boxShadow: "var(--Paper-shadow)",
											backgroundColor:
												"rgb(from " +
												colorTheme.bpp.sky["010"] +
												" r g b / 0.65);",
										},
										"& .MuiSvgIcon-root": { fontSize: "1.2rem" },
										"& .MuiCheckbox-root": {
											padding: "0.4rem",
											width: "1.5rem",
										},
										"& .MuiTypography-root": {
											marginLeft: liftKitTheme.spacing.xs,
										},
									},
								},
							},
						},

						//  actions styling
						"& .MuiCardActions-root": {
							height: "9.7rem !important",
							backgroundColor: colorTheme.bpp.granite["020"],
							boxShadow: "var(--shadow-lg)",
							// Show discount options for materials
							"& .discount-options": {
								display: "block",
							},
						},
					},
				},
			],
		},
	},

	// Custom Liftkit spacing system - use the extracted liftKitTheme
	liftkit: {
		spacing: liftKitTheme.spacing,
		typography: liftKitTheme.typography,
	},

	// Add custom breakpoints to work with the Liftkit responsive system
	breakpoints: {
		values: {
			xs: 0,
			sm: 600,
			md: 960,
			lg: 1280,
			xl: 1920,
		},
	},
});

export default theme;
export { liftKitTheme, colorTheme };
