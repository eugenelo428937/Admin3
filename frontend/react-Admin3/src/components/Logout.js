// src/components/Logout.js

import React from 'react';

const Logout = ({ setIsAuthenticated }) => {
  const handleLogout = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8888/students/logout/', {
        method: 'POST',
        credentials: 'include', // Include credentials (cookies) in the request
      });

      if (response.ok) {
        localStorage.removeItem('isAuthenticated');
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <button onClick={handleLogout}>Logout</button>
  );
};

export default Logout;
