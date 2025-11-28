import React, { useState } from "react";
import {
   Box,
   Typography,
   Pagination,
   Chip,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import MaterialProductCard from "./MaterialProductCard";

const BUTTON_BEHAVIORS = [
   {
      page: 0,
      label: "Standard Add to Cart",
      description: "Standard add to cart button",
      chipColor: "primary",
   },
   {
      page: 1,
      label: "Buy with Recommended",
      description: "SpeedDial with recommended product suggestion",
      chipColor: "info",
   },
   {
      page: 2,
      label: "Buy Both",
      description: "SpeedDial for Printed + eBook bundle option",
      chipColor: "success",
   },
];

const MaterialProductCardDemo = () => {
   const [currentPage, setCurrentPage] = useState(1);
   const theme = useTheme();

   const currentBehavior = BUTTON_BEHAVIORS[currentPage - 1];

   const handlePageChange = (event, value) => {
      setCurrentPage(value);
   };

   return (
      <Box sx={{
         display: "flex",
         alignItems: "center",
         gap: 0,
         mb: 5,
         flexDirection: "column"
      }}>
         {/* Label showing current behavior */}
         {/* Product Card */}
         <MaterialProductCard buttonPage={currentPage - 1} />
         <Box
            sx={{
               display: "flex",
               alignItems: "center",
               gap: 0,
               mt: 2,
               flexDirection: "column"
            }}
         >
            <Chip
               label={currentBehavior.label}
               color={currentBehavior.chipColor}
               size="small"
            />                        
         </Box>

         {/* Pagination Control */}
         <Box
            sx={{
               display: "flex",
               justifyContent: "center",
               alignItems: "center",
               mt: 0.5,
               gap: 2,
            }}
         >
            <Typography variant="body2" color="text.secondary">
               Add to Cart Behavior:
            </Typography>
            <Pagination
               count={3}
               page={currentPage}
               onChange={handlePageChange}
               color="primary"
               size="small"
            />
         </Box>
      </Box>
   );
};

export default MaterialProductCardDemo;
