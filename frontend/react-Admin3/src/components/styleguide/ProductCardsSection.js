import React, { useState } from "react";
import {
	Container,
	Typography,
	Grid,	
	useTheme
} from "@mui/material";
import "../../styles/product_card.css";

// Import refactored components
import {
	MaterialProductCardDemo,
	EnhancedTutorialProductCard,
	EnhancedOnlineClassroomProductCard,
	BundleProductCard,
	EnhancedMarkingVoucherProductCard,
	MarkingProductCardDemo,
} from "./ProductCards";

const ProductCardsSection = () => {
	const theme = useTheme();
	return (
		<Container sx={{mt:2}} maxWidth="xl">
			{/* All Product Types Grid */}
			<Typography variant="h3" sx={{ mb: theme.liftkit.spacing.xs }}>
				Product Card Types
			</Typography>
			<Typography variant="subtitle1" sx={{ mb: theme.liftkit.spacing.sm }}>
				Enhanced layouts for all product categories with improved hierarchy
				and functionality
			</Typography>

			<Grid container spacing={0} sx={{ mb: 6, alignItems: "center" }}>
				<Grid size={{ xs: 12, sm: 6, lg: 4, xl : 3 }}>
					<Typography variant="h6" gutterBottom>
						Materials
					</Typography>
					<Typography
						variant="body2"
						color="text.secondary"
						sx={{ mb: 0 }}>
						Print & eBook variations
					</Typography>
					<MaterialProductCardDemo />
				</Grid>

				<Grid size={{ xs: 12, sm: 6, lg: 4, xl : 3 }}>
					<Typography variant="h6" gutterBottom>
						Tutorial
					</Typography>
					<Typography
						variant="body2"
						color="text.secondary"
						sx={{ mb: 2 }}>
						Face to face and Live Online
					</Typography>
					<EnhancedTutorialProductCard />
				</Grid>

				<Grid size={{ xs: 12, sm: 6, lg: 4, xl : 3 }}>
					<Typography variant="h6" gutterBottom>
						Online Classroom
					</Typography>
					<Typography
						variant="body2"
						color="text.secondary"
						sx={{ mb: 2 }}>
						Digital recordings
					</Typography>
					<EnhancedOnlineClassroomProductCard />
				</Grid>

				<Grid size={{ xs: 12, sm: 6, lg: 4, xl : 3 }}>
					<Typography variant="h6" gutterBottom>
						Bundle
					</Typography>
					<Typography
						variant="body2"
						color="text.secondary"
						sx={{ mb: 2 }}>
						Bundle package
					</Typography>
					<BundleProductCard />
				</Grid>

				<Grid size={{ xs: 12, sm: 6, lg: 4, xl : 3 }}>
					<Typography variant="h6" gutterBottom>
						Marking
					</Typography>
					<Typography
						variant="body2"
						color="text.secondary"
						sx={{ mb: 2 }}>
						Different deadline scenarios for marking products
					</Typography>
					<MarkingProductCardDemo />
				</Grid>

				<Grid size={{ xs: 12, sm: 6, lg: 4, xl : 3 }}>
					<Typography variant="h6" gutterBottom>
						Marking Voucher
					</Typography>
					<Typography
						variant="body2"
						color="text.secondary"
						sx={{ mb: 2 }}>
						Pre-paid marking credits
					</Typography>
					<EnhancedMarkingVoucherProductCard />
				</Grid>
			</Grid>
		</Container>
	);
};

export default ProductCardsSection;
