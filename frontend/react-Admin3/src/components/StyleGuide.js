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
	Fab,
	Paper,
} from "@mui/material";
import { Add } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
// Import sub-components
import TypographySection from "./styleguide/TypographySection";
import ColorSystemSection from "./styleguide/ColorSystemSection";
import ButtonsSection from "./styleguide/ButtonsSection";
import FormElementsSection from "./styleguide/FormElementsSection";
import FeedbackSection from "./styleguide/FeedbackSection";
import NavigationSection from "./styleguide/NavigationSection";
import LayoutSection from "./styleguide/LayoutSection";
import TablesSection from "./styleguide/TablesSection";
import ProductCardsSection from "./styleguide/ProductCardsSection";

import Tab from "react-bootstrap/Tab";
import Tabs from "react-bootstrap/Tabs";

const StyleGuide = () => {
	const [dialogOpen, setDialogOpen] = useState(false);
	const theme = useTheme();

	return (
		<Container
			maxWidth="xl"
			disableGutters
			sx={{
				px: theme.liftkit.spacing["2xl"],
				py: theme.liftkit.spacing.lg,
			}}>
			<Typography variant="h2">
				Style Guide
			</Typography>

			<Typography
				variant="subtitle1"
				gutterBottom
				sx={{ mb: theme.liftkit.spacing.md }}
				>
				BPP branding palette with Material UI components
			</Typography>

			{/* Tab Navigation - Styled via theme.js */}
			<Box
				sx={{
					borderBottom: 1,
					borderColor: "divider",					
				}}>
				<Tabs
					defaultActiveKey="typography"
					id="style-guide-tabs">
					<Tab
						eventKey="typography"
						title={
							<Typography
								variant="heading"
								className="p-2 color-light__onsurface_lkv">
								Typography
							</Typography>
						}>
						<Grid container>
							<Grid size={{ xs: 12, lg: 12 }}>
								<TypographySection />
							</Grid>
						</Grid>
					</Tab>
					<Tab
						eventKey="colours"
						title={
							<Typography
								variant="heading"
								className="p-2 color-light__onsurface_lkv">
								Colour palette
							</Typography>
						}>
						<Grid size={{ xs: 12, lg: 12 }}>
							<ColorSystemSection />
						</Grid>
					</Tab>
					<Tab
						eventKey="product-cards"
						title={
							<Typography
								variant="heading"
								className="p-2 color-light__onsurface_lkv">
								Product Cards
							</Typography>
						}>
						<ProductCardsSection />						
					</Tab>
					<Tab
						eventKey="buttons-forms-feedback"
						title={
							<Typography
								variant="heading"
								className="p-2 color-light__onsurface_lkv">
								Buttons, Forms & Feedback
							</Typography>
						}>
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
					</Tab>
					<Tab
						eventKey="navigation-layout-tables"
						title={
							<Typography
								variant="heading"
								className="p-2 color-light__onsurface_lkv">
								Navigation, Layout & Tables
							</Typography>
						}>
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
					</Tab>
				</Tabs>
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

			{/* Floating Action Button */}
			<Fab
				color="primary"
				onClick={() => setDialogOpen(true)}
				sx={{ position: "fixed", bottom: 16, right: 16 }}>
				<Add />
			</Fab>
		</Container>
	);
};

export default StyleGuide;
