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
  Tooltip
} from '@mui/material';
import {
  RuleOutlined,
  AddShoppingCart,
  InfoOutline,
  CalendarMonthOutlined
} from '@mui/icons-material';

// Enhanced Marking Product Card - All Deadlines Available
const MarkingCardAllAvailable = () => {
	const [selectedPriceType, setSelectedPriceType] = useState('');

	const mockDeadlines = [
		{ id: 1, deadline: new Date('2025-03-15'), recommended_submit_date: new Date('2025-03-10') },
		{ id: 2, deadline: new Date('2025-06-15'), recommended_submit_date: new Date('2025-06-10') },
		{ id: 3, deadline: new Date('2025-09-15'), recommended_submit_date: new Date('2025-09-10') }
	];
	
	const now = new Date();
	const upcoming = mockDeadlines.filter(d => d.deadline > now);
	const expired = mockDeadlines.filter(d => d.deadline <= now);

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
					<Box sx={{
						border: 1,
						borderColor: 'success.light',
						borderRadius: 1,
						p: 1.5,
						backgroundColor: 'success.50',
						display: 'flex',
						alignItems: 'center',
						gap: 1,
						transition: 'all 0.2s ease',
						'&:hover': {
							boxShadow: '1px 2px 1px rgba(0, 0, 0, 0.15)',
							backgroundColor: 'success.100',
						},
					}}>
						<CalendarMonthOutlined sx={{ fontSize: 18, color: 'success.main' }} />
						<Typography variant="body2" color="success.dark">
							{upcoming.length > 0 
								? `Next deadline: ${upcoming[0].deadline.toLocaleDateString()} (${upcoming.length} available)`
								: 'All deadlines available'
							}
						</Typography>
					</Box>
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
						color="success"
						sx={{
							borderRadius: '50%',
							minWidth: 44,
							width: 44,
							height: 44,
							p: 0,
							boxShadow: '0 4px 8px rgba(76, 175, 80, 0.3)',
							'&:hover': {
								boxShadow: '0 6px 12px rgba(76, 175, 80, 0.4)',
								transform: 'translateY(-1px)',
							},
						}}
					>
						<AddShoppingCart sx={{ fontSize: 18 }} />
					</Button>
				</Box>
				<Typography variant="caption" color="text.secondary" mt={1}>
					Standard pricing • Price includes VAT
				</Typography>
			</CardActions>
		</Card>
	);
};

export default MarkingCardAllAvailable;