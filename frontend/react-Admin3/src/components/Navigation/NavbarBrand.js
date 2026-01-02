import React from 'react';
import { Box } from '@mui/material';
import { useNavigate } from "react-router-dom";

const NavbarBrand = () => {
	const navigate = useNavigate();

	return (
		<Box
			component="button"
			onClick={() => navigate("/home")}
			aria-label="Go to home page"
			sx={{
				cursor: "pointer",
				background: 'none',
				border: 'none',
				padding: 0,
				display: 'flex',
				alignItems: 'center',
			}}
			className="navbar-brand order-1 order-md-0"
		>
			{/* Desktop logo - hidden on mobile */}
			<Box
				component="img"
				src={require("../../assets/ActEdlogo.png")}
				alt="ActEd Logo"				
				sx={{
					display: { xs: 'none', lg: 'block' },
					maxWidth: "114px",
					minWidth: "114px",
				}}
			/>
			{/* Mobile logo - hidden on desktop */}
			<Box
				component="img"
				src={require("../../assets/ActEdlogo-S.png")}
				alt="ActEd Logo"
				sx={{
					display: { xs: 'block', lg: 'none' },
					maxWidth: '2.35rem',					
					minWidth: '2.35rem',
				}}
			/>
		</Box>
	);
};

export default NavbarBrand;
