import { createTheme } from "@mui/material/styles";
import "../styles/liftkit-css/globals.css";
import colorTheme from "./colorTheme.js";
import liftKitTheme from "./liftKitTheme.js";

// Gradient utility function for interactive headers
const createGradientStyle = (mousePosition, isHovered, colorScheme) => {
	const { x, y } = mousePosition;
	const intensity = isHovered ? 0.15 : 0.03;
	const gradientAngle = Math.atan2(y - 50, x - 50) * (180 / Math.PI);
	
	return {
		background: `linear-gradient(${gradientAngle}deg, 
			rgba(${colorScheme.primary}, ${intensity}) 0%, 
			rgba(${colorScheme.secondary}, ${intensity * 0.7}) 30%, 
			rgba(255, 255, 255, 0) 60%, 
			rgba(${colorScheme.accent}, ${intensity * 0.5}) 100%)`,
		transition: isHovered ? 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
	};
};

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
		fineprint: {
			fontFamily: "Poppins,Inter Variable,san-serif",
			fontWeight: 200,
			fontSize:
				"calc(1em /  var(--halfstep)/  var(--quarterstep)) !important",
			lineHeight: "var(--halfstep) !important",
			letterSpacing: "-0.007em !important",
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
				// Tutorial Product Card Variant
				{
					props: { variant: "tutorial-product" },
					style: {
						minWidth: "21rem",
						maxWidth: "21rem",
						height: "fit-content",
						overflow: "hidden",
						aspectRatio: "2/3",
						boxShadow: "var(--Paper-shadow)",
						justifyContent: "space-between",
						// Product Header
						"& .product-header": {
							backgroundColor: colorTheme.bpp.purple["010"],
							color: "#ffffff",
							height: "13.43rem",
							height: "7.43rem",
							padding: "1rem",
							boxShadow: "var(--shadow-sm)",
							display: "flex",
							flexDirection: "row",
							alignItems: "center",
							justifyContent: "flex-start",
							flex: "0 0 auto",
							"& .MuiCardHeader-content": {
								order: 1,
								flex: "1",
								"& .product-title": {
									color: colorTheme.bpp.sky["100"],
								},
								"& .product-subtitle": {
									color: colorTheme.bpp.sky["090"],
								},
							},
							"& .MuiCardHeader-avatar": {
								order: 2,
								marginLeft: "auto",
								marginRight: "0",
								"& .product-avatar": {
									backgroundColor: colorTheme.bpp.granite["020"],
									boxShadow: "var(--Paper-shadow)",
									"& .product-avatar-icon": {
										fontSize: "1.5rem",
										color: colorTheme.bpp.purple["090"],
									},
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
						minWidth: "22rem",
						maxWidth: "22rem",
						height: "fit-content",
						overflow: "hidden",
						aspectRatio: "2/3",
						boxShadow: "var(--Paper-shadow)",
						justifyContent: "space-between",

						// Product Header
						"& .product-header": {
							backgroundColor: colorTheme.bpp.sky["020"],
							color: "#ffffff",
							height: "13.43rem",
							height: "7.43rem",
							padding: "1rem",
							boxShadow: "var(--shadow-sm)",
							display: "flex",
							flexDirection: "row",
							alignItems: "center",
							justifyContent: "flex-start",
							flex: "0 0 auto",
							"& .MuiCardHeader-content": {
								order: 1,
								flex: "1",
								"& .product-title": {
									color: colorTheme.bpp.sky["100"],
								},
								"& .product-subtitle": {
									color: colorTheme.bpp.sky["090"],
								},
							},
							"& .MuiCardHeader-avatar": {
								order: 2,
								marginLeft: "auto",
								marginRight: "0",
								"& .product-avatar": {
									backgroundColor: colorTheme.bpp.granite["020"],
									boxShadow: "var(--Paper-shadow)",
									"& .product-avatar-icon": {
										fontSize: "1.5rem",
										color: colorTheme.bpp.sky["090"],
									},
								},
							},
						},

						//  content styling
						"& .MuiCardContent-root": {
							padding: liftKitTheme.spacing.md,
							height: "100%",

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
										paddingLeft: liftKitTheme.spacing.md,
										paddingRight: liftKitTheme.spacing.md,
										paddingTop: liftKitTheme.spacing.xs,
										paddingBottom: liftKitTheme.spacing.xs,
									},
								},
							},
							// Product Variations
							"& .product-variations": {
								display: "flex",
								flexDirection: "column",
								alignItems: "start",
								justifyContent: "start",
								textAlign: "left",
								paddingLeft: liftKitTheme.spacing.sm,
								paddingRight: liftKitTheme.spacing.sm,

								"& .variations-title": {
									marginBottom: liftKitTheme.spacing.xs2,
									textAlign: "left",
									color: colorTheme.bpp.sky["100"],
								},

								"& .variations-group": {
									display: "flex",
									flexDirection: "column",
									alignItems: "flex-start",
									justifyContent: "flex-start",
									width: "100%",
									"& .variation-option": {
										marginBottom: liftKitTheme.spacing.xs2,
										marginLeft: liftKitTheme.spacing.xs2,
										width: "100%",
										color: colorTheme.bpp.sky["100"],
										transition: "all 0.2s ease-in-out",
										"& .MuiCheckbox-root": {
											padding: liftKitTheme.spacing.sm,
											width: liftKitTheme.spacing.md,
											height: liftKitTheme.spacing.md,
											color: colorTheme.bpp.sky["090"],
											alignItems: "center",
											justifyContent: "center",
										},
										"& .MuiSvgIcon-root": {
											fontSize: liftKitTheme.spacing.md,
										},
										"&:hover": {
											boxShadow: "var(--Paper-shadow)",
											backdropFilter: "saturate(2.4)",
										},
										"& .variation-label": {
											marginLeft: liftKitTheme.spacing.xs,
										},
									},
								},
							},
						},

						//  actions styling
						"& .MuiCardActions-root": {
							height: "23.7rem !important",
							backgroundColor: colorTheme.bpp.sky["020"],
							boxShadow: "var(--shadow-lg)",
							paddingTop: liftKitTheme.spacing.md,
							paddingLeft: liftKitTheme.spacing.md,
							paddingRight: liftKitTheme.spacing.md,
							flexDirection: "column",
							alignItems: "stretch",
							justifyContent: "space-between",
							display: "flex",
							width: "100%",
							// Price & Action Section
							"& .price-container": {
								display: "flex",
								flexDirection: "row",
								alignItems: "center",
								justifyContent: "end",

								// Discount Options
								"& .discount-options": {
									display: "flex",
									flexDirection: "column",
									alignItems: "start",
									justifyContent: "start",
									textAlign: "left",
									paddingLeft: liftKitTheme.spacing.sm,
									paddingRight: liftKitTheme.spacing.sm,
									"& .discount-title": {
										textAlign: "left",
										color: colorTheme.bpp.sky["100"],
									},
									"& .discount-radio-group": {
										display: "flex",
										flexDirection: "column",
										alignItems: "flex-start",
										justifyContent: "flex-start",
										marginLeft: liftKitTheme.spacing.sm,
										"& .discount-radio-option": {
											padding: liftKitTheme.spacing.xs2,
											width: "100%",
											color: colorTheme.bpp.sky["100"],
											transition: "all 0.2s ease-in-out",

											"&:hover": {
												boxShadow: "var(--Paper-shadow)",
												backdropFilter: "saturate(2.4)",
											},

											"& .MuiRadio-root": {
												// padding: liftKitTheme.spacing.sm,
												width: liftKitTheme.spacing.md,
												height: liftKitTheme.spacing.md,
												color: colorTheme.bpp.sky["090"],
												alignItems: "center",
												justifyContent: "center",
												"& .MuiSvgIcon-root": {
													fontSize: liftKitTheme.spacing.md,
												},
											},

											"& .discount-label": {
												paddingLeft: liftKitTheme.spacing.xs,
												color: colorTheme.bpp.sky["100"],
											},
										},
									},
								},
								"& .price-action-section": {
									flex: 1,
									display: "flex",
									flexDirection: "column",
									"& .price-info-row": {
										display: "flex",
										alignItems: "flex-end",
										alignSelf: "flex-end",
										"& .price-display": {
											color: colorTheme.bpp.sky["100"],
										},

										"& .info-button": {
											minWidth: "auto",
											borderRadius: "50%",

											"&:hover": {
												backdropFilter: "saturate(2.4)",
												boxShadow: "var(--Paper-shadow)",
												transform: "translateY(-1px)",
											},

											"& .MuiSvgIcon-root": {
												fontSize: "1.2rem",
											},
										},
									},
									"& .price-details-row": {
										display: "flex",
										flexDirection: "column",
										alignItems: "flex-end",
										"& .price-level-text": {
											display: "block",
											textAlign: "right",
										},
										"& .vat-status-text": {
											display: "block",
											textAlign: "right",
										},
									},
									"& .add-to-cart-button": {
										alignSelf: "flex-end",
										borderRadius: "50%",
										minWidth: liftKitTheme.spacing.xl,
										width: liftKitTheme.spacing.xl,
										height: liftKitTheme.spacing.xl,
										padding: liftKitTheme.spacing.sm,
										marginLeft: liftKitTheme.spacing.md,
										marginRight: liftKitTheme.spacing.md,
										marginTop: liftKitTheme.spacing.md,
										boxShadow: "var(--Paper-shadow)",
										backgroundColor: colorTheme.bpp.sky["030"],
										transition: "all 0.15s ease-in-out",
										"&:hover": {
											boxShadow: "var(--Paper-shadow)",
											transform: "scale(1.05)",
											filter: "saturate(2)",
										},

										"& .MuiSvgIcon-root": {
											fontSize: "1.6rem",
										},
									},
								},

								// Status Text
								"& .status-text": {
									color: colorTheme.bpp.sky["100"],
									marginTop: liftKitTheme.spacing.xs2,
								},
							},
						},
					},
				},

				// Bundle Product Card Variant
				{
					props: { variant: "bundle-product" },
					style: {
						minWidth: "21rem",
						maxWidth: "21rem",
						height: "fit-content",
						overflow: "hidden",
						aspectRatio: "2/3",
						boxShadow: "var(--Paper-shadow)",
						justifyContent: "space-between",

						// Product Header
						"& .product-header": {
							backgroundColor: colorTheme.bpp.green["010"],
							color: "#ffffff",
							height: "13.43rem",
							height: "7.43rem",
							padding: "1rem",
							boxShadow: "var(--shadow-sm)",
							display: "flex",
							flexDirection: "row",
							alignItems: "center",
							justifyContent: "flex-start",
							flex: "0 0 auto",
							"& .MuiCardHeader-content": {
								order: 1,
								flex: "1",
								"& .product-title": {
									color: colorTheme.bpp.green["100"],
								},
								"& .product-subtitle": {
									color: colorTheme.bpp.green["090"],
								},
							},
							"& .MuiCardHeader-avatar": {
								order: 2,
								marginLeft: "auto",
								marginRight: "0",
								"& .product-avatar": {
									backgroundColor: colorTheme.bpp.granite["020"],
									boxShadow: "var(--Paper-shadow)",
									"& .product-avatar-icon": {
										fontSize: "1.5rem",
										color: colorTheme.bpp.green["090"],
									},
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
								},
							},
							// Variations section
							"& .product-variations": {
								padding: liftKitTheme.spacing.sm,
								paddingLeft: liftKitTheme.spacing.md,
								boxShadow: "var(--shadow-sm)",
								backgroundColor:
									"rgb(from " +
									colorTheme.bpp.green["010"] +
									" r g b / 0.25);",
								transition: "all 0.2s ease",
							},
						},

						//  actions styling
						"& .MuiCardActions-root": {
							height: "23.7rem !important",
							backgroundColor: colorTheme.bpp.green["010"],
							boxShadow: "var(--shadow-lg)",
							paddingTop: liftKitTheme.spacing.md,
							paddingLeft: liftKitTheme.spacing.md,
							paddingRight: liftKitTheme.spacing.md,
							flexDirection: "column",
							alignItems: "stretch",
							justifyContent: "space-between",
							// Price & Action Section
							"& .price-container": {
								display: "flex",
								flexDirection: "row",
								alignItems: "center",
								justifyContent: "start",
								"& .price-action-section": {
									display: "flex",
									flexDirection: "column",
									alignItems: "flex-end",
									justifyContent: "space-between",
									"& .price-info": {
										display: "flex",
										alignItems: "center",
										"& .price-display": {
											color: colorTheme.bpp.green["100"],
										},
										"& .info-button": {
											minWidth: "auto",
											padding: liftKitTheme.spacing.xs2,
											borderRadius: "50%",
											"&:hover": {
												backdropFilter: "saturate(2.4)",
												boxShadow: "var(--Paper-shadow)",
												transform: "translateY(-1px)",
											},
											"& .MuiSvgIcon-root": {
												fontSize: "1.2rem",
											},
										},
									},
									"& .add-to-cart-button": {
										borderRadius: "50%",
										minWidth: liftKitTheme.spacing.xl,
										width: liftKitTheme.spacing.xl,
										height: liftKitTheme.spacing.xl,
										padding: liftKitTheme.spacing.sm,
										marginLeft: liftKitTheme.spacing.md,
										marginRight: liftKitTheme.spacing.md,
										marginTop: liftKitTheme.spacing.md,
										boxShadow: "var(--Paper-shadow)",
										backgroundColor: colorTheme.bpp.green["030"],
										transition: "all 0.15s ease-in-out",
										"&:hover": {
											boxShadow: "var(--Paper-shadow)",
											transform: "scale(1.05)",
											filter: "saturate(2)",
										},
										"& .MuiSvgIcon-root": {
											fontSize: "1.6rem",
										},
									},
								},
								// Status Text
								"& .status-text": {
									color: colorTheme.bpp.green["100"],
									marginTop: liftKitTheme.spacing.xs2,
								},
							},
						},
					},
				},

				// Online Classroom Product Card Variant
				{
					props: { variant: "online-product" },
					style: {
						minWidth: "21rem",
						maxWidth: "21rem",
						height: "fit-content",
						overflow: "hidden",
						aspectRatio: "2/3",
						boxShadow: "var(--Paper-shadow)",
						justifyContent: "space-between",

						// Product Header
						"& .product-header": {
							backgroundColor: colorTheme.bpp.cobalt["010"],
							color: "#ffffff",
							height: "13.43rem",
							height: "7.43rem",
							padding: "1rem",
							boxShadow: "var(--shadow-sm)",
							display: "flex",
							flexDirection: "row",
							alignItems: "center",
							justifyContent: "flex-start",
							flex: "0 0 auto",
							"& .MuiCardHeader-content": {
								order: 1,
								flex: "1",
								"& .product-title": {
									color: colorTheme.bpp.cobalt["100"],
								},
								"& .product-subtitle": {
									color: colorTheme.bpp.cobalt["090"],
								},
							},
							"& .MuiCardHeader-avatar": {
								order: 2,
								marginLeft: "auto",
								marginRight: "0",
								"& .product-avatar": {
									backgroundColor: colorTheme.bpp.granite["020"],
									boxShadow: "var(--Paper-shadow)",
									"& .product-avatar-icon": {
										fontSize: "1.5rem",
										color: colorTheme.bpp.cobalt["090"],
									},
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
								},
							},
						},

						//  actions styling
						"& .MuiCardActions-root": {
							height: "23.7rem !important",
							backgroundColor: colorTheme.bpp.cobalt["010"],
							boxShadow: "var(--shadow-lg)",
							paddingTop: liftKitTheme.spacing.md,
							paddingLeft: liftKitTheme.spacing.md,
							paddingRight: liftKitTheme.spacing.md,
							flexDirection: "column",
							alignItems: "stretch",
							justifyContent: "space-between",
							// Price & Action Section
							"& .price-container": {
								display: "flex",
								flexDirection: "row",
								alignItems: "center",
								justifyContent: "start",
								"& .price-action-section": {
									display: "flex",
									flexDirection: "column",
									alignItems: "flex-end",
									justifyContent: "space-between",
									"& .price-info": {
										display: "flex",
										alignItems: "center",
										"& .price-display": {
											color: colorTheme.bpp.cobalt["100"],
										},
										"& .info-button": {
											minWidth: "auto",
											padding: liftKitTheme.spacing.xs2,
											borderRadius: "50%",
											"&:hover": {
												backdropFilter: "saturate(2.4)",
												boxShadow: "var(--Paper-shadow)",
												transform: "translateY(-1px)",
											},
											"& .MuiSvgIcon-root": {
												fontSize: "1.2rem",
											},
										},
									},
									"& .add-to-cart-button": {
										borderRadius: "50%",
										minWidth: liftKitTheme.spacing.xl,
										width: liftKitTheme.spacing.xl,
										height: liftKitTheme.spacing.xl,
										padding: liftKitTheme.spacing.sm,
										marginLeft: liftKitTheme.spacing.md,
										marginRight: liftKitTheme.spacing.md,
										marginTop: liftKitTheme.spacing.md,
										boxShadow: "var(--Paper-shadow)",
										backgroundColor: colorTheme.bpp.cobalt["030"],
										transition: "all 0.15s ease-in-out",
										"&:hover": {
											boxShadow: "var(--Paper-shadow)",
											transform: "scale(1.05)",
											filter: "saturate(2)",
										},
										"& .MuiSvgIcon-root": {
											fontSize: "1.6rem",
										},
									},
								},
								// Status Text
								"& .status-text": {
									color: colorTheme.bpp.cobalt["100"],
									marginTop: liftKitTheme.spacing.xs2,
								},
							},
						},
					},
				},

				// Marking Product Card Variant (Orange theme)
				{
					props: { variant: "marking-product" },
					style: {
						minWidth: "21rem",
						maxWidth: "21rem",
						height: "fit-content",
						overflow: "hidden",
						aspectRatio: "2/3",
						boxShadow: "var(--Paper-shadow)",
						justifyContent: "space-between",

						// Product Header
						"& .product-header": {
							backgroundColor: colorTheme.bpp.orange["010"],
							color: "#ffffff",
							height: "13.43rem",
							height: "7.43rem",
							padding: "1rem",
							boxShadow: "var(--shadow-sm)",
							display: "flex",
							flexDirection: "row",
							alignItems: "center",
							justifyContent: "flex-start",
							flex: "0 0 auto",
							"& .MuiCardHeader-content": {
								order: 1,
								flex: "1",
								"& .product-title": {
									color: colorTheme.bpp.orange["100"],
								},
								"& .product-subtitle": {
									color: colorTheme.bpp.orange["090"],
								},
							},
							"& .MuiCardHeader-avatar": {
								order: 2,
								marginLeft: "auto",
								marginRight: "0",
								"& .product-avatar": {
									backgroundColor: colorTheme.bpp.granite["020"],
									boxShadow: "var(--Paper-shadow)",
									"& .product-avatar-icon": {
										fontSize: "1.5rem",
										color: colorTheme.bpp.orange["090"],
									},
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
								},
							},
						},

						//  actions styling
						"& .MuiCardActions-root": {
							height: "23.7rem !important",
							backgroundColor: colorTheme.bpp.orange["010"],
							boxShadow: "var(--shadow-lg)",
							paddingTop: liftKitTheme.spacing.md,
							paddingLeft: liftKitTheme.spacing.md,
							paddingRight: liftKitTheme.spacing.md,
							flexDirection: "column",
							alignItems: "stretch",
							justifyContent: "space-between",
							// Price & Action Section
							"& .price-container": {
								display: "flex",
								flexDirection: "row",
								alignItems: "center",
								justifyContent: "start",
								"& .price-action-section": {
									display: "flex",
									flexDirection: "column",
									alignItems: "flex-end",
									justifyContent: "space-between",
									"& .price-info": {
										display: "flex",
										alignItems: "center",
										"& .price-display": {
											color: colorTheme.bpp.orange["100"],
										},
										"& .info-button": {
											minWidth: "auto",
											padding: liftKitTheme.spacing.xs2,
											borderRadius: "50%",
											"&:hover": {
												backdropFilter: "saturate(2.4)",
												boxShadow: "var(--Paper-shadow)",
												transform: "translateY(-1px)",
											},
											"& .MuiSvgIcon-root": {
												fontSize: "1.2rem",
											},
										},
									},
									"& .add-to-cart-button": {
										borderRadius: "50%",
										minWidth: liftKitTheme.spacing.xl,
										width: liftKitTheme.spacing.xl,
										height: liftKitTheme.spacing.xl,
										padding: liftKitTheme.spacing.sm,
										marginLeft: liftKitTheme.spacing.md,
										marginRight: liftKitTheme.spacing.md,
										marginTop: liftKitTheme.spacing.md,
										boxShadow: "var(--Paper-shadow)",
										backgroundColor: colorTheme.bpp.orange["030"],
										transition: "all 0.15s ease-in-out",
										"&:hover": {
											boxShadow: "var(--Paper-shadow)",
											transform: "scale(1.05)",
											filter: "saturate(2)",
										},
										"& .MuiSvgIcon-root": {
											fontSize: "1.6rem",
										},
									},
								},
								// Status Text
								"& .status-text": {
									color: colorTheme.bpp.orange["100"],
									marginTop: liftKitTheme.spacing.xs2,
								},
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
	// Custom gradient utilities
	gradients: {
		createGradientStyle,
		colorSchemes: {
			material: {
				primary: "140, 250, 250",    //rgb(140, 212, 246)

				secondary: "33, 150, 243", // #2196F3		
				accent: "173, 63, 181"      //rgb(173, 63, 181)
			},
			tutorial: {
				primary: "156, 39, 176",   // #9C27B0
				secondary: "233, 30, 99",  // #E91E63
				accent: "103, 58, 183"     // #673AB7
			},
			online: {
				primary: "33, 150, 243",   // #2196F3
				secondary: "3, 169, 244",  // #03A9F4
				accent: "63, 81, 181"      // #3F51B5
			},
			bundle: {
				primary: "76, 175, 80",    // #4CAF50
				secondary: "139, 195, 74", // #8BC34A
				accent: "46, 125, 50"      // #2E7D32
			},
			assessment: {
				primary: "156, 39, 176",   // #9C27B0
				secondary: "233, 30, 99",  // #E91E63
				accent: "103, 58, 183"     // #673AB7
			},
			marking: {
				primary: "255, 152, 0",    // #FF9800
				secondary: "255, 193, 7",  // #FFC107
				accent: "255, 111, 0"      // #FF6F00
			}
		}
	}
});

export default theme;
export { liftKitTheme, colorTheme };
