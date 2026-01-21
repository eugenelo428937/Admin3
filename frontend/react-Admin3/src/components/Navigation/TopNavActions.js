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
               component="a"
               href="/brochure"
               target="_blank"
               startIcon={isDesktop ? <DownloadIcon /> : null}
               endIcon={!isDesktop ? <DownloadIcon /> : null}
               sx={{
                  textTransform: "none",
                  color:
                     theme.palette.liftkit?.light?.background || "text.primary",
                  minWidth: {
                     xs: theme.liftkit.spacing.xl,
                     lg: 64,
                  },
                  justifyContent: {
                     xs: "end",
                     md: "center",
                  },
                  p: 0,
               }}
            >
               <Typography
                  varitant="topnavlink"
                  color={theme.palette.offwhite["000"]}
                  sx={{
                     display: { xs: "none", md: "flex" },
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
                  minWidth: {
                     xs: theme.liftkit.spacing.xl,
                     lg: 64,
                  },
                  justifyContent: {
                     xs: "end",
                     md: "center",
                  },
                  p: 0,
               }}
               aria-label="search products"
               startIcon={isDesktop ? <SearchIcon /> : null}
               endIcon={!isDesktop ? <SearchIcon /> : null}
            >
               <Typography
                  varitant="topnavlink"
                  color={theme.palette.offwhite["000"]}
                  sx={{
                     display: { xs: "none", md: "flex" },

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
