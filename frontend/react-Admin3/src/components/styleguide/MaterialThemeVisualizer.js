import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
   // Layout
   Container,
   Box,
   Typography,
   Paper,
   Grid,
   Divider,
   Card,
   CardHeader,
   CardContent,
   CardActions,
   Stack,
   ThemeProvider,
   createTheme,
   // Form Controls - Group 1
   Checkbox,
   FormControlLabel,
   FormGroup,
   RadioGroup,
   Radio,
   FormControl,
   FormLabel,
   InputLabel,
   Select,
   MenuItem,
   TextField,
   ToggleButton,
   ToggleButtonGroup,
   // Buttons & Indicators - Group 2
   Button,
   IconButton,
   Fab,
   Badge,
   Chip,
   Avatar,
   Tooltip,
   Switch,
   // Feedback - Group 3
   Alert,
   AlertTitle,
   Dialog,
   DialogTitle,
   DialogContent,
   DialogContentText,
   DialogActions,
   LinearProgress,
   CircularProgress,
   Snackbar,
   // Navigation & Layout - Group 4
   Accordion,
   AccordionSummary,
   AccordionDetails,
   AppBar,
   Toolbar,
   Breadcrumbs,
   Link,
   Menu,
   Pagination,
   SpeedDial,
   SpeedDialAction,
   SpeedDialIcon,
   Stepper,
   Step,
   StepLabel,
   Tabs,
   Tab,
} from "@mui/material";

// Icons
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import FavoriteIcon from "@mui/icons-material/Favorite";
import ShareIcon from "@mui/icons-material/Share";
import MailIcon from "@mui/icons-material/Mail";
import NotificationsIcon from "@mui/icons-material/Notifications";
import HomeIcon from "@mui/icons-material/Home";
import SettingsIcon from "@mui/icons-material/Settings";
import SearchIcon from "@mui/icons-material/Search";
import MenuIcon from "@mui/icons-material/Menu";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import FileCopyIcon from "@mui/icons-material/FileCopy";
import SaveIcon from "@mui/icons-material/Save";
import PrintIcon from "@mui/icons-material/Print";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import StarIcon from "@mui/icons-material/Star";
import PersonIcon from "@mui/icons-material/Person";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import RefreshIcon from "@mui/icons-material/Refresh";
import PaletteIcon from "@mui/icons-material/Palette";
import ColorLensIcon from "@mui/icons-material/ColorLens";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import TouchAppIcon from "@mui/icons-material/TouchApp";
import FeedbackIcon from "@mui/icons-material/Feedback";
import ViewQuiltIcon from "@mui/icons-material/ViewQuilt";
import DashboardIcon from "@mui/icons-material/Dashboard";

// Material Color Utilities for dynamic theme generation
import {
   argbFromHex,
   hexFromArgb,
   themeFromSourceColor,
   Hct,
} from "@material/material-color-utilities";

// Import the material theme JSON
import materialTheme from "../../theme/material-theme.json";

// Tonal palette tone values for dynamic generation
const TONE_VALUES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 50, 60, 70, 80, 90, 95, 98, 99, 100];

/**
 * Generate a complete theme from a seed color using Material Color Utilities
 */
const generateThemeFromSeed = (seedColor) => {
   try {
      const sourceColorArgb = argbFromHex(seedColor);
      const theme = themeFromSourceColor(sourceColorArgb);
      return theme;
   } catch (e) {
      console.error("Error generating theme:", e);
      return null;
   }
};

/**
 * Convert Material Color Utilities scheme to hex colors object
 */
const schemeToHexColors = (scheme) => {
   if (!scheme || typeof scheme.toJSON !== "function") return null;
   const result = {};
   for (const [key, value] of Object.entries(scheme.toJSON())) {
      result[key] = hexFromArgb(value);
   }
   return result;
};

/**
 * Generate tonal palettes from dynamic theme
 */
const generateDynamicPalettes = (dynamicTheme) => {
   if (!dynamicTheme || !dynamicTheme.palettes) return null;
   const palettes = dynamicTheme.palettes;
   return {
      primary: Object.fromEntries(
         TONE_VALUES.map((tone) => [String(tone), hexFromArgb(palettes.primary.tone(tone))])
      ),
      secondary: Object.fromEntries(
         TONE_VALUES.map((tone) => [String(tone), hexFromArgb(palettes.secondary.tone(tone))])
      ),
      tertiary: Object.fromEntries(
         TONE_VALUES.map((tone) => [String(tone), hexFromArgb(palettes.tertiary.tone(tone))])
      ),
      neutral: Object.fromEntries(
         TONE_VALUES.map((tone) => [String(tone), hexFromArgb(palettes.neutral.tone(tone))])
      ),
      "neutral-variant": Object.fromEntries(
         TONE_VALUES.map((tone) => [String(tone), hexFromArgb(palettes.neutralVariant.tone(tone))])
      ),
   };
};

/**
 * Map scheme keys (camelCase) to MD3 CSS custom property names
 * e.g., "primaryContainer" -> "--md-sys-color-primary-container"
 */
const schemeKeyToCssVar = (key) => {
   // Convert camelCase to kebab-case
   const kebab = key.replace(/([A-Z])/g, "-$1").toLowerCase();
   return `--md-sys-color-${kebab}`;
};

/**
 * Apply scheme colors as CSS custom properties on the document root
 */
const applyCssCustomProperties = (scheme, targetElement = document.documentElement) => {
   if (!scheme) return;

   Object.entries(scheme).forEach(([key, value]) => {
      const cssVar = schemeKeyToCssVar(key);
      targetElement.style.setProperty(cssVar, value);
   });
};

/**
 * Remove all MD3 CSS custom properties from the target element
 */
const removeCssCustomProperties = (scheme, targetElement = document.documentElement) => {
   if (!scheme) return;

   Object.keys(scheme).forEach((key) => {
      const cssVar = schemeKeyToCssVar(key);
      targetElement.style.removeProperty(cssVar);
   });
};

/**
 * Generate CSS text for export
 */
const generateCssExport = (scheme) => {
   if (!scheme) return "";

   const lines = Object.entries(scheme).map(([key, value]) => {
      const cssVar = schemeKeyToCssVar(key);
      return `  ${cssVar}: ${value};`;
   });

   return `:root {\n${lines.join("\n")}\n}`;
};

