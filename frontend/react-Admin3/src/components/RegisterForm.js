import React from "react";
import { Modal, Form, Button, Alert } from "react-bootstrap";

const RegisterForm = ({
  show,
  onHide,
  registerData,
  handleRegisterInputChange,
  handleRegister,
  registerError,
  isLoading,
  switchToLogin,
}) => (
  <Modal show={show} onHide={onHide}>
    <Modal.Header closeButton>
      <Modal.Title>Register</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      {registerError && <Alert variant="danger">{registerError}</Alert>}
      <Form onSubmit={handleRegister}>
        <Form.Group className="mb-3">
          <Form.Label>First Name</Form.Label>
          <Form.Control
            type="text"
            name="first_name"
            value={registerData.first_name}
            onChange={handleRegisterInputChange}
            required
          />
          <Form.Label>Last Name</Form.Label>
          <Form.Control
            type="text"
            name="last_name"
            value={registerData.last_name}
            onChange={handleRegisterInputChange}
            required
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Email address</Form.Label>
          <Form.Control
            type="email"
            name="email"
            value={registerData.email}
            onChange={handleRegisterInputChange}
            required
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Password</Form.Label>
          <Form.Control
            type="password"
            name="password"
            value={registerData.password}
            onChange={handleRegisterInputChange}
            required
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Confirm Password</Form.Label>
          <Form.Control
            type="password"
            name="confirmPassword"
            value={registerData.confirmPassword}
            onChange={handleRegisterInputChange}
            required
          />
        </Form.Group>
        <div className="d-flex justify-content-between align-items-center">
          <Button variant="primary" type="submit" disabled={isLoading}>
            {isLoading ? "Registering..." : "Register"}
          </Button>
          <Button variant="link" onClick={switchToLogin}>
            Already have an account? Login
          </Button>
        </div>
      </Form>
    </Modal.Body>
  </Modal>
);

export default RegisterForm;
