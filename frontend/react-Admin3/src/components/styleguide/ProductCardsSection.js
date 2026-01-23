import React, { useState } from "react";
import {
	Container,
	Typography,
	Grid,
	useTheme,
	Divider
} from "@mui/material";

// Import refactored components
import {
	MaterialProductCardDemo,
	TutorialProductCard,
	OnlineClassroomProductCard,
	BundleProductCard,
	MarkingVoucherProductCard,
	MarkingProductCard,
	MaterialProductCard2,
} from "./ProductCards";

const ProductCardsSection = () => {
	const theme = useTheme();
	return (
		<Container sx={{mt:2}} maxWidth="xl">
			{/* All Product Types Grid */}
			<Typography variant="h4" sx={{ mb: theme.spacing.xs }}>
				Product Cards
			</Typography>			
			<Divider sx={{mb: theme.spacing.md }}/>
			<Grid container spacing={0} sx={{ mb: 6, alignItems: "start" }}>
				<Grid size={{ xs: 12, sm: 6, lg: 4, xl : 3 }} sx={{justifyItems:"center"}}>
					<Typography variant="h6" gutterBottom>
						Materials
					</Typography>				
					<MaterialProductCardDemo />
				</Grid>

				<Grid size={{ xs: 12, sm: 6, lg: 4 }} sx={{justifyItems:"center"}}>
					<Typography variant="h6" gutterBottom>
						Tutorials
					</Typography>					
					<TutorialProductCard />
				</Grid>

				<Grid size={{ xs: 12, sm: 6, lg: 4 }} sx={{justifyItems:"center"}}>
					<Typography variant="h6" gutterBottom>
						Online Classroom
					</Typography>					
					<OnlineClassroomProductCard />
				</Grid>

				<Grid size={{ xs: 12, sm: 6, lg: 4 }} sx={{justifyItems:"center"}}>
					<Typography variant="h6" gutterBottom>
						Bundle
					</Typography>					
					<BundleProductCard />
				</Grid>

				<Grid size={{ xs: 12, sm: 6, lg: 4 }} sx={{justifyItems:"center"}}>
					<Typography variant="h6" gutterBottom>
						Marking
					</Typography>					
					<MarkingProductCard />
				</Grid>

				<Grid size={{ xs: 12, sm: 6, lg: 4 }} sx={{justifyItems:"center"}}>
					<Typography variant="h6" gutterBottom>
						Marking Voucher
					</Typography>					
					<MarkingVoucherProductCard />
				</Grid>
			</Grid>
		</Container>
	);
};

export default ProductCardsSection;
