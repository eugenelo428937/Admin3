import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Button,
  AppBar,
  Toolbar,
  Menu,
  MenuItem,
  Breadcrumbs,
  Link,
  Badge,
  Tabs,
  Tab,
  Paper,
  IconButton,
  Divider,
  Stack
} from '@mui/material';
import {
  MoreVert,
  Download,
  Share,
  Print,
  Notifications
} from '@mui/icons-material';

const NavigationSection = () => {
  const [tabValue, setTabValue] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  return (
    <Card elevation={2} sx={{ height: "100%" }}>
      <CardHeader title="Navigation" />
      <Divider />
      <CardContent>
        <Stack spacing={3}>
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Tabs
            </Typography>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              variant="scrollable">
              <Tab label="All Products" />
              <Tab label="Tutorials" />
              <Tab label="Materials" />
            </Tabs>
          </Box>

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Breadcrumbs
            </Typography>
            <Breadcrumbs>
              <Link underline="hover" color="inherit" href="#">
                Home
              </Link>
              <Link underline="hover" color="inherit" href="#">
                Products
              </Link>
              <Typography color="text.primary">
                Current Page
              </Typography>
            </Breadcrumbs>
          </Box>

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Menu
            </Typography>
            <Button
              variant="outlined"
              onClick={handleMenuClick}
              endIcon={<MoreVert />}
              size="small">
              Options
            </Button>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}>
              <MenuItem onClick={handleMenuClose}>
                <Download sx={{ mr: 1 }} />
                Download
              </MenuItem>
              <MenuItem onClick={handleMenuClose}>
                <Share sx={{ mr: 1 }} />
                Share
              </MenuItem>
              <MenuItem onClick={handleMenuClose}>
                <Print sx={{ mr: 1 }} />
                Print
              </MenuItem>
            </Menu>
          </Box>

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              App Bar
            </Typography>
            <Paper variant="outlined">
              <AppBar position="static" elevation={0}>
                <Toolbar variant="dense">
                  <Typography
                    variant="h6"
                    component="div"
                    sx={{ flexGrow: 1, fontSize: "1rem" }}>
                    Admin3
                  </Typography>
                  <IconButton color="inherit" size="small">
                    <Badge badgeContent={3} color="error">
                      <Notifications fontSize="small" />
                    </Badge>
                  </IconButton>
                </Toolbar>
              </AppBar>
            </Paper>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default NavigationSection;