import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SearchBox from "../components/SearchBox";
import SearchResults from "../components/SearchResults";
import { Row, Col, Alert } from "react-bootstrap";
import { Typography, Container } from "@mui/material";
import backgroundVideo from "../assets/video/12595751_2560_1440_30fps.mp4";
import { useTheme } from "@mui/material/styles";
import rulesEngineService from "../services/rulesEngineService";
import JsonContentRenderer from "../components/Common/JsonContentRenderer";

const Home = () => {
	const theme = useTheme();
	const navigate = useNavigate();
	const [searchResults, setSearchResults] = useState(null);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedFilters, setSelectedFilters] = useState({
		subjects: [],
		product_groups: [],
		variations: [],
		products: [],
	});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [ruleMessages, setRuleMessages] = useState([]);
	const [rulesLoading, setRulesLoading] = useState(true);

	// Evaluate rules on component mount
	useEffect(() => {
		const evaluateHomePageRules = async () => {
			try {
				setRulesLoading(true);
				const currentDate = new Date().toISOString().split('T')[0];
				console.log('🎯 [Home] Evaluating rules for date:', currentDate);
				
				const result = await rulesEngineService.evaluateRulesAtEntryPoint('home_page_mount', {
					current_date: currentDate,
					user_location: 'home_page'
				});
				
				console.log('🎯 [Home] Rules engine result:', result);
				
				if (result.success && result.messages) {
					console.log('🎯 [Home] All messages:', result.messages);
					
					// Filter for display messages only - BUT let's also show 'message' type
					const displayMessages = result.messages.filter(msg => 
						msg.type === 'display' || msg.type === 'message'
					);
					console.log('🎯 [Home] Filtered messages:', displayMessages);
					setRuleMessages(displayMessages);
				}
			} catch (error) {
				console.error('Error evaluating home page rules:', error);
			} finally {
				setRulesLoading(false);
			}
		};

		evaluateHomePageRules();
	}, []);

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
		console.log("🚀 [Home] Starting navigation to search results");
		console.log("🚀 [Home] Raw parameters received:", {
			results: results ? "present" : "missing",
			filters: filters ? "present" : "missing",
			query: query ? `"${query}"` : "missing",
		});

		// Use current state if parameters are not provided
		const searchQueryToUse = query || searchQuery;
		const filtersToUse = filters || selectedFilters;

		console.log("🚀 [Home] Final parameters to use:", {
			searchQuery: searchQueryToUse?.trim(),
			selectedFilters: filtersToUse,
		});

		const searchParams = new URLSearchParams();

		if (searchQueryToUse?.trim()) {
			searchParams.append("q", searchQueryToUse.trim());
			console.log(
				"🚀 [Home] Added query parameter:",
				searchQueryToUse.trim()
			);
		}

		// Add selected filters
		filtersToUse.subjects.forEach((subject) => {
			searchParams.append("subjects", subject.code || subject.id);
			console.log(
				"🚀 [Home] Added subject filter:",
				subject.code || subject.id
			);
		});

		filtersToUse.product_groups.forEach((group) => {
			searchParams.append("groups", group.id);
			console.log("🚀 [Home] Added group filter:", group.id);
		});

		filtersToUse.variations.forEach((variation) => {
			searchParams.append("variations", variation.id);
			console.log("🚀 [Home] Added variation filter:", variation.id);
		});

		filtersToUse.products.forEach((product) => {
			searchParams.append("products", product.id);
			console.log("🚀 [Home] Added product filter:", product.id);
		});

		console.log(
			"🚀 [Home] All searchParams entries:",
			Array.from(searchParams.entries())
		);

		const finalUrl = `/products?${searchParams.toString()}`;
		console.log("🚀 [Home] Final navigation URL:", finalUrl);

		// Navigate to product list with search parameters
		navigate(finalUrl);

		console.log("🚀 [Home] Navigation completed");
	};

	return (
		<Container maxWidth="false" className="hero-container">
			<Row>
				<Col
					className="text-center"
					style={{
						position: "relative",
						overflow: "hidden",
					}}>
					{/* Background Video */}
					<video
						autoPlay
						loop
						muted
						playsInline
						style={{
							position: "absolute",
							top: 0,
							left: 0,
							width: "100%",
							height: "100%",
							objectFit: "cover",
							zIndex: -2,
						}}>
						<source src={backgroundVideo} type="video/mp4" />
						Your browser does not support the video tag.
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
							zIndex: -1,
						}}
					/>

					{/* Content */}
					<Container className="hero-content d-flex flex-column flex-wrap justify-content-center align-items-center">
						<Typography
							variant="h1"
							className="">
							BPP Actuarial Education
						</Typography>
						<Typography
							variant="h2"
							className="">
							Online Store
						</Typography>
						<div
							style={{ maxWidth: "600px", margin: "0 auto" }}
							className="m-top__xl">
							<SearchBox
								onSearchResults={handleSearchResults}
								onShowMatchingProducts={handleShowMatchingProducts}
								autoFocus={false}
							/>
						</div>
					</Container>
				</Col>
			</Row>

			{/* Rules Engine Messages - Below Hero, Above Search Results */}
			{console.log('🎯 [Home] Render - rulesLoading:', rulesLoading, 'ruleMessages:', ruleMessages)}
			{console.log('🎯 [Home] Render condition check:', !rulesLoading, ruleMessages.length > 0, (!rulesLoading && ruleMessages.length > 0))}
			
			{/* FORCE SHOW MESSAGES FOR DEBUGGING */}
			{ruleMessages.length > 0 ? (
				<Container maxWidth="xl" className="my-4">
					<Row>
						<Col>							
							{ruleMessages.map((message, index) => (
								<Alert 
									key={`rule-message-${index}`}
									variant="warning"
									className="mb-3"
									style={{
										borderRadius: '8px',
										border: '1px solid #ffc107',
										backgroundColor: '#fff3cd',
										color: '#856404'
									}}
								>
									<div>
										<strong>{message.title || 'No Title'}</strong>
										{message.content_format === 'json' && message.json_content ? (
											<JsonContentRenderer content={message.json_content} />
										) : (
											<div dangerouslySetInnerHTML={{ __html: message.message || message.content || 'No message content' }} />
										)}
										<div style={{ fontSize: '10px', marginTop: '5px', color: '#666' }}>
											Type: {message.type} | Message Type: {message.message_type} | Content Format: {message.content_format || 'html'}
										</div>
									</div>
								</Alert>
							))}
						</Col>
					</Row>
				</Container>
			) : (
				<Container maxWidth="xl" className="my-2">
					<div style={{ padding: '5px', backgroundColor: '#ffeeee', color: '#cc0000' }}>
						DEBUG: No rule messages to display (length: {ruleMessages.length})
					</div>
				</Container>
			)}					

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
					loading={loading}
					error={error}
					maxSuggestions={5}
				/>
			</Container>
		</Container>
	);
};

export default Home;
