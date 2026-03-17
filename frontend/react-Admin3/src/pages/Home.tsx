import React from "react";
import { Box, Card, CardContent, useTheme, Grid, Divider } from "@mui/material";
import SearchBox from "../components/SearchBox.tsx";
import SearchResults from "../components/SearchResults.tsx";
import RulesEngineInlineAlert from "../components/Common/RulesEngineInlineAlert";
import { Typography, Container } from "@mui/material";
import { heroContainerStyles, heroContentStyles } from "../theme/styles";
import { ArrowForward } from "@mui/icons-material";
import StripeWaveBackground from "../components/Effects/StripeWaveBackground";
import AuroraBorealisBackground from '../components/Effects/AuroraBorealisBackground';
import OceanDepthBackground from '../components/Effects/OceanDepthBackground';
import NeonMeshBackground from '../components/Effects/NeonMeshBackground';
import SunsetSilkBackground from "../components/Effects/SunsetSilkBackground";
import IrisDawnBackground from "../components/Effects/IrisDawnBackground";
import CopperRoseBackground from "../components/Effects/CopperRoseBackground";
import useHomeVM from "./useHomeVM";

const Home: React.FC = () => {
   const vm = useHomeVM();
   const theme = useTheme() as any;

   // Video path from public folder
   const backgroundVideo = "/video/12595751_2560_1440_30fps.mp4";
   const backgroundVideoPoster = "/videoframe_0.png";
   const graphic1 = "/brand020.1a983628.webp";

   return (
      <>
         {/* SVG Background Layer - above video, below content */}
         <Box
            sx={{
               position: "absolute",
               top: {
                  xs: "25rem",
                  sm: "26rem",
                  md: "24rem",
                  lg: "23rem",
                  xl: "19rem",
               },
               left: {
                  xs: "12rem",
                  sm: "1rem",
                  md: "3rem",
                  lg: "5rem",
                  xl: "6rem",
               },
               width: { sm: "80%", md: "70%", lg: "64%", xl: "50%" },
               height: "45rem",
               zIndex: 2,
               overflow: "visible",
               pointerEvents: "none",
            }}
         >
            <svg
               width="100%"
               height="100%"
               viewBox="0 0 869 983"
               preserveAspectRatio="xMinYMin slice"
            >
               <defs>
                  <clipPath id={vm.chevronClipId}>
                     <rect
                        width="25%"
                        height="136%"
                        style={{ transform: "skew(29.3deg, 0deg)" }}
                     ></rect>
                  </clipPath>
               </defs>
               <image
                  href={graphic1}
                  width="100%"
                  height="100%"
                  clipPath={`url(#${vm.chevronClipId})`}
                  preserveAspectRatio="xMidYMid slice"
               />
               <rect
                  className="stroke-dark-base-ink-emphasis"
                  x="59%"
                  y="8%"
                  width="25%"
                  height="78%"
                  fill="none"
                  strokeWidth="2"
                  style={{
                     transform: "skew(29.3deg, 0deg)",
                     transformOrigin: "100% 100%",
                     stroke: "#525252",
                  }}
               ></rect>
            </svg>
         </Box>
         <Container
            data-testid="hero-container"
            disableGutters={true}
            maxWidth={false}
            sx={{
               ...heroContainerStyles,
               width: "100%",
            }}
         >
            <Container
               disableGutters={true}
               maxWidth={false}
               sx={{
                  position: "relative",
                  overflow: "hidden",
                  height: "100%",
                  padding: 0,
               }}>
               {/* Animated Gradient Wave Background (Stripe-style) */}
               {/* <StripeWaveBackground /> */}
               {/* <AuroraBorealisBackground style={{ opacity: 0.8 }} /> */}
               {/* <OceanDepthBackground/> */}
               <NeonMeshBackground/>
               {/* <SunsetSilkBackground /> */}
               {/* <IrisDawnBackground /> */}
               {/* <CopperRoseBackground /> */}
               {/* Dark Overlay for text readability */}
               <div
                  style={{
                     position: "absolute",
                     top: 0,
                     left: 0,
                     width: "100%",
                     height: "100%",
                     backgroundColor: "rgba(0, 0, 0, 0.45)",
                     zIndex: 1,
                  }}
               />
               {/* Content */}
               <Container
                  sx={{
                     ...heroContentStyles,
                     padding: {
                        xs: theme.spacingTokens.lg,
                        lg: theme.spacingTokens.lg,
                     },
                     zIndex: 3,
                     display: "flex",
                     flexDirection: "column",
                     justifyContent: "space-evenly",
                     alignItems: "center",
                  }}
               >
                  {/* Rules Engine Messages Section (Holiday Messages, etc.) */}
                  <Box
                     sx={{
                        position: "absolute",
                        top: theme.spacingTokens.sm,
                        right: theme.spacingTokens.sm,
                        zIndex: 10,
                        maxWidth: { xs: "90%", sm: "400px", md: "450px" },
                     }}
                  >
                     <RulesEngineInlineAlert
                        messages={vm.rulesMessages}
                        loading={vm.rulesLoading}
                        loadingMessage="Checking for important notices..."
                     />
                  </Box>
                  <Box
                     sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "start",
                     }}
                  >
                     <Typography
                        variant={"title_BPP" as any}
                     >
                        BPP
                     </Typography>
                     <Box sx={{
                        paddingLeft: theme.spacingTokens.xs[2],
                        textAlign: 'start',
                     }}>
                        <Typography
                           variant={"title_Acted" as any}
                        >
                           Actuarial Education
                        </Typography>
                        <Divider flexItem />
                        <Typography
                           variant={"title_onlineStore" as any}
                        >
                           Online Store
                        </Typography>
                     </Box>
                  </Box>

                  <Container
                     style={{ maxWidth: "600px", margin: "0 auto" }}
                     disableGutters={true}
                  >
                     <SearchBox
                        onSearchResults={vm.handleSearchResults}
                        onShowMatchingProducts={vm.handleShowMatchingProducts}
                        autoFocus={false}
                     />
                  </Container>
               </Container>
            </Container>

            {/* Search Results Section */}
            <Container
               disableGutters={true}
               maxWidth={false}
               sx={{
                  justifyContent: "center",
                  alignItems: "center",
                  position: "relative",
                  zIndex: 10,
               }}
            >
               <SearchResults
                  searchResults={vm.searchResults}
                  onShowMatchingProducts={vm.handleShowMatchingProducts}
                  loading={false}
                  error={vm.error}
                  maxSuggestions={5}
               />
            </Container>
            {/* Product Cards Grid */}
            <Grid
               container
               spacing={5}
               sx={{
                  padding: theme.spacingTokens.md
               }}
            >
               {vm.productCards.map((card) => (
                  <Grid
                     key={card.id}
                     size={{ xs: 12, sm: 6, md: 4, lg: 4 }}
                     sx={{
                        gap: 2,
                        zIndex: 99,
                     }}
                  >
                     <Card
                        elevation={3}
                        sx={{
                           p: { xs: 2, md: 3 },
                           py: { xs: 2, md: 5 },
                           backgroundColor: "rgba(255, 255, 255, 0.95)",
                           borderRadius: theme.spacingTokens.sm,
                           height: "100%",
                           justifyContent: "space-between",
                           display: "flex",
                           flexDirection: "column",
                        }}
                     >
                        <CardContent>
                           <Typography
                              variant="h4"
                              sx={{
                                 color: theme.palette.scales.granite[90],
                                 fontWeight: 500,
                                 marginBottom: theme.spacingTokens.lg,
                              }}
                           >
                              {card.title}
                           </Typography>
                           <Typography
                              variant="body2"
                              sx={{
                                 color: theme.palette.text.secondary,
                                 lineHeight: 1.7,
                                 flexGrow: 1,
                                 mb: 3,
                              }}
                           >
                              {card.description}
                           </Typography>
                        </CardContent>
                        {/* CTA Button */}
                        <Box
                           component="button"
                           onClick={() =>
                              vm.handleProductCategoryClick(card.filterValue)
                           }
                           sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "100%",
                              py: 1.5,
                              px: 3,
                              border: "none",
                              borderRadius: 2,
                              background: card.gradient,
                              color: "#ffffff",
                              fontSize: "0.875rem",
                              fontWeight: 600,
                              cursor: "pointer",
                              transition: "all 0.2s ease",
                              "&:hover": {
                                 opacity: 0.9,
                                 transform: "scale(1.02)",
                              },
                              "&:active": {
                                 transform: "scale(0.98)",
                              },
                           }}
                        >
                           View Products
                           <ArrowForward sx={{ fontSize: 18 }} />
                        </Box>
                     </Card>
                  </Grid>
               ))}
            </Grid>
         </Container>
      </>
   );
};

export default Home;
