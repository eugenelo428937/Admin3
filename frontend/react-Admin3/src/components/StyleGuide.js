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
	const [tabValue, setTabValue] = useState(0);

	return (
		<Container
			maxWidth={false}>
			<Typography variant="h2" component="h1" gutterBottom sx={{ mt: 3 }}>
				Admin3 Style Guide
			</Typography>

			<Typography
				variant="subtitle1"
				gutterBottom
				sx={{ mb: 2, color: "text.secondary" }}>
				BPP branding with Material UI components and Liftkit CSS
			</Typography>

			{/* Tab Navigation - Styled via theme.js */}
			<Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }} className="m-left__2xl m-right__2xl p-left__2xl p-right__2xl">
				<Tabs
					defaultActiveKey="typography"
					id="uncontrolled-tab-example"
					className="mb-3">
					<Tab
						eventKey="typography"
						title={
							<Typography
								variant="heading"
								className="p-2 color-light__onsurface_lkv">
								Typography
							</Typography>
						}>
						<Grid container spacing={2}>
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
