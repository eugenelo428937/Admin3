import React, { useState } from "react";
import { Form, Button, Alert, Row, Col } from "react-bootstrap";
import authService from "../services/authService";

const initialForm = {
  first_name: "",
  last_name: "",
  title: "",
  email1: "",
  home_building: "",
  home_street: "",
  home_district: "",
  home_town: "",
  home_county: "",
  home_postcode: "",
  home_state: "",
  home_country: "",
  work_company: "",
  work_department: "",
  work_building: "",
  work_street: "",
  work_district: "",
  work_town: "",
  work_county: "",
  work_postcode: "",
  work_state: "",
  work_country: "",
  send_invoices_to: "HOME",
  send_study_material_to: "HOME",
  home_phone: "",
  work_phone: "",
  mobile_phone: "",
  password: "",
  confirmPassword: ""
};

const RegisterForm = ({
  registerError,
  isLoading: isLoadingProp,
  switchToLogin,
  handleRegister: handleRegisterProp
}) => {
  const [form, setForm] = useState(initialForm);
  const [showWork, setShowWork] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const validate = () => {
    const errors = {};
    if (!form.first_name) errors.first_name = "First name is required.";
    if (!form.last_name) errors.last_name = "Last name is required.";
    if (!form.email1) errors.email1 = "Email is required.";
    else if (!/^\S+@\S+\.\S+$/.test(form.email1)) errors.email1 = "Invalid email format.";
    if (!form.home_street) errors.home_street = "Home street is required.";
    if (!form.home_town) errors.home_town = "Home town/city is required.";
    if (!form.home_postcode) errors.home_postcode = "Home postcode/ZIP is required.";
    if (!form.home_state) errors.home_state = "Home state is required.";
    if (!form.home_country) errors.home_country = "Home country is required.";
    if (!form.home_phone) errors.home_phone = "Home phone is required.";
    if (!form.mobile_phone) errors.mobile_phone = "Mobile phone is required.";
    if (!form.password) errors.password = "Password is required.";
    if (!form.confirmPassword) errors.confirmPassword = "Please confirm your password.";
    if (form.password && form.confirmPassword && form.password !== form.confirmPassword) errors.confirmPassword = "Passwords do not match.";
    if (showWork) {
      if (!form.work_company) errors.work_company = "Work company is required.";
      if (!form.work_street) errors.work_street = "Work street is required.";
      if (!form.work_town) errors.work_town = "Work town/city is required.";
      if (!form.work_postcode) errors.work_postcode = "Work postcode/ZIP is required.";
      if (!form.work_state) errors.work_state = "Work state is required.";
      if (!form.work_country) errors.work_country = "Work country is required.";
      if (!form.work_phone) errors.work_phone = "Work phone is required.";
    }
    return errors;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setIsLoading(true);
    try {
      const profile = {
        title: form.title,
        send_invoices_to: form.send_invoices_to,
        send_study_material_to: form.send_study_material_to,
        home_address: {
          building: form.home_building,
          street: form.home_street,
          district: form.home_district,
          town: form.home_town,
          county: form.home_county,
          postcode: form.home_postcode,
          state: form.home_state,
          country: form.home_country,
        },
        work_address: showWork ? {
          company: form.work_company,
          department: form.work_department,
          building: form.work_building,
          street: form.work_street,
          district: form.work_district,
          town: form.work_town,
          county: form.work_county,
          postcode: form.work_postcode,
          state: form.work_state,
          country: form.work_country,
        } : {},
        home_phone: form.home_phone,
        work_phone: showWork ? form.work_phone : "",
        mobile_phone: form.mobile_phone
      };
      const payload = {
        username: form.email,
        password: form.password,
        email: form.email,
        first_name: form.first_name,
        last_name: form.last_name,
        profile,
      };
      console.log('Register payload:', payload); // Debug: log payload before sending
      const result = await authService.register(payload);
      if (result.status === "success") {
        window.location.href = "/home";
      } else {
        setError(result.message || "Registration failed");
      }
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="register-form-panel" style={{ maxWidth: 900, margin: "0 auto", padding: 24, background: "#fff", borderRadius: 8, boxShadow: "0 2px 8px #eee" }}>
      <h2>Register</h2>
      {(registerError || error) && <Alert variant="danger">{registerError || error}</Alert>}
      <Form onSubmit={handleRegister} autoComplete="off">
        {/* Contact Name */}
        <h5>Contact Name</h5>
        <Row>
          <Col md={2}>
            <Form.Group className="mb-2">
              <Form.Label>Title</Form.Label>
              <Form.Select name="title" value={form.title} onChange={handleChange}>
                <option value=""></option>
                <option>Mr</option>
                <option>Miss</option>
                <option>Mrs</option>
                <option>Ms</option>
                <option>Dr</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={5}>
            <Form.Group className="mb-2">
              <Form.Label>First Name *</Form.Label>
              <Form.Control type="text" name="first_name" value={form.first_name} onChange={handleChange} isInvalid={!!fieldErrors.first_name} required />
              <Form.Control.Feedback type="invalid">{fieldErrors.first_name}</Form.Control.Feedback>
            </Form.Group>
          </Col>
          <Col md={5}>
            <Form.Group className="mb-2">
              <Form.Label>Last Name *</Form.Label>
              <Form.Control type="text" name="last_name" value={form.last_name} onChange={handleChange} isInvalid={!!fieldErrors.last_name} required />
              <Form.Control.Feedback type="invalid">{fieldErrors.last_name}</Form.Control.Feedback>
            </Form.Group>
          </Col>
        </Row>
        <hr />
        {/* Email */}
        <h5>Email</h5>
        <Row>
          <Col md={6}>
            <Form.Group className="mb-2">
              <Form.Label>Email *</Form.Label>
              <Form.Control type="email" name="email" value={form.email} onChange={handleChange} isInvalid={!!fieldErrors.email} required />
              <Form.Control.Feedback type="invalid">{fieldErrors.email}</Form.Control.Feedback>
            </Form.Group>
          </Col>
        </Row>
        <hr />
        {/* Home Address */}
        <h5>Home Address</h5>
        <Row>
          <Col md={4}><Form.Group className="mb-2"><Form.Label>Building name</Form.Label><Form.Control type="text" name="home_building" value={form.home_building} onChange={handleChange} /></Form.Group></Col>
          <Col md={4}><Form.Group className="mb-2"><Form.Label>Street *</Form.Label><Form.Control type="text" name="home_street" value={form.home_street} onChange={handleChange} isInvalid={!!fieldErrors.home_street} required /><Form.Control.Feedback type="invalid">{fieldErrors.home_street}</Form.Control.Feedback></Form.Group></Col>
          <Col md={4}><Form.Group className="mb-2"><Form.Label>District</Form.Label><Form.Control type="text" name="home_district" value={form.home_district} onChange={handleChange} /></Form.Group></Col>
        </Row>
        <Row>
          <Col md={4}><Form.Group className="mb-2"><Form.Label>Town or City *</Form.Label><Form.Control type="text" name="home_town" value={form.home_town} onChange={handleChange} isInvalid={!!fieldErrors.home_town} required /><Form.Control.Feedback type="invalid">{fieldErrors.home_town}</Form.Control.Feedback></Form.Group></Col>
          <Col md={4}><Form.Group className="mb-2"><Form.Label>County</Form.Label><Form.Control type="text" name="home_county" value={form.home_county} onChange={handleChange} /></Form.Group></Col>
          <Col md={4}><Form.Group className="mb-2"><Form.Label>Postcode/ZIP *</Form.Label><Form.Control type="text" name="home_postcode" value={form.home_postcode} onChange={handleChange} isInvalid={!!fieldErrors.home_postcode} required style={{ textTransform: 'uppercase' }} /><Form.Control.Feedback type="invalid">{fieldErrors.home_postcode}</Form.Control.Feedback></Form.Group></Col>
        </Row>
        <Row>
          <Col md={6}><Form.Group className="mb-2"><Form.Label>State *</Form.Label><Form.Control type="text" name="home_state" value={form.home_state} onChange={handleChange} isInvalid={!!fieldErrors.home_state} required /><Form.Control.Feedback type="invalid">{fieldErrors.home_state}</Form.Control.Feedback></Form.Group></Col>
          <Col md={6}><Form.Group className="mb-2"><Form.Label>Country *</Form.Label><Form.Control type="text" name="home_country" value={form.home_country} onChange={handleChange} isInvalid={!!fieldErrors.home_country} required /><Form.Control.Feedback type="invalid">{fieldErrors.home_country}</Form.Control.Feedback></Form.Group></Col>
        </Row>
        <hr />
        {/* Work Address (optional) */}
        <h5>Work/University/College Address <Button variant="outline-secondary" size="sm" onClick={() => setShowWork(v => !v)}>{showWork ? "Remove work details" : "Add work details"}</Button></h5>
        {showWork && (
          <>
            <Row>
              <Col md={4}><Form.Group className="mb-2"><Form.Label>Company</Form.Label><Form.Control type="text" name="work_company" value={form.work_company} onChange={handleChange} isInvalid={!!fieldErrors.work_company} required /><Form.Control.Feedback type="invalid">{fieldErrors.work_company}</Form.Control.Feedback></Form.Group></Col>
              <Col md={4}><Form.Group className="mb-2"><Form.Label>Department</Form.Label><Form.Control type="text" name="work_department" value={form.work_department} onChange={handleChange} /></Form.Group></Col>
              <Col md={4}><Form.Group className="mb-2"><Form.Label>Building name</Form.Label><Form.Control type="text" name="work_building" value={form.work_building} onChange={handleChange} /></Form.Group></Col>
            </Row>
            <Row>
              <Col md={4}><Form.Group className="mb-2"><Form.Label>Street</Form.Label><Form.Control type="text" name="work_street" value={form.work_street} onChange={handleChange} isInvalid={!!fieldErrors.work_street} required /><Form.Control.Feedback type="invalid">{fieldErrors.work_street}</Form.Control.Feedback></Form.Group></Col>
              <Col md={4}><Form.Group className="mb-2"><Form.Label>District</Form.Label><Form.Control type="text" name="work_district" value={form.work_district} onChange={handleChange} /></Form.Group></Col>
              <Col md={4}><Form.Group className="mb-2"><Form.Label>Town or City</Form.Label><Form.Control type="text" name="work_town" value={form.work_town} onChange={handleChange} isInvalid={!!fieldErrors.work_town} required /><Form.Control.Feedback type="invalid">{fieldErrors.work_town}</Form.Control.Feedback></Form.Group></Col>
            </Row>
            <Row>
              <Col md={4}><Form.Group className="mb-2"><Form.Label>County</Form.Label><Form.Control type="text" name="work_county" value={form.work_county} onChange={handleChange} /></Form.Group></Col>
              <Col md={4}><Form.Group className="mb-2"><Form.Label>Postcode/ZIP</Form.Label><Form.Control type="text" name="work_postcode" value={form.work_postcode} onChange={handleChange} isInvalid={!!fieldErrors.work_postcode} required style={{ textTransform: 'uppercase' }} /><Form.Control.Feedback type="invalid">{fieldErrors.work_postcode}</Form.Control.Feedback></Form.Group></Col>
              <Col md={2}><Form.Group className="mb-2"><Form.Label>State</Form.Label><Form.Control type="text" name="work_state" value={form.work_state} onChange={handleChange} isInvalid={!!fieldErrors.work_state} required /><Form.Control.Feedback type="invalid">{fieldErrors.work_state}</Form.Control.Feedback></Form.Group></Col>
              <Col md={2}><Form.Group className="mb-2"><Form.Label>Country</Form.Label><Form.Control type="text" name="work_country" value={form.work_country} onChange={handleChange} isInvalid={!!fieldErrors.work_country} required /><Form.Control.Feedback type="invalid">{fieldErrors.work_country}</Form.Control.Feedback></Form.Group></Col>
            </Row>
            <Row>
              <Col md={4}><Form.Group className="mb-2"><Form.Label>Phone (work)</Form.Label><Form.Control type="text" name="work_phone" value={form.work_phone} onChange={handleChange} isInvalid={!!fieldErrors.work_phone} required /><Form.Control.Feedback type="invalid">{fieldErrors.work_phone}</Form.Control.Feedback></Form.Group></Col>
            </Row>
            <hr />
          </>
        )}
        {/* Preferences and Communication Details */}
        <h5>Preferences and Communication Details</h5>
        <Row>
          <Col md={6}>
            <Form.Group className="mb-2">
              <Form.Label>Send invoices to *</Form.Label><br />
              <Form.Check inline type="radio" label="Home" name="send_invoices_to" value="HOME" checked={form.send_invoices_to === "HOME"} onChange={handleChange} />
              <Form.Check inline type="radio" label="Work" name="send_invoices_to" value="WORK" checked={form.send_invoices_to === "WORK"} onChange={handleChange} />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group className="mb-2">
              <Form.Label>Send study material to *</Form.Label><br />
              <Form.Check inline type="radio" label="Home" name="send_study_material_to" value="HOME" checked={form.send_study_material_to === "HOME"} onChange={handleChange} />
              <Form.Check inline type="radio" label="Work" name="send_study_material_to" value="WORK" checked={form.send_study_material_to === "WORK"} onChange={handleChange} />
            </Form.Group>
          </Col>
        </Row>
        <hr />
        {/* Contact Numbers */}
        <h5>Contact Numbers</h5>
        <Row>
          <Col md={4}><Form.Group className="mb-2"><Form.Label>Phone (home) *</Form.Label><Form.Control type="text" name="home_phone" value={form.home_phone} onChange={handleChange} isInvalid={!!fieldErrors.home_phone} required /><Form.Control.Feedback type="invalid">{fieldErrors.home_phone}</Form.Control.Feedback></Form.Group></Col>
          <Col md={4}><Form.Group className="mb-2"><Form.Label>Phone (mobile) *</Form.Label><Form.Control type="text" name="mobile_phone" value={form.mobile_phone} onChange={handleChange} isInvalid={!!fieldErrors.mobile_phone} required /><Form.Control.Feedback type="invalid">{fieldErrors.mobile_phone}</Form.Control.Feedback></Form.Group></Col>
        </Row>
        <hr />
        {/* Auth */}
        <h5>Set Password</h5>
        <Row>
          <Col md={6}><Form.Group className="mb-2"><Form.Label>Password *</Form.Label><Form.Control type="password" name="password" value={form.password} onChange={handleChange} isInvalid={!!fieldErrors.password} required /><Form.Control.Feedback type="invalid">{fieldErrors.password}</Form.Control.Feedback></Form.Group></Col>
          <Col md={6}><Form.Group className="mb-2"><Form.Label>Confirm Password *</Form.Label><Form.Control type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} isInvalid={!!fieldErrors.confirmPassword} required /><Form.Control.Feedback type="invalid">{fieldErrors.confirmPassword}</Form.Control.Feedback></Form.Group></Col>
        </Row>
        <div className="d-flex justify-content-between align-items-center mt-3">
          <Button variant="primary" type="submit" disabled={isLoading || isLoadingProp}>
            {(isLoading || isLoadingProp) ? "Registering..." : "Register"}
          </Button>
          <Button variant="link" onClick={switchToLogin}>
            Already have an account? Login
          </Button>
        </div>
      </Form>
    </section>
  );
};

export default RegisterForm;
