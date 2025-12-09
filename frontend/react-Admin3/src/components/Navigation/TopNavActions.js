import React from "react";
import { Box, Button, Tooltip, Typography } from "@mui/material";
import {
   Search as SearchIcon,
   Download as DownloadIcon,
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";

const TopNavActions = ({ onOpenSearch }) => {
   const theme = useTheme();

   return (
      <Box
         sx={{
            display: "flex",
            alignItems: "center",
            gap: { xs: 0, xl: 1 },
            justifyContent: "space-evenly",
         }}
      >
         {/* Brochure Download - Desktop Only */}
         <Tooltip title="Download Brochure">
            <Button
               component="a"
               href="/brochure"
               target="_blank"
               startIcon={<DownloadIcon sx={{
                me: {xs:0,xl:2}
               }} />}
               sx={{
                  textTransform: "none",
                  color:
                     theme.palette.liftkit?.light?.background || "text.primary",
                  // display: { xs: "none", md: "flex" },
                  p: 0,
                  px: { xs: 0, lg: 2 },
                  minWidth: {
                     xs: theme.liftkit.spacing.xl,
                     lg: 64,
                  },
                  justifyContent:"center"
               }}
            >
               <Typography
                  varitant="topnavlink"
                  color={theme.palette.offwhite["000"]}
                  sx={{
                     display: { xs: "none", lg: "flex" },
                  }}
               >
                  Brochure
               </Typography>
            </Button>
         </Tooltip>

         {/* Search Button */}
         <Tooltip title="Search Products (Ctrl+K)">
            <Button
               onClick={onOpenSearch}
               sx={{
                  color:
                     theme.palette.liftkit?.light?.background || "text.primary",
                  p: 0,
                  px: { xs: 0, lg: 2 },
                  minWidth: {
                     xs: theme.liftkit.spacing.xl,
                     lg: 64,
                  },
                  // display: { xs: "none", md: "flex" },
                  justifyContent:"center"
               }}
               aria-label="search products"
               startIcon={<SearchIcon />}
            >
               <Typography
                  varitant="topnavlink"
                  color={theme.palette.offwhite["000"]}
                  sx={{
                     display: { xs: "none", lg: "flex" },
                  }}
               >
                  Search
               </Typography>
            </Button>
         </Tooltip>
      </Box>
   );
};

export default TopNavActions;
