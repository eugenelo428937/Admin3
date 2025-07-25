import React from 'react';
import { Navbar, Image } from 'react-bootstrap';

const NavbarBrand = () => {
  return (
		<Navbar.Brand
			href="#home"
			className="navbar-brand pe-md-2 order-1 order-md-0">
			<Image
				fluid
				src={require("../../assets/ActEdlogo.png")}
				alt="ActEd Logo"
				className="d-none d-md-block"
			/>
			<Image
				fluid
				src={require("../../assets/ActEdlogo-S.png")}
				alt="ActEd Logo"
				className="d-md-none"
        style={{ maxWidth: "2.35rem" }}
			/>
		</Navbar.Brand>
  );
};

export default NavbarBrand;