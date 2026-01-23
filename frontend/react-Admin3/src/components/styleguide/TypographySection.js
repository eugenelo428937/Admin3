import React from "react";
import {
   Box,
   Container,
   Typography,
   Card,
   CardContent,
   CardHeader,
   Divider,
   Grid,
   Stack,
   useTheme
} from "@mui/material";

const TypographySection = () => {
	const theme = useTheme();
   return (
      <Card
         elevation={2}
         sx={{ width: "100%" }}
         className="p-left__2xl p-right__2xl p-top__lg"
      >
         <CardContent>
            <Grid container spacing={0}>
               <Grid size={{ xs: 12, md: 12, lg: 6 }}>
                  <Card elevation={2} sx={{ padding: theme.spacing.lg }}>
                     <CardHeader
                        title={<Typography variant="h4">Typography</Typography>}
                        subheader={
                           <Typography variant="subtitle2">
                              Material UI Typography variants from theme.js with
                              LiftKit spacing.
                           </Typography>
                        }
                     />
                     <Divider />
                     <Grid container spacing={2} className="m-top__md">
                        <Grid size={{ xs: 12, md: 12, lg: 6 }}>
                           <Stack spacing={2} textAlign="left">
                              <Box>
                                 <Typography variant="h1">Heading 1</Typography>
                                 <Typography
                                    variant="caption"
                                    color="text.secondary"
                                 >
                                    variant="h1" - Page titles
                                 </Typography>
                              </Box>
                              <Box>
                                 <Typography variant="h2">Heading 2</Typography>
                                 <Typography
                                    variant="caption"
                                    color="text.secondary"
                                 >
                                    variant="h2" - Section titles
                                 </Typography>
                              </Box>
                              <Box>
                                 <Typography variant="h3">Heading 3</Typography>
                                 <Typography
                                    variant="caption"
                                    color="text.secondary"
                                 >
                                    variant="h3" - Subsection titles
                                 </Typography>
                              </Box>
                              <Box>
                                 <Typography variant="h4">Heading 4</Typography>
                                 <Typography
                                    variant="caption"
                                    color="text.secondary"
                                 >
                                    variant="h4" - Component titles
                                 </Typography>
                              </Box>
                              <Box>
                                 <Typography variant="h5">Heading 5</Typography>
                                 <Typography
                                    variant="caption"
                                    color="text.secondary"
                                 >
                                    variant="h5" - Small headings
                                 </Typography>
                              </Box>
                              <Box>
                                 <Typography variant="h6">Heading 6</Typography>
                                 <Typography
                                    variant="caption"
                                    color="text.secondary"
                                 >
                                    variant="h6" - Card titles
                                 </Typography>
                              </Box>
                           </Stack>
                        </Grid>
                        <Grid size={{ xs: 12, md: 12, lg: 6 }}>
                           <Stack
                              spacing={2}
                              textAlign="left"
                              className="justify-content__end"
							  sx = {{
								paddingTop : theme.spacing.lg
							  }}
                           >                              
                              <Box>
                                 <Typography variant="subtitle1">
                                    big brown fog jumps over the lazy god
                                 </Typography>
                                 <Typography
                                    variant="caption"
                                    color="text.secondary"
                                 >
                                    variant="subtitle1"
                                 </Typography>
                              </Box>
                              <Box>
                                 <Typography variant="subtitle2">
                                    big brown fog jumps over the lazy god
                                 </Typography>
                                 <Typography
                                    variant="caption"
                                    color="text.secondary"
                                 >
                                    variant="subtitle2"
                                 </Typography>
                              </Box>
                              <Box>
                                 <Typography variant="body1">
                                    big brown fog jumps over the lazy god
                                 </Typography>
                                 <Typography
                                    variant="caption"
                                    color="text.secondary"
                                 >
                                    variant="body1"
                                 </Typography>
                              </Box>
                              <Box>
                                 <Typography variant="body2">
                                    big brown fog jumps over the lazy god
                                 </Typography>
                                 <Typography
                                    variant="caption"
                                    color="text.secondary"
                                 >
                                    variant="body2"
                                 </Typography>
                              </Box>
                              <Box>
                                 <Typography variant="button" wrap="nowrap">
                                    big brown fog jumps over the lazy god
                                 </Typography>
                                 <br />
                                 <Typography
                                    variant="caption"
                                    color="text.secondary"
                                 >
                                    variant="button"
                                 </Typography>
                              </Box>
                              <Box>
                                 <Typography variant="caption">
                                    big brown fog jumps over the lazy god
                                 </Typography>
                                 <br />
                                 <Typography
                                    variant="caption"
                                    color="text.secondary"
                                 >
                                    variant="caption"
                                 </Typography>
                              </Box>
                              <Box>
                                 <Typography variant="overline">
                                    big brown fog jumps over the lazy god
                                 </Typography>
                                 <br />
                                 <Typography
                                    variant="caption"
                                    color="text.secondary"
                                 >
                                    variant="overline"
                                 </Typography>
                              </Box>
                              <Box>
                                 <Typography variant="fineprint">
                                    big brown fog jumps over the lazy god
                                 </Typography>
                                 <br />
                                 <Typography
                                    variant="caption"
                                    color="text.secondary"
                                 >
                                    variant="fineprint"
                                 </Typography>
                              </Box>
                           </Stack>
                        </Grid>
                     </Grid>
                  </Card>
               </Grid>
               <Grid size={{ xs: 12, md: 12, lg: 6 }}>				
                  <Card elevation={2} sx={{ padding: theme.spacing.lg, width:1  }}>
                     <CardHeader
                        title={
                           <Typography variant="h4">LiftKit Spacing</Typography>
                        }
                        subheader={
                           <Typography variant="subtitle2">
                              Material UI Spacing from theme.js with LiftKit
                           </Typography>
                        }
                     />
                     <Divider />
                     <CardContent>
						<Stack spacing={1}>
							<Box
                              sx={{
                                 display: "flex",
                                 alignItems: "center",
								 gap : 2,

                              }}
                           >
                              <Box
                                 sx={{
                                    width: theme.spacing.xs3,
                                    height: 16,
                                    backgroundColor: "primary.main",
                                 }}
                              />
                              <Typography variant="body2">
                                 --3xs spacing
                              </Typography>
                           </Box>
							
							<Box
                              sx={{
                                 display: "flex",
                                 alignItems: "center",
                                 gap: 2,
                              }}
                           >
													
                              <Box
                                 sx={{
                                    width: theme.spacing.xs2,
                                    height: 16,
                                    backgroundColor: "primary.main",
                                 }}
                              />
                              <Typography variant="body2">
                                 --2xs spacing
                              </Typography>
                           </Box>
						   <Box
                              sx={{
                                 display: "flex",
                                 alignItems: "center",
                                 gap: 2,
                              }}
                           >
						   <Box
                                 sx={{
                                    width: theme.spacing.xs,
                                    height: 16,
                                    backgroundColor: "primary.main",
                                 }}
                              />
                              <Typography variant="body2">
                                 --xs spacing
                              </Typography>
                           </Box>
						   <Box
                              sx={{
                                 display: "flex",
                                 alignItems: "center",
                                 gap: 2,
                              }}
                           >
						   <Box
                                 sx={{
                                    width: theme.spacing.sm,
                                    height: 16,
                                    backgroundColor: "primary.main",
                                 }}
                              />
                              <Typography variant="body2">
                                 --sm spacing
                              </Typography>
                           </Box>
						   <Box
                              sx={{
                                 display: "flex",
                                 alignItems: "center",
                                 gap: 2,
                              }}
                           >
						   <Box
                                 sx={{
                                    width: theme.spacing.md,
                                    height: 16,
                                    backgroundColor: "primary.main",
                                 }}
                              />
                              <Typography variant="body2">
                                 --md spacing
                              </Typography>
                           </Box>
						   <Box
                              sx={{
                                 display: "flex",
                                 alignItems: "center",
                                 gap: 2,
                              }}
                           >
						   <Box
                                 sx={{
                                    width: theme.spacing.lg,
                                    height: 16,
                                    backgroundColor: "primary.main",
                                 }}
                              />
                              <Typography variant="body2">
                                 --lg spacing
                              </Typography>
                           </Box>
						   <Box
                              sx={{
                                 display: "flex",
                                 alignItems: "center",
                                 gap: 2,
                              }}
                           >
						   <Box
                                 sx={{
                                    width: theme.spacing.xl,
                                    height: 16,
                                    backgroundColor: "primary.main",
                                 }}
                              />
                              <Typography variant="body2">
                                 --xl spacing
                              </Typography>
                           </Box>
						   <Box
                              sx={{
                                 display: "flex",
                                 alignItems: "center",
                                 gap: 2,
                              }}
                           >
						   <Box
                                 sx={{
                                    width: theme.spacing.xl2,
                                    height: 16,
                                    backgroundColor: "primary.main",
                                 }}
                              />
                              <Typography variant="body2">
                                 --2xl spacing
                              </Typography>
                           </Box>
						</Stack>                        
                     </CardContent>
                  </Card>
               </Grid>
            </Grid>
         </CardContent>
      </Card>
   );
};

export default TypographySection;
