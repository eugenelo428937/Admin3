import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Alert,
  CircularProgress,
  LinearProgress,
  Chip,
  Badge,
  Divider,
  Stack
} from '@mui/material';
import { Mail, Notifications, Person } from '@mui/icons-material';

const FeedbackSection = () => {
  return (
    <Card elevation={2} sx={{ height: "100%" }}>
      <CardHeader title="Feedback & Data" />
      <Divider />
      <CardContent>
        <Stack spacing={3}>
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Alerts
            </Typography>
            <Stack spacing={1}>
              <Alert severity="success" size="small">
                Success message
              </Alert>
              <Alert severity="warning" size="small">
                Warning message
              </Alert>
              <Alert severity="error" size="small">
                Error message
              </Alert>
              <Alert severity="info" size="small">
                Info message
              </Alert>
            </Stack>
          </Box>

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Progress
            </Typography>
            <Stack spacing={2}>
              <LinearProgress
                variant="determinate"
                value={60}
              />
              <Box sx={{ display: "flex", gap: 1 }}>
                <CircularProgress size={24} />
                <CircularProgress
                  variant="determinate"
                  value={75}
                  size={24}
                />
              </Box>
            </Stack>
          </Box>

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Chips & Badges
            </Typography>
            <Stack spacing={2}>
              <Stack
                direction="row"
                spacing={1}
                flexWrap="wrap"
                sx={{ gap: 1 }}>
                <Chip label="Default" size="small" />
                <Chip
                  label="Primary"
                  color="primary"
                  size="small"
                />
                <Chip
                  label="Secondary"
                  color="secondary"
                  size="small"
                />
                <Chip
                  label="Success"
                  color="success"
                  size="small"
                />
              </Stack>
              <Stack
                direction="row"
                spacing={2}
                alignItems="center">
                <Badge badgeContent={4} color="primary">
                  <Mail />
                </Badge>
                <Badge badgeContent={99} color="secondary">
                  <Notifications />
                </Badge>
                <Badge variant="dot" color="error">
                  <Person />
                </Badge>
              </Stack>
            </Stack>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default FeedbackSection;