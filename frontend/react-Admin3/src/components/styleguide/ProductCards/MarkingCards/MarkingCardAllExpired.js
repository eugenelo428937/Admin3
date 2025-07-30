import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  CardActions,
  Button,
  Chip,
  Divider,
  Tooltip
} from '@mui/material';
import {
  RuleOutlined,
  NotificationsActive,
  InfoOutline,
  CalendarMonthOutlined,
  Block,
  Email
} from '@mui/icons-material';

const MarkingCardAllExpired = () => {
  const mockDeadlines = [
    { id: 1, deadline: new Date('2024-12-15'), recommended_submit_date: new Date('2024-12-10') },
    { id: 2, deadline: new Date('2024-09-15'), recommended_submit_date: new Date('2024-09-10') },
    { id: 3, deadline: new Date('2024-06-15'), recommended_submit_date: new Date('2024-06-10') }
  ];

  const latestExpiredDate = new Date(Math.max(...mockDeadlines.map(d => d.deadline.getTime())));

  return (
    <Card elevation={2} className="product-card d-flex flex-column" sx={{ 
      maxWidth: 340, 
      height: 'fit-content', 
      overflow: 'hidden',
      opacity: 0.8,
      filter: 'grayscale(20%)'
    }}>
      <CardHeader
        title={
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6" sx={{ flex: 1, color: 'text.secondary' }}>
              Actuarial Mathematics Marking
            </Typography>
            <Box
              sx={{
                backgroundColor: 'white',
                borderRadius: '50%',
                p: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}
            >
              <RuleOutlined sx={{ fontSize: 16, color: 'text.disabled' }} />
            </Box>
          </Box>
        }
        className="product-card-header marking-header"
        sx={{ py: 2.5 }}
      />

      <CardContent className="product-card-content" sx={{ marginTop: "0" }}>
        <Box display="flex" gap={1.5} mb={3}>
          <Chip 
            label="CS1" 
            variant="outlined" 
            color="default" 
            sx={{ 
              fontWeight: 600, 
              fontSize: '0.875rem', 
              px: 1.5, 
              py: 0.5, 
              '& .MuiChip-label': { px: 1 },
              opacity: 0.7
            }} 
          />
          <Chip 
            label="2024A" 
            variant="outlined" 
            color="default" 
            sx={{ 
              fontWeight: 600, 
              fontSize: '0.875rem', 
              px: 1.5, 
              py: 0.5, 
              '& .MuiChip-label': { px: 1 },
              opacity: 0.7
            }} 
          />
        </Box>

        <Box mb={1}>
          <Typography variant="subtitle1" color="text.secondary" mb={2} textAlign="left">
            Marking Deadlines
          </Typography>
          
          {/* All expired status */}
          <Box sx={{
            border: 1,
            borderColor: 'error.light',
            borderRadius: 1,
            p: 1.5,
            backgroundColor: 'error.50',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mb: 2,
            transition: 'all 0.2s ease',
          }}>
            <Block sx={{ fontSize: 18, color: 'error.main' }} />
            <Box>
              <Typography variant="body2" color="error.dark" fontWeight={600}>
                All deadlines expired
              </Typography>
              <Typography variant="caption" color="error.dark">
                Last deadline: {latestExpiredDate.toLocaleDateString()}
              </Typography>
            </Box>
          </Box>

          {/* Notification option */}
          <Box sx={{
            border: 1,
            borderColor: 'info.light',
            borderRadius: 1,
            p: 1.5,
            backgroundColor: 'info.50',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            transition: 'all 0.2s ease',
            '&:hover': {
              boxShadow: '1px 2px 1px rgba(0, 0, 0, 0.15)',
              backgroundColor: 'info.100',
            },
          }}>
            <Email sx={{ fontSize: 18, color: 'info.main' }} />
            <Typography variant="body2" color="info.dark">
              Get notified of new deadlines
            </Typography>
          </Box>
        </Box>
      </CardContent>

      <Divider />

      <CardActions className="product-card-actions" sx={{ px: 2, py: 1, flexDirection: 'column', alignItems: 'stretch', mt: 'auto', height: 'auto !important', minHeight: 'auto !important' }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1.5}>
            <Typography variant="h4" fontWeight={700} color="text.disabled">
              £35.00
            </Typography>
            <Tooltip title="Product unavailable">
              <Button variant="outlined" size="small" disabled sx={{ minWidth: 'auto', px: 1, py: 0.5 }}>
                <InfoOutline sx={{ fontSize: 16 }} />
              </Button>
            </Tooltip>
          </Box>
          <Button
            variant="contained"
            startIcon={<NotificationsActive />}
            color="info"
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontSize: '0.75rem',
              py: 1,
              px: 2
            }}
          >
            Notify Me
          </Button>
        </Box>
        <Typography variant="caption" color="text.secondary" mt={1}>
          Product unavailable • Will notify when available
        </Typography>
      </CardActions>
    </Card>
  );
};

export default MarkingCardAllExpired;