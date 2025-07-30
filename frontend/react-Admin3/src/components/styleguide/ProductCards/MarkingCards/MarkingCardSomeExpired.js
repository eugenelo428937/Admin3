import React, { useState } from 'react';
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
  Tooltip,
  Collapse
} from '@mui/material';
import {
  RuleOutlined,
  AddShoppingCart,
  InfoOutline,
  CalendarMonthOutlined,
  ExpandMore,
  ExpandLess,
  CheckCircle,
  Cancel
} from '@mui/icons-material';

const MarkingCardSomeExpired = () => {
  const [showDetails, setShowDetails] = useState(false);

  const mockDeadlines = [
    { id: 1, deadline: new Date('2025-01-15'), recommended_submit_date: new Date('2025-01-10'), expired: true },
    { id: 2, deadline: new Date('2025-06-15'), recommended_submit_date: new Date('2025-06-10'), expired: false },
    { id: 3, deadline: new Date('2025-09-15'), recommended_submit_date: new Date('2025-09-10'), expired: false }
  ];
  
  const now = new Date();
  const available = mockDeadlines.filter(d => !d.expired);
  const expired = mockDeadlines.filter(d => d.expired);

  return (
    <Card elevation={2} className="product-card d-flex flex-column" sx={{ maxWidth: 340, height: 'fit-content', overflow: 'hidden' }}>
      <CardHeader
        title={
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6" sx={{ flex: 1}}>
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
              <RuleOutlined sx={{ fontSize: 16, color: 'orange.main' }} />
            </Box>
          </Box>
        }
        className="product-card-header marking-header"
        sx={{ py: 2.5 }}
      />

      <CardContent className="product-card-content" sx={{ marginTop: "0" }}>
        <Box display="flex" gap={1.5} mb={3}>
          <Chip label="CS1" variant="filled" color="primary" sx={{ fontWeight: 600, fontSize: '0.875rem', px: 1.5, py: 0.5, '& .MuiChip-label': { px: 1 } }} />
          <Chip label="2024A" variant="filled" color="secondary" sx={{ fontWeight: 600, fontSize: '0.875rem', px: 1.5, py: 0.5, '& .MuiChip-label': { px: 1 } }} />
        </Box>

        <Box mb={1}>
          <Typography variant="subtitle1" color="text.primary" mb={2} textAlign="left">
            Marking Deadlines
          </Typography>
          
          {/* Mixed status summary */}
          <Box sx={{
            border: 1,
            borderColor: 'warning.light',
            borderRadius: 1,
            p: 1.5,
            backgroundColor: 'warning.50',
            mb: 1.5,
            transition: 'all 0.2s ease',
            '&:hover': {
              boxShadow: '1px 2px 1px rgba(0, 0, 0, 0.15)',
              backgroundColor: 'warning.100',
            },
          }}>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <CalendarMonthOutlined sx={{ fontSize: 18, color: 'warning.dark' }} />
              <Typography variant="body2" color="warning.dark" fontWeight={600}>
                Mixed availability
              </Typography>
            </Box>
            <Typography variant="caption" color="warning.dark">
              {available.length} available, {expired.length} expired
            </Typography>
          </Box>

          {/* Toggle details */}
          <Button
            fullWidth
            variant="text"
            size="small"
            onClick={() => setShowDetails(!showDetails)}
            endIcon={showDetails ? <ExpandLess /> : <ExpandMore />}
            sx={{ 
              justifyContent: 'space-between',
              color: 'text.secondary',
              '&:hover': { backgroundColor: 'action.hover' }
            }}
          >
            <Typography variant="caption">
              View deadline details
            </Typography>
          </Button>

          <Collapse in={showDetails}>
            <Box sx={{ mt: 1, pl: 1 }}>
              {mockDeadlines.map((deadline, index) => (
                <Box key={index} display="flex" alignItems="center" gap={1.5} sx={{ py: 0.5 }}>
                  {deadline.expired ? (
                    <Cancel sx={{ fontSize: 14, color: 'error.main' }} />
                  ) : (
                    <CheckCircle sx={{ fontSize: 14, color: 'success.main' }} />
                  )}
                  <Typography 
                    variant="caption" 
                    color={deadline.expired ? 'error.main' : 'success.main'}
                    sx={{ flex: 1 }}
                  >
                    {deadline.deadline.toLocaleDateString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {deadline.expired ? 'Expired' : 'Available'}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Collapse>
        </Box>
      </CardContent>

      <Divider />

      <CardActions className="product-card-actions" sx={{ px: 2, py: 1, flexDirection: 'column', alignItems: 'stretch', mt: 'auto', height: 'auto !important', minHeight: 'auto !important' }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1.5}>
            <Typography variant="h4" fontWeight={700} color="primary.main">
              £35.00
            </Typography>
            <Tooltip title="Show price details">
              <Button variant="outlined" size="small" sx={{ minWidth: 'auto', px: 1, py: 0.5 }}>
                <InfoOutline sx={{ fontSize: 16 }} />
              </Button>
            </Tooltip>
          </Box>
          <Button
            variant="contained"
            color="warning"
            sx={{
              borderRadius: '50%',
              minWidth: 44,
              width: 44,
              height: 44,
              p: 0,
              boxShadow: '0 4px 8px rgba(255, 152, 0, 0.3)',
              '&:hover': {
                boxShadow: '0 6px 12px rgba(255, 152, 0, 0.4)',
                transform: 'translateY(-1px)',
              },
            }}
          >
            <AddShoppingCart sx={{ fontSize: 18 }} />
          </Button>
        </Box>
        <Typography variant="caption" color="text.secondary" mt={1}>
          Limited availability • Price includes VAT
        </Typography>
      </CardActions>
    </Card>
  );
};

export default MarkingCardSomeExpired;