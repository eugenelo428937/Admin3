import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Button,
  Divider,
  IconButton,
  Stack
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import { useTheme } from "@mui/material/styles";

const ButtonsSection = () => {
  const theme = useTheme();
  return (
    <Card elevation={2} sx={{ height: "100%" }}>
      <CardHeader title="Buttons" />
      <Divider />
      <CardContent>
        <Stack spacing={3}>
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Contained Buttons
            </Typography>
            <Stack
              direction="row"
              spacing={1}
              flexWrap="wrap"
              sx={{ gap: 1 }}>
              <Button 
                variant="contained"
                sx={{
                  backgroundColor: 'var(--mui-palette-primary-main)',
                  color: theme.palette.primary.main,
                  //color: '#ffffff',
                  '&:hover': {
                    backgroundColor: 'var(--mui-palette-primary-dark)',
                  }
                }}
              >
                Primary
              </Button>
              <Button 
                variant="contained" 
                color="secondary"
                sx={{
                  backgroundColor: 'var(--mui-palette-secondary-main)',
                  color: '#000000',
                  '&:hover': {
                    backgroundColor: 'var(--mui-palette-secondary-dark)',
                  }
                }}
              >
                Secondary
              </Button>
              <Button variant="contained" color="success">
                Success
              </Button>
              <Button variant="contained" color="error">
                Error
              </Button>
            </Stack>
          </Box>

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Outlined Buttons
            </Typography>
            <Stack
              direction="row"
              spacing={1}
              flexWrap="wrap"
              sx={{ gap: 1 }}>
              <Button variant="outlined">Primary</Button>
              <Button variant="outlined" color="secondary">
                Secondary
              </Button>
              <Button variant="outlined" color="success">
                Success
              </Button>
            </Stack>
          </Box>

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Text Buttons
            </Typography>
            <Stack
              direction="row"
              spacing={1}
              flexWrap="wrap"
              sx={{ gap: 1 }}>
              <Button>Primary</Button>
              <Button color="secondary">Secondary</Button>
              <Button color="success">Success</Button>
              <Button color="error">Error</Button>
            </Stack>
          </Box>

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Icon & FAB
            </Typography>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center">
              <IconButton color="primary">
                <Add />
              </IconButton>
              <IconButton color="secondary">
                <Edit />
              </IconButton>
              <IconButton color="error">
                <Delete />
              </IconButton>
            </Stack>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default ButtonsSection;