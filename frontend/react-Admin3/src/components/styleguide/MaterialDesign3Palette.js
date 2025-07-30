import React from "react";
import {
	Container,
	Box,
	Typography,
	Card,
	CardContent,
	CardHeader,
	Divider,
	Grid,
	Paper,
} from "@mui/material";
import "../../styles/liftkit-css/new-globals.css";

const MaterialDesign3Palette = () => {
	// BPP Color System data matching the unified-color-palette.html
	const bppColorFamilies = [
		{
			name: "Purple",
			iconColor: "var(--color-purple-060)",
			tones: [
				{ label: "010", color: "var(--color-purple-010)" },
				{ label: "020", color: "var(--color-purple-020)" },
				{ label: "030", color: "var(--color-purple-030)" },
				{ label: "040", color: "var(--color-purple-040)" },
				{ label: "050", color: "var(--color-purple-050)" },
				{ label: "060", color: "var(--color-purple-060)" },
				{ label: "070", color: "var(--color-purple-070)" },
				{ label: "080", color: "var(--color-purple-080)" },
				{ label: "090", color: "var(--color-purple-090)" },
				{ label: "100", color: "var(--color-purple-100)" },
				{ label: "110", color: "var(--color-purple-110)" },
			],
		},
		{
			name: "Sky",
			iconColor: "var(--color-sky-040)",
			tones: [
				{ label: "010", color: "var(--color-sky-010)" },
				{ label: "020", color: "var(--color-sky-020)" },
				{ label: "030", color: "var(--color-sky-030)" },
				{ label: "040", color: "var(--color-sky-040)" },
				{ label: "050", color: "var(--color-sky-050)" },
				{ label: "060", color: "var(--color-sky-060)" },
				{ label: "070", color: "var(--color-sky-070)" },
				{ label: "080", color: "var(--color-sky-080)" },
				{ label: "090", color: "var(--color-sky-090)" },
				{ label: "100", color: "var(--color-sky-100)" },
				{ label: "110", color: "var(--color-sky-110)" },
			],
		},
		{
			name: "Mint",
			iconColor: "var(--color-mint-030)",
			tones: [
				{ label: "010", color: "var(--color-mint-010)" },
				{ label: "020", color: "var(--color-mint-020)" },
				{ label: "030", color: "var(--color-mint-030)" },
				{ label: "040", color: "var(--color-mint-040)" },
				{ label: "050", color: "var(--color-mint-050)" },
				{ label: "060", color: "var(--color-mint-060)" },
				{ label: "070", color: "var(--color-mint-070)" },
				{ label: "080", color: "var(--color-mint-080)" },
				{ label: "090", color: "var(--color-mint-090)" },
				{ label: "100", color: "var(--color-mint-100)" },
				{ label: "110", color: "var(--color-mint-110)" },
			],
		},
		{
			name: "Orange",
			iconColor: "var(--color-orange-110)",
			tones: [
				{ label: "010", color: "var(--color-orange-010)" },
				{ label: "020", color: "var(--color-orange-020)" },
				{ label: "030", color: "var(--color-orange-030)" },
				{ label: "040", color: "var(--color-orange-040)" },
				{ label: "050", color: "var(--color-orange-050)" },
				{ label: "060", color: "var(--color-orange-060)" },
				{ label: "070", color: "var(--color-orange-070)" },
				{ label: "080", color: "var(--color-orange-080)" },
				{ label: "090", color: "var(--color-orange-090)" },
				{ label: "100", color: "var(--color-orange-100)" },
				{ label: "110", color: "var(--color-orange-110)" },
			],
		},
		{
			name: "Yellow",
			iconColor: "var(--color-yellow-110)",
			tones: [
				{ label: "010", color: "var(--color-yellow-010)" },
				{ label: "020", color: "var(--color-yellow-020)" },
				{ label: "030", color: "var(--color-yellow-030)" },
				{ label: "040", color: "var(--color-yellow-040)" },
				{ label: "050", color: "var(--color-yellow-050)" },
				{ label: "060", color: "var(--color-yellow-060)" },
				{ label: "070", color: "var(--color-yellow-070)" },
				{ label: "080", color: "var(--color-yellow-080)" },
				{ label: "090", color: "var(--color-yellow-090)" },
				{ label: "100", color: "var(--color-yellow-100)" },
				{ label: "110", color: "var(--color-yellow-110)" },
			],
		},
		{
			name: "Granite (Grayscale)",
			iconColor: "var(--color-granite-060)",
			tones: [
				{ label: "000", color: "var(--color-granite-000)" },
				{ label: "010", color: "var(--color-granite-010)" },
				{ label: "020", color: "var(--color-granite-020)" },
				{ label: "030", color: "var(--color-granite-030)" },
				{ label: "040", color: "var(--color-granite-040)" },
				{ label: "050", color: "var(--color-granite-050)" },
				{ label: "060", color: "var(--color-granite-060)" },
				{ label: "070", color: "var(--color-granite-070)" },
				{ label: "080", color: "var(--color-granite-080)" },
				{ label: "090", color: "var(--color-granite-090)" },
				{ label: "100", color: "var(--color-granite-100)" },
			],
		},
	];

	// Material Design 3 Color System Structure
	// Row 1: Core Colors (Primary, Secondary, Tertiary, Error)
	const coreColors = [
		{
			type: "Primary",
			colors: [
				{
					name: "Primary",
					bg: "var(--md-sys-color-primary_lkv)",
					color: "var(--md-sys-color-on-primary_lkv)",
				},
				{
					name: "On Primary",
					bg: "var(--md-sys-color-on-primary_lkv)",
					color: "var(--md-sys-color-primary_lkv)",
				},
				{
					name: "Primary Container",
					bg: "var(--md-sys-color-primary-container_lkv)",
					color: "var(--md-sys-color-on-primary-container_lkv)",
				},
				{
					name: "On Primary Container",
					bg: "var(--md-sys-color-on-primary-container_lkv)",
					color: "var(--md-sys-color-primary-container_lkv)",
				},
			],
		},
		{
			type: "Secondary",
			colors: [
				{
					name: "Secondary",
					bg: "var(--md-sys-color-secondary_lkv)",
					color: "var(--md-sys-color-on-secondary_lkv)",
				},
				{
					name: "On Secondary",
					bg: "var(--md-sys-color-on-secondary_lkv)",
					color: "var(--md-sys-color-secondary_lkv)",
				},
				{
					name: "Secondary Container",
					bg: "var(--md-sys-color-secondary-container_lkv)",
					color: "var(--md-sys-color-on-secondary-container_lkv)",
				},
				{
					name: "On Secondary Container",
					bg: "var(--md-sys-color-on-secondary-container_lkv)",
					color: "var(--md-sys-color-secondary-container_lkv)",
				},
			],
		},
		{
			type: "Tertiary",
			colors: [
				{
					name: "Tertiary",
					bg: "var(--md-sys-color-tertiary_lkv)",
					color: "var(--md-sys-color-on-tertiary_lkv)",
				},
				{
					name: "On Tertiary",
					bg: "var(--md-sys-color-on-tertiary_lkv)",
					color: "var(--md-sys-color-tertiary_lkv)",
				},
				{
					name: "Tertiary Container",
					bg: "var(--md-sys-color-tertiary-container_lkv)",
					color: "var(--md-sys-color-on-tertiary-container_lkv)",
				},
				{
					name: "On Tertiary Container",
					bg: "var(--md-sys-color-on-tertiary-container_lkv)",
					color: "var(--md-sys-color-tertiary-container_lkv)",
				},
			],
		},
		{
			type: "Error",
			colors: [
				{
					name: "Error",
					bg: "var(--md-sys-color-error_lkv)",
					color: "var(--md-sys-color-on-error_lkv)",
				},
				{
					name: "On Error",
					bg: "var(--md-sys-color-on-error_lkv)",
					color: "var(--md-sys-color-error_lkv)",
				},
				{
					name: "Error Container",
					bg: "var(--md-sys-color-error-container_lkv)",
					color: "var(--md-sys-color-on-error-container_lkv)",
				},
				{
					name: "On Error Container",
					bg: "var(--md-sys-color-on-error-container_lkv)",
					color: "var(--md-sys-color-error-container_lkv)",
				},
			],
		},
	];

	// Row 2: Fixed Colors
	const fixedColors = [
		{
			type: "Primary Fixed",
			colors: [
				{
					name: "Primary Fixed",
					bg: "var(--md-sys-color-primary-fixed_lkv)",
					color: "var(--md-sys-color-on-primary-fixed_lkv)",
					position: "left",
				},
				{
					name: "Primary Fixed Dim",
					bg: "var(--md-sys-color-primary-fixed-dim_lkv)",
					color: "var(--md-sys-color-on-primary-fixed-variant_lkv)",
					position: "right",
				},
				{
					name: "On Primary Fixed",
					bg: "var(--md-sys-color-on-primary-fixed_lkv)",
					color: "var(--md-sys-color-primary-fixed_lkv)",
					position: "full",
				},
				{
					name: "On Primary Fixed Variant",
					bg: "var(--md-sys-color-on-primary-fixed-variant_lkv)",
					color: "var(--md-sys-color-primary-fixed_lkv)",
					position: "full",
				},
			],
		},
		{
			type: "Secondary Fixed",
			colors: [
				{
					name: "Secondary Fixed",
					bg: "var(--md-sys-color-secondary-fixed_lkv)",
					color: "var(--md-sys-color-on-secondary-fixed_lkv)",
					position: "left",
				},
				{
					name: "Secondary Fixed Dim",
					bg: "var(--md-sys-color-secondary-fixed-dim_lkv)",
					color: "var(--md-sys-color-on-secondary-fixed-variant_lkv)",
					position: "right",
				},
				{
					name: "On Secondary Fixed",
					bg: "var(--md-sys-color-on-secondary-fixed_lkv)",
					color: "var(--md-sys-color-secondary-fixed_lkv)",
					position: "full",
				},
				{
					name: "On Secondary Fixed Variant",
					bg: "var(--md-sys-color-on-secondary-fixed-variant_lkv)",
					color: "var(--md-sys-color-secondary-fixed_lkv)",
					position: "full",
				},
			],
		},
		{
			type: "Tertiary Fixed",
			colors: [
				{
					name: "Tertiary Fixed",
					bg: "var(--md-sys-color-tertiary-fixed_lkv)",
					color: "var(--md-sys-color-on-tertiary-fixed_lkv)",
					position: "left",
				},
				{
					name: "Tertiary Fixed Dim",
					bg: "var(--md-sys-color-tertiary-fixed-dim_lkv)",
					color: "var(--md-sys-color-on-tertiary-fixed-variant_lkv)",
					position: "right",
				},
				{
					name: "On Tertiary Fixed",
					bg: "var(--md-sys-color-on-tertiary-fixed_lkv)",
					color: "var(--md-sys-color-tertiary-fixed_lkv)",
					position: "full",
				},
				{
					name: "On Tertiary Fixed Variant",
					bg: "var(--md-sys-color-on-tertiary-fixed-variant_lkv)",
					color: "var(--md-sys-color-tertiary-fixed_lkv)",
					position: "full",
				},
			],
		},
	];

	// Row 3: Surface Colors
	const surfaceColors = {
		main: [
			// Row 1: Surface brightness
			[
				{
					name: "Surface Dim",
					bg: "var(--md-sys-color-surface-dim_lkv)",
					color: "var(--md-sys-color-on-surface_lkv)",
				},
				{
					name: "Surface",
					bg: "var(--md-sys-color-surface_lkv)",
					color: "var(--md-sys-color-on-surface_lkv)",
				},
				{
					name: "Surface Bright",
					bg: "var(--md-sys-color-surface-bright_lkv)",
					color: "var(--md-sys-color-on-surface_lkv)",
				},
			],
			// Row 2: Surface containers
			[
				{
					name: "Surface Container Lowest",
					bg: "var(--md-sys-color-surface-container-lowest_lkv)",
					color: "var(--md-sys-color-on-surface_lkv)",
				},
				{
					name: "Surface Container Low",
					bg: "var(--md-sys-color-surface-container-low_lkv)",
					color: "var(--md-sys-color-on-surface_lkv)",
				},
				{
					name: "Surface Container",
					bg: "var(--md-sys-color-surface-container_lkv)",
					color: "var(--md-sys-color-on-surface_lkv)",
				},
				{
					name: "Surface Container High",
					bg: "var(--md-sys-color-surface-container-high_lkv)",
					color: "var(--md-sys-color-on-surface_lkv)",
				},
				{
					name: "Surface Container Highest",
					bg: "var(--md-sys-color-surface-container-highest_lkv)",
					color: "var(--md-sys-color-on-surface_lkv)",
				},
			],
			// Row 3: On surface
			[
				{
					name: "On Surface",
					bg: "var(--md-sys-color-on-surface_lkv)",
					color: "var(--md-sys-color-surface_lkv)",
				},
				{
					name: "On Surface Variant",
					bg: "var(--md-sys-color-on-surface-variant_lkv)",
					color: "var(--md-sys-color-surface-variant_lkv)",
				},
				{
					name: "Outline",
					bg: "var(--md-sys-color-outline_lkv)",
					color: "var(--md-sys-color-surface_lkv)",
				},
				{
					name: "Outline Variant",
					bg: "var(--md-sys-color-outline-variant_lkv)",
					color: "var(--md-sys-color-on-surface-variant_lkv)",
				},
			],
		],
		inverse: [
			{
				name: "Inverse Surface",
				bg: "var(--md-sys-color-inverse-surface_lkv)",
				color: "var(--md-sys-color-inverse-on-surface_lkv)",
			},
			{
				name: "Inverse On Surface",
				bg: "var(--md-sys-color-inverse-on-surface_lkv)",
				color: "var(--md-sys-color-inverse-surface_lkv)",
			},
			{
				name: "Inverse Primary",
				bg: "var(--md-sys-color-inverse-primary_lkv)",
				color: "var(--md-sys-color-inverse-surface_lkv)",
			},
			[
				{
					name: "Scrim",
					bg: "var(--md-sys-color-scrim_lkv)",
					color: "#ffffff",
				},
				{
					name: "Shadow",
					bg: "var(--md-sys-color-shadow_lkv)",
					color: "#ffffff",
				},
			],
		],
	};

	// Light theme LKV variables for the bottom section
	const lkvVariables = [
		{
			name: "Primary",
			var: "--md-sys-color-primary_lkv",
			color: "var(--md-sys-color-primary_lkv)",
		},
		{
			name: "Secondary",
			var: "--md-sys-color-secondary_lkv",
			color: "var(--md-sys-color-secondary_lkv)",
		},
		{
			name: "Tertiary",
			var: "--md-sys-color-tertiary_lkv",
			color: "var(--md-sys-color-tertiary_lkv)",
		},
		{
			name: "Surface",
			var: "--md-sys-color-surface-bright_lkv",
			color: "var(--md-sys-color-surface-bright_lkv)",
		},
		{
			name: "Surface Container",
			var: "--md-sys-color-surface-container_lkv",
			color: "var(--md-sys-color-surface-container_lkv)",
		},
		{
			name: "Background",
			var: "--md-sys-color-surface-container-lowest_lkv",
			color: "var(--md-sys-color-surface-container-lowest_lkv)",
		},
		{
			name: "Success Container",
			var: "--color-interactive-positive",
			color: "var(--color-interactive-positive)",
		},
		{
			name: "Warning Container",
			var: "--light__warningcontainer_lkv",
			color: "var(--light__warningcontainer_lkv)",
		},
		{
			name: "Info Container",
			var: "--color-interactive-neutral",
			color: "var(--color-interactive-neutral)",
		},
		{
			name: "Error Container",
			var: "--color-interactive-negative",
			color: "var(--color-interactive-negative)",
		},
	];

	return (
		<Box>
			{/* Header */}
			<Box sx={{ textAlign: "center", mb: 6, pt: 3 }}>
				<Typography
					variant="h4"
					sx={{ fontWeight: 600, mb: 1.5, color: "#1f1f1f" }}>
					Color Palette
				</Typography>
				<Typography variant="body1" sx={{ color: "#5f6368", mb: 1 }}>
					Complete color system combining BPP Colors and Material Design 3
				</Typography>
				<Typography
					variant="subtitle1"
					sx={{ color: "#666", fontStyle: "italic" }}>
					BPP Color System bars + MD3 key colors on different surfaces
				</Typography>
			</Box>

			{/* BPP Color System Bars */}
			<Paper sx={{ mb: 8 }} width="74rem">
				<Grid container spacing={2} sx={{ justifyContent: "center" }}>
					<Grid size={{ xs: 12 }} sx={{ p: 4 }}>
						<Typography variant="h5" sx={{ mb: 3 }}>
							BPP Tonal palettes
						</Typography>

						<Grid container spacing={3} sx={{ justifyContent: "center" }}>
							{/* Left Column - First 3 families */}
							<Grid spacing={3} size="auto">
								{bppColorFamilies.slice(0, 3).map((family) => (
									<Box key={family.name} sx={{ mb: 3 }} width="32rem">
										<Paper
											elevation={2}
											sx={{ borderRadius: 3, overflow: "hidden" }}>
											{/* Family Header */}
											<Box
												sx={{
													display: "flex",
													alignItems: "center",
													p: 2,
													backgroundColor: "#f8f9fa",
													borderBottom: "1px solid #e9ecef",
												}}>
												<Box
													sx={{
														width: 20,
														height: 20,
														backgroundColor: family.iconColor,
														borderRadius: "50%",
														mr: 1.5,
													}}
												/>
												<Typography variant="body1">
													{family.name}
												</Typography>
											</Box>

											{/* Color Bar Container */}
											<Box sx={{ position: "relative" }}>
												{/* Color Labels */}
												<Box
													sx={{
														position: "absolute",
														top: -25,
														left: 0,
														right: 0,
														display: "flex",
														height: 25,
														backgroundColor: "white",
														borderBottom: "1px solid #e9ecef",
													}}>
													{family.tones.map((tone) => (
														<Box
															key={tone.label}
															sx={{
																flex: 1,
																display: "flex",
																alignItems: "center",
																justifyContent: "center",
																borderRight:
																	"1px solid #e9ecef",
																"&:last-child": {
																	borderRight: "none",
																},
															}}>
															<Typography variant="subtitle1">
																{tone.label}
															</Typography>
														</Box>
													))}
												</Box>

												{/* Color Bar */}
												<Box
													sx={{
														display: "flex",
														height: 48,
														mt: 3,
													}}>
													{family.tones.map((tone) => (
														<Box
															key={tone.label}
															sx={{
																flex: 1,
																backgroundColor: tone.color,
																borderRight:
																	"1px solid rgba(255,255,255,0.2)",
																cursor: "pointer",
																transition:
																	"transform 0.2s ease",
																"&:last-child": {
																	borderRight: "none",
																},
																"&:hover": {
																	transform: "scale(1.05)",
																	zIndex: 2,
																	boxShadow:
																		"0 2px 8px rgba(0,0,0,0.15)",
																},
															}}
															onClick={() =>
																navigator.clipboard.writeText(
																	tone.color
																)
															}
														/>
													))}
												</Box>
											</Box>
										</Paper>
									</Box>
								))}
							</Grid>

							{/* Right Column - Last 3 families */}
							<Grid spacing={3} size="auto">
								{bppColorFamilies.slice(3, 6).map((family) => (
									<Box key={family.name} sx={{ mb: 3 }} width="32rem">
										<Paper
											elevation={2}
											sx={{ borderRadius: 3, overflow: "hidden" }}>
											{/* Family Header */}
											<Box
												sx={{
													display: "flex",
													alignItems: "center",
													p: 2,
													backgroundColor: "#f8f9fa",
													borderBottom: "1px solid #e9ecef",
												}}>
												<Box
													sx={{
														width: 20,
														height: 20,
														backgroundColor: family.iconColor,
														borderRadius: "50%",
														mr: 1.5,
													}}
												/>
												<Typography variant="body1">
													{family.name}
												</Typography>
											</Box>

											{/* Color Bar Container */}
											<Box sx={{ position: "relative" }}>
												{/* Color Labels */}
												<Box
													sx={{
														position: "absolute",
														top: -25,
														left: 0,
														right: 0,
														display: "flex",
														height: 25,
														backgroundColor: "white",
														borderBottom: "1px solid #e9ecef",
													}}>
													{family.tones.map((tone) => (
														<Box
															key={tone.label}
															sx={{
																flex: 1,
																display: "flex",
																alignItems: "center",
																justifyContent: "center",
																fontSize: "0.75rem",
																fontWeight: 500,
																color: "#666",
																borderRight:
																	"1px solid #e9ecef",
																"&:last-child": {
																	borderRight: "none",
																},
															}}>
															{tone.label}
														</Box>
													))}
												</Box>

												{/* Color Bar */}
												<Box
													sx={{
														display: "flex",
														height: 48,
														mt: 3,
													}}>
													{family.tones.map((tone) => (
														<Box
															key={tone.label}
															sx={{
																flex: 1,
																backgroundColor: tone.color,
																borderRight:
																	"1px solid rgba(255,255,255,0.2)",
																cursor: "pointer",
																transition:
																	"transform 0.2s ease",
																"&:last-child": {
																	borderRight: "none",
																},
																"&:hover": {
																	transform: "scale(1.05)",
																	zIndex: 2,
																	boxShadow:
																		"0 2px 8px rgba(0,0,0,0.15)",
																},
															}}
															onClick={() =>
																navigator.clipboard.writeText(
																	tone.color
																)
															}
														/>
													))}
												</Box>
											</Box>
										</Paper>
									</Box>
								))}
							</Grid>
						</Grid>
					</Grid>
					<Grid size={{ xs: 12 }} sx={{ p: 4 }}>
						{/* Material Design 3 Color System */}
						<Box>
							<Typography variant="h5" sx={{ mb: 3 }}>
								Material Design 3 Color System
							</Typography>

							{/* Row 1: Core Colors */}
							<Container sx={{ mb: 4 }} maxWidth="lg">
								<Typography variant="h6" sx={{ mb: 2 }}>
									Core Colors
								</Typography>

								<Grid container spacing={2}>
									{coreColors.map((colorGroup) => (
										<Grid size={{ xs: 3 }} key={colorGroup.type}>
											<Box
												sx={{
													borderRadius: 2,
													justifyContent: "between",
												}}>
												<Typography
													variant="subtitle1"
													sx={{ mb: 1 }}>
													{colorGroup.type}
												</Typography>
												{colorGroup.colors.map((color) => (
													<Box
														key={color.name}
														sx={{
															backgroundColor: color.bg,
															color: color.color,
															p: 1,
															cursor: "pointer",
															textAlign: "left",
															height: "3rem",
														}}
														onClick={() =>
															navigator.clipboard.writeText(
																color.bg
															)
														}>
														<Typography
															variant="body2"
															color={color.color}>
															{color.name}
														</Typography>
													</Box>
												))}
											</Box>
										</Grid>
									))}
								</Grid>
							</Container>

							{/* Row 2: Fixed Colors */}
							<Container sx={{ mb: 4 }} maxWidth="lg">
								<Typography variant="h6" sx={{ mb: 2 }}>
									Fixed Colors
								</Typography>
								<Grid container spacing={4} columnSpacing={6}>
									{fixedColors.map((colorGroup) => (
										<Grid key={colorGroup.type} size={{ xs: 4 }}>
											<Typography variant="body2" sx={{ mb: 1 }}>
												{colorGroup.type}
											</Typography>

											{/* First row - split left/right */}
											<Box
												sx={{
													display: "flex",
													height: "4.854rem",
												}}>
												<Box
													sx={{
														flex: 1,
														backgroundColor:
															colorGroup.colors[0].bg,
														color: colorGroup.colors[0].color,
														p: 1,
														cursor: "pointer",
														textAlign: "start",
														alignContent: "flex-end",
													}}
													onClick={() =>
														navigator.clipboard.writeText(
															colorGroup.colors[0].bg
														)
													}
													justifyContent="flex-end">
													<Typography
														variant="body2"
														color={colorGroup.colors[0].color}>
														{colorGroup.colors[0].name}
													</Typography>
												</Box>
												<Box
													sx={{
														flex: 1,
														backgroundColor:
															colorGroup.colors[1].bg,
														color: colorGroup.colors[1].color,
														p: 1,
														textAlign: "start",
														alignContent: "flex-end",
													}}
													onClick={() =>
														navigator.clipboard.writeText(
															colorGroup.colors[1].bg
														)
													}>
													<Typography
														variant="body2"
														color={colorGroup.colors[1].color}>
														{colorGroup.colors[1].name}
													</Typography>
												</Box>
											</Box>

											{/* Second and third rows - full width */}
											{colorGroup.colors.slice(2).map((color) => (
												<Box
													key={color.name}
													sx={{
														backgroundColor: color.bg,
														color: color.color,
														cursor: "pointer",
														textAlign: "left",
														height: "3rem",
														display: "flex",
														alignItems: "center",
														justifyContent: "center",
														alignContent: "flex-end",
													}}
													onClick={() =>
														navigator.clipboard.writeText(
															color.bg
														)
													}>
													<Typography
														variant="body2"
														color={color.color}>
														{color.name}
													</Typography>
												</Box>
											))}
										</Grid>
									))}
								</Grid>
							</Container>

							{/* Row 3: Surface Colors */}
							<Container
								maxWidth="lg"
								sx={{ justifyContent: "between" }}>
								<Typography variant="h6" sx={{ mb: 2 }}>
									Surface Colors
								</Typography>
								<Box
									sx={{
										display: "flex",
										gap: 1,
										alignItems: "stretch",
									}}>
									{/* Left section - 75% width */}
									<Box sx={{ flex: 3 }}>
										{surfaceColors.main.map((row, rowIndex) => (
											<Box
												key={rowIndex}
												sx={{
													display: "flex",
													mb: rowIndex < 2 ? 1 : 0,
												}}>
												{row.map((color) => (
													<Box
														key={color.name}
														sx={{
															flex: 1,
															backgroundColor: color.bg,
															color: color.color,
															cursor: "pointer",
															textAlign: "left",
															height: "4.854rem",
															display: "flex",
															alignItems: "center",
															justifyContent: "flex-start",
															p: 1,
															border:
																"1px solid rgba(0,0,0,0.035)",
															"&:hover": {
																transform: "scale(1.02)",
															},
														}}
														onClick={() =>
															navigator.clipboard.writeText(
																color.bg
															)
														}>
														<Typography
															variant="body2"
															color={color.color}>
															{color.name}
														</Typography>
													</Box>
												))}
											</Box>
										))}
									</Box>

									{/* Right section - 25% width */}
									<Box sx={{ flex: 1, alignItems: "stretch" }}>
										<Paper
											elevation={3}
											sx={{
												ps: 5,
												borderRadius: 2,
												height: "100%",
												px: 2,
												pt: 1,
											}}>
											{surfaceColors.inverse
												.slice(0, 3)
												.map((color) => (
													<Box
														key={color.name}
														sx={{
															backgroundColor: color.bg,
															color: color.color,
															p: 1,
															mb: 1,
															height: "3rem",
															cursor: "pointer",
															textAlign: "left",
															display: "flex",
															justifyContent: "flex-start",
															alignItems: "flex-end",
														}}
														onClick={() =>
															navigator.clipboard.writeText(
																color.bg
															)
														}>
														<Typography
															variant="body2"
															color={color.color}>
															{color.name}
														</Typography>
													</Box>
												))}

											{/* Last row - split 50/50 */}
											<Grid
												container
												columnSpacing={1}
												sx={{ alignItems: "stretch" }}>
												{surfaceColors.inverse[3].map((color) => (
													<Grid size="grow" key={color.name}>
														<Box
															sx={{
																backgroundColor: color.bg,
																color: color.color,
																cursor: "pointer",
																textAlign: "left",
																p: 1,
																height: "4rem",
															}}
															onClick={() =>
																navigator.clipboard.writeText(
																	color.bg
																)
															}>
															<Typography
																variant="body2"
																color={color.color}>
																{color.name}
															</Typography>
														</Box>
													</Grid>
												))}
											</Grid>
										</Paper>
									</Box>
								</Box>
							</Container>
						</Box>
					</Grid>
				</Grid>
			</Paper>

			{/* Light Theme LKV Variables */}
			<Container maxWidth="lg" sx={{ justifyContent: "between" }}>
				<Typography
					variant="h6"
					sx={{
						mb: 2,
					}}>
					Light Theme Variables (_lkv)
				</Typography>
				<Grid
					container
					spacing={2}
					sx={{
						justifyContent: "center",
						alignItems: "center",
						textAlign: "center",
					}}>
					{lkvVariables.map((variable) => (
						<Grid size="auto" key={variable.name}>
							<Paper
								elevation={1}
								sx={{
									display: "flex",
									flexDirection: "row",
									p: 2,
									pl: 3,
									backgroundColor: "white",
									borderRadius: 3,
									cursor: "pointer",
									transition: "transform 0.2s ease",
									justifyContent: "flex-start",
									alignItems: "center",
									height: "7rem",
									width: "21.25rem",
									"&:hover": {
										transform: "translateY(-2px)",
										boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
									},
								}}
								onClick={() =>
									navigator.clipboard.writeText(variable.var)
								}>
								<Box
									sx={{
										height: "3rem",
										width: "3rem",
										backgroundColor: variable.color,
										borderRadius: 2,
										mb: 1.5,
										mr: 2,
										border: "1px solid rgba(0,0,0,0.35)",
									}}
								/>
								<Box sx={{ display: "flex", flexDirection: "column" }}>
									<Typography variant="body2" sx={{ mb: 0.5 }}>
										{variable.name}
									</Typography>
									<Typography variant="subtitle2">
										{variable.var}
									</Typography>
								</Box>
							</Paper>
						</Grid>
					))}
				</Grid>
			</Container>
		</Box>
	);
};

export default MaterialDesign3Palette;
