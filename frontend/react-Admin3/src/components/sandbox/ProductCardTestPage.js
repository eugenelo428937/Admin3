import React from "react";
import { Box, Typography, Paper } from "@mui/material";
import {
  BalancedProductCardTest,
  EnhancedTutorialProductCardTest,
} from "../styleguide/ProductCards";

const ProductCardTestPage = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Product Card Test (Base + Subvariant via ProductCard)
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: 3,
          alignItems: "start",
        }}
      >
        <Paper elevation={0} sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Material Product (BalancedProductCardTest)
          </Typography>
          <BalancedProductCardTest producttype="material" />
        </Paper>

        <Paper elevation={0} sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Tutorial Product (EnhancedTutorialProductCardTest)
          </Typography>
          <EnhancedTutorialProductCardTest producttype="tutorial" />
        </Paper>
      </Box>
    </Box>
  );
};

export default ProductCardTestPage;


