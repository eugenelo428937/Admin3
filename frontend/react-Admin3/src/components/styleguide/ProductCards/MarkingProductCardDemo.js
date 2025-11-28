import React, { useState } from "react";
import {
   Box,
   Typography,
   Pagination,
   Chip,
} from "@mui/material";
import MarkingProductCard from "./MarkingProductCard";

const BUTTON_BEHAVIORS = [
   {
      page: 0,
      label: "Standard Add to Cart",
      description: "Simple add to cart button",
      chipColor: "primary",
   },
   {
      page: 1,
      label: "Buy with Recommended",
      description: "SpeedDial with recommended product suggestion",
      chipColor: "secondary",
   },
   {
      page: 2,
      label: "Buy Both",
      description: "SpeedDial for Marking + Voucher bundle option",
      chipColor: "success",
   },
];

const MarkingProductCardDemo = () => {
   const [currentPage, setCurrentPage] = useState(1);

   const currentBehavior = BUTTON_BEHAVIORS[currentPage - 1];

   const handlePageChange = (event, value) => {
      setCurrentPage(value);
   };

   return (
      <Box>
         {/* Label showing current behavior */}
         <Box
            sx={{
               display: "flex",
               alignItems: "center",
               gap: 1,
               mb: 2,
            }}
         >
            <Chip
               label={currentBehavior.label}
               color={currentBehavior.chipColor}
               size="small"
            />
            <Typography variant="caption" color="text.secondary">
               {currentBehavior.description}
            </Typography>
         </Box>

         {/* Product Card */}
         <MarkingProductCard buttonPage={currentPage - 1} />

         {/* Pagination Control */}
         <Box
            sx={{
               display: "flex",
               justifyContent: "center",
               alignItems: "center",
               mt: 2,
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

export default MarkingProductCardDemo;
