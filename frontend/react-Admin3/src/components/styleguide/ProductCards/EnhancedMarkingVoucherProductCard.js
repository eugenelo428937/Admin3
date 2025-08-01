import React, { useState } from "react";
import {
	Alert,
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
	FormControlLabel,
	Radio,
	RadioGroup,
	Tooltip,
	TextField,
	IconButton,
} from "@mui/material";
import {
	ConfirmationNumberOutlined,
	AddShoppingCart,
	Star,
	AccessTime,
	InfoOutline,
	Savings,
	Timer,
	Add,
	Remove,
} from "@mui/icons-material";
import { Arrows as ArrowsIcon } from "react-bootstrap-icons";
import { NumberInput } from "@carbon/react";

const EnhancedMarkingVoucherProductCard = ({
	variant = "marking-product",
	...props
}) => {
	const [quantity, setQuantity] = useState(1);
	const basePrice = 35; // Base price per voucher

	const handleQuantityChange = (event, value) => {
		if (value >= 1 && value <= 99) {
			setQuantity(value);
		}
	};

	const handleIncrement = () => {
		if (quantity < 99) {
			setQuantity(quantity + 1);
		}
	};

	const handleDecrement = () => {
		if (quantity > 1) {
			setQuantity(quantity - 1);
		}
	};

	const totalPrice = basePrice * quantity;

	return (
		<Card
			elevation={2}
			variant={variant}
			className="d-flex flex-column"
			{...props}>
			<CardHeader
				className="product-header"
				title={
					<Typography
						variant="h4"
						textAlign="left"
						className="product-title">
						Marking Voucher
					</Typography>
				}
				avatar={
					<Avatar className="product-avatar">
						<ConfirmationNumberOutlined className="product-avatar-icon" />
					</Avatar>
				}
			/>

			<CardContent>
				<Typography
					variant="body2"
					color="text.secondary"
					className="product-description"
					sx={{ mb: 2, textAlign: "left" }}>
					Submit any current assignment or mock exam paper for marking at
					any time, irrespective of the deadlines dates.
				</Typography>

				<Alert
					severity="info"
					className="info-alert"
					sx={{ mb: 2, textAlign: "left" }}>
					<Typography variant="caption" className="alert-text">
						To ensure that your script is returned before the date of the
						exam, please adhere to the explicit Marking Voucher deadline
						dates in each session.
					</Typography>
				</Alert>

				<Box className="validity-info" sx={{ mb: 2 }}>
					<Stack
						direction="row"
						spacing={1}
						alignItems="center"
						className="info-row"
						sx={{ mb: 1 }}>
						<Timer
							className="info-icon"
							sx={{ fontSize: 16, color: "text.secondary" }}
						/>
						<Typography variant="caption" className="info-text">
							Valid for 4 years
						</Typography>
					</Stack>
				</Box>

				<Box
					// className="quantity-section"
					sx={{
						display: "flex",
						alignItems: "center",
						mt: 2,
						flexDirection: "row",
					}}>
					<NumberInput
						id="default-number-input"
						type="text"
						label="Quantity"
						value={quantity}
						onBlur={() => {}}
						onChange={() => {}}
						size="md"
						step={1}
						min={1}
						max={99}
						defaultValue={1}
						helperText="Please enter quantity."
						invalidText="Invalid quantity"
						locale="en"
					/>
				</Box>
			</CardContent>

			<CardActions>
				<Box className="price-container">
					<Box className="price-action-section">
						<Box className="price-info-row">
							<Typography variant="h3" className="price-display">
								£{totalPrice.toFixed(2)}
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
								{quantity} voucher{quantity !== 1 ? "s" : ""} • £
								{basePrice} each
							</Typography>
							<Typography
								variant="fineprint"
								className="vat-status-text"
								color="text.secondary">
								Price includes VAT
							</Typography>
						</Box>
						<Button
							variant="contained"
							className="add-to-cart-button"
							sx={{ alignSelf: "stretch" }}>
							<AddShoppingCart />
						</Button>
					</Box>
				</Box>
			</CardActions>
		</Card>
	);
};

export default EnhancedMarkingVoucherProductCard;
