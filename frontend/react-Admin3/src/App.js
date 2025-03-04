// src/App.js

import React, { useEffect, useState } from 'react';
import ActEdNavbar from "./components/ActEdNavbar";
import { AuthProvider } from "./hooks/useAuth";


function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if the user is authenticated
    const authStatus = localStorage.getItem('isAuthenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  return (
		<AuthProvider>
			<div className="App">
				<ActEdNavbar />
				<h1>The Acturial Education Company</h1>
				<h2>E-Store</h2>
			</div>
		</AuthProvider>
  );
}

export default App;
