import React, { useState, useEffect } from "react";
import { Box, useTheme, Grid, Divider } from "@mui/material";
import { useNavigate } from "react-router-dom";
import SearchBox from "../components/SearchBox";
import SearchResults from "../components/SearchResults";
import { Row, Col, Alert } from "react-bootstrap";
import { Typography, Container } from "@mui/material";
import { rulesEngineHelpers } from "../utils/rulesEngineUtils";
import rulesEngineService from "../services/rulesEngineService";


const Home = () => {
	const navigate = useNavigate();
	const theme = useTheme();
	const [searchResults, setSearchResults] = useState(null);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedFilters, setSelectedFilters] = useState({
		subjects: [],
		product_groups: [],
		variations: [],
		products: [],
	});
	const [error, setError] = useState(null);

	// Rules engine state for holiday messages and other home page rules
	const [rulesMessages, setRulesMessages] = useState([]);
	const [rulesLoading, setRulesLoading] = useState(false);

	// Video path from public folder
	const backgroundVideo = `${process.env.PUBLIC_URL}/video/12595751_2560_1440_30fps.mp4`;
	const backgroundVideoPoster = `${process.env.PUBLIC_URL}/bg2.png`;

	// Debug video paths
	useEffect(() => {
		console.log("🎥 PUBLIC_URL:", process.env.PUBLIC_URL);
		console.log("🎥 Video path:", backgroundVideo);
		console.log("🎥 Poster path:", backgroundVideoPoster);
	}, [backgroundVideo, backgroundVideoPoster]);

	// Execute home_page_mount rules when component mounts
	useEffect(() => {
		const executeRules = async () => {
			setRulesLoading(true);
			setRulesMessages([]); // Clear previous messages

			try {
				console.log("🔍 [Home] Executing home page rules...");

				// Use the new helper function for simplified execution
				const result = await rulesEngineHelpers.executeHomePage(
					null,
					rulesEngineService
				);

				console.log("📋 [Home] Rules engine result:", result);

				if (result.success && result.messages?.processed?.length > 0) {
					// Extract processed display messages for home page (filter out acknowledgments)
					const displayMessages = result.messages.processed.filter(
						(msg) =>
							!msg.isAcknowledgment &&
							msg.display_type !== "modal" &&
							msg.parsed?.displayType !== "modal"
					);
					setRulesMessages(displayMessages);
				}

				// Handle any processing errors
				if (result.errors && result.errors.length > 0) {
					console.error("🚨 Rules processing errors:", result.errors);
					if (process.env.NODE_ENV === "development") {
						setError(`Development Error: ${result.errors.join(", ")}`);
					}
				}
			} catch (err) {
				console.error("Error executing home_page_mount rules:", err);

				// Handle schema validation errors specifically
				if (err.name === "SchemaValidationError") {
					console.error(
						"🚨 Schema validation failed for rules engine:",
						err.details
					);
					console.error("🔍 Schema errors:", err.schemaErrors);
					// For development, show schema validation errors to help debugging
					if (process.env.NODE_ENV === "development") {
						setError(
							`Development Error: Schema validation failed - ${err.details}`
						);
					}
				}
				// Don't show other rule engine errors to user - shouldn't block home page
			} finally {
				setRulesLoading(false);
			}
		};

		executeRules();
	}, []); // Empty dependency array since this should run once on mount

	// Handle search results from SearchBox
	const handleSearchResults = (results, query) => {
		setSearchResults(results);
		setSearchQuery(query || "");
		setError(null);
	};

	// Handle filter selection from SearchResults
	const handleFilterSelect = (filterType, item) => {
		const isSelected = isFilterSelected(filterType, item);

		if (isSelected) {
			// Remove filter
			setSelectedFilters((prev) => ({
				...prev,
				[filterType]: prev[filterType].filter(
					(selected) => selected.id !== item.id
				),
			}));
		} else {
			// Add filter
			setSelectedFilters((prev) => ({
				...prev,
				[filterType]: [...prev[filterType], item],
			}));
		}
	};

	// Check if filter is selected
	const isFilterSelected = (filterType, item) => {
		return selectedFilters[filterType].some(
			(selected) => selected.id === item.id
		);
	};

	// Remove filter
	const handleFilterRemove = (filterType, itemId) => {
		setSelectedFilters((prev) => ({
			...prev,
			[filterType]: prev[filterType].filter((item) => item.id !== itemId),
		}));
	};

	// Handle "Show Matching Products" button click
	const handleShowMatchingProducts = (results, filters, query) => {
		// Use current state if parameters are not provided
		const searchQueryToUse = query || searchQuery;
		const filtersToUse = filters || selectedFilters;

		const searchParams = new URLSearchParams();

		if (searchQueryToUse?.trim()) {
			searchParams.append("q", searchQueryToUse.trim());
		}

		// Add selected filters
		filtersToUse.subjects.forEach((subject) => {
			searchParams.append("subjects", subject.code || subject.id);
		});

		filtersToUse.product_groups.forEach((group) => {
			searchParams.append("groups", group.id);
		});

		filtersToUse.variations.forEach((variation) => {
			searchParams.append("variations", variation.id);
		});

		filtersToUse.products.forEach((product) => {
			searchParams.append("products", product.id);
		});

		const finalUrl = `/products?${searchParams.toString()}`;

		// Navigate to product list with search parameters
		navigate(finalUrl);
	};

	return (
		<Container
			maxWidth={true}
			className="hero-container"
			disableGutters={true}>
			<Row style={{ height: "100%" }}>
				<Col
					className="text-center"
					style={{
						position: "relative",
						overflow: "hidden",
						height: "100%",
					}}>
					{/* Background Video */}
					<video
						autoPlay
						loop
						muted
						playsInline
						poster={backgroundVideoPoster}
						onError={(e) => {
							console.error("🚨 Video error event:", e);
							console.error("🚨 Video element:", e.target);
							console.error("🚨 Video currentSrc:", e.target.currentSrc);
							console.error("🚨 Video error details:", e.target.error);
						}}
						onLoadedData={(e) => {
							console.log("✅ Video loaded successfully");
							console.log(
								"📊 Video dimensions:",
								e.target.videoWidth,
								"x",
								e.target.videoHeight
							);
							console.log("📊 Video duration:", e.target.duration);
						}}
						onLoadStart={() => console.log("📥 Video loading started...")}
						onCanPlay={() => console.log("▶️ Video can play")}
						style={{
							position: "absolute",
							top: 0,
							left: 0,
							width: "100%",
							height: "100%",
							objectFit: "cover",
							zIndex: 0,
						}}>
						<source src={backgroundVideo} type="video/mp4" />
					</video>

					{/* Grey Overlay */}
					<div
						style={{
							position: "absolute",
							top: 0,
							left: 0,
							width: "100%",
							height: "100%",
							backgroundColor: "rgba(0, 0, 0, 0.75)",
							zIndex: 1,
						}}
					/>

					{/* Content */}
					<Container className="hero-content d-flex flex-column flex-wrap justify-content-center align-items-center">
						<Grid container spacing={2}>
							<Grid size={{ xs: 12, md: 12, lg: 6 }}>
								<Box
									sx={{
										display: "flex",
										flexDirection: "column",
										alignItems: "start",
									}}>
									<Typography
										variant="BPP"
										color={theme.palette.md3.surfaceVariant}>
										BPP
									</Typography>
									<Typography
										variant="Acted"
										color={theme.palette.md3.surfaceVariant}
										className="m-top__xs">
										Actuarial Education
									</Typography>
								</Box>
								<Divider />
								<Typography
									variant="h3"
									align="start"
									color={theme.palette.md3.surfaceVariant}>
									Online Store
								</Typography>
							</Grid>
							<Grid size={{ xs: 12, md: 12, lg: 6 }}>
								<Container
									style={{ maxWidth: "600px", margin: "0 auto" }}
									className="m-top__xl">
									<SearchBox										
										onSearchResults={handleSearchResults}
										onShowMatchingProducts={
											handleShowMatchingProducts
										}
										autoFocus={false}
									/>
								</Container>
							</Grid>
						</Grid>
					</Container>
				</Col>
			</Row>

			{/* Rules Engine Messages Section (Holiday Messages, etc.) */}
			<Container maxWidth="xl" className="mt-4">
				{rulesLoading && (
					<Alert variant="info" className="text-center">
						<i className="bi bi-hourglass-split me-2"></i>
						Checking for important notices...
					</Alert>
				)}

				{!rulesLoading &&
					rulesMessages.map((message, index) => {
						// Use the parsed content from the new utilities
						const parsed = message.parsed || message;
						const variant =
							parsed.variant === "warning"
								? "warning"
								: parsed.variant === "error"
								? "danger"
								: parsed.variant === "info"
								? "info"
								: "primary";

						return (
							<Alert
								key={`alert-${message.template_id || index}`}
								variant={variant}
								className="mb-3"
								data-testid="holiday-message"
								dismissible={parsed.dismissible || false}>
								<Alert.Heading>
									{parsed.icon && (
										<i className={`bi bi-${parsed.icon} me-2`}></i>
									)}
									{parsed.title || "Notice"}
								</Alert.Heading>
								<div
									className="mb-0"
									dangerouslySetInnerHTML={{
										__html: parsed.message || "No message content",
									}}
								/>
							</Alert>
						);
					})}
			</Container>

			{/* Search Results Section */}
			<Container disableGutters={true} maxWidth="xl">
				<SearchResults
					searchResults={searchResults}
					searchQuery={searchQuery}
					selectedFilters={selectedFilters}
					onFilterSelect={handleFilterSelect}
					onFilterRemove={handleFilterRemove}
					onShowMatchingProducts={handleShowMatchingProducts}
					isFilterSelected={isFilterSelected}
					loading={false}
					error={error}
					maxSuggestions={5}
				/>
			</Container>
		</Container>
	);
};

export default Home;