const MaterialThemeVisualizer = () => {
   // State for scheme selection
   const [selectedScheme, setSelectedScheme] = useState("light");

   // State for dynamic theme generation
   const [seedColor, setSeedColor] = useState(materialTheme.seed || "#6F358A");
   const [useJsonTheme, setUseJsonTheme] = useState(true);
   const [copiedMessage, setCopiedMessage] = useState("");

   // State for interactive components
   const [checkboxState, setCheckboxState] = useState({
      option1: true,
      option2: false,
      option3: false,
   });
   const [radioValue, setRadioValue] = useState("option1");
   const [selectValue, setSelectValue] = useState("option1");
   const [textValue, setTextValue] = useState("");
   const [toggleValue, setToggleValue] = useState("left");
   const [multiToggle, setMultiToggle] = useState(["bold"]);
   const [switchStates, setSwitchStates] = useState({
      switch1: true,
      switch2: false,
   });
   const [numberValue, setNumberValue] = useState(1);

   // Dialog state
   const [dialogOpen, setDialogOpen] = useState(false);

   // Menu state
   const [menuAnchor, setMenuAnchor] = useState(null);

   // Snackbar state
   const [snackbarOpen, setSnackbarOpen] = useState(false);

   // Tabs state
   const [tabValue, setTabValue] = useState(0);

   // Accordion state (for demo accordion in Group 4)
   const [expandedAccordion, setExpandedAccordion] = useState("panel1");

   // Stepper state
   const [activeStep, setActiveStep] = useState(1);

   // Section expansion state - all sections expanded by default
   const [expandedSections, setExpandedSections] = useState({
      colorPalettes: true,
      group1: true,
      group2: true,
      group3: true,
      group4: true,
      compositeExamples: true,
   });

   // CSS custom property injection state
   const [cssInjectionEnabled, setCssInjectionEnabled] = useState(false);

   // Handler for section expansion
   const handleSectionToggle = useCallback((section) => {
      setExpandedSections((prev) => ({
         ...prev,
         [section]: !prev[section],
      }));
   }, []);

   // Expand/Collapse all sections
   const handleExpandAll = useCallback(() => {
      setExpandedSections({
         colorPalettes: true,
         group1: true,
         group2: true,
         group3: true,
         group4: true,
         compositeExamples: true,
      });
   }, []);

   const handleCollapseAll = useCallback(() => {
      setExpandedSections({
         colorPalettes: false,
         group1: false,
         group2: false,
         group3: false,
         group4: false,
         compositeExamples: false,
      });
   }, []);

   // Generate dynamic theme from seed color
   const dynamicTheme = useMemo(() => {
      if (useJsonTheme) return null;
      return generateThemeFromSeed(seedColor);
   }, [seedColor, useJsonTheme]);

   // Get current scheme colors (either from JSON or dynamically generated)
   const currentScheme = useMemo(() => {
      if (useJsonTheme) {
         return materialTheme.schemes[selectedScheme] || materialTheme.schemes.light;
      }
      if (!dynamicTheme) return materialTheme.schemes.light;

      // Map scheme selection to dynamic theme
      const isDark = selectedScheme.startsWith("dark");
      const scheme = isDark ? dynamicTheme.schemes.dark : dynamicTheme.schemes.light;
      const hexColors = schemeToHexColors(scheme);
      return hexColors || materialTheme.schemes.light;
   }, [useJsonTheme, selectedScheme, dynamicTheme]);

   // Get tonal palettes (either from JSON or dynamically generated)
   const tonalPalettes = useMemo(() => {
      if (useJsonTheme) {
         return materialTheme.palettes;
      }
      const dynamicPalettes = generateDynamicPalettes(dynamicTheme);
      return dynamicPalettes || materialTheme.palettes;
   }, [useJsonTheme, dynamicTheme]);

   // Apply CSS custom properties when injection is enabled
   useEffect(() => {
      if (cssInjectionEnabled) {
         applyCssCustomProperties(currentScheme);
         console.log("CSS custom properties applied to :root");
      } else {
         removeCssCustomProperties(currentScheme);
         console.log("CSS custom properties removed from :root");
      }

      // Cleanup on unmount
      return () => {
         removeCssCustomProperties(currentScheme);
      };
   }, [cssInjectionEnabled, currentScheme]);

   // Get available schemes
   const schemeOptions = Object.keys(materialTheme.schemes);

   // Handlers for dynamic theme
   const handleSeedColorChange = useCallback((e) => {
      setSeedColor(e.target.value);
      setUseJsonTheme(false);
   }, []);

   const handleResetToJson = useCallback(() => {
      setSeedColor(materialTheme.seed || "#6F358A");
      setUseJsonTheme(true);
   }, []);

   const handleCopyScheme = useCallback(() => {
      navigator.clipboard.writeText(JSON.stringify(currentScheme, null, 2));
      setCopiedMessage("Scheme JSON copied!");
      setTimeout(() => setCopiedMessage(""), 2000);
   }, [currentScheme]);

   const handleCopyFullTheme = useCallback(() => {
      const fullTheme = {
         seed: seedColor,
         schemes: {
            [selectedScheme]: currentScheme,
         },
         palettes: tonalPalettes,
      };
      navigator.clipboard.writeText(JSON.stringify(fullTheme, null, 2));
      setCopiedMessage("Full theme JSON copied!");
      setTimeout(() => setCopiedMessage(""), 2000);
   }, [seedColor, selectedScheme, currentScheme, tonalPalettes]);

   const handleCopyCss = useCallback(() => {
      const cssText = generateCssExport(currentScheme);
      navigator.clipboard.writeText(cssText);
      setCopiedMessage("CSS custom properties copied!");
      setTimeout(() => setCopiedMessage(""), 2000);
   }, [currentScheme]);

   // Helper to determine text color based on background luminance
   const getContrastText = (hexColor) => {
      if (!hexColor || hexColor.startsWith("var(")) return "#000000";
      const hex = hexColor.replace("#", "");
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance > 0.5 ? "#000000" : "#FFFFFF";
   };

   // Section Header Component (now used inside AccordionSummary)
   const SectionHeader = ({ children, icon }) => (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
         {icon}
         <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {children}
         </Typography>
      </Box>
   );

   // Collapsible Section Wrapper Component
   const CollapsibleSection = ({ id, title, icon, children }) => (
      <Accordion
         expanded={expandedSections[id]}
         onChange={() => handleSectionToggle(id)}
         sx={{
            mb: 2,
            backgroundColor: currentScheme.surface,
            "&:before": { display: "none" },
            borderRadius: "8px !important",
            overflow: "hidden",
         }}
         elevation={2}
      >
         <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            sx={{
               backgroundColor: currentScheme.surfaceContainerLow,
               borderBottom: expandedSections[id] ? `1px solid ${currentScheme.outlineVariant}` : "none",
               "& .MuiAccordionSummary-content": { my: 1.5 },
            }}
         >
            <SectionHeader icon={icon}>{title}</SectionHeader>
         </AccordionSummary>
         <AccordionDetails sx={{ p: 3 }}>
            {children}
         </AccordionDetails>
      </Accordion>
   );

   // Subsection Header Component
   const SubsectionHeader = ({ children }) => (
      <Typography variant="h6" sx={{ fontWeight: 500, mb: 2, mt: 3 }}>
         {children}
      </Typography>
   );

   // Color Swatch Component
   const ColorSwatch = ({ name, color, textColor }) => (
      <Box
         sx={{
            backgroundColor: color,
            color: textColor || getContrastText(color),
            p: 1.5,
            minHeight: "3.5rem",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            cursor: "pointer",
            transition: "transform 0.2s",
            "&:hover": {
               transform: "scale(1.02)",
               zIndex: 1,
            },
         }}
         onClick={() => navigator.clipboard.writeText(color)}
         title={`Click to copy: ${color}`}
      >
         <Typography variant="caption" sx={{ fontWeight: 500 }}>
            {name}
         </Typography>
         <Typography variant="caption" sx={{ opacity: 0.8, fontSize: "0.65rem" }}>
            {color}
         </Typography>
      </Box>
   );

   // Component Showcase Card
   const ShowcaseCard = ({ title, children }) => (
      <Card sx={{ mb: 2 }}>
         <CardHeader
            title={title}
            titleTypographyProps={{ variant: "subtitle1", fontWeight: 600 }}
            sx={{ pb: 1, backgroundColor: currentScheme.surfaceContainerLow }}
         />
         <CardContent>{children}</CardContent>
      </Card>
   );

   return (
      <Box sx={{ backgroundColor: currentScheme.background, minHeight: "100vh", pb: 6 }}>
         <Container maxWidth="xl">
            {/* Header */}
            <Box sx={{ pt: 4, pb: 3 }}>
               <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                  Material Theme Visualizer
               </Typography>
               <Typography variant="body1" sx={{ color: currentScheme.onSurfaceVariant, mb: 3 }}>
                  Visualize and customize Material Design 3 color schemes using @material/material-color-utilities
               </Typography>

               {/* Theme Controls */}
               <Paper
                  elevation={2}
                  sx={{
                     p: 3,
                     backgroundColor: currentScheme.surfaceContainerLow,
                     borderRadius: 2,
                  }}
               >
                  <Stack
                     direction={{ xs: "column", md: "row" }}
                     spacing={3}
                     alignItems={{ xs: "stretch", md: "center" }}
                     flexWrap="wrap"
                     useFlexGap
                  >
                     {/* Seed Color Picker */}
                     <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <PaletteIcon sx={{ color: currentScheme.primary }} />
                        <Typography variant="subtitle2" sx={{ color: currentScheme.onSurface }}>
                           Seed Color:
                        </Typography>
                        <Tooltip title="Pick a color to generate a new theme" arrow>
                           <input
                              type="color"
                              value={seedColor}
                              onChange={handleSeedColorChange}
                              style={{
                                 width: 50,
                                 height: 36,
                                 border: "none",
                                 borderRadius: 8,
                                 cursor: "pointer",
                                 boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                              }}
                           />
                        </Tooltip>
                        <Typography
                           variant="body2"
                           sx={{
                              fontFamily: "monospace",
                              color: currentScheme.onSurfaceVariant,
                              backgroundColor: currentScheme.surfaceContainer,
                              px: 1,
                              py: 0.5,
                              borderRadius: 1,
                           }}
                        >
                           {seedColor.toUpperCase()}
                        </Typography>
                     </Box>

                     {/* Scheme Selector */}
                     <FormControl size="small" sx={{ minWidth: 220 }}>
                        <InputLabel>Color Scheme</InputLabel>
                        <Select
                           value={selectedScheme}
                           label="Color Scheme"
                           onChange={(e) => setSelectedScheme(e.target.value)}
                        >
                           {schemeOptions.map((scheme) => (
                              <MenuItem key={scheme} value={scheme}>
                                 {scheme.split("-").map(word =>
                                    word.charAt(0).toUpperCase() + word.slice(1)
                                 ).join(" ")}
                              </MenuItem>
                           ))}
                        </Select>
                     </FormControl>

                     {/* Source Toggle */}
                     <FormControlLabel
                        control={
                           <Switch
                              checked={useJsonTheme}
                              onChange={(e) => setUseJsonTheme(e.target.checked)}
                              color="primary"
                           />
                        }
                        label={
                           <Typography variant="body2" sx={{ color: currentScheme.onSurface }}>
                              Use material-theme.json
                           </Typography>
                        }
                     />

                     {/* Action Buttons */}
                     <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Tooltip title="Reset to JSON theme" arrow>
                           <Button
                              variant="outlined"
                              size="small"
                              onClick={handleResetToJson}
                              startIcon={<RefreshIcon />}
                           >
                              Reset
                           </Button>
                        </Tooltip>
                        <Tooltip title="Copy current scheme as JSON" arrow>
                           <Button
                              variant="outlined"
                              size="small"
                              onClick={handleCopyScheme}
                              startIcon={<ContentCopyIcon />}
                           >
                              Copy Scheme
                           </Button>
                        </Tooltip>
                        <Tooltip title="Copy full theme with palettes" arrow>
                           <Button
                              variant="outlined"
                              size="small"
                              onClick={handleCopyFullTheme}
                              startIcon={<ContentCopyIcon />}
                           >
                              Copy Full Theme
                           </Button>
                        </Tooltip>
                        <Tooltip title="Copy CSS custom properties (:root variables)" arrow>
                           <Button
                              variant="contained"
                              size="small"
                              onClick={handleCopyCss}
                              startIcon={<ContentCopyIcon />}
                              color="secondary"
                           >
                              Copy CSS
                           </Button>
                        </Tooltip>
                     </Stack>

                     {/* CSS Injection Toggle */}
                     <FormControlLabel
                        control={
                           <Switch
                              checked={cssInjectionEnabled}
                              onChange={(e) => setCssInjectionEnabled(e.target.checked)}
                              color="secondary"
                           />
                        }
                        label={
                           <Typography variant="body2" sx={{ color: currentScheme.onSurface }}>
                              Apply to :root (live)
                           </Typography>
                        }
                     />
                  </Stack>

                  {/* Status indicator */}
                  <Box sx={{ mt: 2, display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                     <Chip
                        label={useJsonTheme ? "Using JSON Theme" : "Using Dynamic Theme"}
                        color={useJsonTheme ? "default" : "primary"}
                        size="small"
                        variant="outlined"
                     />
                     {!useJsonTheme && (
                        <Chip
                           label="Generated from seed color"
                           color="secondary"
                           size="small"
                           variant="outlined"
                        />
                     )}
                     {cssInjectionEnabled && (
                        <Chip
                           label="CSS vars active on :root"
                           color="success"
                           size="small"
                           variant="filled"
                        />
                     )}
                     {copiedMessage && (
                        <Chip
                           label={copiedMessage}
                           color="success"
                           size="small"
                        />
                     )}
                     <Box sx={{ flexGrow: 1 }} />
                     {/* Expand/Collapse All Buttons */}
                     <Button
                        variant="text"
                        size="small"
                        onClick={handleExpandAll}
                        sx={{ minWidth: "auto" }}
                     >
                        Expand All
                     </Button>
                     <Button
                        variant="text"
                        size="small"
                        onClick={handleCollapseAll}
                        sx={{ minWidth: "auto" }}
                     >
                        Collapse All
                     </Button>
                  </Box>
               </Paper>
            </Box>

            {/* ============================================ */}
            {/* COLOR PALETTES SECTION */}
            {/* ============================================ */}
            <CollapsibleSection
               id="colorPalettes"
               title="Color Palettes"
               icon={<ColorLensIcon sx={{ color: currentScheme.primary }} />}
            >
               {/* Tonal Palettes */}
               <SubsectionHeader>Tonal Palettes</SubsectionHeader>
               <Grid container spacing={2}>
                  {Object.entries(tonalPalettes).map(([paletteName, tones]) => (
                     <Grid size={12} key={paletteName}>
                        <Paper elevation={1} sx={{ overflow: "hidden", borderRadius: 2 }}>
                           <Box
                              sx={{
                                 p: 1.5,
                                 backgroundColor: currentScheme.surfaceContainerLow,
                                 borderBottom: "1px solid",
                                 borderColor: currentScheme.outlineVariant,
                              }}
                           >
                              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                 {paletteName.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                              </Typography>
                           </Box>
                           <Box sx={{ display: "flex" }}>
                              {Object.entries(tones).map(([tone, color]) => (
                                 <Box
                                    key={tone}
                                    sx={{
                                       flex: 1,
                                       backgroundColor: color,
                                       height: 48,
                                       display: "flex",
                                       alignItems: "center",
                                       justifyContent: "center",
                                       cursor: "pointer",
                                       transition: "transform 0.2s",
                                       "&:hover": {
                                          transform: "scaleY(1.2)",
                                          zIndex: 1,
                                       },
                                    }}
                                    onClick={() => navigator.clipboard.writeText(color)}
                                    title={`${tone}: ${color}`}
                                 >
                                    <Typography
                                       variant="caption"
                                       sx={{
                                          color: getContrastText(color),
                                          fontSize: "0.6rem",
                                          fontWeight: 500,
                                       }}
                                    >
                                       {tone}
                                    </Typography>
                                 </Box>
                              ))}
                           </Box>
                        </Paper>
                     </Grid>
                  ))}
               </Grid>

               {/* Key Colors Grid */}
               <SubsectionHeader>Key Colors</SubsectionHeader>
               <Grid container spacing={1}>
                  {/* Primary */}
                  <Grid size={{ xs: 6, md: 3 }}>
                     <Paper elevation={1} sx={{ overflow: "hidden", borderRadius: 2 }}>
                        <Typography variant="caption" sx={{ p: 1, display: "block", fontWeight: 600 }}>
                           Primary
                        </Typography>
                        <ColorSwatch name="Primary" color={currentScheme.primary} textColor={currentScheme.onPrimary} />
                        <ColorSwatch name="On Primary" color={currentScheme.onPrimary} textColor={currentScheme.primary} />
                        <ColorSwatch name="Primary Container" color={currentScheme.primaryContainer} textColor={currentScheme.onPrimaryContainer} />
                        <ColorSwatch name="On Primary Container" color={currentScheme.onPrimaryContainer} textColor={currentScheme.primaryContainer} />
                     </Paper>
                  </Grid>

                  {/* Secondary */}
                  <Grid size={{ xs: 6, md: 3 }}>
                     <Paper elevation={1} sx={{ overflow: "hidden", borderRadius: 2 }}>
                        <Typography variant="caption" sx={{ p: 1, display: "block", fontWeight: 600 }}>
                           Secondary
                        </Typography>
                        <ColorSwatch name="Secondary" color={currentScheme.secondary} textColor={currentScheme.onSecondary} />
                        <ColorSwatch name="On Secondary" color={currentScheme.onSecondary} textColor={currentScheme.secondary} />
                        <ColorSwatch name="Secondary Container" color={currentScheme.secondaryContainer} textColor={currentScheme.onSecondaryContainer} />
                        <ColorSwatch name="On Secondary Container" color={currentScheme.onSecondaryContainer} textColor={currentScheme.secondaryContainer} />
                     </Paper>
                  </Grid>

                  {/* Tertiary */}
                  <Grid size={{ xs: 6, md: 3 }}>
                     <Paper elevation={1} sx={{ overflow: "hidden", borderRadius: 2 }}>
                        <Typography variant="caption" sx={{ p: 1, display: "block", fontWeight: 600 }}>
                           Tertiary
                        </Typography>
                        <ColorSwatch name="Tertiary" color={currentScheme.tertiary} textColor={currentScheme.onTertiary} />
                        <ColorSwatch name="On Tertiary" color={currentScheme.onTertiary} textColor={currentScheme.tertiary} />
                        <ColorSwatch name="Tertiary Container" color={currentScheme.tertiaryContainer} textColor={currentScheme.onTertiaryContainer} />
                        <ColorSwatch name="On Tertiary Container" color={currentScheme.onTertiaryContainer} textColor={currentScheme.tertiaryContainer} />
                     </Paper>
                  </Grid>

                  {/* Error */}
                  <Grid size={{ xs: 6, md: 3 }}>
                     <Paper elevation={1} sx={{ overflow: "hidden", borderRadius: 2 }}>
                        <Typography variant="caption" sx={{ p: 1, display: "block", fontWeight: 600 }}>
                           Error
                        </Typography>
                        <ColorSwatch name="Error" color={currentScheme.error} textColor={currentScheme.onError} />
                        <ColorSwatch name="On Error" color={currentScheme.onError} textColor={currentScheme.error} />
                        <ColorSwatch name="Error Container" color={currentScheme.errorContainer} textColor={currentScheme.onErrorContainer} />
                        <ColorSwatch name="On Error Container" color={currentScheme.onErrorContainer} textColor={currentScheme.errorContainer} />
                     </Paper>
                  </Grid>
               </Grid>

               {/* Surface Colors */}
               <SubsectionHeader>Surface Colors</SubsectionHeader>
               <Grid container spacing={1}>
                  <Grid size={12}>
                     <Paper elevation={1} sx={{ overflow: "hidden", borderRadius: 2 }}>
                        <Box sx={{ display: "flex" }}>
                           <ColorSwatch name="Surface Dim" color={currentScheme.surfaceDim} />
                           <ColorSwatch name="Surface" color={currentScheme.surface} />
                           <ColorSwatch name="Surface Bright" color={currentScheme.surfaceBright} />
                        </Box>
                        <Box sx={{ display: "flex" }}>
                           <ColorSwatch name="Container Lowest" color={currentScheme.surfaceContainerLowest} />
                           <ColorSwatch name="Container Low" color={currentScheme.surfaceContainerLow} />
                           <ColorSwatch name="Container" color={currentScheme.surfaceContainer} />
                           <ColorSwatch name="Container High" color={currentScheme.surfaceContainerHigh} />
                           <ColorSwatch name="Container Highest" color={currentScheme.surfaceContainerHighest} />
                        </Box>
                        <Box sx={{ display: "flex" }}>
                           <ColorSwatch name="On Surface" color={currentScheme.onSurface} />
                           <ColorSwatch name="On Surface Variant" color={currentScheme.onSurfaceVariant} />
                           <ColorSwatch name="Outline" color={currentScheme.outline} />
                           <ColorSwatch name="Outline Variant" color={currentScheme.outlineVariant} />
                        </Box>
                     </Paper>
                  </Grid>
               </Grid>

               {/* Inverse & Special Colors */}
               <SubsectionHeader>Inverse & Special Colors</SubsectionHeader>
               <Grid container spacing={1}>
                  <Grid size={{ xs: 6, md: 3 }}>
                     <Paper elevation={1} sx={{ overflow: "hidden", borderRadius: 2 }}>
                        <ColorSwatch name="Inverse Surface" color={currentScheme.inverseSurface} />
                        <ColorSwatch name="Inverse On Surface" color={currentScheme.inverseOnSurface} />
                        <ColorSwatch name="Inverse Primary" color={currentScheme.inversePrimary} />
                     </Paper>
                  </Grid>
                  <Grid size={{ xs: 6, md: 3 }}>
                     <Paper elevation={1} sx={{ overflow: "hidden", borderRadius: 2 }}>
                        <ColorSwatch name="Scrim" color={currentScheme.scrim} />
                        <ColorSwatch name="Shadow" color={currentScheme.shadow} />
                        <ColorSwatch name="Surface Tint" color={currentScheme.surfaceTint} />
                     </Paper>
                  </Grid>
               </Grid>
            </CollapsibleSection>

            {/* ============================================ */}
            {/* GROUP 1: FORM CONTROLS */}
            {/* ============================================ */}
            <CollapsibleSection
               id="group1"
               title="Group 1: Form Controls"
               icon={<CheckBoxIcon sx={{ color: currentScheme.primary }} />}
            >

               <Grid container spacing={3}>
                  {/* Checkbox */}
                  <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                     <ShowcaseCard title="Checkbox">
                        <FormGroup>
                           <FormControlLabel
                              control={
                                 <Checkbox
                                    checked={checkboxState.option1}
                                    onChange={(e) => setCheckboxState({...checkboxState, option1: e.target.checked})}
                                 />
                              }
                              label="Checked"
                           />
                           <FormControlLabel
                              control={
                                 <Checkbox
                                    checked={checkboxState.option2}
                                    onChange={(e) => setCheckboxState({...checkboxState, option2: e.target.checked})}
                                 />
                              }
                              label="Unchecked"
                           />
                           <FormControlLabel
                              control={<Checkbox indeterminate />}
                              label="Indeterminate"
                           />
                           <FormControlLabel
                              control={<Checkbox disabled />}
                              label="Disabled"
                           />
                           <FormControlLabel
                              control={<Checkbox disabled checked />}
                              label="Disabled Checked"
                           />
                        </FormGroup>
                     </ShowcaseCard>
                  </Grid>

                  {/* Radio Group */}
                  <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                     <ShowcaseCard title="Radio Group">
                        <FormControl>
                           <FormLabel>Select an option</FormLabel>
                           <RadioGroup
                              value={radioValue}
                              onChange={(e) => setRadioValue(e.target.value)}
                           >
                              <FormControlLabel value="option1" control={<Radio />} label="Option 1" />
                              <FormControlLabel value="option2" control={<Radio />} label="Option 2" />
                              <FormControlLabel value="option3" control={<Radio />} label="Option 3" />
                              <FormControlLabel value="option4" control={<Radio />} label="Disabled" disabled />
                           </RadioGroup>
                        </FormControl>
                     </ShowcaseCard>
                  </Grid>

                  {/* Number Field */}
                  <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                     <ShowcaseCard title="Number Field">
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                           <TextField
                              type="number"
                              label="Quantity"
                              value={numberValue}
                              onChange={(e) => setNumberValue(Number(e.target.value))}
                              inputProps={{ min: 0, max: 100 }}
                              size="small"
                           />
                           <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <IconButton
                                 size="small"
                                 onClick={() => setNumberValue(Math.max(0, numberValue - 1))}
                              >
                                 <Typography>-</Typography>
                              </IconButton>
                              <TextField
                                 type="number"
                                 value={numberValue}
                                 onChange={(e) => setNumberValue(Number(e.target.value))}
                                 size="small"
                                 sx={{ width: 80 }}
                                 inputProps={{ style: { textAlign: "center" } }}
                              />
                              <IconButton
                                 size="small"
                                 onClick={() => setNumberValue(numberValue + 1)}
                              >
                                 <Typography>+</Typography>
                              </IconButton>
                           </Box>
                        </Box>
                     </ShowcaseCard>
                  </Grid>

                  {/* Select */}
                  <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                     <ShowcaseCard title="Select">
                        <FormControl fullWidth sx={{ mb: 2 }}>
                           <InputLabel>Standard Select</InputLabel>
                           <Select
                              value={selectValue}
                              label="Standard Select"
                              onChange={(e) => setSelectValue(e.target.value)}
                           >
                              <MenuItem value="option1">Option 1</MenuItem>
                              <MenuItem value="option2">Option 2</MenuItem>
                              <MenuItem value="option3">Option 3</MenuItem>
                              <MenuItem value="option4" disabled>Disabled Option</MenuItem>
                           </Select>
                        </FormControl>
                        <FormControl fullWidth size="small">
                           <InputLabel>Small Select</InputLabel>
                           <Select
                              value={selectValue}
                              label="Small Select"
                              onChange={(e) => setSelectValue(e.target.value)}
                           >
                              <MenuItem value="option1">Option 1</MenuItem>
                              <MenuItem value="option2">Option 2</MenuItem>
                           </Select>
                        </FormControl>
                     </ShowcaseCard>
                  </Grid>

                  {/* TextField Standard */}
                  <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                     <ShowcaseCard title="TextField (Standard)">
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                           <TextField
                              variant="standard"
                              label="Empty"
                              placeholder="Enter text..."
                           />
                           <TextField
                              variant="standard"
                              label="Filled"
                              value={textValue || "Sample text"}
                              onChange={(e) => setTextValue(e.target.value)}
                           />
                           <TextField
                              variant="standard"
                              label="Error"
                              error
                              helperText="This field has an error"
                              defaultValue="Invalid input"
                           />
                           <TextField
                              variant="standard"
                              label="Disabled"
                              disabled
                              defaultValue="Disabled text"
                           />
                        </Box>
                     </ShowcaseCard>
                  </Grid>

                  {/* ToggleButtonGroup */}
                  <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                     <ShowcaseCard title="ToggleButtonGroup">
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                           <Box>
                              <Typography variant="caption" sx={{ mb: 1, display: "block" }}>
                                 Exclusive Selection
                              </Typography>
                              <ToggleButtonGroup
                                 value={toggleValue}
                                 exclusive
                                 onChange={(e, newValue) => newValue && setToggleValue(newValue)}
                                 size="small"
                              >
                                 <ToggleButton value="left">Left</ToggleButton>
                                 <ToggleButton value="center">Center</ToggleButton>
                                 <ToggleButton value="right">Right</ToggleButton>
                              </ToggleButtonGroup>
                           </Box>
                           <Box>
                              <Typography variant="caption" sx={{ mb: 1, display: "block" }}>
                                 Multi Selection
                              </Typography>
                              <ToggleButtonGroup
                                 value={multiToggle}
                                 onChange={(e, newValue) => setMultiToggle(newValue)}
                                 size="small"
                              >
                                 <ToggleButton value="bold"><strong>B</strong></ToggleButton>
                                 <ToggleButton value="italic"><em>I</em></ToggleButton>
                                 <ToggleButton value="underline"><u>U</u></ToggleButton>
                              </ToggleButtonGroup>
                           </Box>
                        </Box>
                     </ShowcaseCard>
                  </Grid>
               </Grid>
            </CollapsibleSection>

            {/* ============================================ */}
            {/* GROUP 2: BUTTONS & INDICATORS */}
            {/* ============================================ */}
            <CollapsibleSection
               id="group2"
               title="Group 2: Buttons & Indicators"
               icon={<TouchAppIcon sx={{ color: currentScheme.primary }} />}
            >

               {/* Buttons */}
               <SubsectionHeader>Button (All Variants × Sizes)</SubsectionHeader>
               <Grid container spacing={2} sx={{ mb: 4 }}>
                  {["contained", "outlined", "text"].map((variant) => (
                     <Grid size={{ xs: 12, md: 4 }} key={variant}>
                        <ShowcaseCard title={`${variant.charAt(0).toUpperCase() + variant.slice(1)}`}>
                           <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                              {["small", "medium", "large"].map((size) => (
                                 <Box key={size} sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                                    <Typography variant="caption" sx={{ width: 60 }}>{size}</Typography>
                                    <Button variant={variant} size={size}>Primary</Button>
                                    <Button variant={variant} size={size} color="secondary">Secondary</Button>
                                    <Button variant={variant} size={size} disabled>Disabled</Button>
                                 </Box>
                              ))}
                           </Box>
                        </ShowcaseCard>
                     </Grid>
                  ))}
               </Grid>

               {/* Icon Buttons */}
               <SubsectionHeader>IconButton (All Colors × Sizes)</SubsectionHeader>
               <ShowcaseCard title="Icon Buttons">
                  <Grid container spacing={2}>
                     {["small", "medium", "large"].map((size) => (
                        <Grid size={12} key={size}>
                           <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                              <Typography variant="caption" sx={{ width: 60 }}>{size}</Typography>
                              <IconButton size={size}><AddIcon /></IconButton>
                              <IconButton size={size} color="primary"><EditIcon /></IconButton>
                              <IconButton size={size} color="secondary"><FavoriteIcon /></IconButton>
                              <IconButton size={size} color="error"><DeleteIcon /></IconButton>
                              <IconButton size={size} disabled><SettingsIcon /></IconButton>
                           </Box>
                        </Grid>
                     ))}
                  </Grid>
               </ShowcaseCard>

               {/* FAB */}
               <SubsectionHeader>Floating Action Button (All Variants)</SubsectionHeader>
               <ShowcaseCard title="FAB">
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}>
                     <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                        <Fab size="small" color="primary"><AddIcon /></Fab>
                        <Typography variant="caption">Small</Typography>
                     </Box>
                     <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                        <Fab size="medium" color="primary"><AddIcon /></Fab>
                        <Typography variant="caption">Medium</Typography>
                     </Box>
                     <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                        <Fab size="large" color="primary"><AddIcon /></Fab>
                        <Typography variant="caption">Large</Typography>
                     </Box>
                     <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                        <Fab variant="extended" color="primary">
                           <AddIcon sx={{ mr: 1 }} />
                           Extended
                        </Fab>
                        <Typography variant="caption">Extended</Typography>
                     </Box>
                     <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                        <Fab color="secondary"><EditIcon /></Fab>
                        <Typography variant="caption">Secondary</Typography>
                     </Box>
                     <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                        <Fab disabled><AddIcon /></Fab>
                        <Typography variant="caption">Disabled</Typography>
                     </Box>
                  </Box>
               </ShowcaseCard>

               {/* Icons with Badge */}
               <SubsectionHeader>Icons & Badges</SubsectionHeader>
               <ShowcaseCard title="Icons with Badges">
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3, alignItems: "center" }}>
                     <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                        <Badge badgeContent={4} color="primary">
                           <MailIcon />
                        </Badge>
                        <Typography variant="caption">Number</Typography>
                     </Box>
                     <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                        <Badge badgeContent={99} color="secondary">
                           <NotificationsIcon />
                        </Badge>
                        <Typography variant="caption">Large Number</Typography>
                     </Box>
                     <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                        <Badge badgeContent={100} max={99} color="error">
                           <ShoppingCartIcon />
                        </Badge>
                        <Typography variant="caption">Max (99+)</Typography>
                     </Box>
                     <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                        <Badge variant="dot" color="primary">
                           <MailIcon />
                        </Badge>
                        <Typography variant="caption">Dot</Typography>
                     </Box>
                     <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                        <Badge variant="dot" color="error">
                           <NotificationsIcon />
                        </Badge>
                        <Typography variant="caption">Dot Error</Typography>
                     </Box>
                     <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                        <Badge badgeContent={0} showZero color="primary">
                           <MailIcon />
                        </Badge>
                        <Typography variant="caption">Show Zero</Typography>
                     </Box>
                  </Box>
               </ShowcaseCard>

               {/* Chips */}
               <SubsectionHeader>Chip (All Variants)</SubsectionHeader>
               <ShowcaseCard title="Chips">
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                     <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                        <Typography variant="caption" sx={{ width: "100%" }}>Filled</Typography>
                        <Chip label="Default" />
                        <Chip label="Primary" color="primary" />
                        <Chip label="Secondary" color="secondary" />
                        <Chip label="Success" color="success" />
                        <Chip label="Error" color="error" />
                        <Chip label="Warning" color="warning" />
                        <Chip label="Info" color="info" />
                     </Box>
                     <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                        <Typography variant="caption" sx={{ width: "100%" }}>Outlined</Typography>
                        <Chip label="Default" variant="outlined" />
                        <Chip label="Primary" color="primary" variant="outlined" />
                        <Chip label="Secondary" color="secondary" variant="outlined" />
                        <Chip label="Success" color="success" variant="outlined" />
                     </Box>
                     <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                        <Typography variant="caption" sx={{ width: "100%" }}>Interactive</Typography>
                        <Chip label="Clickable" onClick={() => {}} />
                        <Chip label="Deletable" onDelete={() => {}} />
                        <Chip label="With Avatar" avatar={<Avatar>M</Avatar>} />
                        <Chip label="With Icon" icon={<FavoriteIcon />} />
                        <Chip label="Disabled" disabled />
                     </Box>
                     <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                        <Typography variant="caption" sx={{ width: "100%" }}>Sizes</Typography>
                        <Chip label="Small" size="small" />
                        <Chip label="Medium" size="medium" />
                     </Box>
                  </Box>
               </ShowcaseCard>

               {/* Tooltip */}
               <SubsectionHeader>Tooltip (All Placements)</SubsectionHeader>
               <ShowcaseCard title="Tooltips">
                  <Box sx={{ display: "flex", justifyContent: "center", gap: 2, py: 4 }}>
                     <Tooltip title="Top" placement="top">
                        <Button variant="outlined">Top</Button>
                     </Tooltip>
                     <Tooltip title="Bottom" placement="bottom">
                        <Button variant="outlined">Bottom</Button>
                     </Tooltip>
                     <Tooltip title="Left" placement="left">
                        <Button variant="outlined">Left</Button>
                     </Tooltip>
                     <Tooltip title="Right" placement="right">
                        <Button variant="outlined">Right</Button>
                     </Tooltip>
                     <Tooltip title="With Arrow" arrow>
                        <Button variant="outlined">Arrow</Button>
                     </Tooltip>
                  </Box>
               </ShowcaseCard>

               {/* Switch */}
               <SubsectionHeader>Switch</SubsectionHeader>
               <ShowcaseCard title="Switch">
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                     <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                        <Typography variant="caption" sx={{ width: 80 }}>Default</Typography>
                        <Switch
                           checked={switchStates.switch1}
                           onChange={(e) => setSwitchStates({...switchStates, switch1: e.target.checked})}
                        />
                        <Switch
                           checked={switchStates.switch2}
                           onChange={(e) => setSwitchStates({...switchStates, switch2: e.target.checked})}
                        />
                     </Box>
                     <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                        <Typography variant="caption" sx={{ width: 80 }}>Colors</Typography>
                        <Switch defaultChecked color="primary" />
                        <Switch defaultChecked color="secondary" />
                        <Switch defaultChecked color="success" />
                        <Switch defaultChecked color="error" />
                        <Switch defaultChecked color="warning" />
                     </Box>
                     <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                        <Typography variant="caption" sx={{ width: 80 }}>Sizes</Typography>
                        <Switch defaultChecked size="small" />
                        <Switch defaultChecked size="medium" />
                     </Box>
                     <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                        <Typography variant="caption" sx={{ width: 80 }}>With Label</Typography>
                        <FormControlLabel control={<Switch defaultChecked />} label="On" />
                        <FormControlLabel control={<Switch />} label="Off" />
                        <FormControlLabel control={<Switch disabled />} label="Disabled" />
                     </Box>
                  </Box>
               </ShowcaseCard>
            </CollapsibleSection>

            {/* ============================================ */}
            {/* GROUP 3: FEEDBACK COMPONENTS */}
            {/* ============================================ */}
            <CollapsibleSection
               id="group3"
               title="Group 3: Feedback Components"
               icon={<FeedbackIcon sx={{ color: currentScheme.primary }} />}
            >

               {/* Alert */}
               <SubsectionHeader>Alert (All Variants × Severities)</SubsectionHeader>
               <Grid container spacing={2}>
                  {["standard", "filled", "outlined"].map((variant) => (
                     <Grid size={{ xs: 12, lg: 4 }} key={variant}>
                        <ShowcaseCard title={`${variant.charAt(0).toUpperCase() + variant.slice(1)}`}>
                           <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                              {["success", "info", "warning", "error"].map((severity) => (
                                 <Alert key={severity} severity={severity} variant={variant}>
                                    {severity.charAt(0).toUpperCase() + severity.slice(1)} alert
                                 </Alert>
                              ))}
                              <Alert severity="info" variant={variant}>
                                 <AlertTitle>With Title</AlertTitle>
                                 This alert has a title
                              </Alert>
                           </Box>
                        </ShowcaseCard>
                     </Grid>
                  ))}
               </Grid>

               {/* Dialog */}
               <SubsectionHeader>Dialog</SubsectionHeader>
               <ShowcaseCard title="Dialog">
                  <Box sx={{ display: "flex", gap: 2 }}>
                     <Button variant="outlined" onClick={() => setDialogOpen(true)}>
                        Open Dialog
                     </Button>
                  </Box>
                  <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
                     <DialogTitle>Sample Dialog</DialogTitle>
                     <DialogContent>
                        <DialogContentText>
                           This is a sample dialog demonstrating the Material Design 3 styling.
                           Dialogs are used to inform users about a specific task and may contain
                           critical information or require decisions.
                        </DialogContentText>
                     </DialogContent>
                     <DialogActions>
                        <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button onClick={() => setDialogOpen(false)} variant="contained">
                           Confirm
                        </Button>
                     </DialogActions>
                  </Dialog>
               </ShowcaseCard>

               {/* Progress */}
               <SubsectionHeader>Progress</SubsectionHeader>
               <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                     <ShowcaseCard title="Linear Progress">
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                           <Box>
                              <Typography variant="caption">Indeterminate</Typography>
                              <LinearProgress />
                           </Box>
                           <Box>
                              <Typography variant="caption">Determinate (50%)</Typography>
                              <LinearProgress variant="determinate" value={50} />
                           </Box>
                           <Box>
                              <Typography variant="caption">Buffer</Typography>
                              <LinearProgress variant="buffer" value={30} valueBuffer={60} />
                           </Box>
                           <Box>
                              <Typography variant="caption">Colors</Typography>
                              <LinearProgress color="primary" sx={{ mb: 1 }} />
                              <LinearProgress color="secondary" sx={{ mb: 1 }} />
                              <LinearProgress color="success" />
                           </Box>
                        </Box>
                     </ShowcaseCard>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                     <ShowcaseCard title="Circular Progress">
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                           <Box sx={{ textAlign: "center" }}>
                              <CircularProgress />
                              <Typography variant="caption" display="block">Indeterminate</Typography>
                           </Box>
                           <Box sx={{ textAlign: "center" }}>
                              <CircularProgress variant="determinate" value={75} />
                              <Typography variant="caption" display="block">75%</Typography>
                           </Box>
                           <Box sx={{ textAlign: "center" }}>
                              <CircularProgress size={20} />
                              <Typography variant="caption" display="block">Small</Typography>
                           </Box>
                           <Box sx={{ textAlign: "center" }}>
                              <CircularProgress size={60} />
                              <Typography variant="caption" display="block">Large</Typography>
                           </Box>
                           <Box sx={{ textAlign: "center" }}>
                              <CircularProgress color="secondary" />
                              <Typography variant="caption" display="block">Secondary</Typography>
                           </Box>
                        </Box>
                     </ShowcaseCard>
                  </Grid>
               </Grid>

               {/* Snackbar */}
               <SubsectionHeader>Snackbar</SubsectionHeader>
               <ShowcaseCard title="Snackbar">
                  <Box sx={{ display: "flex", gap: 2 }}>
                     <Button variant="outlined" onClick={() => setSnackbarOpen(true)}>
                        Show Snackbar
                     </Button>
                  </Box>
                  <Snackbar
                     open={snackbarOpen}
                     autoHideDuration={3000}
                     onClose={() => setSnackbarOpen(false)}
                     message="This is a snackbar message"
                     action={
                        <Button color="primary" size="small" onClick={() => setSnackbarOpen(false)}>
                           UNDO
                        </Button>
                     }
                  />
               </ShowcaseCard>
            </CollapsibleSection>

            {/* ============================================ */}
            {/* GROUP 4: NAVIGATION & LAYOUT */}
            {/* ============================================ */}
            <CollapsibleSection
               id="group4"
               title="Group 4: Navigation & Layout"
               icon={<ViewQuiltIcon sx={{ color: currentScheme.primary }} />}
            >

               {/* Accordion */}
               <SubsectionHeader>Accordion</SubsectionHeader>
               <ShowcaseCard title="Accordion">
                  <Accordion
                     expanded={expandedAccordion === "panel1"}
                     onChange={(e, isExpanded) => setExpandedAccordion(isExpanded ? "panel1" : false)}
                  >
                     <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography>Accordion 1</Typography>
                     </AccordionSummary>
                     <AccordionDetails>
                        <Typography>
                           Content for the first accordion panel. This demonstrates the expanded state.
                        </Typography>
                     </AccordionDetails>
                  </Accordion>
                  <Accordion
                     expanded={expandedAccordion === "panel2"}
                     onChange={(e, isExpanded) => setExpandedAccordion(isExpanded ? "panel2" : false)}
                  >
                     <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography>Accordion 2</Typography>
                     </AccordionSummary>
                     <AccordionDetails>
                        <Typography>Content for the second accordion panel.</Typography>
                     </AccordionDetails>
                  </Accordion>
                  <Accordion disabled>
                     <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography>Disabled Accordion</Typography>
                     </AccordionSummary>
                  </Accordion>
               </ShowcaseCard>

               {/* AppBar */}
               <SubsectionHeader>AppBar</SubsectionHeader>
               <ShowcaseCard title="AppBar">
                  <Box sx={{ position: "relative", mb: 2 }}>
                     <AppBar position="static">
                        <Toolbar>
                           <IconButton edge="start" color="inherit">
                              <MenuIcon />
                           </IconButton>
                           <Typography variant="h6" sx={{ flexGrow: 1 }}>
                              App Title
                           </Typography>
                           <IconButton color="inherit">
                              <SearchIcon />
                           </IconButton>
                           <IconButton color="inherit">
                              <SettingsIcon />
                           </IconButton>
                        </Toolbar>
                     </AppBar>
                  </Box>
                  <Box sx={{ position: "relative" }}>
                     <AppBar position="static" color="secondary">
                        <Toolbar variant="dense">
                           <Typography variant="h6" sx={{ flexGrow: 1 }}>
                              Secondary Dense
                           </Typography>
                        </Toolbar>
                     </AppBar>
                  </Box>
               </ShowcaseCard>

               {/* Cards */}
               <SubsectionHeader>Cards (Different Elevations)</SubsectionHeader>
               <Grid container spacing={2}>
                  {[0, 1, 2, 4, 8, 16, 24].map((elevation) => (
                     <Grid size={{ xs: 6, md: 3, lg: "auto" }} key={elevation}>
                        <Card elevation={elevation} sx={{ minWidth: 120 }}>
                           <CardHeader
                              avatar={<Avatar sx={{ bgcolor: currentScheme.primary }}>E</Avatar>}
                              action={<IconButton><MoreVertIcon /></IconButton>}
                              title={`Elevation ${elevation}`}
                              subheader="Subheader"
                              titleTypographyProps={{ variant: "body2" }}
                              subheaderTypographyProps={{ variant: "caption" }}
                           />
                           <CardContent>
                              <Typography variant="body2">Card content</Typography>
                           </CardContent>
                           <CardActions>
                              <Button size="small">Action</Button>
                           </CardActions>
                        </Card>
                     </Grid>
                  ))}
               </Grid>

               {/* Breadcrumbs */}
               <SubsectionHeader>Breadcrumbs</SubsectionHeader>
               <ShowcaseCard title="Breadcrumbs">
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                     <Breadcrumbs>
                        <Link href="#" underline="hover" color="inherit">Home</Link>
                        <Link href="#" underline="hover" color="inherit">Products</Link>
                        <Typography color="text.primary">Current Page</Typography>
                     </Breadcrumbs>
                     <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />}>
                        <Link href="#" underline="hover" color="inherit" sx={{ display: "flex", alignItems: "center" }}>
                           <HomeIcon sx={{ mr: 0.5 }} fontSize="small" />
                           Home
                        </Link>
                        <Link href="#" underline="hover" color="inherit">Category</Link>
                        <Typography color="text.primary">Item</Typography>
                     </Breadcrumbs>
                  </Box>
               </ShowcaseCard>

               {/* Link */}
               <SubsectionHeader>Link</SubsectionHeader>
               <ShowcaseCard title="Link">
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                     <Link href="#" underline="always">Always Underline</Link>
                     <Link href="#" underline="hover">Hover Underline</Link>
                     <Link href="#" underline="none">No Underline</Link>
                     <Link href="#" color="primary">Primary</Link>
                     <Link href="#" color="secondary">Secondary</Link>
                     <Link href="#" color="error">Error</Link>
                  </Box>
               </ShowcaseCard>

               {/* Menu */}
               <SubsectionHeader>Menu</SubsectionHeader>
               <ShowcaseCard title="Menu">
                  <Button variant="outlined" onClick={(e) => setMenuAnchor(e.currentTarget)}>
                     Open Menu
                  </Button>
                  <Menu
                     anchorEl={menuAnchor}
                     open={Boolean(menuAnchor)}
                     onClose={() => setMenuAnchor(null)}
                  >
                     <MenuItem onClick={() => setMenuAnchor(null)}>
                        <HomeIcon sx={{ mr: 1 }} /> Home
                     </MenuItem>
                     <MenuItem onClick={() => setMenuAnchor(null)}>
                        <SettingsIcon sx={{ mr: 1 }} /> Settings
                     </MenuItem>
                     <Divider />
                     <MenuItem onClick={() => setMenuAnchor(null)} disabled>
                        Disabled Item
                     </MenuItem>
                  </Menu>
               </ShowcaseCard>

               {/* Pagination */}
               <SubsectionHeader>Pagination</SubsectionHeader>
               <ShowcaseCard title="Pagination">
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                     <Pagination count={10} />
                     <Pagination count={10} variant="outlined" />
                     <Pagination count={10} shape="rounded" />
                     <Pagination count={10} color="primary" />
                     <Pagination count={10} color="secondary" />
                     <Pagination count={10} size="small" />
                     <Pagination count={10} size="large" />
                  </Box>
               </ShowcaseCard>

               {/* SpeedDial */}
               <SubsectionHeader>SpeedDial</SubsectionHeader>
               <ShowcaseCard title="SpeedDial">
                  <Box sx={{ height: 200, position: "relative" }}>
                     <SpeedDial
                        ariaLabel="SpeedDial example"
                        sx={{ position: "absolute", bottom: 16, right: 16 }}
                        icon={<SpeedDialIcon />}
                     >
                        <SpeedDialAction icon={<FileCopyIcon />} tooltipTitle="Copy" />
                        <SpeedDialAction icon={<SaveIcon />} tooltipTitle="Save" />
                        <SpeedDialAction icon={<PrintIcon />} tooltipTitle="Print" />
                        <SpeedDialAction icon={<ShareIcon />} tooltipTitle="Share" />
                     </SpeedDial>
                  </Box>
               </ShowcaseCard>

               {/* Stepper */}
               <SubsectionHeader>Stepper</SubsectionHeader>
               <ShowcaseCard title="Stepper">
                  <Box sx={{ mb: 3 }}>
                     <Typography variant="caption">Horizontal</Typography>
                     <Stepper activeStep={activeStep}>
                        <Step><StepLabel>Step 1</StepLabel></Step>
                        <Step><StepLabel>Step 2</StepLabel></Step>
                        <Step><StepLabel>Step 3</StepLabel></Step>
                     </Stepper>
                     <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
                        <Button
                           disabled={activeStep === 0}
                           onClick={() => setActiveStep(activeStep - 1)}
                        >
                           Back
                        </Button>
                        <Button
                           variant="contained"
                           onClick={() => setActiveStep(Math.min(activeStep + 1, 3))}
                        >
                           {activeStep === 2 ? "Finish" : "Next"}
                        </Button>
                     </Box>
                  </Box>
                  <Box>
                     <Typography variant="caption">Alternative Label</Typography>
                     <Stepper activeStep={1} alternativeLabel>
                        <Step><StepLabel>Select</StepLabel></Step>
                        <Step><StepLabel>Configure</StepLabel></Step>
                        <Step><StepLabel>Confirm</StepLabel></Step>
                     </Stepper>
                  </Box>
               </ShowcaseCard>

               {/* Tabs */}
               <SubsectionHeader>Tabs</SubsectionHeader>
               <ShowcaseCard title="Tabs">
                  <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
                     <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
                        <Tab label="Tab One" />
                        <Tab label="Tab Two" />
                        <Tab label="Tab Three" />
                        <Tab label="Disabled" disabled />
                     </Tabs>
                  </Box>
                  <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
                     <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} centered>
                        <Tab label="Centered 1" />
                        <Tab label="Centered 2" />
                        <Tab label="Centered 3" />
                     </Tabs>
                  </Box>
                  <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
                     <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
                        <Tab icon={<HomeIcon />} label="Home" />
                        <Tab icon={<FavoriteIcon />} label="Favorites" />
                        <Tab icon={<PersonIcon />} label="Profile" />
                     </Tabs>
                  </Box>
               </ShowcaseCard>
            </CollapsibleSection>

            {/* ============================================ */}
            {/* SECTION 5: COMPOSITE EXAMPLES */}
            {/* ============================================ */}
            <CollapsibleSection
               id="compositeExamples"
               title="Section 5: Composite Examples"
               icon={<DashboardIcon sx={{ color: currentScheme.primary }} />}
            >

               <Grid container spacing={3}>
                  {/* Example 1: Product Card */}
                  <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                     <Card elevation={4}>
                        <CardHeader
                           avatar={<Avatar sx={{ bgcolor: currentScheme.primary }}>P</Avatar>}
                           action={
                              <Box>
                                 <IconButton><FavoriteIcon /></IconButton>
                                 <IconButton><ShareIcon /></IconButton>
                              </Box>
                           }
                           title="Product Card Example"
                           subheader="With header icons and actions"
                        />
                        <CardContent>
                           <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                              This card demonstrates a typical product layout with quantity controls
                              and multiple interaction options.
                           </Typography>
                           <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                              <Typography variant="body2">Quantity:</Typography>
                              <IconButton size="small"><Typography>-</Typography></IconButton>
                              <TextField
                                 type="number"
                                 value={1}
                                 size="small"
                                 sx={{ width: 60 }}
                                 inputProps={{ style: { textAlign: "center" } }}
                              />
                              <IconButton size="small"><Typography>+</Typography></IconButton>
                           </Box>
                           <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
                              <Chip label="In Stock" color="success" size="small" />
                              <Chip label="Popular" color="primary" size="small" variant="outlined" />
                           </Box>
                        </CardContent>
                        <CardActions sx={{ justifyContent: "space-between", px: 2 }}>
                           <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <FormControlLabel
                                 control={<Checkbox size="small" />}
                                 label="Gift wrap"
                              />
                           </Box>
                           <SpeedDial
                              ariaLabel="Product actions"
                              sx={{ position: "relative" }}
                              icon={<SpeedDialIcon />}
                              direction="left"
                              FabProps={{ size: "small" }}
                           >
                              <SpeedDialAction icon={<ShoppingCartIcon />} tooltipTitle="Add to Cart" />
                              <SpeedDialAction icon={<FavoriteIcon />} tooltipTitle="Wishlist" />
                           </SpeedDial>
                        </CardActions>
                     </Card>
                  </Grid>

                  {/* Example 2: Search Form */}
                  <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                     <Card elevation={4}>
                        <CardHeader title="Search & Filter" />
                        <CardContent>
                           <TextField
                              fullWidth
                              variant="outlined"
                              placeholder="Search products..."
                              size="small"
                              sx={{ mb: 2 }}
                              InputProps={{
                                 startAdornment: <SearchIcon sx={{ mr: 1, color: "action.active" }} />,
                              }}
                           />
                           <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                              <InputLabel>Category</InputLabel>
                              <Select label="Category" defaultValue="">
                                 <MenuItem value="">All Categories</MenuItem>
                                 <MenuItem value="electronics">Electronics</MenuItem>
                                 <MenuItem value="clothing">Clothing</MenuItem>
                              </Select>
                           </FormControl>
                           <Box sx={{ mb: 2 }}>
                              <Typography variant="caption" sx={{ mb: 1, display: "block" }}>
                                 Active Filters:
                              </Typography>
                              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                                 <Chip label="Price: $10-$50" onDelete={() => {}} size="small" />
                                 <Chip label="In Stock" onDelete={() => {}} size="small" />
                                 <Chip label="4+ Stars" onDelete={() => {}} size="small" />
                              </Box>
                           </Box>
                        </CardContent>
                        <CardActions>
                           <Button variant="contained" fullWidth>
                              Search
                           </Button>
                        </CardActions>
                     </Card>
                  </Grid>

                  {/* Example 3: Dashboard Widget */}
                  <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                     <Card elevation={4}>
                        <AppBar position="static" color="primary">
                           <Toolbar variant="dense">
                              <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                                 Dashboard Widget
                              </Typography>
                              <IconButton color="inherit" size="small">
                                 <SettingsIcon />
                              </IconButton>
                           </Toolbar>
                        </AppBar>
                        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
                           <Tabs value={0} variant="fullWidth">
                              <Tab label="Overview" />
                              <Tab label="Details" />
                           </Tabs>
                        </Box>
                        <CardContent>
                           <Box sx={{ mb: 2 }}>
                              <Typography variant="body2" sx={{ mb: 1 }}>Loading progress...</Typography>
                              <LinearProgress variant="determinate" value={65} />
                           </Box>
                           <Box sx={{ display: "flex", justifyContent: "space-around" }}>
                              <Box sx={{ textAlign: "center" }}>
                                 <CircularProgress variant="determinate" value={75} size={50} />
                                 <Typography variant="caption" display="block">CPU</Typography>
                              </Box>
                              <Box sx={{ textAlign: "center" }}>
                                 <CircularProgress variant="determinate" value={45} size={50} color="secondary" />
                                 <Typography variant="caption" display="block">Memory</Typography>
                              </Box>
                           </Box>
                        </CardContent>
                     </Card>
                  </Grid>

                  {/* Example 4: Notification Center */}
                  <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                     <Card elevation={4}>
                        <CardHeader
                           title="Notifications"
                           action={
                              <Badge badgeContent={3} color="error">
                                 <NotificationsIcon />
                              </Badge>
                           }
                        />
                        <CardContent sx={{ p: 0 }}>
                           <Alert severity="success" sx={{ borderRadius: 0 }}>
                              <AlertTitle>Order Shipped</AlertTitle>
                              Your order #12345 has been shipped
                           </Alert>
                           <Alert severity="warning" sx={{ borderRadius: 0 }}>
                              <AlertTitle>Low Stock</AlertTitle>
                              Item in your cart is running low
                           </Alert>
                           <Alert severity="info" sx={{ borderRadius: 0 }}>
                              <AlertTitle>New Feature</AlertTitle>
                              Check out our new dashboard
                           </Alert>
                        </CardContent>
                        <CardActions>
                           <Button size="small">Mark all as read</Button>
                           <Button size="small">View all</Button>
                        </CardActions>
                     </Card>
                  </Grid>

                  {/* Example 5: Settings Panel */}
                  <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                     <Card elevation={4}>
                        <CardHeader title="Settings Panel" />
                        <CardContent sx={{ p: 0 }}>
                           <Accordion defaultExpanded>
                              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                 <Typography>Notifications</Typography>
                              </AccordionSummary>
                              <AccordionDetails>
                                 <FormControlLabel
                                    control={<Switch defaultChecked />}
                                    label="Email notifications"
                                 />
                                 <FormControlLabel
                                    control={<Switch />}
                                    label="Push notifications"
                                 />
                              </AccordionDetails>
                           </Accordion>
                           <Accordion>
                              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                 <Typography>Privacy</Typography>
                              </AccordionSummary>
                              <AccordionDetails>
                                 <FormGroup>
                                    <FormControlLabel
                                       control={<Checkbox defaultChecked />}
                                       label="Show profile publicly"
                                    />
                                    <FormControlLabel
                                       control={<Checkbox />}
                                       label="Allow data collection"
                                    />
                                 </FormGroup>
                              </AccordionDetails>
                           </Accordion>
                           <Accordion>
                              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                 <Typography>Theme</Typography>
                              </AccordionSummary>
                              <AccordionDetails>
                                 <RadioGroup defaultValue="light">
                                    <FormControlLabel value="light" control={<Radio />} label="Light" />
                                    <FormControlLabel value="dark" control={<Radio />} label="Dark" />
                                    <FormControlLabel value="system" control={<Radio />} label="System" />
                                 </RadioGroup>
                              </AccordionDetails>
                           </Accordion>
                        </CardContent>
                     </Card>
                  </Grid>
               </Grid>
            </CollapsibleSection>

            {/* Footer */}
            <Box sx={{ textAlign: "center", py: 4, color: currentScheme.onSurfaceVariant }}>
               <Typography variant="body2">
                  Material Theme Visualizer • {useJsonTheme ? "Using material-theme.json" : "Using Dynamic Theme Generation"}
               </Typography>
               <Typography variant="caption" sx={{ display: "block", mb: 1 }}>
                  Seed Color: {seedColor.toUpperCase()} • Scheme: {selectedScheme.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
               </Typography>
               <Typography variant="caption" sx={{ opacity: 0.7 }}>
                  Powered by @material/material-color-utilities
               </Typography>
            </Box>
         </Container>
      </Box>
   );
};

export default MaterialThemeVisualizer;
