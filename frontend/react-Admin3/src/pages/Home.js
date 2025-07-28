import "bootstrap/dist/css/bootstrap.min.css";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import SearchBox from "../components/SearchBox";
import SearchResults from "../components/SearchResults";
import { Row, Col } from "react-bootstrap";
import { Typography, Container } from "@mui/material";
import backgroundVideo from "../assets/video/12595751_2560_1440_30fps.mp4";

const Home = () => {
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
		<Container
			disableGutters={true}
			maxWidth="false"
			className="hero-container">
			<Row disableGutters={true}>
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
					<Container className="hero-content d-flex flex-wrap justify-content-center align-items-center">
						<Typography variant="h1" className="color-light__onprimary_lkv">
							BPP Actuarial Education
						</Typography>
						<Typography variant="h2" className="color-light__onprimary_lkv">
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

			{/* Search Results Section */}
			<Container				
				disableGutters={true}
				maxWidth="xl">
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
