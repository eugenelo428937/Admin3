// src/components/ActEdNavbar.js
import React, { useEffect, useState } from 'react';
import { Container, Button, Col, Row, Nav, Navbar, Image, NavDropdown, Modal, Form, Alert } from "react-bootstrap";
import { LinkContainer } from "react-router-bootstrap";
import { House, QuestionCircle, Cart, PersonCircle, Download, Search } from "react-bootstrap-icons";
import axios from 'axios'; // Make sure to install axios: npm install axios
import "bootstrap/dist/css/bootstrap.min.css";
import "../css/navbar.css";

const ActEdNavbar = () => {
  // State for authentication status
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  
  // State for modals
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  
  // Form states
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  
  // Error and loading states
  const [loginError, setLoginError] = useState("");
  const [registerError, setRegisterError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Check if user is already logged in (from localStorage)
  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    
    if (token && user) {
      const userData = JSON.parse(user);
      setIsAuthenticated(true);
      setUsername(userData.name || userData.email || userData.username);
    }
  }, []);

  // Handle login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    setIsLoading(true);
    
    try {
      // Connect to Django backend for authentication
      const response = await axios.post("http://localhost:8888/students/login/", {
			username: loginEmail,
			password: loginPassword,
		});
      
      // If login is successful
      if (response.data && response.data.token) {
        // Store token and user data
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.user));
        
        // Update state
        setIsAuthenticated(true);
        setUsername(response.data.user.name || response.data.user.username || loginEmail);
        setShowLoginModal(false);
        
        // Reset form
        setLoginEmail("");
        setLoginPassword("");
      } else {
        setLoginError("Login failed. Please check your credentials.");
      }
    } catch (error) {
      console.error("Login error:", error);
      setLoginError(
        error.response?.data?.message || 
        "Login failed. Please check your credentials and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle register
  const handleRegister = async (e) => {
    e.preventDefault();
    setRegisterError("");
    
    // Validate passwords match
    if (registerPassword !== registerConfirmPassword) {
      setRegisterError("Passwords don't match!");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Connect to Django backend for registration
      const response = await axios.post('/api/students/register', {
        email: registerEmail,
        password: registerPassword,
        name: registerName
      });
      
      // If registration is successful
      if (response.data && response.data.token) {
        // Store token and user data
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.user));
        
        // Update state
        setIsAuthenticated(true);
        setUsername(response.data.user.name || response.data.user.username || registerEmail);
        setShowRegisterModal(false);
        
        // Reset form
        setRegisterEmail("");
        setRegisterPassword("");
        setRegisterConfirmPassword("");
        setRegisterName("");
      } else {
        setRegisterError("Registration failed. Please try again.");
      }
    } catch (error) {
      console.error("Registration error:", error);
      setRegisterError(
        error.response?.data?.message || 
        "Registration failed. Please try again later."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      // Optional: Call logout endpoint if your API requires it
      const token = localStorage.getItem("token");
      if (token) {
        await axios.post('/api/students/logout', {}, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Clear local storage regardless of API response
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setIsAuthenticated(false);
      setUsername("");
    }
  };

  // Toggle between login and register modals
  const switchToRegister = () => {
    setLoginError("");
    setShowLoginModal(false);
    setShowRegisterModal(true);
  };

  const switchToLogin = () => {
    setRegisterError("");
    setShowRegisterModal(false);
    setShowLoginModal(true);
  };

  // Handle user icon click
  const handleUserIconClick = () => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
    }
    // If authenticated, the dropdown will handle showing logout option
  };

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
            {isAuthenticated ? (
              <NavDropdown 
                title={
                  <div className="d-flex align-items-center">
                    <PersonCircle className="bi d-flex flex-row align-items-center" />
                    <span className="d-none d-md-block mx-1 fst-normal">Welcome, {username}</span>
                  </div>
                } 
                id="user-dropdown"
              >
                <NavDropdown.Item href="/profile">My Profile</NavDropdown.Item>
                <NavDropdown.Item href="/orders">My Orders</NavDropdown.Item>
                <NavDropdown.Divider />
                <NavDropdown.Item onClick={handleLogout}>Logout</NavDropdown.Item>
              </NavDropdown>
            ) : (
              <Button
                variant="link"
                onClick={handleUserIconClick}
                className="btn-search p-0 mx-1 flex-wrap align-items-center d-flex flex-row">
                <PersonCircle className="bi d-flex flex-row align-items-center"></PersonCircle>
                <span className="d-none d-md-block mx-1 fst-normal">Login</span>
              </Button>
            )}
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

      {/* Login Modal */}
      <Modal show={showLoginModal} onHide={() => setShowLoginModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Login</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loginError && <Alert variant="danger">{loginError}</Alert>}
          <Form onSubmit={handleLogin}>
            <Form.Group className="mb-3" controlId="loginEmail">
              <Form.Label>Email address</Form.Label>
              <Form.Control 
                type="email" 
                placeholder="Enter email" 
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="loginPassword">
              <Form.Label>Password</Form.Label>
              <Form.Control 
                type="password" 
                placeholder="Password" 
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
              />
            </Form.Group>
            
            <div className="d-flex justify-content-between align-items-center">
              <Button 
                variant="primary" 
                type="submit" 
                disabled={isLoading}
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </Button>
              <Button variant="link" onClick={switchToRegister}>
                Need an account? Register
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Register Modal */}
      <Modal show={showRegisterModal} onHide={() => setShowRegisterModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Register</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {registerError && <Alert variant="danger">{registerError}</Alert>}
          <Form onSubmit={handleRegister}>
            <Form.Group className="mb-3" controlId="registerName">
              <Form.Label>Full Name</Form.Label>
              <Form.Control 
                type="text" 
                placeholder="Enter your name" 
                value={registerName}
                onChange={(e) => setRegisterName(e.target.value)}
                required
              />
            </Form.Group>
            
            <Form.Group className="mb-3" controlId="registerEmail">
              <Form.Label>Email address</Form.Label>
              <Form.Control 
                type="email" 
                placeholder="Enter email" 
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
                required
              />
              <Form.Text className="text-muted">
                We'll never share your email with anyone else.
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3" controlId="registerPassword">
              <Form.Label>Password</Form.Label>
              <Form.Control 
                type="password" 
                placeholder="Password" 
                value={registerPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
                required
              />
            </Form.Group>
            
            <Form.Group className="mb-3" controlId="registerConfirmPassword">
              <Form.Label>Confirm Password</Form.Label>
              <Form.Control 
                type="password" 
                placeholder="Confirm Password" 
                value={registerConfirmPassword}
                onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                required
              />
            </Form.Group>
            
            <div className="d-flex justify-content-between align-items-center">
              <Button 
                variant="primary" 
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? 'Registering...' : 'Register'}
              </Button>
              <Button variant="link" onClick={switchToLogin}>
                Already have an account? Login
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default ActEdNavbar;
