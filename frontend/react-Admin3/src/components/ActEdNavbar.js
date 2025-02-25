// src/components/ActEdNavbar.js
import React from "react";
import { Container, Button, Col, Row, Nav, Navbar, Image, NavDropdown } from "react-bootstrap";
import { LinkContainer } from "react-router-bootstrap";
import { House, QuestionCircle, Cart, PersonCircle, Download, Search } from "react-bootstrap-icons";
import "bootstrap/dist/css/bootstrap.min.css";
import "../css/navbar.css";

const ActEdNavbar = () => {
	return (
		<div className="navbar-container">
			<div className="d-flex flex-row navbar-top px-3 px-lg-4 px-xl-5 pt-2 pb-1 justify-content-between align-content-end">
				<div className="d-flex flex-row px-1 align-content-center flex-wrap">
					<div className="me-1 d-flex flex-row align-content-center flex-wrap">
						<Button
							variant="link"
							to="/Home"
							className="p-0 mx-1 flex-wrap align-items-center d-flex flex-row">
							<House className="bi d-flex flex-row align-items-center"></House>
							<span className="d-none d-md-block mx-1 fst-normal">ActEd Home</span>
						</Button>
					</div>
					<div className="me-1 d-flex flex-row align-content-center flex-wrap">
						<Button
							variant="link"
							to="/Home"
							className="p-0 mx-1 flex-wrap align-items-center d-flex flex-row">
							<QuestionCircle className="bi d-flex flex-row align-items-center"></QuestionCircle>
							<span className="d-none d-md-block mx-1 fst-normal">Help</span>
						</Button>
					</div>
				</div>

				<div className="d-flex flex-row px-3">
					<div className="me-lg-2 me-1 d-flex flex-row align-content-center">
						<Button
							variant="link"
							to="/shopping-cart"
							className="btn-search p-0 mx-1 flex-wrap align-items-center d-flex flex-row">
							<Cart className="bi d-flex flex-row align-items-center"></Cart>
							<span className="d-none d-md-block mx-1 fst-normal">Shopping Cart</span>
							<span className="position-absolute translate-middle badge rounded-circle bg-danger p-1 notification-dot">
								<span className="position-relative"></span>
								<span className="visually-hidden">item(s) in shopping cart</span>
							</span>
						</Button>
					</div>
					<div className="ms-lg-2 ms-1 d-flex flex-row align-content-center">
						<Button
							variant="link"
							to="/shopping-cart"
							className="btn-search p-0 mx-1 flex-wrap align-items-center d-flex flex-row">
							<PersonCircle className="bi d-flex flex-row align-items-center"></PersonCircle>
							<span className="d-none d-md-block mx-1 fst-normal">Welcome, Eugene</span>
						</Button>
					</div>
				</div>
			</div>
			<Navbar
				expand="md"
				className="navbar navbar-expand-md navbar-main align-content-center justify-content-between px-3 px-lg-4 px-xl-5 pt-md-2 py-2">
				<Container
					fluid
					className="d-flex flex-row justify-content-between align-items-center">
					<Navbar.Brand
						href="#home"
						className="navbar-brand pe-md-2 order-1 order-md-0">
						<Image
							fluid
							src={require("../assets/ActEdlogo.png")}
							alt="ActEd Logo"
							className="d-none d-md-block"
						/>
						<Image
							fluid
							src={require("../assets/ActEdlogo-S.png")}
							alt="ActEd Logo"
							className="d-md-none"
						/>
					</Navbar.Brand>
					<Navbar.Toggle
						className="navbar-toggler menu-button collapsed justify-content-between order-3 order-md-1"
						type="button"
						data-bs-toggle="collapse"
						data-bs-target="#navbar-menu"
						aria-controls="navbar-menu"
						aria-expanded="false"
						aria-label="Toggle navigation">
						<span className="toggler-icon top-bar"></span>
						<span className="toggler-icon middle-bar"></span>
						<span className="toggler-icon bottom-bar"></span>
					</Navbar.Toggle>
					<Navbar.Collapse
						id="navbar-menu"
						className="px-md-1 px-0 m-auto justify-content-lg-center justify-content-md-start order-4 order-md-2">
						<Nav className="navbar-nav  px-md-2 px-lg-2 flex-wrap">
							<Nav.Link href="#home">Home</Nav.Link>
							<Nav.Link href="#home">Subjects</Nav.Link>
							<Nav.Link href="#home">Distance Learning</Nav.Link>
							<Nav.Link href="#home">Tutorials</Nav.Link>
							<Nav.Link href="#home">Online Classroom</Nav.Link>
						</Nav>
					</Navbar.Collapse>
					<div className="d-flex justify-content-md-end justify-content-start align-content-center flex-row ps-md-2 order-0 order-md-4">
						<div className="d-none d-md-block mb-md-1 mb-lg-0">
							<Button
								variant="link"
								to="/Brochure"
								className="nav-link btn-search p-0 ms-2 align-items-center d-flex flex-row">
								<Download className="bi d-flex flex-row align-items-center"></Download>
								<span className="d-none d-md-block mx-1 fst-normal">Brochure</span>
							</Button>
						</div>
						<div>
							<Button
								variant="link"
								to="/Search"
								className="nav-link btn-search p-0 ms-2 align-items-center d-flex flex-row">
								<Search className="bi d-flex flex-row align-items-center"></Search>
								<span className="d-none d-md-block mx-1 fst-normal">Search</span>
							</Button>
						</div>
					</div>
				</Container>
			</Navbar>
		</div>
	);
};

export default ActEdNavbar;
