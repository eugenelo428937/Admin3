import React, { useState } from "react";
import {
	Box,
	Typography,
	Container,
	Grid,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	Paper,
	Tab as MuiTab,
	Tabs as MuiTabs,
} from "@mui/material";
import { Add } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
// Import sub-components
import TypographySection from "../components/styleguide/TypographySection.js";
import ColorSystemSection from "../components/styleguide/ColorSystemSection.js";
import ButtonsSection from "../components/styleguide/ButtonsSection.js";
import FormElementsSection from "../components/styleguide/FormElementsSection.js";
import FeedbackSection from "../components/styleguide/FeedbackSection.js";
import NavigationSection from "../components/styleguide/NavigationSection.js";
import LayoutSection from "../components/styleguide/LayoutSection.js";
import TablesSection from "../components/styleguide/TablesSection.js";
import ProductCardsSection from "../components/styleguide/ProductCardsSection.js";
import Sandbox from "../components/styleguide/Sandbox.js";

interface TabPanelProps {
	children: React.ReactNode;
	value: number;
	index: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
	return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null;
}

const StyleGuide: React.FC = () => {
	const [dialogOpen, setDialogOpen] = useState(false);
	const [tabValue, setTabValue] = useState(0);
	const theme = useTheme() as any;

	return (
		<Container
			maxWidth="xl"
			disableGutters
			sx={{
				px: theme.spacingTokens.xl2,
				py: theme.spacingTokens.lg,
			}}>
			<Typography variant="h2">
				Style Guide
			</Typography>

			<Typography
				variant="subtitle1"
				gutterBottom
				sx={{ mb: theme.spacingTokens.md }}
				>
				BPP branding palette with Material UI components
			</Typography>

			{/* Tab Navigation - Styled via theme.js */}
			<Box
				sx={{
					borderColor: "divider",
					marginX: theme.spacingTokens.xl2
				}}>
				<MuiTabs
					value={tabValue}
					onChange={(_e: React.SyntheticEvent, newValue: number) => setTabValue(newValue)}
					variant="scrollable"
					scrollButtons="auto"
				>
					<MuiTab label="Sandbox" />
					<MuiTab label="Typography" />
					<MuiTab label="Colour palette" />
					<MuiTab label="Product Cards" />
					<MuiTab label="Buttons, Forms & Feedback" />
					<MuiTab label="Navigation, Layout & Tables" />
				</MuiTabs>

				<TabPanel value={tabValue} index={0}>
					<Grid container>
						<Grid size={{ xs: 12, lg: 12 }}>
							<Sandbox/>
						</Grid>
					</Grid>
				</TabPanel>

				<TabPanel value={tabValue} index={1}>
					<Grid container>
						<Grid size={{ xs: 12, lg: 12 }}>
							<TypographySection />
						</Grid>
					</Grid>
				</TabPanel>

				<TabPanel value={tabValue} index={2}>
					<Grid size={{ xs: 12, lg: 12 }}>
						<ColorSystemSection />
					</Grid>
				</TabPanel>

				<TabPanel value={tabValue} index={3}>
					<ProductCardsSection />
				</TabPanel>

				<TabPanel value={tabValue} index={4}>
					<Grid container spacing={2}>
						<Grid size={{ xs: 12, md: 4 }}>
							<ButtonsSection />
						</Grid>
						<Grid size={{ xs: 12, md: 4 }}>
							<FormElementsSection />
						</Grid>
						<Grid size={{ xs: 12, md: 4 }}>
							<FeedbackSection />
						</Grid>
					</Grid>
				</TabPanel>

				<TabPanel value={tabValue} index={5}>
					<Grid container spacing={3}>
						<Grid size={{ xs: 12, md: 4 }}>
							<NavigationSection />
						</Grid>
						<Grid size={{ xs: 12, md: 4 }}>
							<LayoutSection />
						</Grid>
						<Grid size={{ xs: 12, md: 4 }}>
							<TablesSection />
						</Grid>
					</Grid>
				</TabPanel>
			</Box>

			{/* Sample Dialog for interaction */}
			<Dialog
				open={dialogOpen}
				onClose={() => setDialogOpen(false)}
				maxWidth="sm"
				fullWidth>
				<DialogTitle>Example Dialog</DialogTitle>
				<DialogContent>
					<Typography>
						This demonstrates the modal component styling with BPP color
						system.
					</Typography>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setDialogOpen(false)}>Cancel</Button>
					<Button onClick={() => setDialogOpen(false)} variant="contained">
						Confirm
					</Button>
				</DialogActions>
			</Dialog>
		</Container>
	);
};

export default StyleGuide;
