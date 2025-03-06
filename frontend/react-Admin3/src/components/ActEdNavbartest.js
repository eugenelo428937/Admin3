// src/components/ActEdNavbar.js
import React, { useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "../css/navbar.css";
import { House, QuestionCircle, Cart, PersonCircle, Download, Search } from "react-bootstrap-icons";
import { Routes, Route } from "react-router-dom";
import { LinkContainer } from "react-router-bootstrap";
import { Container, Button, Nav, Navbar, Image, NavDropdown, Modal, Form, Alert } from "react-bootstrap";
import { Link } from "react-router-dom";

const ActEdNavbar = () => {
	return (
		<div>
			<Link to="/Home">
				
					<div className="d-flex flex-row align-content-center flex-wrap">
						<House className="bi d-flex flex-row align-items-center" />
						<span className="d-none d-md-block mx-1 fst-normal">ActEd Home</span>
					</div>
				
			</Link>
		</div>
	);
};

export default ActEdNavbar;
