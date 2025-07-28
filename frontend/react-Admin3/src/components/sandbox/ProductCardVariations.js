import React, { useState } from 'react';
import {
	Card,
	CardHeader,
	CardContent,
	CardActions,
	Checkbox,
	FormControlLabel,
	Button,
	Typography,
	Box,
	Chip,
	Divider,
	Tooltip,
	Radio,
	RadioGroup,
} from '@mui/material';
import {
	LibraryBooksSharp,
	InfoOutline,
	AddShoppingCart,
	RuleOutlined,
	CalendarMonthOutlined,
	Warning,
	SchoolOutlined,
	ComputerOutlined,
	Inventory2Outlined,
	ConfirmationNumberOutlined,
} from '@mui/icons-material';
import '../../styles/product_card.css';


// Variation B: Enhanced Balanced & Traditional
const BalancedProductCard = () => {
	const [selectedVariations, setSelectedVariations] = useState([]);
	const [selectedPriceType, setSelectedPriceType] = useState(''); // Empty means standard pricing

	return (
		<Card elevation={2} className="product-card d-flex flex-column" sx={{ maxWidth: 340, height: 'fit-content', overflow: 'hidden' }}>
			{/* Enhanced Header - Similar to Variation C */}
			<CardHeader
				title={
					<Box display="flex" alignItems="center" justifyContent="space-between">
						<Typography variant="h6" sx={{ flex: 1}}>
							Actuarial Mathematics Study Material
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
							<LibraryBooksSharp sx={{ fontSize: 16, color: 'primary.main' }} />
						</Box>
					</Box>
				}
				className="product-card-header material-header"
				sx={{
					py: 2.5,
				}}
			/>

			<CardContent className="product-card-content" sx={{ marginTop: "0" }}>
				{/* Enhanced Chips Section - More prominent */}
				<Box display="flex" gap={1.5} mb={3}>
					<Chip 
						label="CS1" 
						variant="filled" 
						color="primary"
						sx={{ 
							fontWeight: 600,
							fontSize: '0.875rem',
							px: 1.5,
							py: 0.5,
							'& .MuiChip-label': { px: 1 }
						}} 
					/>
					<Chip 
						label="2024A" 
						variant="filled" 
						color="secondary"
						sx={{ 
							fontWeight: 600,
							fontSize: '0.875rem',
							px: 1.5,
							py: 0.5,
							'& .MuiChip-label': { px: 1 }
						}} 
					/>
				</Box>

				{/* Enhanced Variations Section - Better hierarchy */}
				<Box>
					<Typography variant="subtitle1" color="text.primary" textAlign="left" className="m-bottom__2xs">
						Product Variations
					</Typography>
					<Box sx={{ display: 'flex', flexDirection: 'column', gap: "m-bottom__2xs" }}>
						<Box
							sx={{
								border: 1,
								borderColor: 'grey.100',
								borderRadius: 1,
								display: 'flex',
								alignItems: 'center',
								transition: 'all 0.2s ease',
								'&:hover': {
									boxShadow: '1px 2px 1px rgba(0, 0, 0, 0.15)',
									backgroundColor: 'grey.50',
								},
							}}
						>
							<FormControlLabel
								control={<Checkbox color="primary" />}
								label={
									<Typography variant="body2">
										Printed Version
									</Typography>
								}
								sx={{ m: 0, flex: 1 }}
							/>
						</Box>
						<Box
							sx={{
								border: 1,
								borderColor: 'grey.100',
								borderRadius: 1,
								display: 'flex',
								alignItems: 'center',
								transition: 'all 0.2s ease',
								'&:hover': {
									boxShadow: '1px 2px 1px rgba(0, 0, 0, 0.15)',
									backgroundColor: 'grey.50',
								},
							}}
						>
							<FormControlLabel
								control={<Checkbox color="primary" />}
								label={
									<Typography variant="body2">
										eBook Version
									</Typography>
								}
								sx={{ m: 0, flex: 1 }}
							/>
						</Box>
					</Box>
				</Box>
			</CardContent>

			<Divider />

			<CardActions className="product-card-actions" sx={{ pt: 2.5, px: 2.5, flexDirection: 'column', alignItems: 'stretch', mt: 'auto', height: 'auto !important', minHeight: 'auto !important' }}>
				{/* Enhanced Discount Options */}
				<Box mb={2.5}>
					<Typography variant="subtitle2" color="text.primary" textAlign="left" className="m-bottom__2xs">
						Discount Options
					</Typography>
					<Box
						sx={{
							border: 1,
							borderColor: 'grey.100',
							borderRadius: 1,
							p: 1.5,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'space-around',
							transition: 'all 0.2s ease',
							'&:hover': {
								boxShadow: '1px 2px 1px rgba(0, 0, 0, 0.15)',
								backgroundColor: 'grey.50',
							},
						}}
					>
						<FormControlLabel
							control={
								<Radio 
									color="primary" 
									checked={selectedPriceType === 'retaker'}
									onClick={() => setSelectedPriceType(selectedPriceType === 'retaker' ? '' : 'retaker')}
								/>
							}
							label={
								<Typography variant="body2">
									Retaker
								</Typography>
							}
							sx={{ m: 0 }}
						/>
						<FormControlLabel
							control={
								<Radio 
									color="primary" 
									checked={selectedPriceType === 'additional'}
									onClick={() => setSelectedPriceType(selectedPriceType === 'additional' ? '' : 'additional')}
								/>
							}
							label={
								<Typography variant="body2">
									Additional Copy
								</Typography>
							}
							sx={{ m: 0 }}
						/>
					</Box>
				</Box>

				{/* Enhanced Price & Action */}
				<Box display="flex" alignItems="center" justifyContent="space-between">
					<Box display="flex" alignItems="center" gap={1.5}>
						<Typography variant="h4" fontWeight={700} color="primary.main">
							{selectedPriceType === 'retaker' ? '£36.00' : 
							 selectedPriceType === 'additional' ? '£22.50' : '£45.00'}
						</Typography>
						<Tooltip title="Show price details">
							<Button 
								variant="outlined" 
								size="small"
								sx={{ 
									minWidth: 'auto',
									px: 1,
									py: 0.5,
								}}
							>
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
					{selectedPriceType === 'retaker' ? 'Retaker discount applied' : 
					 selectedPriceType === 'additional' ? 'Additional copy discount applied' : 'Standard pricing'} • Price includes VAT
				</Typography>
			</CardActions>
		</Card>
	);
};

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

// Enhanced Marking Product Card - Deadlines Expiring Soon
const MarkingCardExpiringSoon = () => {
	const [selectedPriceType, setSelectedPriceType] = useState('');

	const mockDeadlines = [
		{ id: 1, deadline: new Date('2025-01-05'), recommended_submit_date: new Date('2024-12-30') },
		{ id: 2, deadline: new Date('2025-03-15'), recommended_submit_date: new Date('2025-03-10') }
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
						borderColor: 'warning.light',
						borderRadius: 1,
						p: 1.5,
						backgroundColor: 'warning.50',
						display: 'flex',
						alignItems: 'center',
						gap: 1,
						transition: 'all 0.2s ease',
						'&:hover': {
							boxShadow: '1px 2px 1px rgba(0, 0, 0, 0.15)',
							backgroundColor: 'warning.100',
						},
					}}>
						<Warning sx={{ fontSize: 18, color: 'warning.main' }} />
						<Typography variant="body2" color="warning.dark">
							{upcoming.length > 0 
								? `Urgent: Next deadline in ${Math.ceil((upcoming[0].deadline - now) / (1000 * 60 * 60 * 24))} days!`
								: 'Urgent: Deadline approaching soon!'
							}
						</Typography>
					</Box>
				</Box>
			</CardContent>

			<Divider />

			<CardActions className="product-card-actions" sx={{ px: 2, py: 1, flexDirection: 'column', alignItems: 'stretch', mt: 'auto', height: 'auto !important', minHeight: 'auto !important' }}>
				<Box className="m-bottom__2xs">
					<Typography variant="subtitle2" color="text.primary" textAlign="left" className="m-bottom__2xs">
						Discount Options
					</Typography>
					<Box sx={{ border: 1, borderColor: 'grey.100', borderRadius: 1, p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-around', transition: 'all 0.2s ease', '&:hover': { boxShadow: '1px 2px 1px rgba(0, 0, 0, 0.15)', backgroundColor: 'grey.50' } }}>
						<FormControlLabel
							control={<Radio color="primary" checked={selectedPriceType === 'retaker'} onClick={() => setSelectedPriceType(selectedPriceType === 'retaker' ? '' : 'retaker')} />}
							label={<Typography variant="body2">Retaker</Typography>}
							sx={{ m: 0 }}
						/>
						<FormControlLabel
							control={<Radio color="primary" checked={selectedPriceType === 'additional'} onClick={() => setSelectedPriceType(selectedPriceType === 'additional' ? '' : 'additional')} />}
							label={<Typography variant="body2">Additional Copy</Typography>}
							sx={{ m: 0 }}
						/>
					</Box>
				</Box>

				<Box display="flex" alignItems="center" justifyContent="space-between">
					<Box display="flex" alignItems="center" gap={1.5}>
						<Typography variant="h4" fontWeight={700} color="primary.main">
							{selectedPriceType === 'retaker' ? '£28.00' : selectedPriceType === 'additional' ? '£17.50' : '£35.00'}
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
							boxShadow: '0 4px 8px rgba(237, 108, 2, 0.3)',
							'&:hover': {
								boxShadow: '0 6px 12px rgba(237, 108, 2, 0.4)',
								transform: 'translateY(-1px)',
							},
						}}
					>
						<AddShoppingCart sx={{ fontSize: 18 }} />
					</Button>
				</Box>
				<Typography variant="caption" color="text.secondary" mt={1}>
					{selectedPriceType === 'retaker' ? 'Retaker discount applied' : selectedPriceType === 'additional' ? 'Additional copy discount applied' : 'Standard pricing'} • Price includes VAT
				</Typography>
			</CardActions>
		</Card>
	);
};

