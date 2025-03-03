// src/App.js

import React, { useEffect, useState } from 'react';
import Navbar from "./components/ActEdNavbar";
import Login from './components/Login';
import StudentForm from './components/StudentForm';
import Logout from './components/Logout';

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
		<div className="App">
			<Navbar />
			<h1>The Acturial Education Company</h1>
			<h2>E-Store</h2>
			
		</div>
  );
}

export default App;
