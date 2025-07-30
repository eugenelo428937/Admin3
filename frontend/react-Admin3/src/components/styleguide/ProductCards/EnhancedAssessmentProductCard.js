import React, { useState, useEffect, useRef } from 'react';
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
  FormControlLabel,
  Radio,
  Tooltip
} from '@mui/material';
import {
  Assessment,
  Timer,
  Analytics,
  TrendingUp,
  AddShoppingCart,
  InfoOutline
} from '@mui/icons-material';

// Enhanced Assessment Product Card - Mock Exams & Practice Tests
const EnhancedAssessmentProductCard = () => {
	const [selectedVariation, setSelectedVariation] = useState('standard');
	const [selectedPriceType, setSelectedPriceType] = useState('');
	const [selectedAttempts, setSelectedAttempts] = useState(3);
	const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
	const [isHovered, setIsHovered] = useState(false);
	const cardRef = useRef(null);
	const headerRef = useRef(null);

	const handleVariationToggle = (variation) => {
		setSelectedVariation(selectedVariation === variation ? '' : variation);
	};

	// Initialize mouse position to center
	useEffect(() => {
		setMousePosition({ x: 50, y: 50 });
	}, []);

	const handleMouseMove = (e) => {
		// Calculate mouse position relative to the header, not the entire card
		if (headerRef.current) {
			const rect = headerRef.current.getBoundingClientRect();
			const x = ((e.clientX - rect.left) / rect.width) * 100;
			const y = ((e.clientY - rect.top) / rect.height) * 100;
			setMousePosition({ x, y });
		}
	};

	const handleMouseEnter = () => {
		setIsHovered(true);
	};

	const handleMouseLeave = () => {
		setIsHovered(false);
		setMousePosition({ x: 50, y: 50 }); // Reset to center
	};

	// Calculate gradient based on mouse position
	const getGradientStyle = () => {
		const { x, y } = mousePosition;
		const intensity = isHovered ? 0.18 : 0.04;
		const gradientAngle = Math.atan2(y - 50, x - 50) * (180 / Math.PI);
		
		return {
			background: `linear-gradient(${gradientAngle}deg, 
				rgba(156, 39, 176, ${intensity}) 0%, 
				rgba(233, 30, 99, ${intensity * 0.7}) 30%, 
				rgba(255, 255, 255, 0) 60%, 
				rgba(103, 58, 183, ${intensity * 0.5}) 100%)`,
			transition: isHovered ? 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
		};
	};

	return (
		<Card 
			ref={cardRef}
			elevation={2} 
			className="product-card d-flex flex-column" 
			onMouseMove={handleMouseMove}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
			sx={{ 
				maxWidth: 340, 
				height: 'fit-content', 
				overflow: 'hidden',
				transform: isHovered ? 'scale(1.02)' : 'scale(1)',
				transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
			}}>
			<CardHeader
				ref={headerRef}
				title={
					<Box display="flex" alignItems="center" justifyContent="space-between">
						<Typography variant="h6" sx={{ flex: 1}}>
							CS1 Mock Examination
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
							<Assessment sx={{ fontSize: 16, color: '#9c27b0' }} />
						</Box>
					</Box>
				}
				className="product-card-header assessment-header"
				sx={{ 
					py: 2.5,
					position: 'relative',
					'&::before': {
						content: '""',
						position: 'absolute',
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						...getGradientStyle(),
						zIndex: 0,
						pointerEvents: 'none',
					},
					'& > *': {
						position: 'relative',
						zIndex: 1,
					}
				}}
			/>

			<CardContent className="product-card-content" sx={{ marginTop: "0" }}>
				<Box display="flex" gap={1.5} mb={3}>
					<Chip label="CS1" variant="filled" color="primary" sx={{ fontWeight: 600, fontSize: '0.875rem', px: 1.5, py: 0.5, '& .MuiChip-label': { px: 1 } }} />
					<Chip label="Mock Exam" variant="filled" sx={{ bgcolor: '#9c27b0', color: 'white', fontWeight: 600, fontSize: '0.875rem', px: 1.5, py: 0.5, '& .MuiChip-label': { px: 1 } }} />
				</Box>

				<Box mb={3}>
					<Typography variant="subtitle1" color="text.primary" mb={2} textAlign="left">
						Exam Features
					</Typography>
					<Box sx={{
						border: 1,
						borderColor: '#e1bee7',
						borderRadius: 1,
						p: 1.5,
						backgroundColor: '#fce4ec',
						display: 'flex',
						flexDirection: 'column',
						gap: 0.5,
						transition: 'all 0.2s ease',
						'&:hover': {
							boxShadow: '1px 2px 1px rgba(0, 0, 0, 0.15)',
							backgroundColor: '#f8bbd9',
						},
					}}>
						<Typography variant="body2" sx={{ color: '#4a148c', display: 'flex', alignItems: 'center', gap: 1 }}>
							<Timer sx={{ fontSize: 14 }} /> 3.5 hour time limit
						</Typography>
						<Typography variant="body2" sx={{ color: '#4a148c', display: 'flex', alignItems: 'center', gap: 1 }}>
							<Analytics sx={{ fontSize: 14 }} /> Detailed performance analytics
						</Typography>
						<Typography variant="body2" sx={{ color: '#4a148c', display: 'flex', alignItems: 'center', gap: 1 }}>
							<TrendingUp sx={{ fontSize: 14 }} /> Progress tracking & benchmarking
						</Typography>
					</Box>
				</Box>

				<Box mb={2}>
					<Typography variant="subtitle2" color="text.primary" mb={1} textAlign="left">
						Exam Type
					</Typography>
					<Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
						<Box sx={{ border: 1, borderColor: selectedVariation === 'standard' ? '#9c27b0' : 'grey.200', borderRadius: 1, p: 1, backgroundColor: selectedVariation === 'standard' ? '#fce4ec' : 'transparent', cursor: 'pointer', transition: 'all 0.2s ease' }} onClick={() => handleVariationToggle('standard')}>
							<FormControlLabel
								control={<Radio size="small" checked={selectedVariation === 'standard'} sx={{ color: '#9c27b0', '&.Mui-checked': { color: '#9c27b0' }, '& .MuiSvgIcon-root': { fontSize: 16 } }} />}
								label={<Typography variant="body2">Standard Mock Exam</Typography>}
								sx={{ m: 0, pointerEvents: 'none' }}
							/>
						</Box>
						<Box sx={{ border: 1, borderColor: selectedVariation === 'adaptive' ? '#9c27b0' : 'grey.200', borderRadius: 1, p: 1, backgroundColor: selectedVariation === 'adaptive' ? '#fce4ec' : 'transparent', cursor: 'pointer', transition: 'all 0.2s ease' }} onClick={() => handleVariationToggle('adaptive')}>
							<FormControlLabel
								control={<Radio size="small" checked={selectedVariation === 'adaptive'} sx={{ color: '#9c27b0', '&.Mui-checked': { color: '#9c27b0' }, '& .MuiSvgIcon-root': { fontSize: 16 } }} />}
								label={<Typography variant="body2">Adaptive Practice Test</Typography>}
								sx={{ m: 0, pointerEvents: 'none' }}
							/>
						</Box>
					</Box>
				</Box>

				<Box mb={2}>
					<Typography variant="subtitle2" color="text.primary" mb={1} textAlign="left">
						Number of Attempts
					</Typography>
					<Box sx={{ display: 'flex', gap: 1 }}>
						{[1, 3, 5, 'Unlimited'].map((attempts) => (
							<Box key={attempts} sx={{ border: 1, borderColor: selectedAttempts === attempts ? '#9c27b0' : 'grey.200', borderRadius: 1, p: 1, backgroundColor: selectedAttempts === attempts ? '#fce4ec' : 'transparent', cursor: 'pointer', transition: 'all 0.2s ease', minWidth: 50, textAlign: 'center' }} onClick={() => setSelectedAttempts(attempts)}>
								<Typography variant="body2" sx={{ color: selectedAttempts === attempts ? '#4a148c' : 'text.secondary' }}>
									{attempts}
								</Typography>
							</Box>
						))}
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
								let basePrice = selectedVariation === 'adaptive' ? 65 : 45;
								if (selectedAttempts === 5) basePrice += 15;
								if (selectedAttempts === 'Unlimited') basePrice += 30;
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
						sx={{
							backgroundColor: '#9c27b0',
							borderRadius: '50%',
							minWidth: 44,
							width: 44,
							height: 44,
							p: 0,
							boxShadow: '0 4px 8px rgba(156, 39, 176, 0.3)',
							'&:hover': {
								backgroundColor: '#7b1fa2',
								boxShadow: '0 6px 12px rgba(156, 39, 176, 0.4)',
								transform: 'translateY(-1px)',
							},
						}}
						disabled={!selectedVariation}
					>
						<AddShoppingCart sx={{ fontSize: 18, color: 'white' }} />
					</Button>
				</Box>
				<Typography variant="caption" color="text.secondary" mt={1}>
					{selectedPriceType === 'retaker' ? 'Retaker discount applied' : selectedPriceType === 'student' ? 'Student discount applied' : 'Standard pricing'} • Price includes VAT • {selectedAttempts} attempt{selectedAttempts !== 1 && selectedAttempts !== 'Unlimited' ? 's' : selectedAttempts === 'Unlimited' ? 's' : ''} included
				</Typography>
			</CardActions>
		</Card>
	);
};

export default EnhancedAssessmentProductCard;