// Enhanced Marking Product Card - Some Deadlines Expired
const MarkingCardSomeExpired = () => {
	const [selectedPriceType, setSelectedPriceType] = useState('');

	const mockDeadlines = [
		{ id: 1, deadline: new Date('2024-10-15'), recommended_submit_date: new Date('2024-10-10') },
		{ id: 2, deadline: new Date('2025-03-15'), recommended_submit_date: new Date('2025-03-10') }
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
						borderColor: 'warning.light',
						borderRadius: 1,
						p: 1.5,
						backgroundColor: 'warning.50',
						display: 'flex',
						alignItems: 'center',
						gap: 1,
						transition: 'all 0.2s ease',
						'&:hover': {
							boxShadow: '1px 2px 1px rgba(0, 0, 0, 0.15)',
							backgroundColor: 'warning.100',
						},
					}}>
						<Warning sx={{ fontSize: 18, color: 'warning.main' }} />
						<Typography variant="body2" color="warning.dark">
							{expired.length} deadline expired, {upcoming.length} remaining
						</Typography>
					</Box>
				</Box>
			</CardContent>

			<Divider />

			<CardActions className="product-card-actions" sx={{ px: 2, py: 1, flexDirection: 'column', alignItems: 'stretch', mt: 'auto', height: 'auto !important', minHeight: 'auto !important' }}>
				<Box className="m-bottom__2xs">
					<Typography variant="subtitle2" color="text.primary" textAlign="left" className="m-bottom__2xs">
						Discount Options
					</Typography>
					<Box sx={{ border: 1, borderColor: 'grey.100', borderRadius: 1, p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-around', transition: 'all 0.2s ease', '&:hover': { boxShadow: '1px 2px 1px rgba(0, 0, 0, 0.15)', backgroundColor: 'grey.50' } }}>
						<FormControlLabel
							control={<Radio color="primary" checked={selectedPriceType === 'retaker'} onClick={() => setSelectedPriceType(selectedPriceType === 'retaker' ? '' : 'retaker')} />}
							label={<Typography variant="body2">Retaker</Typography>}
							sx={{ m: 0 }}
						/>
						<FormControlLabel
							control={<Radio color="primary" checked={selectedPriceType === 'additional'} onClick={() => setSelectedPriceType(selectedPriceType === 'additional' ? '' : 'additional')} />}
							label={<Typography variant="body2">Additional Copy</Typography>}
							sx={{ m: 0 }}
						/>
					</Box>
				</Box>

				<Box display="flex" alignItems="center" justifyContent="space-between">
					<Box display="flex" alignItems="center" gap={1.5}>
						<Typography variant="h4" fontWeight={700} color="primary.main">
							{selectedPriceType === 'retaker' ? '£28.00' : selectedPriceType === 'additional' ? '£17.50' : '£35.00'}
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
							boxShadow: '0 4px 8px rgba(237, 108, 2, 0.3)',
							'&:hover': {
								boxShadow: '0 6px 12px rgba(237, 108, 2, 0.4)',
								transform: 'translateY(-1px)',
							},
						}}
					>
						<AddShoppingCart sx={{ fontSize: 18 }} />
					</Button>
				</Box>
				<Typography variant="caption" color="text.secondary" mt={1}>
					{selectedPriceType === 'retaker' ? 'Retaker discount applied' : selectedPriceType === 'additional' ? 'Additional copy discount applied' : 'Standard pricing'} • Price includes VAT
				</Typography>
			</CardActions>
		</Card>
	);
};

// Enhanced Marking Product Card - All Deadlines Expired
const MarkingCardAllExpired = () => {

	const mockDeadlines = [
		{ id: 1, deadline: new Date('2024-10-15'), recommended_submit_date: new Date('2024-10-10') },
		{ id: 2, deadline: new Date('2024-11-15'), recommended_submit_date: new Date('2024-11-10') }
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
						borderColor: 'error.light',
						borderRadius: 1,
						p: 1.5,
						backgroundColor: 'error.50',
						display: 'flex',
						alignItems: 'center',
						gap: 1,
						transition: 'all 0.2s ease',
						'&:hover': {
							boxShadow: '1px 2px 1px rgba(0, 0, 0, 0.15)',
							backgroundColor: 'error.100',
						},
					}}>
						<Warning sx={{ fontSize: 18, color: 'error.main' }} />
						<Typography variant="body2" color="error.dark">
							All deadlines have expired
						</Typography>
					</Box>
				</Box>
			</CardContent>

			<Divider />

			<CardActions className="product-card-actions" sx={{ px: 2, py: 1, flexDirection: 'column', alignItems: 'stretch', mt: 'auto', height: 'auto !important', minHeight: 'auto !important' }}>
				<Box className="m-bottom__2xs">
					<Typography variant="subtitle2" color="text.secondary" textAlign="left" className="m-bottom__2xs">
						Discount Options
					</Typography>
					<Box sx={{ border: 1, borderColor: 'grey.300', borderRadius: 1, p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-around', backgroundColor: 'grey.50', opacity: 0.6 }}>
						<FormControlLabel
							control={<Radio color="primary" disabled />}
							label={<Typography variant="body2" color="text.disabled">Retaker</Typography>}
							sx={{ m: 0 }}
						/>
						<FormControlLabel
							control={<Radio color="primary" disabled />}
							label={<Typography variant="body2" color="text.disabled">Additional Copy</Typography>}
							sx={{ m: 0 }}
						/>
					</Box>
				</Box>

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
						disabled
						sx={{
							borderRadius: '50%',
							minWidth: 44,
							width: 44,
							height: 44,
							p: 0,
						}}
					>
						<AddShoppingCart sx={{ fontSize: 18 }} />
					</Button>
				</Box>
				<Typography variant="caption" color="text.disabled" mt={1}>
					Product unavailable - All deadlines expired
				</Typography>
			</CardActions>
		</Card>
	);
};

// Enhanced Marking Product Card based on the template (Original)
const EnhancedMarkingProductCard = () => {
	const [selectedVariations, setSelectedVariations] = useState([]);
	const [selectedPriceType, setSelectedPriceType] = useState(''); // Empty means standard pricing

	// Mock marking deadlines data
	const mockDeadlines = [
		{ id: 1, deadline: new Date('2024-12-15'), recommended_submit_date: new Date('2024-12-10') },
		{ id: 2, deadline: new Date('2024-10-30'), recommended_submit_date: new Date('2024-10-25') }
	];
	
	const now = new Date();
	const upcoming = mockDeadlines.filter(d => d.deadline > now);
	const expired = mockDeadlines.filter(d => d.deadline <= now);

	return (
		<Card elevation={2} className="product-card d-flex flex-column" sx={{ maxWidth: 340, height: 'fit-content', overflow: 'hidden' }}>
			{/* Enhanced Header - Marking themed */}
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
				sx={{
					py: 2.5,
				}}
			/>

			<CardContent className="product-card-content" sx={{ marginTop: "0" }}>
				{/* Enhanced Chips Section */}
				<Box display="flex" gap={1.5} mb={3}>
					<Chip 
						label="CS1" 
						variant="filled" 
						color="primary"
						sx={{ 
							fontWeight: 600,
							fontSize: '0.875rem',
							px: 1.5,
							py: 0.5,
							'& .MuiChip-label': { px: 1 }
						}} 
					/>
					<Chip 
						label="2024A" 
						variant="filled" 
						color="secondary"
						sx={{ 
							fontWeight: 600,
							fontSize: '0.875rem',
							px: 1.5,
							py: 0.5,
							'& .MuiChip-label': { px: 1 }
						}} 
					/>
				</Box>

				{/* Marking Deadlines Information */}
				<Box mb={1}>
					<Typography variant="subtitle1" color="text.primary" mb={2} textAlign="left">
						Marking Deadlines
					</Typography>
					
					{upcoming.length > 0 ? (
						<Box
							sx={{
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
							}}
						>
							<CalendarMonthOutlined sx={{ fontSize: 18, color: 'success.main' }} />
							<Typography variant="body2" color="success.dark">
								Next deadline: {upcoming[0].deadline.toLocaleDateString()}
							</Typography>
						</Box>
					) : (
						<Box
							sx={{
								border: 1,
								borderColor: 'warning.light',
								borderRadius: 1,
								p: 1.5,
								backgroundColor: 'warning.50',
								display: 'flex',
								alignItems: 'center',
								gap: 1,
								transition: 'all 0.2s ease',
								'&:hover': {
									boxShadow: '1px 2px 1px rgba(0, 0, 0, 0.15)',
									backgroundColor: 'warning.100',
								},
							}}
						>
							<Warning sx={{ fontSize: 18, color: 'warning.main' }} />
							<Typography variant="body2" color="warning.dark">
								Some deadlines have expired
							</Typography>
						</Box>
					)}
				</Box>

			</CardContent>

			<Divider />

			<CardActions className="product-card-actions" sx={{ px: 2, py: 1, flexDirection: 'column', alignItems: 'stretch', mt: 'auto', height: 'auto !important', minHeight: 'auto !important' }}>
				{/* Enhanced Discount Options - Same template */}
				<Box className="m-bottom__2xs">
					<Typography variant="subtitle2" color="text.primary" textAlign="left" className="m-bottom__2xs">
						Discount Options
					</Typography>
					<Box
						sx={{
							border: 1,
							borderColor: 'grey.100',
							borderRadius: 1,
							p: 1.5,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'space-around',
							transition: 'all 0.2s ease',
							'&:hover': {
								boxShadow: '1px 2px 1px rgba(0, 0, 0, 0.15)',
								backgroundColor: 'grey.50',
							},
						}}
					>
						<FormControlLabel
							control={
								<Radio 
									color="primary" 
									checked={selectedPriceType === 'retaker'}
									onClick={() => setSelectedPriceType(selectedPriceType === 'retaker' ? '' : 'retaker')}
								/>
							}
							label={
								<Typography variant="body2">
									Retaker
								</Typography>
							}
							sx={{ m: 0 }}
						/>
						<FormControlLabel
							control={
								<Radio 
									color="primary" 
									checked={selectedPriceType === 'additional'}
									onClick={() => setSelectedPriceType(selectedPriceType === 'additional' ? '' : 'additional')}
								/>
							}
							label={
								<Typography variant="body2">
									Additional Copy
								</Typography>
							}
							sx={{ m: 0 }}
						/>
					</Box>
				</Box>

				{/* Enhanced Price & Action */}
				<Box display="flex" alignItems="center" justifyContent="space-between">
					<Box display="flex" alignItems="center" gap={1.5}>
						<Typography variant="h4" fontWeight={700} color="primary.main">
							{selectedPriceType === 'retaker' ? '£28.00' : 
							 selectedPriceType === 'additional' ? '£17.50' : '£35.00'}
						</Typography>
						<Tooltip title="Show price details">
							<Button 
								variant="outlined" 
								size="small"
								sx={{ 
									minWidth: 'auto',
									px: 1,
									py: 0.5,
								}}
							>
								<InfoOutline sx={{ fontSize: 16 }} />
							</Button>
						</Tooltip>
					</Box>
					<Button
						variant="contained"
						color="success"
						disabled={expired.length === mockDeadlines.length} // Disable if all deadlines expired
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
					{selectedPriceType === 'retaker' ? 'Retaker discount applied' : 
					 selectedPriceType === 'additional' ? 'Additional copy discount applied' : 'Standard pricing'} • Price includes VAT
				</Typography>
			</CardActions>
		</Card>
	);
};

