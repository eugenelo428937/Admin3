import React, { useState, useEffect, useRef } from 'react';
import {
  Avatar,
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
const EnhancedAssessmentProductCard = ({ variant = "assessment-product", ...props }) => {
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
			variant={variant}
			className="d-flex flex-column" 
			onMouseMove={handleMouseMove}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
			sx={{ 
				overflow: 'hidden',
				transform: isHovered ? 'scale(1.02)' : 'scale(1)',
				transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
			}}
			{...props}>
			<CardHeader
				ref={headerRef}
				className="product-header"
				title={
					<Typography
						variant="h4"
						textAlign="left"
						className="product-title">
						CS1 Mock Examination
					</Typography>
				}
				subheader={
					<Typography
						variant="subtitle1"
						textAlign="left"
						className="product-subtitle">
						Mock Exam • Practice Test
					</Typography>
				}
				avatar={
					<Avatar className="product-avatar">
						<Assessment className="product-avatar-icon" />
					</Avatar>
				}
				sx={{ 
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

			<CardContent>
				<Box className="product-chips">
					<Chip label="CS1" variant="filled" color="primary" />
					<Chip label="Mock Exam" variant="filled" color="secondary" />
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

			<CardActions>
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

				<Box className="price-container">
					<Box className="price-action-section">
						<Box className="price-info">
							<Typography variant="h3" className="price-display">
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
								<Button size="small" className="info-button">
									<InfoOutline />
								</Button>
							</Tooltip>
						</Box>
						<Button
							variant="contained"
							className="add-to-cart-button"
							disabled={!selectedVariation}
						>
							<AddShoppingCart />
						</Button>
					</Box>
				</Box>
				<Typography variant="caption" className="status-text">
					{selectedPriceType === 'retaker' ? 'Retaker discount applied' : selectedPriceType === 'student' ? 'Student discount applied' : 'Standard pricing'} • Price includes VAT • {selectedAttempts} attempt{selectedAttempts !== 1 && selectedAttempts !== 'Unlimited' ? 's' : selectedAttempts === 'Unlimited' ? 's' : ''} included
				</Typography>
			</CardActions>
		</Card>
	);
};

export default EnhancedAssessmentProductCard;