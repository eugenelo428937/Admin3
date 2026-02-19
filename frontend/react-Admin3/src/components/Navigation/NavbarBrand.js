import React from 'react';
import { Box, Stack, Typography, useTheme } from '@mui/material';
import { useNavigate } from "react-router-dom";

const NavbarBrand = () =>
{
	const navigate = useNavigate();
	const theme = useTheme();
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
				src={require("../../assets/ActEdlogo-S.png")}
				alt="ActEd Logo"
				sx={{
					display: { xs: 'none', lg: 'block' },
					maxWidth: '2.35rem',
					minWidth: '2.35rem',
					marginRight: theme.spacingTokens.xs[4],
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
			<Stack sx={{ maxWidth: '11.75rem', mt: 1 }}>

				<Typography variant="logo_bpp">BPP</Typography>

				<Typography variant="logo_acted">ACTUARIAL</Typography>

				<Box sx={{
					textAlign: 'left',
					lineHeight: 1,
					display: 'flex',
					gap: theme.spacingTokens.xs[4]
				}}>
					<Typography variant='logo_lyceum'>LYCEUM</Typography>
					<Typography variant='logo_education_group'>EDUCATION GROUP</Typography>
				</Box>
			</Stack>
		</Box>
	);
};

export default NavbarBrand;