// Enhanced Tutorial Product Card - Available Registration
const EnhancedTutorialProductCard = () => {
	const [selectedVariation, setSelectedVariation] = useState('live');
	const [selectedPriceType, setSelectedPriceType] = useState('');

	const handleVariationToggle = (variation) => {
		setSelectedVariation(selectedVariation === variation ? '' : variation);
	};

	return (
		<Card elevation={2} className="product-card d-flex flex-column" sx={{ maxWidth: 340, height: 'fit-content', overflow: 'hidden' }}>
			<CardHeader
				title={
					<Box display="flex" alignItems="center" justifyContent="space-between">
						<Typography variant="h6" sx={{ flex: 1}}>
							CS1 Weekend Tutorial
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
							<SchoolOutlined sx={{ fontSize: 16, color: 'success.main' }} />
						</Box>
					</Box>
				}
				className="product-card-header tutorial-header"
				sx={{ py: 2.5 }}
			/>

			<CardContent className="product-card-content" sx={{ marginTop: "0" }}>
				<Box display="flex" gap={1.5} mb={3}>
					<Chip label="CS1" variant="filled" color="primary" sx={{ fontWeight: 600, fontSize: '0.875rem', px: 1.5, py: 0.5, '& .MuiChip-label': { px: 1 } }} />
					<Chip label="London" variant="filled" color="secondary" sx={{ fontWeight: 600, fontSize: '0.875rem', px: 1.5, py: 0.5, '& .MuiChip-label': { px: 1 } }} />
				</Box>

				<Box mb={3}>
					<Typography variant="subtitle1" color="text.primary" mb={2} textAlign="left">
						Tutorial Information
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
							Weekend Course: Feb 15-16, 2025
						</Typography>
					</Box>
				</Box>

				<Box mb={2}>
					<Typography variant="subtitle2" color="text.primary" mb={1} textAlign="left">
						Tutorial Format
					</Typography>
					<Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
						<Box sx={{ border: 1, borderColor: selectedVariation === 'live' ? 'success.main' : 'grey.200', borderRadius: 1, p: 1, backgroundColor: selectedVariation === 'live' ? 'success.50' : 'transparent', cursor: 'pointer', transition: 'all 0.2s ease' }} onClick={() => handleVariationToggle('live')}>
							<FormControlLabel
								control={<Radio size="small" checked={selectedVariation === 'live'} color="success" sx={{ '& .MuiSvgIcon-root': { fontSize: 16 } }} />}
								label={<Typography variant="body2">Live Tutorial</Typography>}
								sx={{ m: 0, pointerEvents: 'none' }}
							/>
						</Box>
						<Box sx={{ border: 1, borderColor: selectedVariation === 'hybrid' ? 'success.main' : 'grey.200', borderRadius: 1, p: 1, backgroundColor: selectedVariation === 'hybrid' ? 'success.50' : 'transparent', cursor: 'pointer', transition: 'all 0.2s ease' }} onClick={() => handleVariationToggle('hybrid')}>
							<FormControlLabel
								control={<Radio size="small" checked={selectedVariation === 'hybrid'} color="success" sx={{ '& .MuiSvgIcon-root': { fontSize: 16 } }} />}
								label={<Typography variant="body2">Live + Recording Access</Typography>}
								sx={{ m: 0, pointerEvents: 'none' }}
							/>
						</Box>
					</Box>
				</Box>
			</CardContent>

			<Divider />

			<CardActions className="product-card-actions" sx={{ px: 2, py: 1, flexDirection: 'column', alignItems: 'stretch', mt: 'auto', height: 'auto !important', minHeight: 'auto !important' }}>
				<Box mb={2.5}>
					<Typography variant="subtitle2" color="text.primary" textAlign="left" className="m-bottom__2xs">
						Discount Options
					</Typography>
					<Box sx={{ border: 1, borderColor: 'grey.100', borderRadius: 1, p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-around', transition: 'all 0.2s ease', '&:hover': { boxShadow: '1px 2px 1px rgba(0, 0, 0, 0.15)', backgroundColor: 'grey.50' } }}>
						<FormControlLabel
							control={<Radio color="primary" checked={selectedPriceType === 'retaker'} onClick={() => setSelectedPriceType(selectedPriceType === 'retaker' ? '' : 'retaker')} />}
							label={<Typography variant="body2">Retaker</Typography>}
							sx={{ m: 0 }}
						/>
						<FormControlLabel
							control={<Radio color="primary" checked={selectedPriceType === 'student'} onClick={() => setSelectedPriceType(selectedPriceType === 'student' ? '' : 'student')} />}
							label={<Typography variant="body2">Student</Typography>}
							sx={{ m: 0 }}
						/>
					</Box>
				</Box>

				<Box display="flex" alignItems="center" justifyContent="space-between">
					<Box display="flex" alignItems="center" gap={1.5}>
						<Typography variant="h4" fontWeight={700} color="primary.main">
							{(() => {
								let basePrice = selectedVariation === 'hybrid' ? 280 : 220;
								if (selectedPriceType === 'retaker') return `£${(basePrice * 0.8).toFixed(2)}`;
								if (selectedPriceType === 'student') return `£${(basePrice * 0.85).toFixed(2)}`;
								return `£${basePrice.toFixed(2)}`;
							})()}
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
						disabled={!selectedVariation}
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
					{selectedPriceType === 'retaker' ? 'Retaker discount applied' : selectedPriceType === 'student' ? 'Student discount applied' : 'Standard pricing'} • Price includes VAT
				</Typography>
			</CardActions>
		</Card>
	);
};

// Enhanced Tutorial Product Card - Fully Booked
const EnhancedTutorialFullyBookedCard = () => {
	return (
		<Card elevation={2} className="product-card d-flex flex-column" sx={{ maxWidth: 340, height: 'fit-content', overflow: 'hidden' }}>
			<CardHeader
				title={
					<Box display="flex" alignItems="center" justifyContent="space-between">
						<Typography variant="h6" sx={{ flex: 1}}>
							CS1 Weekend Tutorial
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
							<SchoolOutlined sx={{ fontSize: 16, color: 'warning.main' }} />
						</Box>
					</Box>
				}
				className="product-card-header tutorial-header"
				sx={{ py: 2.5 }}
			/>

			<CardContent className="product-card-content" sx={{ marginTop: "0" }}>
				<Box display="flex" gap={1.5} mb={3}>
					<Chip label="CS1" variant="filled" color="primary" sx={{ fontWeight: 600, fontSize: '0.875rem', px: 1.5, py: 0.5, '& .MuiChip-label': { px: 1 } }} />
					<Chip label="London" variant="filled" color="secondary" sx={{ fontWeight: 600, fontSize: '0.875rem', px: 1.5, py: 0.5, '& .MuiChip-label': { px: 1 } }} />
				</Box>

				<Box mb={3}>
					<Typography variant="subtitle1" color="text.primary" mb={2} textAlign="left">
						Availability Status
					</Typography>
					<Box sx={{
						border: 1,
						borderColor: 'warning.light',
						borderRadius: 1,
						p: 1.5,
						backgroundColor: 'warning.50',
						display: 'flex',
						alignItems: 'center',
						gap: 1,
					}}>
						<Warning sx={{ fontSize: 18, color: 'warning.main' }} />
						<Typography variant="body2" color="warning.dark">
							Fully Booked - Join Waitlist
						</Typography>
					</Box>
				</Box>

				<Box mb={2}>
					<Typography variant="subtitle2" color="text.secondary" mb={1} textAlign="left">
						Tutorial Information
					</Typography>
					<Box sx={{ border: 1, borderColor: 'grey.300', borderRadius: 1, p: 1.5, backgroundColor: 'grey.50', opacity: 0.7 }}>
						<Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
							<CalendarMonthOutlined sx={{ fontSize: 16 }} /> Weekend Course: Feb 15-16, 2025
						</Typography>
					</Box>
				</Box>
			</CardContent>

			<Divider />

			<CardActions className="product-card-actions" sx={{ px: 2, py: 1, flexDirection: 'column', alignItems: 'stretch', mt: 'auto', height: 'auto !important', minHeight: 'auto !important' }}>
				<Box display="flex" alignItems="center" justifyContent="space-between">
					<Box display="flex" alignItems="center" gap={1.5}>
						<Typography variant="h4" fontWeight={700} color="text.disabled">
							£220.00
						</Typography>
						<Tooltip title="Currently unavailable">
							<Button variant="outlined" size="small" disabled sx={{ minWidth: 'auto', px: 1, py: 0.5 }}>
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
							boxShadow: '0 4px 8px rgba(237, 108, 2, 0.3)',
							'&:hover': {
								boxShadow: '0 6px 12px rgba(237, 108, 2, 0.4)',
								transform: 'translateY(-1px)',
							},
						}}
					>
						<AddShoppingCart sx={{ fontSize: 18 }} />
					</Button>
				</Box>
				<Typography variant="caption" color="text.secondary" mt={1}>
					Join waitlist • We'll notify you if space becomes available
				</Typography>
			</CardActions>
		</Card>
	);
};

