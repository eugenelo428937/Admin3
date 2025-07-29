import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Grid
} from '@mui/material';
import MaterialDesign3Palette from './MaterialDesign3Palette';
import "../../styles/bpp-color-system.css";
const ColorSystemSection = () => {
  return (
    <Card
      elevation={2}
      sx={{ height: "100%" }}
      className="p-left__md p-right__md p-top__lg"
    >
      <CardHeader
        title="Color System"
        subheader={
          <Typography variant="subtitle2">
            BPP Branding with Material UI Color System
          </Typography>
        }
      />
      <Divider />
      <CardContent>
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={6}>
            {/* Primary Colors */}
            <Typography variant="h6" gutterBottom>
              Primary Colors
            </Typography>
            <Grid container spacing={1} sx={{ mb: 3 }}>
              <Grid item xs={3}>
                <Box sx={{ textAlign: "center" }}>
                  <Box
                    sx={{
                      width: "4rem",
                      height: 60,
                      backgroundColor: "var(--mui-palette-primary-main)",
                      borderRadius: 1,
                      mb: 0.5,
                    }}
                  />
                  <Typography variant="caption" display="block">
                    Primary
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    #3f51b5
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={3}>
                <Box sx={{ textAlign: "center" }}>
                  <Box
                    sx={{
                      width: "4rem",
                      height: 60,
                      backgroundColor: "var(--mui-palette-primary-light)",
                      borderRadius: 1,
                      mb: 0.5,
                    }}
                  />
                  <Typography variant="caption" display="block">
                    Light
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    #7986cb
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={3}>
                <Box sx={{ textAlign: "center" }}>
                  <Box
                    sx={{
                      width: "4rem",
                      height: 60,
                      backgroundColor: "var(--mui-palette-primary-dark)",
                      borderRadius: 1,
                      mb: 0.5,
                    }}
                  />
                  <Typography variant="caption" display="block">
                    Dark
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    #303f9f
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={3}>
                <Box sx={{ textAlign: "center" }}>
                  <Box
                    sx={{
                      width: "4rem",
                      height: 60,
                      backgroundColor: "var(--mui-palette-primary-50)",
                      border: "1px solid #ddd",
                      borderRadius: 1,
                      mb: 0.5,
                    }}
                  />
                  <Typography variant="caption" display="block">
                    Container
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    50 shade
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Grid>
          
          <Grid item xs={6}>
            {/* Secondary Colors */}
            <Typography variant="h6" gutterBottom>
              Secondary Colors
            </Typography>
            <Grid container spacing={1} sx={{ mb: 3 }}>
              <Grid item xs={3}>
                <Box sx={{ textAlign: "center" }}>
                  <Box
                    sx={{
                      width: "4rem",
                      height: 60,
                      backgroundColor: "var(--mui-palette-secondary-main)",
                      borderRadius: 1,
                      mb: 0.5,
                    }}
                  />
                  <Typography variant="caption" display="block">
                    Secondary
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    #ffc107
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={3}>
                <Box sx={{ textAlign: "center" }}>
                  <Box
                    sx={{
                      width: "4rem",
                      height: 60,
                      backgroundColor: "var(--mui-palette-secondary-light)",
                      borderRadius: 1,
                      mb: 0.5,
                    }}
                  />
                  <Typography variant="caption" display="block">
                    Light
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    #ffd54f
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={3}>
                <Box sx={{ textAlign: "center" }}>
                  <Box
                    sx={{
                      width: "4rem",
                      height: 60,
                      backgroundColor: "var(--mui-palette-secondary-dark)",
                      borderRadius: 1,
                      mb: 0.5,
                    }}
                  />
                  <Typography variant="caption" display="block">
                    Dark
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    #ffa000
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={3}>
                <Box sx={{ textAlign: "center" }}>
                  <Box
                    sx={{
                      width: "4rem",
                      height: 60,
                      backgroundColor: "var(--mui-palette-secondary-50)",
                      border: "1px solid #ddd",
                      borderRadius: 1,
                      mb: 0.5,
                    }}
                  />
                  <Typography variant="caption" display="block">
                    Container
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    50 shade
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Grid>

          <Grid item xs={6}>
            {/* Semantic Colors */}
            <Typography variant="h6" gutterBottom>
              Semantic Colors
            </Typography>
            <Grid container spacing={1} sx={{ mb: 3 }}>
              <Grid item xs={3}>
                <Box sx={{ textAlign: "center" }}>
                  <Box
                    sx={{
                      width: "4rem",
                      height: 50,
                      backgroundColor: "var(--mui-palette-success-main)",
                      borderRadius: 1,
                      mb: 0.5,
                    }}
                  />
                  <Typography variant="caption" display="block">
                    Success
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={3}>
                <Box sx={{ textAlign: "center" }}>
                  <Box
                    sx={{
                      width: "4rem",
                      height: 50,
                      backgroundColor: "var(--mui-palette-warning-main)",
                      borderRadius: 1,
                      mb: 0.5,
                    }}
                  />
                  <Typography variant="caption" display="block">
                    Warning
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={3}>
                <Box sx={{ textAlign: "center" }}>
                  <Box
                    sx={{
                      width: "4rem",
                      height: 50,
                      backgroundColor: "var(--mui-palette-error-main)",
                      borderRadius: 1,
                      mb: 0.5,
                    }}
                  />
                  <Typography variant="caption" display="block">
                    Error
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={3}>
                <Box sx={{ textAlign: "center" }}>
                  <Box
                    sx={{
                      width: "4rem",
                      height: 50,
                      backgroundColor: "var(--mui-palette-info-main)",
                      borderRadius: 1,
                      mb: 0.5,
                    }}
                  />
                  <Typography variant="caption" display="block">
                    Info
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Grid>

          <Grid item xs={6}>
            {/* Surface Colors - Material Design 3 */}
            <Typography variant="h6" gutterBottom>
              Surface Colors (Light)
            </Typography>
            <Grid container spacing={1} sx={{ mb: 3 }}>
              <Grid item xs={4}>
                <Box sx={{ textAlign: "center" }}>
                  <Box
                    sx={{
                      width: "3rem",
                      height: 40,
                      backgroundColor: "var(--mui-palette-surface-main)",
                      border: "1px solid #ddd",
                      borderRadius: 1,
                      mb: 0.5,
                    }}
                  />
                  <Typography variant="caption" display="block">
                    Surface
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    #fef7ff
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ textAlign: "center" }}>
                  <Box
                    sx={{
                      width: "3rem",
                      height: 40,
                      backgroundColor: "var(--mui-palette-surface-variant)",
                      border: "1px solid #ddd",
                      borderRadius: 1,
                      mb: 0.5,
                    }}
                  />
                  <Typography variant="caption" display="block">
                    Variant
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    #e7e0ec
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ textAlign: "center" }}>
                  <Box
                    sx={{
                      width: "3rem",
                      height: 40,
                      backgroundColor: "var(--mui-palette-surface-container-highest)",
                      border: "1px solid #ddd",
                      borderRadius: 1,
                      mb: 0.5,
                    }}
                  />
                  <Typography variant="caption" display="block">
                    Container
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    #e6e1e5
                  </Typography>
                </Box>
              </Grid>
            </Grid>
            <Grid container spacing={1}>
              <Grid item xs={4}>
                <Box sx={{ textAlign: "center" }}>
                  <Box
                    sx={{
                      width: "3rem",
                      height: 40,
                      backgroundColor: "var(--mui-palette-surface-container-high)",
                      border: "1px solid #ddd",
                      borderRadius: 1,
                      mb: 0.5,
                    }}
                  />
                  <Typography variant="caption" display="block">
                    High
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    #ece6f0
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ textAlign: "center" }}>
                  <Box
                    sx={{
                      width: "3rem",
                      height: 40,
                      backgroundColor: "var(--mui-palette-surface-container)",
                      border: "1px solid #ddd",
                      borderRadius: 1,
                      mb: 0.5,
                    }}
                  />
                  <Typography variant="caption" display="block">
                    Default
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    #f3edf7
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ textAlign: "center" }}>
                  <Box
                    sx={{
                      width: "3rem",
                      height: 40,
                      backgroundColor: "var(--mui-palette-surface-container-low)",
                      border: "1px solid #ddd",
                      borderRadius: 1,
                      mb: 0.5,
                    }}
                  />
                  <Typography variant="caption" display="block">
                    Low
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    #f7f2fa
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Grid>

          {/* Product Colors Section */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Product Colors
            </Typography>
            <Grid container spacing={1}>
              <Grid item xs={2}>
                <Box sx={{ textAlign: "center" }}>
                  <Box
                    sx={{
                      width: "4rem",
                      height: 50,
                      backgroundColor: "var(--mui-palette-product-tutorial)",
                      borderRadius: 1,
                      mb: 0.5,
                    }}
                  />
                  <Typography variant="caption" display="block">
                    Tutorial
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    #2e7d32
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={2}>
                <Box sx={{ textAlign: "center" }}>
                  <Box
                    sx={{
                      width: "4rem",
                      height: 50,
                      backgroundColor: "var(--mui-palette-product-material)",
                      borderRadius: 1,
                      mb: 0.5,
                    }}
                  />
                  <Typography variant="caption" display="block">
                    Material
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    #1565c0
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={2}>
                <Box sx={{ textAlign: "center" }}>
                  <Box
                    sx={{
                      width: "4rem",
                      height: 50,
                      backgroundColor: "var(--mui-palette-product-marking)",
                      borderRadius: 1,
                      mb: 0.5,
                    }}
                  />
                  <Typography variant="caption" display="block">
                    Marking
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    #f57c00
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={2}>
                <Box sx={{ textAlign: "center" }}>
                  <Box
                    sx={{
                      width: "4rem",
                      height: 50,
                      backgroundColor: "var(--mui-palette-product-online)",
                      borderRadius: 1,
                      mb: 0.5,
                    }}
                  />
                  <Typography variant="caption" display="block">
                    Online
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    #7b1fa2
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={2}>
                <Box sx={{ textAlign: "center" }}>
                  <Box
                    sx={{
                      width: "4rem",
                      height: 50,
                      backgroundColor: "var(--mui-palette-product-voucher)",
                      borderRadius: 1,
                      mb: 0.5,
                    }}
                  />
                  <Typography variant="caption" display="block">
                    Voucher
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    #d32f2f
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={2}>
                <Box sx={{ textAlign: "center" }}>
                  <Box
                    sx={{
                      width: "4rem",
                      height: 50,
                      backgroundColor: "var(--mui-palette-product-bundle)",
                      borderRadius: 1,
                      mb: 0.5,
                    }}
                  />
                  <Typography variant="caption" display="block">
                    Bundle
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    #00695c
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
        
        {/* Material Design 3 Color Palette */}
        <Grid item xs={12} sx={{ mt: 4 }}>
          <MaterialDesign3Palette />
        </Grid>
      </CardContent>
    </Card>
  );
};

export default ColorSystemSection;