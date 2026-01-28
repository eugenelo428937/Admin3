import React, { useState, useEffect, useId } from "react";
import { Box, Card, CardContent, useTheme, Grid, Divider } from "@mui/material";
import { useNavigate } from "react-router-dom";
import SearchBox from "../components/SearchBox";
import SearchResults from "../components/SearchResults";
import RulesEngineInlineAlert from "../components/Common/RulesEngineInlineAlert";
import { Typography, Container } from "@mui/material";
import { heroContainerStyles, heroContentStyles } from "../theme/styles";
import { rulesEngineHelpers } from "../utils/rulesEngineUtils";
import rulesEngineService from "../services/rulesEngineService";
import { useDispatch } from "react-redux";
import { navSelectProductGroup } from "../store/slices/filtersSlice";
import
{
   MenuBook,
   RateReview,
   School,
   ArrowForward,
} from "@mui/icons-material";

const Home = () =>
{
   const navigate = useNavigate();
   const theme = useTheme();
   const dispatch = useDispatch();
   const [searchResults, setSearchResults] = useState(null);
   const [error, setError] = useState(null);
   const chevronClipId = useId();

   // Rules engine state for holiday messages and other home page rules
   const [rulesMessages, setRulesMessages] = useState([]);
   const [rulesLoading, setRulesLoading] = useState(false);

   // Video path from public folder
   const backgroundVideo = `${process.env.PUBLIC_URL}/video/12595751_2560_1440_30fps.mp4`;
   const backgroundVideoPoster = `${process.env.PUBLIC_URL}/videoframe_0.png`;
   const graphic1 = `${process.env.PUBLIC_URL}/brand020.1a983628.webp`;
   // const graphic2 = `${process.env.PUBLIC_URL}/brand070.59c82c5e.webp`;
   // const graphic3 = `${process.env.PUBLIC_URL}/halftone_sq.df9804eb.avif`;
   // Debug video paths
   useEffect(() => { }, [backgroundVideo, backgroundVideoPoster]);

   // Execute home_page_mount rules when component mounts
   useEffect(() =>
   {
      const executeRules = async () =>
      {
         setRulesLoading(true);
         setRulesMessages([]); // Clear previous messages

         try
         {
            // Use the new helper function for simplified execution
            const result = await rulesEngineHelpers.executeHomePage(
               null,
               rulesEngineService
            );

            if (result.success && result.messages?.processed?.length > 0)
            {
               // Extract processed display messages for home page (filter out acknowledgments)
               const displayMessages = result.messages.processed.filter(
                  (msg) =>
                     !msg.isAcknowledgment &&
                     msg.display_type !== "modal" &&
                     msg.parsed?.displayType !== "modal"
               );
               setRulesMessages(displayMessages);
            }

            // Handle any processing errors
            if (result.errors && result.errors.length > 0)
            {
               console.error("🚨 Rules processing errors:", result.errors);
               if (process.env.NODE_ENV === "development")
               {
                  setError(`Development Error: ${result.errors.join(", ")}`);
               }
            }
         } catch (err)
         {
            console.error("Error executing home_page_mount rules:", err);

            // Handle schema validation errors specifically
            if (err.name === "SchemaValidationError")
            {
               console.error(
                  "🚨 Schema validation failed for rules engine:",
                  err.details
               );
               console.error("🔍 Schema errors:", err.schemaErrors);
               // For development, show schema validation errors to help debugging
               if (process.env.NODE_ENV === "development")
               {
                  setError(
                     `Development Error: Schema validation failed - ${err.details}`
                  );
               }
            }
            // Don't show other rule engine errors to user - shouldn't block home page
         } finally
         {
            setRulesLoading(false);
         }
      };

      executeRules();
   }, []); // Empty dependency array since this should run once on mount

   // Handle search results from SearchBox
   const handleSearchResults = (results) =>
   {
      setSearchResults(results);
      setError(null);
   };

   // Handle "Show Matching Products" button click
   // Redux state and URL sync middleware handle filters automatically
   const handleShowMatchingProducts = () =>
   {
      navigate("/products");
   };

   // Handle navigation to products page with specific product type filter
   const handleProductCategoryClick = (productType) =>
   {
      dispatch(navSelectProductGroup(productType));
      navigate("/products");
   };

   // Product category cards data
   const productCards = [
      {
         id: "study-materials",
         title: "Study Materials",
         description:
            "Comprehensive essential pack and revision materials to help you master actuarial concepts and excel in your exams.",
         filterValue: "Core Study Materials",
         icon: "MenuBook",
         gradient: "linear-gradient(135deg, #4658ac 0%, #2d3f93 100%)",
      },
      {
         id: "marking-service",
         title: "Marking Service",
         description:
            "Feedback on your practice papers with detailed marking and personalized guidance to improve your exam technique.",
         filterValue: "Marking",
         icon: "RateReview",
         gradient: "linear-gradient(135deg, #006874 0%, #004f58 100%)",
      },
      {
         id: "tuition",
         title: "Tuition",
         description:
            "Build and consolidate your knowledge and understanding of the principles. Time spent on an ActEd tutorial will be amongst your most productive study time.",
         filterValue: "Tutorial",
         icon: "School",
         gradient: "linear-gradient(135deg, #76546e 0%, #5c3c55 100%)",
      },
   ];

   // Icon mapping for product cards
   const iconMap = {
      MenuBook: MenuBook,
      RateReview: RateReview,
      School: School,
   };

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
                  <clipPath id={chevronClipId}>
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
                  clipPath={`url(#${chevronClipId})`}
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
               {/* Background Video */}
               <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  poster={backgroundVideoPoster}
                  style={{
                     position: "absolute",
                     top: 0,
                     left: 0,
                     width: "100%",
                     height: "100%",
                     objectFit: "cover",
                     zIndex: 0,
                  }}
               >
                  <source src={backgroundVideo} type="video/mp4" />
               </video>

               {/* Grey Overlay */}
               <div
                  style={{
                     position: "absolute",
                     top: 0,
                     left: 0,
                     width: "100%",
                     height: "100%",
                     backgroundColor: "rgba(0, 0, 0, 0.75)",
                     zIndex: 1,
                  }}
               />
               {/* Content */}
               <Container
                  sx={{
                     ...heroContentStyles,
                     padding: {
                        xs: theme.spacing.lg,
                        lg: theme.spacing.lg,
                     },
                     zIndex: 3,
                     display: "flex",
                     flexDirection: "column",
                     justifyContent: "space-evenly",
                     alignItems: "center",
                  }}
               >
                  {/* Rules Engine Messages Section (Holiday Messages, etc.) */}
                  <RulesEngineInlineAlert
                     messages={rulesMessages}
                     loading={rulesLoading}
                     loadingMessage="Checking for important notices..."
                     fullWidth={true}
                     float={true}
                     floatPosition="right"
                  />
                  <Box
                     sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "start",
                     }}
                  >
                     <Typography
                        variant="BPP"
                        color={theme.palette.md3.surfaceVariant}
                     >
                        BPP
                     </Typography>
                     <Typography
                        variant="Acted"
                        color={theme.palette.md3.surfaceVariant}
                        className="m-top__xs"
                     >
                        Actuarial Education
                     </Typography>
                     <Divider flexItem />
                     <Typography
                        variant="h3"
                        align="start"
                        color={theme.palette.md3.surfaceVariant}
                     >
                        Online Store
                     </Typography>
                  </Box>

                  <Container
                     style={{ maxWidth: "600px", margin: "0 auto" }}
                     disableGutters="true"
                  >
                     <SearchBox
                        onSearchResults={handleSearchResults}
                        onShowMatchingProducts={handleShowMatchingProducts}
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
                  searchResults={searchResults}
                  onShowMatchingProducts={handleShowMatchingProducts}
                  loading={false}
                  error={error}
                  maxSuggestions={5}
               />
            </Container>
            <Grid
               container>
                  <Grid size={{ xs: 12, sm: 6, md: 4 }}>red</Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 4 }}>green</Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 4 }}>blue</Grid>
               </Grid>
            {/* Product Cards Grid */}
            <Grid
               container
               // spacing={3}
               sx={{
                  // justifyContent: "center",
                  // alignItems: "stretch",
                  // maxWidth: "1200px",
                  // mx: "auto",
                  // zIndex: 99,
                  // height: "100%",
                  // minHeight: "inherit",
                  // alignItems: "center",
                  // justifyContent: "flex-end",
                  // position: "relative",                  
               }}
            >
               {productCards.map((card) => (
                  <Grid
                     key={card.id}
                     size={{ xs: 12, sm: 6, md: 4, lg: 4 }}
                     sx={{
                        // alignSelf: "stretch",
                        zIndex: 99,
                     }}
                  >
                     <Card
                        elevation={3}
                        sx={{
                           p: { xs: 2, md: 3 },
                           py: { xs: 2, md: 5 },
                           backgroundColor: "rgba(255, 255, 255, 0.95)",
                           borderRadius: theme.spacing.sm,
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
                                 marginBottom: theme.spacing.lg,
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
                              handleProductCategoryClick(card.filterValue)
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