// Enhanced Tutorial Product Card - Registration Deadline Passed
const EnhancedTutorialExpiredCard = () => {
	return (
		<Card elevation={2} className="product-card d-flex flex-column" sx={{ maxWidth: 340, height: 'fit-content', overflow: 'hidden' }}>
			<CardHeader
				title={
					<Box display="flex" alignItems="center" justifyContent="space-between">
						<Typography variant="h6" sx={{ flex: 1}}>
							CS1 Weekend Tutorial
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
							<SchoolOutlined sx={{ fontSize: 16, color: 'error.main' }} />
						</Box>
					</Box>
				}
				className="product-card-header tutorial-header"
				sx={{ py: 2.5 }}
			/>

			<CardContent className="product-card-content" sx={{ marginTop: "0" }}>
				<Box display="flex" gap={1.5} mb={3}>
					<Chip label="CS1" variant="filled" color="primary" sx={{ fontWeight: 600, fontSize: '0.875rem', px: 1.5, py: 0.5, '& .MuiChip-label': { px: 1 } }} />
					<Chip label="London" variant="filled" color="secondary" sx={{ fontWeight: 600, fontSize: '0.875rem', px: 1.5, py: 0.5, '& .MuiChip-label': { px: 1 } }} />
				</Box>

				<Box mb={3}>
					<Typography variant="subtitle1" color="text.primary" mb={2} textAlign="left">
						Registration Status
					</Typography>
					<Box sx={{
						border: 1,
						borderColor: 'error.light',
						borderRadius: 1,
						p: 1.5,
						backgroundColor: 'error.50',
						display: 'flex',
						alignItems: 'center',
						gap: 1,
					}}>
						<Warning sx={{ fontSize: 18, color: 'error.main' }} />
						<Typography variant="body2" color="error.dark">
							Registration Deadline Passed
						</Typography>
					</Box>
				</Box>

				<Box mb={2}>
					<Typography variant="subtitle2" color="text.secondary" mb={1} textAlign="left">
						Tutorial Information
					</Typography>
					<Box sx={{ border: 1, borderColor: 'grey.300', borderRadius: 1, p: 1.5, backgroundColor: 'grey.50', opacity: 0.7 }}>
						<Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
							<CalendarMonthOutlined sx={{ fontSize: 16 }} /> Weekend Course: Jan 18-19, 2025 (Past)
						</Typography>
					</Box>
				</Box>
			</CardContent>

			<Divider />

			<CardActions className="product-card-actions" sx={{ px: 2, py: 1, flexDirection: 'column', alignItems: 'stretch', mt: 'auto', height: 'auto !important', minHeight: 'auto !important' }}>
				<Box display="flex" alignItems="center" justifyContent="space-between">
					<Box display="flex" alignItems="center" gap={1.5}>
						<Typography variant="h4" fontWeight={700} color="text.disabled">
							£220.00
						</Typography>
						<Tooltip title="Registration closed">
							<Button variant="outlined" size="small" disabled sx={{ minWidth: 'auto', px: 1, py: 0.5 }}>
								<InfoOutline sx={{ fontSize: 16 }} />
							</Button>
						</Tooltip>
					</Box>
					<Button
						variant="contained"
						disabled
						sx={{
							borderRadius: '50%',
							minWidth: 44,
							width: 44,
							height: 44,
							p: 0,
						}}
					>
						<AddShoppingCart sx={{ fontSize: 18 }} />
					</Button>
				</Box>
				<Typography variant="caption" color="text.disabled" mt={1}>
					Tutorial unavailable • Registration period ended
				</Typography>
			</CardActions>
		</Card>
	);
};

// Enhanced Online Classroom Product Card - Current Access
const EnhancedOnlineClassroomProductCard = () => {
	const [selectedVariation, setSelectedVariation] = useState('recording');
	const [selectedPriceType, setSelectedPriceType] = useState('');

	const handleVariationToggle = (variation) => {
		setSelectedVariation(selectedVariation === variation ? '' : variation);
	};

	return (
		<Card elevation={2} className="product-card d-flex flex-column" sx={{ maxWidth: 340, height: 'fit-content', overflow: 'hidden' }}>
			<CardHeader
				title={
					<Box display="flex" alignItems="center" justifyContent="space-between">
						<Typography variant="h6" sx={{ flex: 1}}>
							CS1 Online Classroom
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
							<ComputerOutlined sx={{ fontSize: 16, color: '#9c27b0' }} />
						</Box>
					</Box>
				}
				className="product-card-header online-classroom-header"
				sx={{ py: 2.5 }}
			/>

			<CardContent className="product-card-content" sx={{ marginTop: "0" }}>
				<Box display="flex" gap={1.5} mb={3}>
					<Chip label="CS1" variant="filled" color="primary" sx={{ fontWeight: 600, fontSize: '0.875rem', px: 1.5, py: 0.5, '& .MuiChip-label': { px: 1 } }} />
					<Chip label="Digital" variant="filled" color="secondary" sx={{ fontWeight: 600, fontSize: '0.875rem', px: 1.5, py: 0.5, '& .MuiChip-label': { px: 1 } }} />
				</Box>

				<Box mb={3}>
					<Typography variant="subtitle1" color="text.primary" mb={2} textAlign="left">
						Access Information
					</Typography>
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
						<ComputerOutlined sx={{ fontSize: 18, color: 'info.main' }} />
						<Typography variant="body2" color="info.dark">
							12 months access • HD recordings
						</Typography>
					</Box>
				</Box>

				<Box mb={2}>
					<Typography variant="subtitle2" color="text.primary" mb={1} textAlign="left">
						Content Type
					</Typography>
					<Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
						<Box sx={{ border: 1, borderColor: selectedVariation === 'recording' ? 'info.main' : 'grey.200', borderRadius: 1, p: 1, backgroundColor: selectedVariation === 'recording' ? 'info.50' : 'transparent', cursor: 'pointer', transition: 'all 0.2s ease' }} onClick={() => handleVariationToggle('recording')}>
							<FormControlLabel
								control={<Radio size="small" checked={selectedVariation === 'recording'} color="info" sx={{ '& .MuiSvgIcon-root': { fontSize: 16 } }} />}
								label={<Typography variant="body2">Session Recordings</Typography>}
								sx={{ m: 0, pointerEvents: 'none' }}
							/>
						</Box>
						<Box sx={{ border: 1, borderColor: selectedVariation === 'live' ? 'info.main' : 'grey.200', borderRadius: 1, p: 1, backgroundColor: selectedVariation === 'live' ? 'info.50' : 'transparent', cursor: 'pointer', transition: 'all 0.2s ease' }} onClick={() => handleVariationToggle('live')}>
							<FormControlLabel
								control={<Radio size="small" checked={selectedVariation === 'live'} color="info" sx={{ '& .MuiSvgIcon-root': { fontSize: 16 } }} />}
								label={<Typography variant="body2">Live Sessions + Recordings</Typography>}
								sx={{ m: 0, pointerEvents: 'none' }}
							/>
						</Box>
					</Box>
				</Box>
			</CardContent>

			<Divider />

			<CardActions className="product-card-actions" sx={{ px: 2, py: 1, flexDirection: 'column', alignItems: 'stretch', mt: 'auto', height: 'auto !important', minHeight: 'auto !important' }}>
				<Box mb={2.5}>
					<Typography variant="subtitle2" color="text.primary" textAlign="left" className="m-bottom__2xs">
						Discount Options
					</Typography>
					<Box sx={{ border: 1, borderColor: 'grey.100', borderRadius: 1, p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-around', transition: 'all 0.2s ease', '&:hover': { boxShadow: '1px 2px 1px rgba(0, 0, 0, 0.15)', backgroundColor: 'grey.50' } }}>
						<FormControlLabel
							control={<Radio color="primary" checked={selectedPriceType === 'retaker'} onClick={() => setSelectedPriceType(selectedPriceType === 'retaker' ? '' : 'retaker')} />}
							label={<Typography variant="body2">Retaker</Typography>}
							sx={{ m: 0 }}
						/>
						<FormControlLabel
							control={<Radio color="primary" checked={selectedPriceType === 'student'} onClick={() => setSelectedPriceType(selectedPriceType === 'student' ? '' : 'student')} />}
							label={<Typography variant="body2">Student</Typography>}
							sx={{ m: 0 }}
						/>
					</Box>
				</Box>

				<Box display="flex" alignItems="center" justifyContent="space-between">
					<Box display="flex" alignItems="center" gap={1.5}>
						<Typography variant="h4" fontWeight={700} color="primary.main">
							{(() => {
								let basePrice = selectedVariation === 'live' ? 180 : 150;
								if (selectedPriceType === 'retaker') return `£${(basePrice * 0.8).toFixed(2)}`;
								if (selectedPriceType === 'student') return `£${(basePrice * 0.85).toFixed(2)}`;
								return `£${basePrice.toFixed(2)}`;
							})()}
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
						disabled={!selectedVariation}
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
					{selectedPriceType === 'retaker' ? 'Retaker discount applied' : selectedPriceType === 'student' ? 'Student discount applied' : 'Standard pricing'} • Price includes VAT
				</Typography>
			</CardActions>
		</Card>
	);
};

// Enhanced Online Classroom Product Card - Coming Soon
const EnhancedOnlineClassroomComingSoonCard = () => {
	return (
		<Card elevation={2} className="product-card d-flex flex-column" sx={{ maxWidth: 340, height: 'fit-content', overflow: 'hidden' }}>
			<CardHeader
				title={
					<Box display="flex" alignItems="center" justifyContent="space-between">
						<Typography variant="h6" sx={{ flex: 1}}>
							CS1 Online Classroom
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
							<ComputerOutlined sx={{ fontSize: 16, color: 'warning.main' }} />
						</Box>
					</Box>
				}
				className="product-card-header online-classroom-header"
				sx={{ py: 2.5 }}
			/>

			<CardContent className="product-card-content" sx={{ marginTop: "0" }}>
				<Box display="flex" gap={1.5} mb={3}>
					<Chip label="CS1" variant="filled" color="primary" sx={{ fontWeight: 600, fontSize: '0.875rem', px: 1.5, py: 0.5, '& .MuiChip-label': { px: 1 } }} />
					<Chip label="2025B" variant="filled" color="secondary" sx={{ fontWeight: 600, fontSize: '0.875rem', px: 1.5, py: 0.5, '& .MuiChip-label': { px: 1 } }} />
				</Box>

				<Box mb={3}>
					<Typography variant="subtitle1" color="text.primary" mb={2} textAlign="left">
						Availability Status
					</Typography>
					<Box sx={{
						border: 1,
						borderColor: 'warning.light',
						borderRadius: 1,
						p: 1.5,
						backgroundColor: 'warning.50',
						display: 'flex',
						alignItems: 'center',
						gap: 1,
					}}>
						<CalendarMonthOutlined sx={{ fontSize: 18, color: 'warning.main' }} />
						<Typography variant="body2" color="warning.dark">
							Coming Soon - Sessions start June 2025
						</Typography>
					</Box>
				</Box>

				<Box mb={2}>
					<Typography variant="subtitle2" color="text.secondary" mb={1} textAlign="left">
						Planned Content
					</Typography>
					<Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
						<Box sx={{ border: 1, borderColor: 'grey.300', borderRadius: 1, p: 1, backgroundColor: 'grey.50', opacity: 0.7 }}>
							<Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
								<ComputerOutlined sx={{ fontSize: 14 }} /> Live interactive sessions
							</Typography>
						</Box>
						<Box sx={{ border: 1, borderColor: 'grey.300', borderRadius: 1, p: 1, backgroundColor: 'grey.50', opacity: 0.7 }}>
							<Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
								<ComputerOutlined sx={{ fontSize: 14 }} /> HD session recordings
							</Typography>
						</Box>
					</Box>
				</Box>
			</CardContent>

			<Divider />

			<CardActions className="product-card-actions" sx={{ px: 2, py: 1, flexDirection: 'column', alignItems: 'stretch', mt: 'auto', height: 'auto !important', minHeight: 'auto !important' }}>
				<Box display="flex" alignItems="center" justifyContent="space-between">
					<Box display="flex" alignItems="center" gap={1.5}>
						<Typography variant="h4" fontWeight={700} color="text.secondary">
							£150.00
						</Typography>
						<Typography variant="body2" color="warning.main" fontWeight={600}>
							Early Bird
						</Typography>
						<Tooltip title="Notify when available">
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
							boxShadow: '0 4px 8px rgba(237, 108, 2, 0.3)',
							'&:hover': {
								boxShadow: '0 6px 12px rgba(237, 108, 2, 0.4)',
								transform: 'translateY(-1px)',
							},
						}}
					>
						<AddShoppingCart sx={{ fontSize: 18 }} />
					</Button>
				</Box>
				<Typography variant="caption" color="text.secondary" mt={1}>
					Early bird pricing • Reserve your spot today
				</Typography>
			</CardActions>
		</Card>
	);
};

