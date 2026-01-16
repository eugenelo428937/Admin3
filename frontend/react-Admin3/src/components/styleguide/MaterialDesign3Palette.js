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
import palettes from "../../theme/colors/palettesTheme.js";

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
               bg: palettes.light.primary,
               color: palettes.light.onPrimary,
            },
            {
               name: "On Primary",
               bg: palettes.light.onPrimary,
               color: palettes.light.primary,
            },
            {
               name: "Primary Container",
               bg: palettes.light.primaryContainer,
               color: palettes.light.onPrimaryContainer,
            },
            {
               name: "On Primary Container",
               bg: palettes.light.onPrimaryContainer,
               color: palettes.light.primaryContainer,
            },
         ],
      },
      {
         type: "Secondary",
         colors: [
            {
               name: "Secondary",
               bg: palettes.light.secondary,
               color: palettes.light.onSecondary,
            },
            {
               name: "On Secondary",
               bg: palettes.light.onSecondary,
               color: palettes.light.secondary,
            },
            {
               name: "Secondary Container",
               bg: palettes.light.secondaryContainer,
               color: palettes.light.onSecondaryContainer,
            },
            {
               name: "On Secondary Container",
               bg: palettes.light.onSecondaryContainer,
               color: palettes.light.secondaryContainer,
            },
         ],
      },
      {
         type: "Tertiary",
         colors: [
            {
               name: "Tertiary",
               bg: palettes.light.tertiary,
               color: palettes.light.onTertiary,
            },
            {
               name: "On Tertiary",
               bg: palettes.light.onTertiary,
               color: palettes.light.tertiary,
            },
            {
               name: "Tertiary Container",
               bg: palettes.light.tertiaryContainer,
               color: palettes.light.onTertiaryContainer,
            },
            {
               name: "On Tertiary Container",
               bg: palettes.light.onTertiaryContainer,
               color: palettes.light.tertiaryContainer,
            },
         ],
      },
      {
         type: "Error",
         colors: [
            {
               name: "Error",
               bg: palettes.light.error,
               color: palettes.light.onError,
            },
            {
               name: "On Error",
               bg: palettes.light.onError,
               color: palettes.light.error,
            },
            {
               name: "Error Container",
               bg: palettes.light.errorContainer,
               color: palettes.light.onErrorContainer,
            },
            {
               name: "On Error Container",
               bg: palettes.light.onErrorContainer,
               color: palettes.light.errorContainer,
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
               bg: palettes.light.primaryFixed,
               color: palettes.light.onPrimaryFixed,
               position: "left",
            },
            {
               name: "Primary Fixed Dim",
               bg: palettes.light.primaryFixedDim,
               color: palettes.light.onPrimaryFixedVariant,
               position: "right",
            },
            {
               name: "On Primary Fixed",
               bg: palettes.light.onPrimaryFixed,
               color: palettes.light.primaryFixed,
               position: "full",
            },
            {
               name: "On Primary Fixed Variant",
               bg: palettes.light.onPrimaryFixedVariant,
               color: palettes.light.primaryFixed,
               position: "full",
            },
         ],
      },
      {
         type: "Secondary Fixed",
         colors: [
            {
               name: "Secondary Fixed",
               bg: palettes.light.onSecondaryFixed,
               color: palettes.light.onSecondary,
               position: "left",
            },
            {
               name: "Secondary Fixed Dim",
               bg: palettes.light.secondaryFixedDim,
               color: palettes.light.onSecondaryFixedVariant,
               position: "right",
            },
            {
               name: "On Secondary Fixed",
               bg: palettes.light.onSecondaryFixed,
               color: palettes.light.secondaryFixed,
               position: "full",
            },
            {
               name: "On Secondary Fixed Variant",
               bg: palettes.light.onSecondaryFixedVariant,
               color: palettes.light.secondaryFixed,
               position: "full",
            },
         ],
      },
      {
         type: "Tertiary Fixed",
         colors: [
            {
               name: "Tertiary Fixed",
               bg: palettes.light.tertiaryFixed,
               color: palettes.light.onTertiaryFixed,
               position: "left",
            },
            {
               name: "Tertiary Fixed Dim",
               bg: palettes.light.tertiaryFixedDim,
               color: palettes.light.onTertiaryFixedVariant,
               position: "right",
            },
            {
               name: "On Tertiary Fixed",
               bg: palettes.light.onTertiaryFixed,
               color: palettes.light.tertiaryFixed,
               position: "full",
            },
            {
               name: "On Tertiary Fixed Variant",
               bg: palettes.light.onTertiaryFixedVariant,
               color: palettes.light.tertiaryFixed,
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
               bg: palettes.light.surfaceDim,
               color: palettes.light.onSurface,
            },
            {
               name: "Surface",
               bg: palettes.light.surface,
               color: palettes.light.onSurface,
            },
            {
               name: "Surface Bright",
               bg: palettes.light.surfaceBright,
               color: palettes.light.onSurface,
            },
         ],
         // Row 2: Surface containers
         [
            {
               name: "Surface Container Lowest",
               bg: palettes.light.surfaceContainerLowest,
               color: palettes.light.onSurface,
            },
            {
               name: "Surface Container Low",
               bg: palettes.light.surfaceContainerLow,
               color: palettes.light.onSurface,
            },
            {
               name: "Surface Container",
               bg: palettes.light.surfaceContainer,
               color: palettes.light.onSurface,
            },
            {
               name: "Surface Container High",
               bg: palettes.light.surfaceContainerHigh,
               color: palettes.light.onSurface,
            },
            {
               name: "Surface Container Highest",
               bg: palettes.light.surfaceContainerHighest,
               color: palettes.light.onSurface,
            },
         ],
         // Row 3: On surface
         [
            {
               name: "On Surface",
               bg: palettes.light.onSurface,
               color: palettes.light.surface,
            },
            {
               name: "On Surface Variant",
               bg: "var(--md-sys-color-on-surface-variant_lkv)",
               color: "var(--md-sys-color-surface-variant_lkv)",
            },
            {
               name: "Outline",
               bg: "var(--md-sys-color-outline_lkv)",
               color: palettes.light.surface,
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

   return (
      <Box>
         {/* Header */}
         <Box sx={{ textAlign: "center", mb: 2, pt: 3 }}>
            <Typography
               variant="h4"
               sx={{ fontWeight: 600, mb: 1.5, color: "#1f1f1f" }}
            >
               Color Palette
            </Typography>
            <Typography variant="body1" sx={{ color: "#5f6368", mb: 1 }}>
               Complete color system combining BPP Colors and Material Design 3
            </Typography>
            <Typography
               variant="subtitle1"
               sx={{ color: "#666", fontStyle: "italic" }}
            >
               BPP Color System bars + MD3 key colors on different surfaces
            </Typography>
         </Box>

         {/* BPP Color System Bars */}
         <Paper sx={{ mb: 2 }}>
            <Grid container spacing={0} sx={{ justifyContent: "center" }}>
               <Grid size={{ xs: 12, lg: 7 }} sx={{ p: 1 }}>
                  <Typography variant="h5" sx={{ mb: 3 }}>
                     BPP Tonal palettes
                  </Typography>

                  <Grid container spacing={2} sx={{ justifyContent: "center" }}>
                     {/* Left Column - First 3 families */}
                     <Grid spacing={1} size="auto">
                        {bppColorFamilies.slice(0, 3).map((family) => (
                           <Box key={family.name} sx={{ mb: 3 }} width="25rem">
                              <Paper
                                 elevation={2}
                                 sx={{ borderRadius: 3, overflow: "hidden" }}
                              >
                                 {/* Family Header */}
                                 <Box
                                    sx={{
                                       display: "flex",
                                       alignItems: "center",
                                       p: 2,
                                       backgroundColor: "#f8f9fa",
                                       borderBottom: "1px solid #e9ecef",
                                    }}
                                 >
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
                                       }}
                                    >
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
                                             }}
                                          >
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
                                       }}
                                    >
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
                     <Grid spacing={1} size="auto">
                        {bppColorFamilies.slice(3, 6).map((family) => (
                           <Box key={family.name} sx={{ mb: 3 }} width="25rem">
                              <Paper
                                 elevation={2}
                                 sx={{ borderRadius: 3, overflow: "hidden" }}
                              >
                                 {/* Family Header */}
                                 <Box
                                    sx={{
                                       display: "flex",
                                       alignItems: "center",
                                       p: 2,
                                       backgroundColor: "#f8f9fa",
                                       borderBottom: "1px solid #e9ecef",
                                    }}
                                 >
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
                                       }}
                                    >
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
                                             }}
                                          >
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
                                       }}
                                    >
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
               <Grid size={{ xs: 12, lg: 5 }} sx={{ p: 2 }}>
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

                        <Grid container spacing={1}>
                           {coreColors.map((colorGroup) => (
                              <Grid size={{ xs: 3 }} key={colorGroup.type}>
                                 <Box
                                    sx={{
                                       borderRadius: 2,
                                       justifyContent: "between",
                                    }}
                                 >
                                    <Typography
                                       variant="subtitle1"
                                       sx={{ mb: 1 }}
                                    >
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
                                          }
                                       >
                                          <Typography
                                             variant="body2"
                                             color={color.color}
                                          >
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
                                    }}
                                 >
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
                                       justifyContent="flex-end"
                                    >
                                       <Typography
                                          variant="body2"
                                          color={colorGroup.colors[0].color}
                                       >
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
                                       }
                                    >
                                       <Typography
                                          variant="body2"
                                          color={colorGroup.colors[1].color}
                                       >
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
                                       }
                                    >
                                       <Typography
                                          variant="body2"
                                          color={color.color}
                                       >
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
                        sx={{ justifyContent: "between", height: "100%", }}
                     >
                        <Typography variant="h6" sx={{ mb: 2 }}>
                           Surface Colors
                        </Typography>
                        <Box
                           sx={{
                              display: "flex",
                              gap: 1,
                              alignItems: "stretch",
                           }}
                        >
                           {/* Left section - 75% width */}
                           <Box sx={{ flex: 3 }}>
                              {surfaceColors.main.map((row, rowIndex) => (
                                 <Box
                                    key={rowIndex}
                                    sx={{
                                       display: "flex",                                       
                                    }}
                                 >
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
                                          }
                                       >
                                          <Typography
                                             variant="body2"
                                             color={color.color}
                                          >
                                             {color.name}
                                          </Typography>
                                       </Box>
                                    ))}
                                 </Box>
                              ))}
                           </Box>

                           {/* Right section - 25% width */}
                           <Box sx={{ flex: 1, alignItems: "stretch", height: "100%" }}>
                              <Paper
                                 elevation={0}
                                 sx={{
                                    ps: 5,
                                    borderRadius: 2,
                                    height: "100%",
                                 }}
                              >
                                 {surfaceColors.inverse
                                    .slice(0, 3)
                                    .map((color) => (
                                       <Box
                                          key={color.name}
                                          sx={{
                                             backgroundColor: color.bg,
                                             color: color.color,
                                             p: 1,                                             
                                             height: "3.55rem",
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
                                          }
                                       >
                                          <Typography
                                             variant="body2"
                                             color={color.color}
                                          >
                                             {color.name}
                                          </Typography>
                                       </Box>
                                    ))}

                                 {/* Last row - split 50/50 */}
                                 <Grid
                                    container
                                    columnSpacing={0}
                                    sx={{ alignItems: "stretch" }}
                                 >
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
                                             }
                                          >
                                             <Typography
                                                variant="body2"
                                                color={color.color}
                                             >
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
      </Box>
   );
};

export default MaterialDesign3Palette;
