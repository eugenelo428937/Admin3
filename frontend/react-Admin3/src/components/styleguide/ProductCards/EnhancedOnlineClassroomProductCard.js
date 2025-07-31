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

  return (
		<Card
			elevation={2}
			variant={variant}
			className="d-flex flex-column"
			{...props}>
			<Badge
				badgeContent="Digital"
				color="info"
				sx={{
					"& .MuiBadge-badge": {
						top: 12,
						right: 12,
						fontSize: "0.75rem",
						height: 20,
						minWidth: 20,
					},
				}}>
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
			</Badge>

			<CardContent>
				{/* Enhanced Chips Section - More prominent */}
				<Box className="product-chips">
					<Chip label="CS1" variant="filled" color="primary" />
					<Chip label="2024A" variant="filled" color="secondary" />
				</Box>

				<Typography variant="subtitle2" sx={{ mb: 1.5 }}>
					Access Options
				</Typography>

				<RadioGroup value={selectedFormat} onChange={handleFormatChange}>
					<Stack spacing={1}>
						{Object.entries(formatOptions).map(([key, option]) => (
							<Box
								key={key}
								sx={{
									border: 1,
									borderColor:
										selectedFormat === key
											? "primary.main"
											: "divider",
									borderRadius: 1,
									p: 1.5,
									backgroundColor:
										selectedFormat === key
											? "primary.50"
											: "transparent",
									transition: "all 0.2s ease",
								}}>
								<FormControlLabel
									value={key}
									control={<Radio size="small" />}
									label={
										<Box sx={{ width: "100%" }}>
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
												textAlign="left">
												{option.description}
											</Typography>
										</Box>
									}
									sx={{ mx: 0, width: "100%" }}
								/>
							</Box>
						))}
					</Stack>
				</RadioGroup>
			</CardContent>

			<CardActions>
				<Box className="price-container">
					<Box className="price-action-section">
						<Box className="price-info">
							<Typography variant="h3" className="price-display">
								£{formatOptions[selectedFormat].price}
							</Typography>
							<Tooltip title="Show price details">
								<Button size="small" className="info-button">
									<InfoOutline />
								</Button>
							</Tooltip>
						</Box>
						<Button variant="contained" className="add-to-cart-button">
							<AddShoppingCart />
						</Button>
					</Box>
				</Box>
				<Typography variant="caption" className="status-text">
					{formatOptions[selectedFormat].description} • Price includes VAT
				</Typography>
			</CardActions>
		</Card>
  );
};

export default EnhancedOnlineClassroomProductCard;