// Enhanced Online Classroom Product Card - Access Expired
const EnhancedOnlineClassroomExpiredCard = () => {
	return (
		<Card elevation={2} className="product-card d-flex flex-column" sx={{ maxWidth: 340, height: 'fit-content', overflow: 'hidden' }}>
			<CardHeader
				title={
					<Box display="flex" alignItems="center" justifyContent="space-between">
						<Typography variant="h6" sx={{ flex: 1}}>
							CS1 Online Classroom
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
							<ComputerOutlined sx={{ fontSize: 16, color: 'error.main' }} />
						</Box>
					</Box>
				}
				className="product-card-header online-classroom-header"
				sx={{ py: 2.5 }}
			/>

			<CardContent className="product-card-content" sx={{ marginTop: "0" }}>
				<Box display="flex" gap={1.5} mb={3}>
					<Chip label="CS1" variant="filled" color="primary" sx={{ fontWeight: 600, fontSize: '0.875rem', px: 1.5, py: 0.5, '& .MuiChip-label': { px: 1 } }} />
					<Chip label="2024A" variant="filled" color="secondary" sx={{ fontWeight: 600, fontSize: '0.875rem', px: 1.5, py: 0.5, '& .MuiChip-label': { px: 1 } }} />
				</Box>

				<Box mb={3}>
					<Typography variant="subtitle1" color="text.primary" mb={2} textAlign="left">
						Access Status
					</Typography>
					<Box sx={{
						border: 1,
						borderColor: 'error.light',
						borderRadius: 1,
						p: 1.5,
						backgroundColor: 'error.50',
						display: 'flex',
						alignItems: 'center',
						gap: 1,
					}}>
						<Warning sx={{ fontSize: 18, color: 'error.main' }} />
						<Typography variant="body2" color="error.dark">
							Access Period Expired
						</Typography>
					</Box>
				</Box>

				<Box mb={2}>
					<Typography variant="subtitle2" color="text.secondary" mb={1} textAlign="left">
						Previous Access
					</Typography>
					<Box sx={{ border: 1, borderColor: 'grey.300', borderRadius: 1, p: 1.5, backgroundColor: 'grey.50', opacity: 0.7 }}>
						<Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
							<CalendarMonthOutlined sx={{ fontSize: 16 }} /> Expired: December 31, 2024
						</Typography>
					</Box>
				</Box>
			</CardContent>

			<Divider />

			<CardActions className="product-card-actions" sx={{ px: 2, py: 1, flexDirection: 'column', alignItems: 'stretch', mt: 'auto', height: 'auto !important', minHeight: 'auto !important' }}>
				<Box display="flex" alignItems="center" justifyContent="space-between">
					<Box display="flex" alignItems="center" gap={1.5}>
						<Typography variant="h4" fontWeight={700} color="text.disabled">
							£150.00
						</Typography>
						<Tooltip title="Content no longer available">
							<Button variant="outlined" size="small" disabled sx={{ minWidth: 'auto', px: 1, py: 0.5 }}>
								<InfoOutline sx={{ fontSize: 16 }} />
							</Button>
						</Tooltip>
					</Box>
					<Button
						variant="contained"
						disabled
						sx={{
							borderRadius: '50%',
							minWidth: 44,
							width: 44,
							height: 44,
							p: 0,
						}}
					>
						<AddShoppingCart sx={{ fontSize: 18 }} />
					</Button>
				</Box>
				<Typography variant="caption" color="text.disabled" mt={1}>
					Content unavailable • Access period has ended
				</Typography>
			</CardActions>
		</Card>
	);
};

