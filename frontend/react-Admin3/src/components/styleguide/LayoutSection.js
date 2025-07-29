import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  Divider,
  Stack
} from '@mui/material';
import { Home, ShoppingCart, ExpandMore } from '@mui/icons-material';

const LayoutSection = () => {
  return (
    <Card elevation={2} sx={{ height: "100%" }}>
      <CardHeader title="Layout" />
      <Divider />
      <CardContent>
        <Stack spacing={3}>
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Lists
            </Typography>
            <Paper variant="outlined">
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <Home fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Dashboard"
                    secondary="Main overview"
                    primaryTypographyProps={{
                      variant: "body2",
                    }}
                    secondaryTypographyProps={{
                      variant: "caption",
                    }}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <ShoppingCart fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Products"
                    secondary="Browse courses"
                    primaryTypographyProps={{
                      variant: "body2",
                    }}
                    secondaryTypographyProps={{
                      variant: "caption",
                    }}
                  />
                </ListItem>
              </List>
            </Paper>
          </Box>

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Accordion
            </Typography>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="body2">
                  Course Information
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography
                  variant="body2"
                  color="text.secondary">
                  Details about course content and
                  requirements.
                </Typography>
              </AccordionDetails>
            </Accordion>
          </Box>

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Cards
            </Typography>
            <Card variant="outlined">
              <CardHeader
                title="Sample Card"
                subheader="With header and content"
                titleTypographyProps={{ variant: "subtitle2" }}
                subheaderTypographyProps={{
                  variant: "caption",
                }}
              />
              <CardContent sx={{ pt: 1 }}>
                <Typography variant="body2">
                  Card content with actions and information.
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default LayoutSection;