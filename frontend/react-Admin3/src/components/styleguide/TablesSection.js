import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Tooltip,
  IconButton,
  Paper,
  Divider,
  Stack,
  Grid
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Person,
  School,
  LibraryBooks,
  Rule,
  Computer
} from '@mui/icons-material';

const TablesSection = () => {
  return (
    <Card elevation={2} sx={{ height: "100%" }}>
      <CardHeader title="Tables & Data" />
      <Divider />
      <CardContent>
        <Stack spacing={3}>
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Data Table
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Course</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell align="right">
                      Price
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>CP1 Tutorial</TableCell>
                    <TableCell>Tutorial</TableCell>
                    <TableCell align="right">£299</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>CP1 Materials</TableCell>
                    <TableCell>Study Material</TableCell>
                    <TableCell align="right">£99</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>CP1 Marking</TableCell>
                    <TableCell>Assessment</TableCell>
                    <TableCell align="right">£150</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Avatars & Icons
            </Typography>
            <Stack
              direction="row"
              spacing={2}
              alignItems="center">
              <Avatar sx={{ width: 32, height: 32 }}>A</Avatar>
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: "secondary.main",
                }}>
                B
              </Avatar>
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: "success.main",
                }}>
                <Person fontSize="small" />
              </Avatar>
            </Stack>
          </Box>

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Product Icons
            </Typography>
            <Grid container spacing={1}>
              <Grid size={{ xs: 3 }}>
                <Box sx={{ textAlign: "center", p: 1 }}>
                  <School
                    sx={{
                      fontSize: 28,
                      color: "var(--mui-palette-product-tutorial)",
                      mb: 0.5,
                    }}
                  />
                  <Typography
                    variant="caption"
                    display="block">
                    Tutorial
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 3 }}>
                <Box sx={{ textAlign: "center", p: 1 }}>
                  <LibraryBooks
                    sx={{
                      fontSize: 28,
                      color: "var(--mui-palette-product-material)",
                      mb: 0.5,
                    }}
                  />
                  <Typography
                    variant="caption"
                    display="block">
                    Material
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 3 }}>
                <Box sx={{ textAlign: "center", p: 1 }}>
                  <Rule
                    sx={{
                      fontSize: 28,
                      color: "var(--mui-palette-product-marking)",
                      mb: 0.5,
                    }}
                  />
                  <Typography
                    variant="caption"
                    display="block">
                    Marking
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 3 }}>
                <Box sx={{ textAlign: "center", p: 1 }}>
                  <Computer
                    sx={{
                      fontSize: 28,
                      color: "var(--mui-palette-product-online)",
                      mb: 0.5,
                    }}
                  />
                  <Typography
                    variant="caption"
                    display="block">
                    Online
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Tooltips
            </Typography>
            <Stack direction="row" spacing={2}>
              <Tooltip title="Add new item">
                <IconButton size="small">
                  <Add />
                </IconButton>
              </Tooltip>
              <Tooltip title="Edit this item">
                <IconButton size="small">
                  <Edit />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete item">
                <IconButton size="small" color="error">
                  <Delete />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default TablesSection;