// Enhanced Bundle Product Card - Complete Package
const EnhancedBundleProductCard = () => {
	const [selectedPriceType, setSelectedPriceType] = useState('');
	const [showDetails, setShowDetails] = useState(false);

	return (
		<Card elevation={2} className="product-card d-flex flex-column" sx={{ maxWidth: 340, height: 'fit-content', overflow: 'hidden' }}>
			<CardHeader
				title={
					<Box display="flex" alignItems="center" justifyContent="space-between">
						<Typography variant="h6" sx={{ flex: 1}}>
							CS1 Complete Bundle
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
							<Inventory2Outlined sx={{ fontSize: 16, color: 'warning.main' }} />
						</Box>
					</Box>
				}
				className="product-card-header bundle-header"
				sx={{ py: 2.5 }}
			/>

			<CardContent className="product-card-content" sx={{ marginTop: "0" }}>
				<Box display="flex" gap={1.5} mb={3}>
					<Chip label="CS1" variant="filled" color="primary" sx={{ fontWeight: 600, fontSize: '0.875rem', px: 1.5, py: 0.5, '& .MuiChip-label': { px: 1 } }} />
					<Chip label="Bundle" variant="filled" color="warning" sx={{ fontWeight: 600, fontSize: '0.875rem', px: 1.5, py: 0.5, '& .MuiChip-label': { px: 1 } }} />
				</Box>

				<Box mb={3}>
					<Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
						<Typography variant="subtitle1" color="text.primary" textAlign="left">
							Bundle Contents
						</Typography>
						<Button size="small" onClick={() => setShowDetails(!showDetails)} sx={{ minWidth: 'auto', p: 0.5 }}>
							<InfoOutline sx={{ fontSize: 14 }} />
						</Button>
					</Box>
					<Box sx={{
						border: 1,
						borderColor: 'warning.light',
						borderRadius: 1,
						p: 1.5,
						backgroundColor: 'warning.50',
						display: 'flex',
						flexDirection: 'column',
						gap: 0.5,
						transition: 'all 0.2s ease',
						'&:hover': {
							boxShadow: '1px 2px 1px rgba(0, 0, 0, 0.15)',
							backgroundColor: 'warning.100',
						},
					}}>
						<Typography variant="body2" color="warning.dark" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
							<LibraryBooksSharp sx={{ fontSize: 14 }} /> Study Materials {showDetails && '(£45)'}
						</Typography>
						<Typography variant="body2" color="warning.dark" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
							<SchoolOutlined sx={{ fontSize: 14 }} /> Weekend Tutorial {showDetails && '(£220)'}
						</Typography>
						<Typography variant="body2" color="warning.dark" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
							<ComputerOutlined sx={{ fontSize: 14 }} /> Online Classroom {showDetails && '(£150)'}
						</Typography>
						{showDetails && (
							<Box sx={{ borderTop: 1, borderColor: 'warning.main', pt: 0.5, mt: 0.5 }}>
								<Typography variant="caption" color="warning.dark" fontWeight={600}>
									Total value: £415 • You save: £35
								</Typography>
							</Box>
						)}
					</Box>
				</Box>
			</CardContent>

			<Divider />

			<CardActions className="product-card-actions" sx={{ px: 2, py: 1, flexDirection: 'column', alignItems: 'stretch', mt: 'auto', height: 'auto !important', minHeight: 'auto !important' }}>
				<Box mb={2.5}>
					<Typography variant="subtitle2" color="text.primary" textAlign="left" className="m-bottom__2xs">
						Discount Options
					</Typography>
					<Box sx={{ border: 1, borderColor: 'grey.100', borderRadius: 1, p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-around', transition: 'all 0.2s ease', '&:hover': { boxShadow: '1px 2px 1px rgba(0, 0, 0, 0.15)', backgroundColor: 'grey.50' } }}>
						<FormControlLabel
							control={<Radio color="primary" checked={selectedPriceType === 'retaker'} onClick={() => setSelectedPriceType(selectedPriceType === 'retaker' ? '' : 'retaker')} />}
							label={<Typography variant="body2">Retaker</Typography>}
							sx={{ m: 0 }}
						/>
						<FormControlLabel
							control={<Radio color="primary" checked={selectedPriceType === 'student'} onClick={() => setSelectedPriceType(selectedPriceType === 'student' ? '' : 'student')} />}
							label={<Typography variant="body2">Student</Typography>}
							sx={{ m: 0 }}
						/>
					</Box>
				</Box>

				<Box display="flex" alignItems="center" justifyContent="space-between">
					<Box display="flex" alignItems="center" gap={1.5}>
						<Typography variant="h4" fontWeight={700} color="primary.main">
							{selectedPriceType === 'retaker' ? '£304.00' : selectedPriceType === 'student' ? '£323.00' : '£380.00'}
						</Typography>
						<Typography variant="body2" color="success.main" fontWeight={600}>
							Save £35
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
					{selectedPriceType === 'retaker' ? 'Retaker discount applied' : selectedPriceType === 'student' ? 'Student discount applied' : 'Standard pricing'} • Price includes VAT
				</Typography>
			</CardActions>
		</Card>
	);
};

// Enhanced Bundle Product Card - Partial Availability
const EnhancedBundlePartialCard = () => {
	const [selectedPriceType, setSelectedPriceType] = useState('');

	return (
		<Card elevation={2} className="product-card d-flex flex-column" sx={{ maxWidth: 340, height: 'fit-content', overflow: 'hidden' }}>
			<CardHeader
				title={
					<Box display="flex" alignItems="center" justifyContent="space-between">
						<Typography variant="h6" sx={{ flex: 1}}>
							CS1 Study Bundle
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
							<Inventory2Outlined sx={{ fontSize: 16, color: 'warning.main' }} />
						</Box>
					</Box>
				}
				className="product-card-header bundle-header"
				sx={{ py: 2.5 }}
			/>

			<CardContent className="product-card-content" sx={{ marginTop: "0" }}>
				<Box display="flex" gap={1.5} mb={3}>
					<Chip label="CS1" variant="filled" color="primary" sx={{ fontWeight: 600, fontSize: '0.875rem', px: 1.5, py: 0.5, '& .MuiChip-label': { px: 1 } }} />
					<Chip label="Partial" variant="filled" color="warning" sx={{ fontWeight: 600, fontSize: '0.875rem', px: 1.5, py: 0.5, '& .MuiChip-label': { px: 1 } }} />
				</Box>

				<Box mb={3}>
					<Typography variant="subtitle1" color="text.primary" mb={2} textAlign="left">
						Available Components
					</Typography>
					<Box sx={{
						border: 1,
						borderColor: 'warning.light',
						borderRadius: 1,
						p: 1.5,
						backgroundColor: 'warning.50',
						display: 'flex',
						flexDirection: 'column',
						gap: 0.5,
					}}>
						<Typography variant="body2" color="success.dark" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
							<LibraryBooksSharp sx={{ fontSize: 14 }} /> Study Materials ✓
						</Typography>
						<Typography variant="body2" color="success.dark" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
							<ComputerOutlined sx={{ fontSize: 14 }} /> Online Classroom ✓
						</Typography>
						<Typography variant="body2" color="text.disabled" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
							<SchoolOutlined sx={{ fontSize: 14 }} /> Tutorial (Fully Booked)
						</Typography>
					</Box>
				</Box>
			</CardContent>

			<Divider />

			<CardActions className="product-card-actions" sx={{ px: 2, py: 1, flexDirection: 'column', alignItems: 'stretch', mt: 'auto', height: 'auto !important', minHeight: 'auto !important' }}>
				<Box mb={2.5}>
					<Typography variant="subtitle2" color="text.primary" textAlign="left" className="m-bottom__2xs">
						Discount Options
					</Typography>
					<Box sx={{ border: 1, borderColor: 'grey.100', borderRadius: 1, p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-around', transition: 'all 0.2s ease', '&:hover': { boxShadow: '1px 2px 1px rgba(0, 0, 0, 0.15)', backgroundColor: 'grey.50' } }}>
						<FormControlLabel
							control={<Radio color="primary" checked={selectedPriceType === 'retaker'} onClick={() => setSelectedPriceType(selectedPriceType === 'retaker' ? '' : 'retaker')} />}
							label={<Typography variant="body2">Retaker</Typography>}
							sx={{ m: 0 }}
						/>
						<FormControlLabel
							control={<Radio color="primary" checked={selectedPriceType === 'student'} onClick={() => setSelectedPriceType(selectedPriceType === 'student' ? '' : 'student')} />}
							label={<Typography variant="body2">Student</Typography>}
							sx={{ m: 0 }}
						/>
					</Box>
				</Box>

				<Box display="flex" alignItems="center" justifyContent="space-between">
					<Box display="flex" alignItems="center" gap={1.5}>
						<Typography variant="h4" fontWeight={700} color="primary.main">
							{selectedPriceType === 'retaker' ? '£156.00' : selectedPriceType === 'student' ? '£166.00' : '£195.00'}
						</Typography>
						<Typography variant="body2" color="warning.main" fontWeight={600}>
							Partial
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
							boxShadow: '0 4px 8px rgba(237, 108, 2, 0.3)',
							'&:hover': {
								boxShadow: '0 6px 12px rgba(237, 108, 2, 0.4)',
								transform: 'translateY(-1px)',
							},
						}}
					>
						<AddShoppingCart sx={{ fontSize: 18 }} />
					</Button>
				</Box>
				<Typography variant="caption" color="text.secondary" mt={1}>
					{selectedPriceType === 'retaker' ? 'Retaker discount applied' : selectedPriceType === 'student' ? 'Student discount applied' : 'Standard pricing'} • Available items only
				</Typography>
			</CardActions>
		</Card>
	);
};

// Enhanced Bundle Product Card - Unavailable
const EnhancedBundleUnavailableCard = () => {
	return (
		<Card elevation={2} className="product-card d-flex flex-column" sx={{ maxWidth: 340, height: 'fit-content', overflow: 'hidden' }}>
			<CardHeader
				title={
					<Box display="flex" alignItems="center" justifyContent="space-between">
						<Typography variant="h6" sx={{ flex: 1}}>
							CS1 Complete Bundle
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
							<Inventory2Outlined sx={{ fontSize: 16, color: 'error.main' }} />
						</Box>
					</Box>
				}
				className="product-card-header bundle-header"
				sx={{ py: 2.5 }}
			/>

			<CardContent className="product-card-content" sx={{ marginTop: "0" }}>
				<Box display="flex" gap={1.5} mb={3}>
					<Chip label="CS1" variant="filled" color="primary" sx={{ fontWeight: 600, fontSize: '0.875rem', px: 1.5, py: 0.5, '& .MuiChip-label': { px: 1 } }} />
					<Chip label="Unavailable" variant="filled" color="error" sx={{ fontWeight: 600, fontSize: '0.875rem', px: 1.5, py: 0.5, '& .MuiChip-label': { px: 1 } }} />
				</Box>

				<Box mb={3}>
					<Typography variant="subtitle1" color="text.primary" mb={2} textAlign="left">
						Availability Status
					</Typography>
					<Box sx={{
						border: 1,
						borderColor: 'error.light',
						borderRadius: 1,
						p: 1.5,
						backgroundColor: 'error.50',
						display: 'flex',
						alignItems: 'center',
						gap: 1,
					}}>
						<Warning sx={{ fontSize: 18, color: 'error.main' }} />
						<Typography variant="body2" color="error.dark">
							Bundle Unavailable - Key Items Sold Out
						</Typography>
					</Box>
				</Box>

				<Box mb={2}>
					<Typography variant="subtitle2" color="text.secondary" mb={1} textAlign="left">
						Bundle Components
					</Typography>
					<Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
						<Box sx={{ border: 1, borderColor: 'grey.300', borderRadius: 1, p: 1, backgroundColor: 'grey.50', opacity: 0.7 }}>
							<Typography variant="body2" color="text.disabled" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
								<LibraryBooksSharp sx={{ fontSize: 14 }} /> Study Materials (Sold Out)
							</Typography>
						</Box>
						<Box sx={{ border: 1, borderColor: 'grey.300', borderRadius: 1, p: 1, backgroundColor: 'grey.50', opacity: 0.7 }}>
							<Typography variant="body2" color="text.disabled" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
								<SchoolOutlined sx={{ fontSize: 14 }} /> Tutorial (Registration Closed)
							</Typography>
						</Box>
						<Box sx={{ border: 1, borderColor: 'grey.300', borderRadius: 1, p: 1, backgroundColor: 'grey.50', opacity: 0.7 }}>
							<Typography variant="body2" color="text.disabled" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
								<ComputerOutlined sx={{ fontSize: 14 }} /> Online Classroom (Expired)
							</Typography>
						</Box>
					</Box>
				</Box>
			</CardContent>

			<Divider />

			<CardActions className="product-card-actions" sx={{ px: 2, py: 1, flexDirection: 'column', alignItems: 'stretch', mt: 'auto', height: 'auto !important', minHeight: 'auto !important' }}>
				<Box display="flex" alignItems="center" justifyContent="space-between">
					<Box display="flex" alignItems="center" gap={1.5}>
						<Typography variant="h4" fontWeight={700} color="text.disabled">
							£380.00
						</Typography>
						<Tooltip title="Bundle unavailable">
							<Button variant="outlined" size="small" disabled sx={{ minWidth: 'auto', px: 1, py: 0.5 }}>
								<InfoOutline sx={{ fontSize: 16 }} />
							</Button>
						</Tooltip>
					</Box>
					<Button
						variant="contained"
						disabled
						sx={{
							borderRadius: '50%',
							minWidth: 44,
							width: 44,
							height: 44,
							p: 0,
						}}
					>
						<AddShoppingCart sx={{ fontSize: 18 }} />
					</Button>
				</Box>
				<Typography variant="caption" color="text.disabled" mt={1}>
					Bundle unavailable • Key components not available
				</Typography>
			</CardActions>
		</Card>
	);
};

// Enhanced Marking Voucher Product Card - Standard
const EnhancedMarkingVoucherProductCard = () => {
	const [selectedQuantity, setSelectedQuantity] = useState(1);

	return (
		<Card elevation={2} className="product-card d-flex flex-column" sx={{ maxWidth: 340, height: 'fit-content', overflow: 'hidden' }}>
			<CardHeader
				title={
					<Box display="flex" alignItems="center" justifyContent="space-between">
						<Typography variant="h6" sx={{ flex: 1}}>
							CS1 Marking Voucher
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
							<ConfirmationNumberOutlined sx={{ fontSize: 16, color: 'info.main' }} />
						</Box>
					</Box>
				}
				className="product-card-header marking-header"
				sx={{ py: 2.5 }}
			/>

			<CardContent className="product-card-content" sx={{ marginTop: "0" }}>
				<Box display="flex" gap={1.5} mb={3}>
					<Chip label="CS1" variant="filled" color="primary" sx={{ fontWeight: 600, fontSize: '0.875rem', px: 1.5, py: 0.5, '& .MuiChip-label': { px: 1 } }} />
					<Chip label="Voucher" variant="filled" color="info" sx={{ fontWeight: 600, fontSize: '0.875rem', px: 1.5, py: 0.5, '& .MuiChip-label': { px: 1 } }} />
				</Box>

				<Box mb={3}>
					<Typography variant="subtitle1" color="text.primary" mb={2} textAlign="left">
						Voucher Information
					</Typography>
					<Box sx={{
						border: 1,
						borderColor: 'info.light',
						borderRadius: 1,
						p: 1.5,
						backgroundColor: 'info.50',
						display: 'flex',
						flexDirection: 'column',
						gap: 0.5,
						transition: 'all 0.2s ease',
						'&:hover': {
							boxShadow: '1px 2px 1px rgba(0, 0, 0, 0.15)',
							backgroundColor: 'info.100',
						},
					}}>
						<Typography variant="body2" color="info.dark" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
							<ConfirmationNumberOutlined sx={{ fontSize: 14 }} /> Pre-paid marking credits
						</Typography>
						<Typography variant="body2" color="info.dark" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
							<CalendarMonthOutlined sx={{ fontSize: 14 }} /> Valid for 2 years
						</Typography>
					</Box>
				</Box>

				<Box mb={2}>
					<Typography variant="subtitle2" color="text.primary" mb={1} textAlign="left">
						Quantity
					</Typography>
					<Box sx={{ display: 'flex', gap: 1 }}>
						{[1, 2, 3, 5].map((qty) => (
							<Box key={qty} sx={{ border: 1, borderColor: selectedQuantity === qty ? 'info.main' : 'grey.200', borderRadius: 1, p: 1, backgroundColor: selectedQuantity === qty ? 'info.50' : 'transparent', cursor: 'pointer', transition: 'all 0.2s ease', minWidth: 40, textAlign: 'center' }} onClick={() => setSelectedQuantity(qty)}>
								<Typography variant="body2" color={selectedQuantity === qty ? 'info.dark' : 'text.secondary'}>
									{qty}
								</Typography>
							</Box>
						))}
					</Box>
				</Box>
			</CardContent>

			<Divider />

			<CardActions className="product-card-actions" sx={{ px: 2, py: 1, flexDirection: 'column', alignItems: 'stretch', mt: 'auto', height: 'auto !important', minHeight: 'auto !important' }}>
				<Box display="flex" alignItems="center" justifyContent="space-between">
					<Box display="flex" alignItems="center" gap={1.5}>
						<Typography variant="h4" fontWeight={700} color="primary.main">
							£{(25 * selectedQuantity).toFixed(2)}
						</Typography>
						{selectedQuantity > 1 && (
							<Typography variant="body2" color="success.main" fontWeight={600}>
								{selectedQuantity}x
							</Typography>
						)}
						<Tooltip title="Show price details">
							<Button variant="outlined" size="small" sx={{ minWidth: 'auto', px: 1, py: 0.5 }}>
								<InfoOutline sx={{ fontSize: 16 }} />
							</Button>
						</Tooltip>
					</Box>
					<Button
						variant="contained"
						color="info"
						sx={{
							borderRadius: '50%',
							minWidth: 44,
							width: 44,
							height: 44,
							p: 0,
							boxShadow: '0 4px 8px rgba(33, 150, 243, 0.3)',
							'&:hover': {
								boxShadow: '0 6px 12px rgba(33, 150, 243, 0.4)',
								transform: 'translateY(-1px)',
							},
						}}
					>
						<AddShoppingCart sx={{ fontSize: 18 }} />
					</Button>
				</Box>
				<Typography variant="caption" color="text.secondary" mt={1}>
					Fixed pricing • Price includes VAT • £25 per voucher
				</Typography>
			</CardActions>
		</Card>
	);
};

// Enhanced Marking Voucher Product Card - Bulk Pack
const EnhancedMarkingVoucherBulkCard = () => {
	return (
		<Card elevation={2} className="product-card d-flex flex-column" sx={{ maxWidth: 340, height: 'fit-content', overflow: 'hidden' }}>
			<CardHeader
				title={
					<Box display="flex" alignItems="center" justifyContent="space-between">
						<Typography variant="h6" sx={{ flex: 1}}>
							CS1 Voucher Bulk Pack
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
							<Inventory2Outlined sx={{ fontSize: 16, color: 'success.main' }} />
						</Box>
					</Box>
				}
				className="product-card-header marking-header"
				sx={{ py: 2.5 }}
			/>

			<CardContent className="product-card-content" sx={{ marginTop: "0" }}>
				<Box display="flex" gap={1.5} mb={3}>
					<Chip label="CS1" variant="filled" color="primary" sx={{ fontWeight: 600, fontSize: '0.875rem', px: 1.5, py: 0.5, '& .MuiChip-label': { px: 1 } }} />
					<Chip label="Bulk (10x)" variant="filled" color="success" sx={{ fontWeight: 600, fontSize: '0.875rem', px: 1.5, py: 0.5, '& .MuiChip-label': { px: 1 } }} />
				</Box>

				<Box mb={3}>
					<Typography variant="subtitle1" color="text.primary" mb={2} textAlign="left">
						Bulk Pack Details
					</Typography>
					<Box sx={{
						border: 1,
						borderColor: 'success.light',
						borderRadius: 1,
						p: 1.5,
						backgroundColor: 'success.50',
						display: 'flex',
						flexDirection: 'column',
						gap: 0.5,
						transition: 'all 0.2s ease',
						'&:hover': {
							boxShadow: '1px 2px 1px rgba(0, 0, 0, 0.15)',
							backgroundColor: 'success.100',
						},
					}}>
						<Typography variant="body2" color="success.dark" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
							<ConfirmationNumberOutlined sx={{ fontSize: 14 }} /> 10 marking vouchers
						</Typography>
						<Typography variant="body2" color="success.dark" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
							<CalendarMonthOutlined sx={{ fontSize: 14 }} /> Valid for 2 years each
						</Typography>
						<Typography variant="body2" color="success.dark" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
							<Inventory2Outlined sx={{ fontSize: 14 }} /> Save £50 vs individual
						</Typography>
					</Box>
				</Box>
			</CardContent>

			<Divider />

			<CardActions className="product-card-actions" sx={{ px: 2, py: 1, flexDirection: 'column', alignItems: 'stretch', mt: 'auto', height: 'auto !important', minHeight: 'auto !important' }}>
				<Box display="flex" alignItems="center" justifyContent="space-between">
					<Box display="flex" alignItems="center" gap={1.5}>
						<Typography variant="h4" fontWeight={700} color="primary.main">
							£200.00
						</Typography>
						<Typography variant="body2" color="success.main" fontWeight={600}>
							Save £50
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
					Bulk pricing • Price includes VAT • £20 per voucher
				</Typography>
			</CardActions>
		</Card>
	);
};

// Enhanced Marking Voucher Product Card - Limited Stock
const EnhancedMarkingVoucherLimitedCard = () => {
	return (
		<Card elevation={2} className="product-card d-flex flex-column" sx={{ maxWidth: 340, height: 'fit-content', overflow: 'hidden' }}>
			<CardHeader
				title={
					<Box display="flex" alignItems="center" justifyContent="space-between">
						<Typography variant="h6" sx={{ flex: 1}}>
							CS1 Marking Voucher
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
							<ConfirmationNumberOutlined sx={{ fontSize: 16, color: 'warning.main' }} />
						</Box>
					</Box>
				}
				className="product-card-header marking-header"
				sx={{ py: 2.5 }}
			/>

			<CardContent className="product-card-content" sx={{ marginTop: "0" }}>
				<Box display="flex" gap={1.5} mb={3}>
					<Chip label="CS1" variant="filled" color="primary" sx={{ fontWeight: 600, fontSize: '0.875rem', px: 1.5, py: 0.5, '& .MuiChip-label': { px: 1 } }} />
					<Chip label="Limited" variant="filled" color="warning" sx={{ fontWeight: 600, fontSize: '0.875rem', px: 1.5, py: 0.5, '& .MuiChip-label': { px: 1 } }} />
				</Box>

				<Box mb={3}>
					<Typography variant="subtitle1" color="text.primary" mb={2} textAlign="left">
						Stock Status
					</Typography>
					<Box sx={{
						border: 1,
						borderColor: 'warning.light',
						borderRadius: 1,
						p: 1.5,
						backgroundColor: 'warning.50',
						display: 'flex',
						alignItems: 'center',
						gap: 1,
					}}>
						<Warning sx={{ fontSize: 18, color: 'warning.main' }} />
						<Typography variant="body2" color="warning.dark">
							Only 3 vouchers remaining in stock
						</Typography>
					</Box>
				</Box>

				<Box mb={2}>
					<Typography variant="subtitle2" color="text.secondary" mb={1} textAlign="left">
						Voucher Details
					</Typography>
					<Box sx={{ border: 1, borderColor: 'grey.200', borderRadius: 1, p: 1.5, backgroundColor: 'grey.50' }}>
						<Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
							<ConfirmationNumberOutlined sx={{ fontSize: 14 }} /> Pre-paid marking credits
						</Typography>
						<Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
							<CalendarMonthOutlined sx={{ fontSize: 14 }} /> Valid for 2 years
						</Typography>
					</Box>
				</Box>
			</CardContent>

			<Divider />

			<CardActions className="product-card-actions" sx={{ px: 2, py: 1, flexDirection: 'column', alignItems: 'stretch', mt: 'auto', height: 'auto !important', minHeight: 'auto !important' }}>
				<Box display="flex" alignItems="center" justifyContent="space-between">
					<Box display="flex" alignItems="center" gap={1.5}>
						<Typography variant="h4" fontWeight={700} color="primary.main">
							£25.00
						</Typography>
						<Tooltip title="Limited stock remaining">
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
							boxShadow: '0 4px 8px rgba(237, 108, 2, 0.3)',
							'&:hover': {
								boxShadow: '0 6px 12px rgba(237, 108, 2, 0.4)',
								transform: 'translateY(-1px)',
							},
						}}
					>
						<AddShoppingCart sx={{ fontSize: 18 }} />
					</Button>
				</Box>
				<Typography variant="caption" color="text.secondary" mt={1}>
					Fixed pricing • Limited stock • Price includes VAT
				</Typography>
			</CardActions>
		</Card>
	);
};

