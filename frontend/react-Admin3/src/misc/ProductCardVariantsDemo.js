import React from "react";
import { Box, Typography, Grid } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import BalancedProductCard from "./ProductCards/BalancedProductCard";
import GlassHeaderProductCards from './components/styleguide/GlassHeaderProductCards';

const ProductCardVariantsDemo = () => {
	const theme = useTheme();

	return (
		<Box sx={{ p: theme.spacingTokens.lg }}>
			<Typography variant="h3" gutterBottom>
				Product Card Variants
			</Typography>
			<Typography variant="body1" sx={{ mb: theme.spacingTokens.lg }}>
				Demonstrates different product card variants with themed header colors and conditional discount options.
			</Typography>

			<Grid container spacing={3}>
				<Grid size={{ xs: 12, md: 6, lg: 3 }}>
					<Box>
						<Typography variant="h6" sx={{ mb: theme.spacingTokens.sm }}>
							Bundle Product
						</Typography>
						<Typography variant="caption" sx={{ mb: theme.spacingTokens.md, display: "block" }}>
							Blue header (#4658ac) • Discount options shown
						</Typography>
						<BalancedProductCard variant="bundle-product" />
					</Box>
				</Grid>

				<Grid size={{ xs: 12, md: 6, lg: 3 }}>
					<Box>
						<Typography variant="h6" sx={{ mb: theme.spacingTokens.sm }}>
							Marking Product
						</Typography>
						<Typography variant="caption" sx={{ mb: theme.spacingTokens.md, display: "block" }}>
							Green header (#006d3d) • Discount options hidden
						</Typography>
						<BalancedProductCard variant="marking-product" />
					</Box>
				</Grid>

				<Grid size={{ xs: 12, md: 6, lg: 3 }}>
					<Box>
						<Typography variant="h6" sx={{ mb: theme.spacingTokens.sm }}>
							Tutorial Product
						</Typography>
						<Typography variant="caption" sx={{ mb: theme.spacingTokens.md, display: "block" }}>
							Purple header (#7950d1) • Discount options shown
						</Typography>
						<BalancedProductCard variant="tutorial-product" />
					</Box>
				</Grid>

				<Grid size={{ xs: 12, md: 6, lg: 3 }}>
					<Box>
						<Typography variant="h6" sx={{ mb: theme.spacingTokens.sm }}>
							Material Product (Default)
						</Typography>
						<Typography variant="caption" sx={{ mb: theme.spacingTokens.md, display: "block" }}>
							Gray header (#5a5d72) • Discount options shown
						</Typography>
						<BalancedProductCard variant="material-product" />
					</Box>
				</Grid>
			</Grid>
			
		</Box>
	);
};

export default ProductCardVariantsDemo;