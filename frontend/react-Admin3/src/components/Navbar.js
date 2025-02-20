// src/components/Navbar.js
import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import '../css/navbar.css'; 

const Navbar = () => {
  return (
		<div className="navbar-container">
			<div className="navbar-top d-none d-md-block">top</div>
			<div className="navbar-main d-flex flex-row justify-content-between align-content-center px-4 px-md-5 py-3">
				<div className="d-flex justify-content-md-start justify-content-end align-content-center flex-wrap w-25 order-3 order-md-1">
					<button
						className="navbar-toggler menu-button"
						type="button"
						data-toggle="collapse"
						data-target="#navbarTogglerDemo03"
						aria-controls="navbarTogglerDemo03"
						aria-expanded="false"
						aria-label="Toggle navigation">
						<span className="navbar-toggler-icon"></span>
					</button>
				</div>
				<div className="order-2">
					<a
						className="navbar-brand"
						href="./index.html">
						<img
							src={require("../assets/ActEdlogo.png")}
							alt="ActEd Logo"
							width="150"
							className="d-none d-md-block"
						/>
						<img
							src={require("../assets/ActEdlogo-S.png")}
							alt="ActEd Logo"
							height="42px"
							className="d-md-none"
						/>
					</a>
				</div>
				<div className="d-flex justify-content-md-end justify-content-start align-content-center flex-wrap w-25 order-1 order-md-3">
					<a
						className="nav-link btn-search p-0"
						id="btn-searchs">
						<i className="bi bi-search"></i>
					</a>
				</div>
			</div>
		</div>
  );
};

export default Navbar;