// Main Preview Component
const ProductCardVariations = () => {
	return (
		<Box sx={{ p: 4, backgroundColor: 'grey.100', minHeight: '100vh' }}>
			<Typography variant="h3" fontWeight={700} mb={4} textAlign="center">
				Enhanced Product Card Template Collection
			</Typography>
			
			{/* All Product Types Grid */}
			<Box textAlign="center" mb={6}>
				<Typography variant="h4" fontWeight={600} mb={1}>
					Product Card Types
				</Typography>
				<Typography variant="body2" color="text.secondary" mb={4}>
					Enhanced layouts for all product categories with improved hierarchy and functionality
				</Typography>
				
				<Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(340px, 1fr))" gap={4} justifyItems="center">
					<Box textAlign="center">
						<Typography variant="h6" fontWeight={600} mb={1} color="primary.main">
							Study Materials
						</Typography>
						<Typography variant="body2" color="text.secondary" mb={2}>
							Print & eBook variations with discounts
						</Typography>
						<BalancedProductCard />
					</Box>

					<Box textAlign="center">
						<Typography variant="h6" fontWeight={600} mb={1} color="success.main">
							Tutorial
						</Typography>
						<Typography variant="body2" color="text.secondary" mb={2}>
							In-person weekend courses
						</Typography>
						<EnhancedTutorialProductCard />
					</Box>

					<Box textAlign="center">
						<Typography variant="h6" fontWeight={600} mb={1} color="info.main">
							Online Classroom
						</Typography>
						<Typography variant="body2" color="text.secondary" mb={2}>
							Digital recordings & live sessions
						</Typography>
						<EnhancedOnlineClassroomProductCard />
					</Box>

					<Box textAlign="center">
						<Typography variant="h6" fontWeight={600} mb={1} color="warning.main">
							Bundle
						</Typography>
						<Typography variant="body2" color="text.secondary" mb={2}>
							Complete study package deals
						</Typography>
						<EnhancedBundleProductCard />
					</Box>

					<Box textAlign="center">
						<Typography variant="h6" fontWeight={600} mb={1} color="orange.main">
							Marking (Available)
						</Typography>
						<Typography variant="body2" color="text.secondary" mb={2}>
							Deadlines available, no discounts
						</Typography>
						<MarkingCardAllAvailable />
					</Box>

					<Box textAlign="center">
						<Typography variant="h6" fontWeight={600} mb={1} color="info.main">
							Marking Voucher
						</Typography>
						<Typography variant="body2" color="text.secondary" mb={2}>
							Pre-paid marking credits
						</Typography>
						<EnhancedMarkingVoucherProductCard />
					</Box>
				</Box>
			</Box>

			{/* Marking States Showcase */}
			<Box textAlign="center" mb={6}>
				<Typography variant="h4" fontWeight={600} mb={1}>
					Marking Product States
				</Typography>
				<Typography variant="body2" color="text.secondary" mb={4}>
					Different deadline scenarios for marking products
				</Typography>
				
				<Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(340px, 1fr))" gap={3} justifyItems="center">
					<Box textAlign="center">
						<Typography variant="h6" fontWeight={600} mb={1} color="success.main">
							All Available
						</Typography>
						<Typography variant="body2" color="text.secondary" mb={2}>
							Multiple upcoming deadlines
						</Typography>
						<MarkingCardAllAvailable />
					</Box>

					<Box textAlign="center">
						<Typography variant="h6" fontWeight={600} mb={1} color="warning.main">
							Expiring Soon
						</Typography>
						<Typography variant="body2" color="text.secondary" mb={2}>
							Urgent deadline warning
						</Typography>
						<MarkingCardExpiringSoon />
					</Box>

					<Box textAlign="center">
						<Typography variant="h6" fontWeight={600} mb={1} color="warning.main">
							Some Expired
						</Typography>
						<Typography variant="body2" color="text.secondary" mb={2}>
							Mixed availability state
						</Typography>
						<MarkingCardSomeExpired />
					</Box>

					<Box textAlign="center">
						<Typography variant="h6" fontWeight={600} mb={1} color="error.main">
							All Expired
						</Typography>
						<Typography variant="body2" color="text.secondary" mb={2}>
							Product unavailable
						</Typography>
						<MarkingCardAllExpired />
					</Box>
				</Box>
			</Box>

			{/* Marking Voucher States Showcase */}
			<Box textAlign="center" mb={4}>
				<Typography variant="h4" fontWeight={600} mb={1}>
					Marking Voucher Variations
				</Typography>
				<Typography variant="body2" color="text.secondary" mb={4}>
					Different voucher types and availability states
				</Typography>
				
				<Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(340px, 1fr))" gap={3} justifyItems="center">
					<Box textAlign="center">
						<Typography variant="h6" fontWeight={600} mb={1} color="info.main">
							Standard Voucher
						</Typography>
						<Typography variant="body2" color="text.secondary" mb={2}>
							Single voucher with quantity selector
						</Typography>
						<EnhancedMarkingVoucherProductCard />
					</Box>

					<Box textAlign="center">
						<Typography variant="h6" fontWeight={600} mb={1} color="success.main">
							Bulk Pack
						</Typography>
						<Typography variant="body2" color="text.secondary" mb={2}>
							10x vouchers with bulk savings
						</Typography>
						<EnhancedMarkingVoucherBulkCard />
					</Box>

					<Box textAlign="center">
						<Typography variant="h6" fontWeight={600} mb={1} color="warning.main">
							Limited Stock
						</Typography>
						<Typography variant="body2" color="text.secondary" mb={2}>
							Low stock warning
						</Typography>
						<EnhancedMarkingVoucherLimitedCard />
					</Box>
				</Box>
			</Box>

			{/* Design Notes */}
			<Box mt={6} p={3} sx={{ backgroundColor: 'white', borderRadius: 2 }}>
				<Typography variant="h6" fontWeight={600} mb={2}>
					Enhanced Product Card Template Features
				</Typography>
				<Typography variant="body2" color="text.secondary" mb={3}>
					This template provides a consistent design system that can be adapted for different product types while maintaining visual cohesion and enhanced user experience.
				</Typography>
				
				<Box mb={3}>
					<Typography variant="subtitle2" fontWeight={600} color="primary" mb={1}>
						Core Template Features
					</Typography>
					<Typography variant="body2" color="text.secondary">
						• <strong>Enhanced Header:</strong> Circular icon background with product-specific theming<br/>
						• <strong>Prominent Chips:</strong> Filled variant chips for subject and exam session codes<br/>
						• <strong>Improved Variations:</strong> Bordered option containers with consistent hover effects<br/>
						• <strong>Radio Button Discounts:</strong> Horizontal layout for pricing options (Retaker, Additional Copy)<br/>
						• <strong>Complete Pricing:</strong> Price display with VAT information and add to cart functionality<br/>
						• <strong>Custom Radio Behavior:</strong> Deselectable radio buttons for flexible pricing options
					</Typography>
				</Box>
				
				<Box mb={3}>
					<Typography variant="subtitle2" fontWeight={600} color="success.main" mb={1}>
						Marking Product Deadline States
					</Typography>
					<Typography variant="body2" color="text.secondary">
						• <strong>All Available (Green):</strong> Multiple upcoming deadlines, success styling, normal functionality<br/>
						• <strong>Expiring Soon (Orange):</strong> Urgent deadline warning, countdown display, warning-colored action button<br/>
						• <strong>Some Expired (Orange):</strong> Mixed state with expired/remaining count, warning styling maintained<br/>
						• <strong>All Expired (Red):</strong> Complete product unavailability, disabled interface, error styling
					</Typography>
				</Box>

				<Box mb={3}>
					<Typography variant="subtitle2" fontWeight={600} color="info.main" mb={1}>
						Marking Voucher Variations
					</Typography>
					<Typography variant="body2" color="text.secondary">
						• <strong>Standard Voucher (Blue):</strong> Individual voucher with quantity selector, pre-paid credits info<br/>
						• <strong>Bulk Pack (Green):</strong> 10x voucher bundle with savings display, bulk discount messaging<br/>
						• <strong>Limited Stock (Orange):</strong> Low inventory warning, urgency indicators, stock count display<br/>
						• <strong>Fixed Pricing:</strong> No discount options available, straightforward add-to-cart functionality
					</Typography>
				</Box>

				<Box mb={3}>
					<Typography variant="subtitle2" fontWeight={600} color="warning.main" mb={1}>
						Smart State Management
					</Typography>
					<Typography variant="body2" color="text.secondary">
						• <strong>Dynamic Button Colors:</strong> Success (green) → Warning (orange) → Disabled (grey)<br/>
						• <strong>Contextual Messaging:</strong> Deadline counts, urgency indicators, expiration warnings<br/>
						• <strong>Progressive Disclosure:</strong> Information hierarchy adapts to deadline urgency<br/>
						• <strong>Accessibility:</strong> Clear visual and textual feedback for all states
					</Typography>
				</Box>
				
				<Typography variant="caption" color="text.secondary" fontStyle="italic">
					This template can be easily extended to other product types (Bundle, Tutorial, Online Classroom) by adapting the specific content sections while maintaining the consistent structure and styling patterns.
				</Typography>
			</Box>
		</Box>
	);
};

export default ProductCardVariations;