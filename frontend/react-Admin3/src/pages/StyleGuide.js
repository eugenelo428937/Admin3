import "bootstrap/dist/css/bootstrap.min.css";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Row, Col } from "react-bootstrap";
import { Typography, Container } from "@mui/material";


const StyleGuide = () => {
	const navigate = useNavigate();	

	return (
		<Container align="start" disableGutters={true} className="mt-3">
			<div className="display1">Style Guide</div>
			<Row>
				<Col>
					<div className="display2">Material UI Typography</div>
					<Typography variant="h1">H1</Typography>
					<Typography variant="h2">H2</Typography>
					<Typography variant="h3">H3</Typography>
					<Typography variant="h4">H4</Typography>
					<Typography variant="h5">H5</Typography>
					<Typography variant="h6">H6</Typography>
					<Typography variant="subtitle1">Subtitle 1</Typography>
					<Typography variant="subtitle2">Subtitle 2</Typography>
					<Typography variant="body1">Body 1</Typography>
					<Typography variant="body2">Body 2</Typography>
					<Typography variant="caption">Caption</Typography>
					<Typography variant="overline">Overline</Typography>
					<Typography variant="button">Button</Typography>
				</Col>
				<Col>
					<div className="display2">LiftKit CSS Typography</div>					
					<div className="display1">display1</div>
					<div className="display2">display2</div>
					<div className="title1">title1</div>
					<div className="title2">title2</div>
					<div className="title3">title3</div>
					<div className="heading">heading</div>
					<div className="subheading">subheading</div>
					<div className="body">body</div>
					<div className="callout">callout</div>
					<div className="label">label</div>
					<div className="caption">caption</div>
					<div className="overline">overline</div>
				</Col>
			</Row>		
		</Container>
	);
};

export default StyleGuide;
