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
  Avatar,
  Radio,
  RadioGroup,
  FormControlLabel,
  Tooltip
} from '@mui/material';
import {
  Computer,
  AddShoppingCart,
  Star,
  AccessTime,
  CalendarMonthOutlined,
  PlayCircleOutline,
  VideoLibrary,
  InfoOutline
} from '@mui/icons-material';

const EnhancedOnlineClassroomProductCard = ({ variant = "online-product", ...props }) => {
  const [selectedFormat, setSelectedFormat] = useState('live');
  const [selectedPriceType, setSelectedPriceType] = useState(""); // Empty means standard pricing
  const [isHovered, setIsHovered] = useState(false);

  const formatOptions = {
		live: {
			price: 249,
			label: "The Hub (VLE)",
			description: "Tutorial recordings delivered via the BPP Learning Hub",
		},
  };

  const handleFormatChange = (event) => {
    setSelectedFormat(event.target.value);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
		<Card
			elevation={2}
			variant={variant}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
			sx={{                 
				transform: isHovered ? 'scale(1.02)' : 'scale(1)',
				transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
			}}
			className="d-flex flex-column"
			{...props}>
			{/* Floating Badges */}
			<Box className="floating-badges-container">
				<Chip
					label="CP1"
					size="small"
					className="subject-badge"
					role="img"
					aria-label="Subject: CP1"
				/>
				<Chip
					label="25S"
					size="small"
					className="session-badge"
					role="img"
					aria-label="Exam session: 25S"
				/>
			</Box>
			<CardHeader
				className="product-header"
				title={
					<Typography
						variant="h4"
						textAlign="left"
						className="product-title">
						Online Classroom
					</Typography>
				}
				subheader={
					<Typography
						variant="subtitle1"
						textAlign="left"
						className="product-subtitle">
						CP1 - Actuarial Practice
					</Typography>
				}
				avatar={
					<Avatar className="product-avatar">
						<Computer className="product-avatar-icon" />
					</Avatar>
				}
			/>

			<CardContent>
				<Box className="product-variations">
					<Typography variant="subtitle2" className="variations-title">
						Access Options
					</Typography>

					<RadioGroup
						value={selectedFormat}
						onChange={handleFormatChange}
						className="variations-group">
						<Stack spacing={1}>
							{Object.entries(formatOptions).map(([key, option]) => (
								<Box key={key} className="variation-option">
									<FormControlLabel
										value={key}
										control={<Radio size="small" />}
										label={
											<Box className="variation-label">
												<Box
													display="flex"
													justifyContent="space-between"
													alignItems="center">
													<Typography
														variant="body2"
														fontWeight={
															selectedFormat === key ? 600 : 400
														}>
														{option.label}
													</Typography>
													<Typography
														variant="body2"
														color="primary.main"
														fontWeight={600}>
														£{option.price}
													</Typography>
												</Box>
												<Typography
													variant="caption"
													color="text.secondary"
													className="variation-description">
													{option.description}
												</Typography>
											</Box>
										}
										className="variation-control"
									/>
								</Box>
							))}
						</Stack>
					</RadioGroup>
				</Box>
			</CardContent>

			<CardActions>
				{/* Discount Options Section - matches theme structure */}
				<Box className="price-container">
					<Box className="discount-options">
						<Typography variant="subtitle2" className="discount-title">
							Discount Options
						</Typography>
						<Box className="discount-radio-group">
							<FormControlLabel
								className="discount-radio-option"
								control={
									<Radio
										checked={selectedPriceType === "retaker"}
										onClick={() =>
											setSelectedPriceType(
												selectedPriceType === "retaker"
													? ""
													: "retaker"
											)
										}
										size="small"
									/>
								}
								label={
									<Typography
										variant="subtitle2"
										className="discount-label">
										Retaker
									</Typography>
								}
							/>
							<FormControlLabel
								className="discount-radio-option"
								control={
									<Radio
										checked={selectedPriceType === "additional"}
										onClick={() =>
											setSelectedPriceType(
												selectedPriceType === "additional"
													? ""
													: "additional"
											)
										}
										size="small"
									/>
								}
								label={
									<Typography
										variant="subtitle2"
										className="discount-label">
										Additional Copy
									</Typography>
								}
							/>
						</Box>
					</Box>
					{/* Price & Action Section - matches theme structure */}
					<Box className="price-action-section">
						<Box className="price-info-row">
							<Typography variant="h3" className="price-display">
								{selectedPriceType === "retaker"
									? `£${(
											formatOptions[selectedFormat].price * 0.8
									  ).toFixed(2)}`
									: selectedPriceType === "additional"
									? `£${(
											formatOptions[selectedFormat].price * 0.5
									  ).toFixed(2)}`
									: `£${formatOptions[selectedFormat].price}`}
							</Typography>
							<Tooltip title="Show price details">
								<Button size="small" className="info-button">
									<InfoOutline />
								</Button>
							</Tooltip>
						</Box>
						<Box className="price-details-row">
							<Typography
								variant="fineprint"
								className="price-level-text"
								color="text.secondary">
								{selectedPriceType === "retaker"
									? "Retaker discount applied"
									: selectedPriceType === "additional"
									? "Additional copy discount applied"
									: "Standard pricing"}
							</Typography>
							<Typography
								variant="fineprint"
								className="vat-status-text"
								color="text.secondary">
								Price includes VAT
							</Typography>
						</Box>
						<Button variant="contained" className="add-to-cart-button">
							<AddShoppingCart />
						</Button>
					</Box>
				</Box>
			</CardActions>
		</Card>
  );
};

export default EnhancedOnlineClassroomProductCard;