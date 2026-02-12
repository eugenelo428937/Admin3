import React from 'react';

import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { createRoot } from "react-dom/client";
import { BrowserRouter as Router } from "react-router-dom";
import "@fontsource-variable/dm-sans";
import "@fontsource/poppins";
import "@fontsource-variable/inter";
import '@fontsource-variable/geist';

const container = document.getElementById("root");
const root = createRoot(container);
root.render(
	<React.StrictMode>
		<Router>
			<App />
		</Router>
	</React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
