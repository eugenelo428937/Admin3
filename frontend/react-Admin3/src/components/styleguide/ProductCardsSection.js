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
  Badge,
  Divider,
  Stack,
  Grid,
  Paper,
  Avatar,
  Checkbox,
  FormControlLabel,
  Radio,
  RadioGroup,
  Tooltip
} from '@mui/material';
import {
  School,
  LibraryBooks,
  Rule,
  Computer,
  LocalActivity,
  Inventory2,
  ShoppingCart,
  Star,
  AccessTime,
  LibraryBooksSharp,
  RuleOutlined,
  AddShoppingCart,
  InfoOutline,
  CalendarMonthOutlined,
  Warning,
  SchoolOutlined,
  ComputerOutlined,
  Inventory2Outlined,
  ConfirmationNumberOutlined
} from '@mui/icons-material';
import '../../styles/product_card.css';

const ProductCardsSection = () => {
  // Sample product data
  const products = [
    {
      id: 1,
      title: "CP1 Tutorial",
      type: "Tutorial",
      subject: "Core Principles",
      price: "£299",
      originalPrice: "£349",
      badge: "Popular",
      badgeColor: "primary",
      icon: <School />,
      color: "var(--mui-palette-product-tutorial)",
      description: "Comprehensive tutorial covering all CP1 syllabus topics with expert guidance."
    },
    {
      id: 2,
      title: "CP1 Study Materials",
      type: "Material",
      subject: "Core Principles",
      price: "£99",
      badge: "New",
      badgeColor: "success",
      icon: <LibraryBooks />,
      color: "var(--mui-palette-product-material)",
      description: "Complete study pack including notes, practice questions, and formula sheets."
    },
    {
      id: 3,
      title: "CP1 Marking Service",
      type: "Marking",
      subject: "Core Principles",
      price: "£150",
      badge: "Limited",
      badgeColor: "warning",
      icon: <Rule />,
      color: "var(--mui-palette-product-marking)",
      description: "Professional marking service with detailed feedback from qualified actuaries."
    },
    {
      id: 4,
      title: "Online Mock Exams",
      type: "Online",
      subject: "Various Subjects",
      price: "£75",
      badge: "Digital",
      badgeColor: "secondary",
      icon: <Computer />,
      color: "var(--mui-palette-product-online)",
      description: "Interactive online mock exams with instant results and performance analytics."
    }
  ];

  const ProductCard = ({ product }) => (
    <Card 
      elevation={2} 
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        '&:hover': {
          elevation: 4,
          transform: 'translateY(-2px)',
          transition: 'all 0.3s ease-in-out'
        }
      }}
    >
      {product.badge && (
        <Chip
          label={product.badge}
          color={product.badgeColor}
          size="small"
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 1
          }}
        />
      )}
      
      <CardHeader
        avatar={
          <Avatar
            sx={{ 
              bgcolor: product.color,
              color: 'white',
              width: 48,
              height: 48
            }}
          >
            {product.icon}
          </Avatar>
        }
        title={product.title}
        subheader={`${product.subject} • ${product.type}`}
        titleTypographyProps={{ variant: 'h6', fontSize: '1.1rem' }}
        subheaderTypographyProps={{ variant: 'caption' }}
        sx={{ pb: 1 }}
      />
      
      <CardContent sx={{ flexGrow: 1, pt: 0 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {product.description}
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Typography variant="h6" color="primary.main" sx={{ fontWeight: 600 }}>
            {product.price}
          </Typography>
          {product.originalPrice && (
            <Typography 
              variant="body2" 
              sx={{ 
                textDecoration: 'line-through',
                color: 'text.disabled'
              }}
            >
              {product.originalPrice}
            </Typography>
          )}
        </Box>

        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Star sx={{ fontSize: 16, color: 'warning.main' }} />
          <Typography variant="caption">4.8 (127 reviews)</Typography>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          <AccessTime sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Typography variant="caption">Available now</Typography>
        </Stack>
      </CardContent>
      
      <CardActions sx={{ p: 2, pt: 0 }}>
        <Button 
          variant="contained" 
          startIcon={<ShoppingCart />}
          fullWidth
          sx={{
            backgroundColor: product.color,
            '&:hover': {
              backgroundColor: product.color,
              filter: 'brightness(0.9)'
            }
          }}
        >
          Add to Cart
        </Button>
      </CardActions>
    </Card>
  );

  return (
    <Box>
      {/* All Product Types Grid */}
      <Typography variant="h4" gutterBottom sx={{ mb: 2 }}>
        All Product Card Types
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Enhanced layouts for all product categories with improved hierarchy and functionality
      </Typography>
      
      <Grid container spacing={4} sx={{ mb: 6 }}>
        <Grid item xs={12} sm={6} lg={4}>
          <Typography variant="h6" gutterBottom color="primary.main">
            Study Materials
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Print & eBook variations with discounts
          </Typography>
          <BalancedProductCard />
        </Grid>

        <Grid item xs={12} sm={6} lg={4}>
          <Typography variant="h6" gutterBottom color="success.main">
            Tutorial
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            In-person weekend courses
          </Typography>
          <EnhancedTutorialProductCard />
        </Grid>

        <Grid item xs={12} sm={6} lg={4}>
          <Typography variant="h6" gutterBottom color="info.main">
            Online Classroom
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Digital recordings & live sessions
          </Typography>
          <EnhancedOnlineClassroomProductCard />
        </Grid>

        <Grid item xs={12} sm={6} lg={4}>
          <Typography variant="h6" gutterBottom color="warning.main">
            Bundle
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Complete study package deals
          </Typography>
          <EnhancedBundleProductCard />
        </Grid>

        <Grid item xs={12} sm={6} lg={4}>
          <Typography variant="h6" gutterBottom sx={{ color: '#ff9800' }}>
            Marking (Available)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Deadlines available, no discounts
          </Typography>
          <MarkingCardAllAvailable />
        </Grid>

        <Grid item xs={12} sm={6} lg={4}>
          <Typography variant="h6" gutterBottom color="info.main">
            Marking Voucher
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Pre-paid marking credits
          </Typography>
          <EnhancedMarkingVoucherProductCard />
        </Grid>
      </Grid>

      {/* Marking States Showcase */}
      <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
        Marking Product States
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Different deadline scenarios for marking products
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 6 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <Typography variant="h6" gutterBottom color="success.main">
            All Available
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Multiple upcoming deadlines
          </Typography>
          <MarkingCardAllAvailable />
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <Typography variant="h6" gutterBottom color="warning.main">
            Expiring Soon
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Urgent deadline warning
          </Typography>
          <MarkingCardExpiringSoon />
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <Typography variant="h6" gutterBottom color="warning.main">
            Some Expired
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Mixed availability state
          </Typography>
          <MarkingCardSomeExpired />
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <Typography variant="h6" gutterBottom color="error.main">
            All Expired
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Product unavailable
          </Typography>
          <MarkingCardAllExpired />
        </Grid>
      </Grid>

      {/* Enhanced Card Variations */}
      <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
        Enhanced Card Variations
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Enhanced Compact Card */}
        <Grid item xs={12} md={4}>
          <Typography variant="h6" gutterBottom>
            Enhanced Compact Card
          </Typography>
          <EnhancedCompactCard />
        </Grid>

        {/* Enhanced Horizontal Card */}
        <Grid item xs={12} md={4}>
          <Typography variant="h6" gutterBottom>
            Enhanced Horizontal Layout
          </Typography>
          <EnhancedHorizontalCard />
        </Grid>

        {/* Enhanced Minimal Card */}
        <Grid item xs={12} md={4}>
          <Typography variant="h6" gutterBottom>
            Enhanced Minimal Style
          </Typography>
          <EnhancedMinimalCard />
        </Grid>
      </Grid>

      {/* Original Simple Variations */}
      <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
        Simple Card Variations
      </Typography>

      <Grid container spacing={3}>
        {/* Compact Card */}
        <Grid item xs={12} md={4}>
          <Typography variant="h6" gutterBottom>
            Compact Card
          </Typography>
          <Card elevation={1}>
            <CardContent sx={{ p: 2 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar sx={{ bgcolor: 'var(--mui-palette-product-tutorial)' }}>
                  <School />
                </Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="subtitle2">CP1 Tutorial</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Core Principles
                  </Typography>
                </Box>
                <Typography variant="h6" color="primary.main">
                  £299
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Horizontal Card */}
        <Grid item xs={12} md={4}>
          <Typography variant="h6" gutterBottom>
            Horizontal Layout
          </Typography>
          <Card elevation={1}>
            <Stack direction="row">
              <Box
                sx={{
                  width: 80,
                  bgcolor: 'var(--mui-palette-product-material)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white'
                }}
              >
                <LibraryBooks sx={{ fontSize: 32 }} />
              </Box>
              <CardContent sx={{ flexGrow: 1, p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Study Materials
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                  Complete resource pack
                </Typography>
                <Typography variant="h6" color="primary.main">
                  £99
                </Typography>
              </CardContent>
            </Stack>
          </Card>
        </Grid>

        {/* Minimal Card */}
        <Grid item xs={12} md={4}>
          <Typography variant="h6" gutterBottom>
            Minimal Style
          </Typography>
          <Paper 
            variant="outlined" 
            sx={{ 
              p: 2,
              '&:hover': {
                boxShadow: 2
              }
            }}
          >
            <Stack spacing={1}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: 'var(--mui-palette-product-online)'
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  ONLINE COURSE
                </Typography>
              </Stack>
              <Typography variant="subtitle1">
                Mock Exams
              </Typography>
              <Typography variant="h6" color="primary.main">
                £75
              </Typography>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

// Enhanced Compact Card Component
const EnhancedCompactCard = () => {
  const [selectedVariations, setSelectedVariations] = useState([]);
  const [selectedPriceType, setSelectedPriceType] = useState('');

  return (
    <Card elevation={2} sx={{ maxWidth: 340, height: 'fit-content' }}>
      <CardHeader
        title={
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="subtitle1" sx={{ flex: 1 }}>
              Study Material
            </Typography>
            <Box
              sx={{
                backgroundColor: 'white',
                borderRadius: '50%',
                p: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
            >
              <LibraryBooksSharp sx={{ fontSize: 14, color: 'primary.main' }} />
            </Box>
          </Box>
        }
        sx={{ py: 1.5 }}
      />
      <CardContent sx={{ pt: 0, pb: 1 }}>
        <Box display="flex" gap={1} mb={2}>
          <Chip label="CS1" variant="filled" color="primary" size="small" />
          <Chip label="2024A" variant="filled" color="secondary" size="small" />
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            Product Variations
          </Typography>
          <Stack spacing={0.5}>
            <FormControlLabel
              control={<Checkbox size="small" />}
              label={<Typography variant="caption">Printed</Typography>}
              sx={{ m: 0 }}
            />
            <FormControlLabel
              control={<Checkbox size="small" />}
              label={<Typography variant="caption">eBook</Typography>}
              sx={{ m: 0 }}
            />
          </Stack>
        </Box>
      </CardContent>
      <CardActions sx={{ p: 2, pt: 0 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
          <Typography variant="h6" color="primary.main">
            £45.00
          </Typography>
          <Button
            variant="contained"
            size="small"
            sx={{
              borderRadius: '50%',
              minWidth: 32,
              width: 32,
              height: 32,
              p: 0,
            }}
          >
            <AddShoppingCart sx={{ fontSize: 14 }} />
          </Button>
        </Box>
      </CardActions>
    </Card>
  );
};

// Enhanced Horizontal Card Component
const EnhancedHorizontalCard = () => {
  return (
    <Card elevation={2} sx={{ display: 'flex', height: 120 }}>
      <Box
        sx={{
          width: 100,
          bgcolor: 'var(--mui-palette-product-marking)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          flexDirection: 'column',
          gap: 1
        }}
      >
        <RuleOutlined sx={{ fontSize: 24 }} />
        <Typography variant="caption" sx={{ color: 'white', opacity: 0.9 }}>
          MARKING
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <CardContent sx={{ flex: 1, p: 2, pb: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Actuarial Marking
          </Typography>
          <Box display="flex" gap={0.5} mb={1}>
            <Chip label="CS1" size="small" color="primary" />
            <Chip label="Available" size="small" color="success" />
          </Box>
          <Typography variant="caption" color="text.secondary">
            Professional feedback service
          </Typography>
        </CardContent>
        <CardActions sx={{ p: 2, pt: 0, justifyContent: 'space-between' }}>
          <Typography variant="h6" color="primary.main">
            £150
          </Typography>
          <Button variant="outlined" size="small">
            Select
          </Button>
        </CardActions>
      </Box>
    </Card>
  );
};

// Enhanced Minimal Card Component
const EnhancedMinimalCard = () => {
  const [selected, setSelected] = useState(false);

  return (
    <Paper 
      variant="outlined" 
      sx={{ 
        p: 2,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        border: selected ? '2px solid' : '1px solid',
        borderColor: selected ? 'primary.main' : 'divider',
        '&:hover': {
          boxShadow: 2,
          borderColor: 'primary.main'
        }
      }}
      onClick={() => setSelected(!selected)}
    >
      <Stack spacing={1.5}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: 'var(--mui-palette-product-online)'
              }}
            />
            <Typography variant="caption" color="text.secondary">
              ONLINE
            </Typography>
          </Stack>
          {selected && (
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: 'success.main'
              }}
            />
          )}
        </Stack>
        <Typography variant="subtitle2">
          Mock Exams
        </Typography>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" color="primary.main">
            £75
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Digital only
          </Typography>
        </Stack>
      </Stack>
    </Paper>
  );
};

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

export default ProductCardsSection;