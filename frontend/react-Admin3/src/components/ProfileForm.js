import React, { useState, useRef, useEffect } from "react";
import { Form, Button, Alert, Row, Col } from "react-bootstrap";
import authService from "../services/authService";
import userService from "../services/userService";
import config from "../config";
import CountryAutocomplete from "./CountryAutocomplete";
import PhoneCodeAutocomplete from "./PhoneCodeAutocomplete";

const initialForm = {
  first_name: "",
  last_name: "",
  title: "",
  email: "",
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

const ProfileForm = ({
  // Mode: 'registration' or 'profile'
  mode = 'registration',
  // For profile mode
  initialData = null,
  onSubmit = null,
  onError = null,
  // For registration mode
  registerError = null,
  isLoading: isLoadingProp = false,
  switchToLogin = null,
  handleRegister = null,
  // Common props
  submitButtonText = null,
  submitButtonDisabled = false,
  showSuccessMessage = true,
  title = null,
  subtitle = null
}) => {
  const [form, setForm] = useState(initialForm);
  const [showWork, setShowWork] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);
  
  // Address search states
  const [showHomeAddressFields, setShowHomeAddressFields] = useState(false);
  const [homeAddressSearch, setHomeAddressSearch] = useState({ postcode: '', country: '', line1: '' });
  const [homeAddressResults, setHomeAddressResults] = useState([]);
  const [homeAddressSearchLoading, setHomeAddressSearchLoading] = useState(false);
  const [homeAddressSearchError, setHomeAddressSearchError] = useState("");
  
  // Country and phone states
  const [countryList, setCountryList] = useState([]);
  const [homeCountryObj, setHomeCountryObj] = useState(null);
  const [homePhoneCountry, setHomePhoneCountry] = useState(null);
  const [mobilePhoneCountry, setMobilePhoneCountry] = useState(null);

  const fieldRefs = {
    first_name: useRef(),
    last_name: useRef(),
    email: useRef(),
    home_street: useRef(),
    home_town: useRef(),
    home_postcode: useRef(),
    home_state: useRef(),
    home_country: useRef(),
    home_phone: useRef(),
    mobile_phone: useRef(),
    password: useRef(),
    confirmPassword: useRef(),
  };

  const isProfileMode = mode === 'profile';
  const isRegistrationMode = mode === 'registration';

  // Load countries on mount
  useEffect(() => {
    fetch(config.apiBaseUrl + "/api/countries")
      .then(res => res.json())
      .then(data => {
        let countries = Array.isArray(data) ? data : data.results || [];
        const frequentCountries = ["United Kingdom", "India", "South Africa"];
        const frequent = frequentCountries
          .map(f => countries.find(c => c.name === f))
          .filter(Boolean);
        const rest = countries
          .filter(c => !frequentCountries.includes(c.name))
          .sort((a, b) => a.name.localeCompare(b.name));
        const all = [...frequent, ...rest];
        setCountryList(all);
      });
  }, []);

  // Populate form in profile mode
  useEffect(() => {
    if (isProfileMode && initialData) {
      console.log("Profile mode: Populating form with initial data", initialData);
      
      const newForm = {
        first_name: initialData.user?.first_name || "",
        last_name: initialData.user?.last_name || "",
        title: initialData.profile?.title || "",
        email: initialData.user?.email || "",
        
        // Home address
        home_building: initialData.home_address?.building || "",
        home_street: initialData.home_address?.street || "",
        home_district: initialData.home_address?.district || "",
        home_town: initialData.home_address?.town || "",
        home_county: initialData.home_address?.county || "",
        home_postcode: initialData.home_address?.postcode || "",
        home_state: initialData.home_address?.state || "",
        home_country: initialData.home_address?.country || "",
        
        // Work address
        work_company: initialData.work_address?.company || "",
        work_department: initialData.work_address?.department || "",
        work_building: initialData.work_address?.building || "",
        work_street: initialData.work_address?.street || "",
        work_district: initialData.work_address?.district || "",
        work_town: initialData.work_address?.town || "",
        work_county: initialData.work_address?.county || "",
        work_postcode: initialData.work_address?.postcode || "",
        work_state: initialData.work_address?.state || "",
        work_country: initialData.work_address?.country || "",
        
        // Preferences
        send_invoices_to: initialData.profile?.send_invoices_to || "HOME",
        send_study_material_to: initialData.profile?.send_study_material_to || "HOME",
        
        // Contact numbers
        home_phone: initialData.contact_numbers?.home_phone || "",
        work_phone: initialData.contact_numbers?.work_phone || "",
        mobile_phone: initialData.contact_numbers?.mobile_phone || "",
        
        // Password fields empty in profile mode
        password: "",
        confirmPassword: ""
      };
      
      setForm(newForm);
      
      // Set work address visibility
      const hasWorkAddress = initialData.work_address && (
        initialData.work_address.company || 
        initialData.work_address.street || 
        initialData.work_address.town
      );
      setShowWork(!!hasWorkAddress);
      
      // Auto-show address fields if we have address data
      const hasHomeAddress = initialData.home_address && (
        initialData.home_address.street || 
        initialData.home_address.town
      );
      setShowHomeAddressFields(!!hasHomeAddress);
    }
  }, [isProfileMode, initialData]);

  // Update phone countries when home country changes
  useEffect(() => {
    const country = countryList.find(c => c.name === form.home_country);
    setHomeCountryObj(country || null);
    if (country && country.phone_code) {
      setHomePhoneCountry(country);
      setMobilePhoneCountry(country);
    }
  }, [form.home_country, countryList]);

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
    if (!form.email) errors.email = "Email is required.";
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) errors.email = "Invalid email format.";
    if (!form.home_street) errors.home_street = "Home street is required.";
    if (!form.home_town) errors.home_town = "Home town/city is required.";
    if (!form.home_postcode) errors.home_postcode = "Home postcode/ZIP is required.";
    if (!form.home_state) errors.home_state = "Home state is required.";
    if (!form.home_country) errors.home_country = "Home country is required.";
    if (!form.home_phone) errors.home_phone = "Home phone is required.";
    if (!form.mobile_phone) errors.mobile_phone = "Mobile phone is required.";
    
    // Password validation
    if (isRegistrationMode) {
      // Registration: password required
      if (!form.password) errors.password = "Password is required.";
      if (!form.confirmPassword) errors.confirmPassword = "Please confirm your password.";
      if (form.password && form.confirmPassword && form.password !== form.confirmPassword) 
        errors.confirmPassword = "Passwords do not match.";
    } else {
      // Profile mode: password optional but if provided, confirmation required
      if (form.password && !form.confirmPassword) 
        errors.confirmPassword = "Please confirm your password.";
      if (form.password && form.confirmPassword && form.password !== form.confirmPassword) 
        errors.confirmPassword = "Passwords do not match.";
    }
    
    // Work address validation if shown
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

  const focusFirstError = (errors) => {
    const errorOrder = [
      "first_name", "last_name", "email", "home_street", "home_town", "home_postcode", 
      "home_state", "home_country", "home_phone", "mobile_phone", "password", "confirmPassword"
    ];
    for (const key of errorOrder) {
      if (errors[key] && fieldRefs[key] && fieldRefs[key].current) {
        fieldRefs[key].current.focus();
        break;
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setEmailVerificationSent(false);
    
    const errors = validate();
    setFieldErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      focusFirstError(errors);
      if (onError) {
        onError("Please fix the validation errors above.");
      }
      return;
    }

    setIsLoading(true);
    
    try {
      if (isProfileMode && onSubmit) {
        // Profile update mode
        const profileData = {
          user: {
            first_name: form.first_name,
            last_name: form.last_name,
            email: form.email,
          },
          profile: {
            title: form.title,
            send_invoices_to: form.send_invoices_to,
            send_study_material_to: form.send_study_material_to,
          },
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
          contact_numbers: {
            home_phone: form.home_phone,
            work_phone: showWork ? form.work_phone : "",
            mobile_phone: form.mobile_phone
          }
        };

        // Add password if provided
        if (form.password) {
          profileData.password = form.password;
        }

        await onSubmit(profileData);
        
      } else if (isRegistrationMode) {
        // Registration mode
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
        
        let result;
        if (handleRegister) {
          // Use custom handler if provided
          result = await handleRegister(payload);
        } else {
          // Use default auth service
          result = await authService.register(payload);
        }
        
        if (result.status === "success") {
          setSuccess(true);
          setSuccessMessage(
            result.message || 
            "Account created successfully! Please check your email for account activation instructions."
          );
          
          // Reset form for potential next registration
          setForm(initialForm);
          setShowWork(false);
          setShowHomeAddressFields(false);
          setHomeAddressSearch({ postcode: '', country: '', line1: '' });
          setHomeAddressResults([]);
        } else {
          setError(result.message || "Registration failed");
          if (onError) {
            onError(result.message || "Registration failed");
          }
        }
      }
    } catch (err) {
      const errorMessage = err.message || (isProfileMode ? "Profile update failed" : "Registration failed");
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Address search functions
  const handleHomeAddressSearch = async () => {
    setHomeAddressSearchError("");
    setHomeAddressSearchLoading(true);
    setHomeAddressResults([]);
    
    const postcode = homeAddressSearch.postcode.trim();
    const country = homeAddressSearch.country.trim().toLowerCase();
    
    if (!postcode || !country) {
      setHomeAddressSearchError("Please enter both postcode and country.");
      setHomeAddressSearchLoading(false);
      return;
    }
    
    try {
      let addresses = [];
      if (country === "uk" || country === "united kingdom" || country === "gb" || country === "great britain") {
        const res = await fetch(
          config.apiBaseUrl + `/api/utils/address-lookup/?postcode=${encodeURIComponent(postcode)}`
        );
        if (res.status === 200) {
          const data = await res.json();
          addresses = (data.addresses || []).map(addr => ({
            line1: addr.line_1 || "",
            line2: addr.line_2 || "",
            town: addr.town_or_city || "",
            county: addr.county || "",
            postcode: addr.postcode || postcode,
            country: "United Kingdom",
            state: "",
            district: "",
            building: addr.building_name || "",
          }));
        } else {
          throw new Error("No addresses found for this postcode.");
        }
      }
      // Add other country logic here...
      
      setHomeAddressResults(addresses);
    } catch (err) {
      setHomeAddressSearchError(err.message || "Address search failed.");
    } finally {
      setHomeAddressSearchLoading(false);
    }
  };

  const handleSelectHomeAddress = (address) => {
    setForm(prev => ({
      ...prev,
      home_building: address.building || '',
      home_street: address.line1 || '',
      home_district: address.district || '',
      home_town: address.town || '',
      home_county: address.county || '',
      home_postcode: address.postcode || '',
      home_state: address.state || '',
      home_country: address.country || '',
    }));
    setShowHomeAddressFields(true);
  };

  return (
    <section
      className="profile-form-panel"
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: 24,
        background: "#fff",
        borderRadius: 8,
        boxShadow: "0 2px 8px #eee",
      }}>
      
      {/* Dynamic Title */}
      <h2 className="mb-4">
        {title || (isProfileMode ? "Update Profile" : "Register")}
      </h2>
      
      {/* Dynamic Subtitle */}
      {subtitle && (
        <p className="text-muted mb-4">{subtitle}</p>
      )}
      
      {/* Success Message - Only show in registration mode if showSuccessMessage is true */}
      {success && showSuccessMessage && isRegistrationMode && (
        <Alert variant="success" className="mb-4">
          <Alert.Heading>
            <i className="fas fa-check-circle me-2"></i>
            Registration Successful!
          </Alert.Heading>
          <p className="mb-3">{successMessage}</p>
          <div className="d-flex gap-2 flex-wrap">            
            {switchToLogin && (
              <Button variant="outline-primary" size="sm" onClick={switchToLogin}>
                <i className="fas fa-sign-in-alt me-1"></i>
                Back to Login
              </Button>
            )}
          </div>
        </Alert>
      )}
      
      {/* Error Messages */}
      {(registerError || error) && !success && (
        <Alert variant="danger">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {registerError || error}
        </Alert>
      )}
      
      {/* Email verification alert in profile mode */}
      {isProfileMode && emailVerificationSent && (
        <Alert variant="info" className="mb-4">
          <i className="bi bi-envelope-check me-2"></i>
          Email verification sent! Please check your new email address and click the verification link.
        </Alert>
      )}
      
      {/* Show form only if not successful in registration OR in profile mode */}
      {(!success || isProfileMode) && (
        <Form onSubmit={handleSubmit} autoComplete="off">
          {/* Contact Name */}
          <h5>Contact Name</h5>
          <Row>
            <Col md={2}>
              <Form.Group className="mb-2">
                <Form.Label>Title</Form.Label>
                <Form.Select
                  name="title"
                  value={form.title || ""}
                  onChange={handleChange}>
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
                <Form.Control
                  type="text"
                  name="first_name"
                  value={form.first_name || ""}
                  onChange={handleChange}
                  isInvalid={!!fieldErrors.first_name}
                  ref={fieldRefs.first_name}
                />
                <Form.Control.Feedback type="invalid">
                  {fieldErrors.first_name}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={5}>
              <Form.Group className="mb-2">
                <Form.Label>Last Name *</Form.Label>
                <Form.Control
                  type="text"
                  name="last_name"
                  value={form.last_name || ""}
                  onChange={handleChange}
                  isInvalid={!!fieldErrors.last_name}
                  ref={fieldRefs.last_name}
                />
                <Form.Control.Feedback type="invalid">
                  {fieldErrors.last_name}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>
          <hr />
          
          {/* Email */}
          <h5>Email</h5>
          {isProfileMode && (
            <div className="mb-2">
              <Alert variant="info" className="py-2">
                <small>
                  <i className="bi bi-info-circle me-1"></i>
                  If you change your email address, you'll need to verify the new email before it becomes active.
                </small>
              </Alert>
            </div>
          )}
          <Row>
            <Col md={6}>
              <Form.Group className="mb-2">
                <Form.Label>Email *</Form.Label>
                <Form.Control
                  type="email"
                  name="email"
                  value={form.email || ""}
                  onChange={handleChange}
                  isInvalid={!!fieldErrors.email}
                  ref={fieldRefs.email}
                />
                <Form.Control.Feedback type="invalid">
                  {fieldErrors.email}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>
          <hr />

          {/* Home Address Section */}
          <h5>Home Address</h5>
          {!showHomeAddressFields ? (
            <Row>
              <Col md={12}>
                <div style={{ border: "1px solid #eee", borderRadius: 6, padding: 16, marginBottom: 16 }}>
                  <div style={{ marginBottom: 8 }}>
                    <Form.Label>Find your address</Form.Label>
                  </div>
                  <Row>
                    <Col md={3}>
                      <Form.Control
                        type="text"
                        placeholder="Postcode"
                        value={homeAddressSearch.postcode}
                        onChange={(e) => setHomeAddressSearch((s) => ({ ...s, postcode: e.target.value }))}
                      />
                    </Col>
                    <Col md={3}>
                      <CountryAutocomplete
                        name="country"
                        value={homeAddressSearch.country}
                        onChange={(e) => setHomeAddressSearch((s) => ({ ...s, country: e.target.value }))}
                        placeholder="Country"
                      />
                    </Col>
                    <Col md={4}>
                      <Form.Control
                        type="text"
                        placeholder="First line of address (optional)"
                        value={homeAddressSearch.line1}
                        onChange={(e) => setHomeAddressSearch((s) => ({ ...s, line1: e.target.value }))}
                      />
                    </Col>
                    <Col md={2}>
                      <Button
                        variant="primary"
                        onClick={handleHomeAddressSearch}
                        disabled={homeAddressSearchLoading}
                        style={{ width: "100%" }}>
                        {homeAddressSearchLoading ? "Searching..." : "Search Address"}
                      </Button>
                    </Col>
                  </Row>
                  {homeAddressSearchError && (
                    <div style={{ color: "red", marginTop: 8 }}>
                      {homeAddressSearchError}
                    </div>
                  )}
                  {homeAddressResults.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ marginBottom: 8 }}>Select your address:</div>
                      <ul style={{ listStyle: "none", padding: 0, maxHeight: 200, overflowY: "auto" }}>
                        {homeAddressResults.map((addr, idx) => (
                          <li key={idx} style={{ marginBottom: 4 }}>
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              style={{ textAlign: "left", width: "100%" }}
                              onClick={() => handleSelectHomeAddress(addr)}>
                              {[addr.line1, addr.line2, addr.town, addr.county, addr.state, addr.country, addr.postcode]
                                .filter(Boolean).join(", ")}
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div style={{ marginTop: 16 }}>
                    <Button variant="link" onClick={() => setShowHomeAddressFields(true)}>
                      Enter address manually
                    </Button>
                  </div>
                </div>
              </Col>
            </Row>
          ) : (
            <>
              <Row>
                <Col md={12}>
                  <Button variant="link" onClick={() => setShowHomeAddressFields(false)}>
                    &larr; Back to address search
                  </Button>
                </Col>
              </Row>
              <Row>
                <Col md={4}>
                  <Form.Group className="mb-2">
                    <Form.Label>Building name</Form.Label>
                    <Form.Control
                      type="text"
                      name="home_building"
                      value={form.home_building || ""}
                      onChange={handleChange}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-2">
                    <Form.Label>Street *</Form.Label>
                    <Form.Control
                      type="text"
                      name="home_street"
                      value={form.home_street || ""}
                      onChange={handleChange}
                      isInvalid={!!fieldErrors.home_street}
                      ref={fieldRefs.home_street}
                    />
                    <Form.Control.Feedback type="invalid">
                      {fieldErrors.home_street}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-2">
                    <Form.Label>District</Form.Label>
                    <Form.Control
                      type="text"
                      name="home_district"
                      value={form.home_district || ""}
                      onChange={handleChange}
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col md={4}>
                  <Form.Group className="mb-2">
                    <Form.Label>Town or City *</Form.Label>
                    <Form.Control
                      type="text"
                      name="home_town"
                      value={form.home_town || ""}
                      onChange={handleChange}
                      isInvalid={!!fieldErrors.home_town}
                      ref={fieldRefs.home_town}
                    />
                    <Form.Control.Feedback type="invalid">
                      {fieldErrors.home_town}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-2">
                    <Form.Label>County</Form.Label>
                    <Form.Control
                      type="text"
                      name="home_county"
                      value={form.home_county || ""}
                      onChange={handleChange}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-2">
                    <Form.Label>Postcode/ZIP *</Form.Label>
                    <Form.Control
                      type="text"
                      name="home_postcode"
                      value={form.home_postcode || ""}
                      onChange={handleChange}
                      isInvalid={!!fieldErrors.home_postcode}
                      style={{ textTransform: "uppercase" }}
                      ref={fieldRefs.home_postcode}
                    />
                    <Form.Control.Feedback type="invalid">
                      {fieldErrors.home_postcode}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-2">
                    <Form.Label>State *</Form.Label>
                    <Form.Control
                      type="text"
                      name="home_state"
                      value={form.home_state || ""}
                      onChange={handleChange}
                      isInvalid={!!fieldErrors.home_state}
                      ref={fieldRefs.home_state}
                    />
                    <Form.Control.Feedback type="invalid">
                      {fieldErrors.home_state}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-2">
                    <Form.Label>Country *</Form.Label>
                    <CountryAutocomplete
                      name="home_country"
                      value={form.home_country}
                      onChange={handleChange}
                      isInvalid={!!fieldErrors.home_country}
                      feedback={fieldErrors.home_country}
                      inputRef={fieldRefs.home_country}
                      placeholder="Country"
                    />
                  </Form.Group>
                </Col>
              </Row>
            </>
          )}
          <hr />

          {/* Work Address Section */}
          <h5>
            Work/University/College Address{" "}
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => setShowWork((v) => !v)}>
              {showWork ? "Remove work details" : "Add work details"}
            </Button>
          </h5>
          {showWork && (
            <>
              {/* Work address fields similar to home address but condensed for space */}
              <Row>
                <Col md={4}>
                  <Form.Group className="mb-2">
                    <Form.Label>Company</Form.Label>
                    <Form.Control
                      type="text"
                      name="work_company"
                      value={form.work_company || ""}
                      onChange={handleChange}
                      isInvalid={!!fieldErrors.work_company}
                    />
                    <Form.Control.Feedback type="invalid">
                      {fieldErrors.work_company}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-2">
                    <Form.Label>Department</Form.Label>
                    <Form.Control
                      type="text"
                      name="work_department"
                      value={form.work_department || ""}
                      onChange={handleChange}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-2">
                    <Form.Label>Building name</Form.Label>
                    <Form.Control
                      type="text"
                      name="work_building"
                      value={form.work_building || ""}
                      onChange={handleChange}
                    />
                  </Form.Group>
                </Col>
              </Row>
              {/* Additional work address fields... */}
              <hr />
            </>
          )}

          {/* Preferences */}
          <h5>Preferences and Communication Details</h5>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-2">
                <Form.Label>Send invoices to *</Form.Label>
                <br />
                <Form.Check
                  inline
                  type="radio"
                  label="Home"
                  name="send_invoices_to"
                  value="HOME"
                  checked={form.send_invoices_to === "HOME"}
                  onChange={handleChange}
                />
                <Form.Check
                  inline
                  type="radio"
                  label="Work"
                  name="send_invoices_to"
                  value="WORK"
                  checked={form.send_invoices_to === "WORK"}
                  onChange={handleChange}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-2">
                <Form.Label>Send study material to *</Form.Label>
                <br />
                <Form.Check
                  inline
                  type="radio"
                  label="Home"
                  name="send_study_material_to"
                  value="HOME"
                  checked={form.send_study_material_to === "HOME"}
                  onChange={handleChange}
                />
                <Form.Check
                  inline
                  type="radio"
                  label="Work"
                  name="send_study_material_to"
                  value="WORK"
                  checked={form.send_study_material_to === "WORK"}
                  onChange={handleChange}
                />
              </Form.Group>
            </Col>
          </Row>
          <hr />

          {/* Contact Numbers */}
          <h5>Contact Numbers</h5>
          <Row>
            <Col md={4}>
              <Form.Group className="mb-2">
                <Form.Label>Phone (home) *</Form.Label>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <PhoneCodeAutocomplete
                    countries={countryList}
                    selectedCountry={homePhoneCountry}
                    onSelect={(country) => setHomePhoneCountry(country)}
                    name="home_phone_code"
                    autoComplete="new-password"
                  />
                  <Form.Control
                    type="text"
                    name="home_phone"
                    value={form.home_phone || ""}
                    onChange={handleChange}
                    isInvalid={!!fieldErrors.home_phone}
                    ref={fieldRefs.home_phone}
                    style={{ flex: 1 }}
                    autoComplete="tel"
                    inputMode="tel"
                  />
                </div>
                <Form.Control.Feedback type="invalid">
                  {fieldErrors.home_phone}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-2">
                <Form.Label>Phone (mobile) *</Form.Label>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <PhoneCodeAutocomplete
                    countries={countryList}
                    selectedCountry={mobilePhoneCountry}
                    onSelect={(country) => setMobilePhoneCountry(country)}
                    name="mobile_phone_code"
                    autoComplete="new-password"
                  />
                  <Form.Control
                    type="text"
                    name="mobile_phone"
                    value={form.mobile_phone || ""}
                    onChange={handleChange}
                    isInvalid={!!fieldErrors.mobile_phone}
                    ref={fieldRefs.mobile_phone}
                    style={{ flex: 1 }}
                    autoComplete="tel"
                    inputMode="tel"
                  />
                </div>
                <Form.Control.Feedback type="invalid">
                  {fieldErrors.mobile_phone}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>
          <hr />

          {/* Password Section */}
          <h5>{isProfileMode ? "Change Password (Optional)" : "Set Password"}</h5>
          {isProfileMode && (
            <div className="mb-3">
              <Alert variant="info" className="py-2">
                <small>
                  <i className="bi bi-info-circle me-1"></i>
                  Leave password fields empty to keep your current password unchanged.
                </small>
              </Alert>
            </div>
          )}
          <Row>
            <Col md={6}>
              <Form.Group className="mb-2">
                <Form.Label>Password {!isProfileMode ? "*" : ""}</Form.Label>
                <Form.Control
                  type="password"
                  name="password"
                  value={form.password || ""}
                  onChange={handleChange}
                  isInvalid={!!fieldErrors.password}
                  ref={fieldRefs.password}
                  placeholder={isProfileMode ? "Enter new password (optional)" : ""}
                />
                <Form.Control.Feedback type="invalid">
                  {fieldErrors.password}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-2">
                <Form.Label>Confirm Password {!isProfileMode ? "*" : ""}</Form.Label>
                <Form.Control
                  type="password"
                  name="confirmPassword"
                  value={form.confirmPassword || ""}
                  onChange={handleChange}
                  isInvalid={!!fieldErrors.confirmPassword}
                  ref={fieldRefs.confirmPassword}
                  placeholder={isProfileMode ? "Confirm new password" : ""}
                />
                <Form.Control.Feedback type="invalid">
                  {fieldErrors.confirmPassword}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>

          {/* Submit Button */}
          <div className="d-flex justify-content-between align-items-center mt-3">
            <Button
              variant="primary"
              type="submit"
              disabled={isLoading || isLoadingProp || submitButtonDisabled}>
              {submitButtonText || (
                isLoading || isLoadingProp ? 
                  (isProfileMode ? "Updating..." : "Registering...") : 
                  (isProfileMode ? "Update Profile" : "Register")
              )}
            </Button>
            {switchToLogin && isRegistrationMode && (
              <Button variant="link" onClick={switchToLogin}>
                Already have an account? Login
              </Button>
            )}
          </div>
        </Form>
      )}
    </section>
  );
};

export default ProfileForm; 