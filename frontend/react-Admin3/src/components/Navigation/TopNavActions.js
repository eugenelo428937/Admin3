import React from "react";
import { Box, Button, Tooltip, Typography, useMediaQuery } from "@mui/material";
import {
   Search as SearchIcon,
   Download as DownloadIcon,
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";

const TopNavActions = ({ onOpenSearch }) => {
   const theme = useTheme();
   const isDesktop = useMediaQuery(theme.breakpoints.up("md")); // ≥960px

   return (
      <Box className="d-flex flex-row flex-wrap" sx={{
         paddingX: theme.liftkit.spacing.sm,
         gap: { xs: 0, md: 2 },
      }}>
         {/* Brochure Download - Desktop Only */}
         <Tooltip title="Download Brochure">
            <Button
               variant="topNavAction"
               component="a"
               href="/brochure"
               target="_blank"
               startIcon={isDesktop ? <DownloadIcon /> : null}
               endIcon={!isDesktop ? <DownloadIcon /> : null}
               sx={{
                  minWidth: {
                     xs: theme.liftkit.spacing.xl,
                     lg: 64,
                  },
                  justifyContent: {
                     xs: "end",
                     md: "center",
                  },
               }}
            >
               <Typography
                  variant="topnavlink"
                  sx={{
                     display: { xs: "none", md: "flex" },
                     color: theme.palette.semantic.navigation.text.primary,
                  }}
               >
                  Brochure
               </Typography>
            </Button>
         </Tooltip>

         {/* Search Button */}
         <Tooltip title="Search Products (Ctrl+K)">
            <Button
               variant="topNavAction"
               onClick={onOpenSearch}
               sx={{
                  minWidth: {
                     xs: theme.liftkit.spacing.xl,
                     lg: 64,
                  },
                  justifyContent: {
                     xs: "end",
                     md: "center",
                  },
               }}
               aria-label="search products"
               startIcon={isDesktop ? <SearchIcon /> : null}
               endIcon={!isDesktop ? <SearchIcon /> : null}
            >
               <Typography
                  variant="topnavlink"
                  sx={{
                     display: { xs: "none", md: "flex" },
                     color: theme.palette.semantic.navigation.text.primary,
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
