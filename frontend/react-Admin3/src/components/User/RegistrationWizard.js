import React, { useState, useEffect, useRef } from "react";
import { Form, Button, Alert, Row, Col, Card, ProgressBar, Badge } from "react-bootstrap";
import authService from "../../services/authService";
import config from "../../config";
import CountryAutocomplete from "./CountryAutocomplete";
import PhoneCodeAutocomplete from "./PhoneCodeAutocomplete";

const initialForm = {
  title: "",
  first_name: "",
  last_name: "",
  email: "",
  
  // Home address
  home_building: "",
  home_street: "",
  home_district: "",
  home_town: "",
  home_county: "",
  home_postcode: "",
  home_state: "",
  home_country: "",
  
  // Work address (optional)
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
  
  // Contact info
  home_phone: "",
  work_phone: "",
  mobile_phone: "",
  personal_email: "",
  work_email: "",
  
  // Preferences
  send_invoices_to: "HOME",
  send_study_material_to: "HOME",
  
  // Security
  password: "",
  confirmPassword: ""
};

const STEPS = [
  { id: 1, title: "Personal", subtitle: "Basic information", icon: "👤" },
  { id: 2, title: "Home", subtitle: "Home address", icon: "🏠" },
  { id: 3, title: "Work", subtitle: "Work details", icon: "🏢" },
  { id: 4, title: "Contact", subtitle: "Phone & preferences", icon: "📞" },
  { id: 5, title: "Security", subtitle: "Password setup", icon: "🔒" }
];

const RegistrationWizard = ({ onSuccess, onError, onSwitchToLogin }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState(initialForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showWorkSection, setShowWorkSection] = useState(false);
  const [countryList, setCountryList] = useState([]);
  const [homePhoneCountry, setHomePhoneCountry] = useState(null);
  const [mobilePhoneCountry, setMobilePhoneCountry] = useState(null);
  
  // Address search states
  const [addressSearch, setAddressSearch] = useState({ postcode: '', country: '' });
  const [addressResults, setAddressResults] = useState([]);
  const [addressSearchLoading, setAddressSearchLoading] = useState(false);
  const [addressSearchError, setAddressSearchError] = useState("");
  const [showManualAddress, setShowManualAddress] = useState(false);

  const fieldRefs = {
    first_name: useRef(),
    last_name: useRef(),
    email: useRef(),
    home_street: useRef(),
    home_town: useRef(),
    home_postcode: useRef(),
    home_country: useRef(),
    home_phone: useRef(),
    mobile_phone: useRef(),
    password: useRef(),
    confirmPassword: useRef(),
  };

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
      })
      .catch(err => console.error("Failed to load countries:", err));
  }, []);

  // Update phone countries when home country changes
  useEffect(() => {
    const country = countryList.find(c => c.name === form.home_country);
    if (country && country.phone_code) {
      setHomePhoneCountry(country);
      setMobilePhoneCountry(country);
    }
  }, [form.home_country, countryList]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
    
    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  const validateStep = (step) => {
    const errors = {};
    
    switch (step) {
      case 1: // Personal Information
        if (!form.first_name.trim()) errors.first_name = "First name is required";
        if (!form.last_name.trim()) errors.last_name = "Last name is required";
        if (!form.email.trim()) errors.email = "Email is required";
        else if (!/^\S+@\S+\.\S+$/.test(form.email)) errors.email = "Invalid email format";
        break;
        
      case 2: // Home Address
        if (!form.home_street.trim()) errors.home_street = "Street is required";
        if (!form.home_town.trim()) errors.home_town = "Town/City is required";
        if (!form.home_postcode.trim()) errors.home_postcode = "Postcode/ZIP is required";
        if (!form.home_country.trim()) errors.home_country = "Country is required";
        break;
        
      case 3: // Work Address (optional, but if shown, validate required fields)
        if (showWorkSection) {
          if (!form.work_company.trim()) errors.work_company = "Company is required";
          if (!form.work_street.trim()) errors.work_street = "Street is required";
          if (!form.work_town.trim()) errors.work_town = "Town/City is required";
          if (!form.work_postcode.trim()) errors.work_postcode = "Postcode/ZIP is required";
          if (!form.work_country.trim()) errors.work_country = "Country is required";
        }
        break;
        
      case 4: // Contact Information
        if (!form.home_phone.trim()) errors.home_phone = "Home phone is required";
        if (!form.mobile_phone.trim()) errors.mobile_phone = "Mobile phone is required";
        break;
        
      case 5: // Security
        if (!form.password.trim()) errors.password = "Password is required";
        else if (form.password.length < 8) errors.password = "Password must be at least 8 characters";
        if (!form.confirmPassword.trim()) errors.confirmPassword = "Please confirm your password";
        else if (form.password !== form.confirmPassword) errors.confirmPassword = "Passwords do not match";
        break;
        
      default:
        break;
    }
    
    return errors;
  };

  const handleNextStep = () => {
    const errors = validateStep(currentStep);
    setFieldErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      // Focus first error field
      const errorFields = Object.keys(errors);
      const firstErrorField = errorFields.find(field => fieldRefs[field]?.current);
      if (firstErrorField && fieldRefs[firstErrorField].current) {
        fieldRefs[firstErrorField].current.focus();
      }
      return;
    }
    
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    // Final validation
    let allErrors = {};
    for (let step = 1; step <= 5; step++) {
      const stepErrors = validateStep(step);
      allErrors = { ...allErrors, ...stepErrors };
    }
    
    setFieldErrors(allErrors);
    
    if (Object.keys(allErrors).length > 0) {
      // Go back to first step with errors
      const firstStepWithError = Math.min(
        ...Object.keys(allErrors).map(field => {
          if (field.includes('first_name') || field.includes('last_name') || field.includes('email')) return 1;
          if (field.includes('home_')) return 2;
          if (field.includes('work_')) return 3;
          if (field.includes('phone')) return 4;
          if (field.includes('password')) return 5;
          return 1;
        })
      );
      setCurrentStep(firstStepWithError);
      return;
    }

    setIsLoading(true);
    
    try {
      // Prepare registration data
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
        work_address: showWorkSection ? {
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
        work_phone: showWorkSection ? form.work_phone : "",
        mobile_phone: form.mobile_phone,
        personal_email: form.personal_email,
        work_email: showWorkSection ? form.work_email : "",
      };

      const payload = {
        username: form.email,
        password: form.password,
        email: form.email,
        first_name: form.first_name,
        last_name: form.last_name,
        profile,
      };

      const result = await authService.register(payload);
      
      if (result.status === "success") {
        if (onSuccess) {
          onSuccess(result);
        }
      } else {
        if (onError) {
          onError(result.message || "Registration failed");
        }
      }
    } catch (err) {
      const errorMessage = err.message || "Registration failed";
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Address search function
  const handleAddressSearch = async () => {
    setAddressSearchError("");
    setAddressSearchLoading(true);
    setAddressResults([]);
    
    const postcode = addressSearch.postcode.trim();
    const country = addressSearch.country.trim().toLowerCase();
    
    if (!postcode || !country) {
      setAddressSearchError("Please enter both postcode and country.");
      setAddressSearchLoading(false);
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
      
      setAddressResults(addresses);
    } catch (err) {
      setAddressSearchError(err.message || "Address search failed.");
    } finally {
      setAddressSearchLoading(false);
    }
  };

  const handleSelectAddress = (address) => {
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
    setShowManualAddress(true);
    setAddressResults([]);
  };

  const getProgressPercentage = () => {
    return (currentStep / 5) * 100;
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="step-content">
            <div className="text-center mb-4">
              <div className="step-icon mb-3">👤</div>
              <h3>Personal Information</h3>
              <p className="text-muted">Let's start with your basic details</p>
            </div>
            
            <Form>
              <Row>
                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label>Title</Form.Label>
                    <Form.Select
                      name="title"
                      value={form.title}
                      onChange={handleChange}
                    >
                      <option value="">Select title</option>
                      <option value="Mr">Mr</option>
                      <option value="Miss">Miss</option>
                      <option value="Mrs">Mrs</option>
                      <option value="Ms">Ms</option>
                      <option value="Dr">Dr</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>First Name <span className="text-danger">*</span></Form.Label>
                    <Form.Control
                      type="text"
                      name="first_name"
                      value={form.first_name}
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
                  <Form.Group className="mb-3">
                    <Form.Label>Last Name <span className="text-danger">*</span></Form.Label>
                    <Form.Control
                      type="text"
                      name="last_name"
                      value={form.last_name}
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
              
              <Form.Group className="mb-3">
                <Form.Label>Email Address <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  isInvalid={!!fieldErrors.email}
                  ref={fieldRefs.email}
                />
                <Form.Control.Feedback type="invalid">
                  {fieldErrors.email}
                </Form.Control.Feedback>
              </Form.Group>
            </Form>
          </div>
        );

      case 2:
        return (
          <div className="step-content">
            <div className="text-center mb-4">
              <div className="step-icon mb-3">🏠</div>
              <h3>Home Address</h3>
              <p className="text-muted">Where should we send your study materials?</p>
            </div>

            {!showManualAddress && (
              <Card className="mb-4 border-light bg-light">
                <Card.Body>
                  <h6 className="mb-3">Find your address quickly</h6>
                  <Row>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Postcode/ZIP</Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="Enter postcode"
                          value={addressSearch.postcode}
                          onChange={(e) => setAddressSearch(prev => ({ ...prev, postcode: e.target.value }))}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Country</Form.Label>
                        <Form.Select
                          value={addressSearch.country}
                          onChange={(e) => setAddressSearch(prev => ({ ...prev, country: e.target.value }))}
                        >
                          <option value="">Select country</option>
                          <option value="GB">United Kingdom</option>
                          <option value="US">United States</option>
                          <option value="IE">Ireland</option>
                          <option value="ZA">South Africa</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={4} className="d-flex align-items-end">
                      <Button
                        variant="primary"
                        onClick={handleAddressSearch}
                        disabled={addressSearchLoading}
                        className="mb-3 w-100"
                      >
                        {addressSearchLoading ? "Searching..." : "Search Address"}
                      </Button>
                    </Col>
                  </Row>
                  
                  {addressSearchError && (
                    <Alert variant="danger" className="py-2">
                      {addressSearchError}
                    </Alert>
                  )}
                  
                  {addressResults.length > 0 && (
                    <div className="mt-3">
                      <h6>Select your address:</h6>
                      <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {addressResults.map((addr, idx) => (
                          <Button
                            key={idx}
                            variant="outline-secondary"
                            className="w-100 text-start mb-2"
                            onClick={() => handleSelectAddress(addr)}
                          >
                            {[addr.line1, addr.line2, addr.town, addr.county, addr.country, addr.postcode]
                              .filter(Boolean).join(", ")}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="text-center mt-3">
                    <Button variant="link" onClick={() => setShowManualAddress(true)}>
                      Enter address manually
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            )}

            {showManualAddress && (
              <Form>
                <div className="text-center mb-3">
                  <Button variant="link" onClick={() => setShowManualAddress(false)}>
                    ← Back to address search
                  </Button>
                </div>
                
                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Building Name</Form.Label>
                      <Form.Control
                        type="text"
                        name="home_building"
                        value={form.home_building}
                        onChange={handleChange}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Street <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="text"
                        name="home_street"
                        value={form.home_street}
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
                    <Form.Group className="mb-3">
                      <Form.Label>District</Form.Label>
                      <Form.Control
                        type="text"
                        name="home_district"
                        value={form.home_district}
                        onChange={handleChange}
                      />
                    </Form.Group>
                  </Col>
                </Row>
                
                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Town/City <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="text"
                        name="home_town"
                        value={form.home_town}
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
                    <Form.Group className="mb-3">
                      <Form.Label>County/State</Form.Label>
                      <Form.Control
                        type="text"
                        name="home_county"
                        value={form.home_county}
                        onChange={handleChange}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Postcode/ZIP <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="text"
                        name="home_postcode"
                        value={form.home_postcode}
                        onChange={handleChange}
                        isInvalid={!!fieldErrors.home_postcode}
                        ref={fieldRefs.home_postcode}
                        style={{ textTransform: "uppercase" }}
                      />
                      <Form.Control.Feedback type="invalid">
                        {fieldErrors.home_postcode}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>
                
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>State (US only)</Form.Label>
                      <Form.Select
                        name="home_state"
                        value={form.home_state}
                        onChange={handleChange}
                      >
                        <option value="">Select state</option>
                        <option value="AL">Alabama</option>
                        <option value="CA">California</option>
                        <option value="FL">Florida</option>
                        <option value="NY">New York</option>
                        <option value="TX">Texas</option>
                        {/* Add more states as needed */}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Country <span className="text-danger">*</span></Form.Label>
                      <CountryAutocomplete
                        name="home_country"
                        value={form.home_country}
                        onChange={handleChange}
                        isInvalid={!!fieldErrors.home_country}
                        feedback={fieldErrors.home_country}
                        inputRef={fieldRefs.home_country}
                        placeholder="Select country"
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Form>
            )}
          </div>
        );

      case 3:
        return (
          <div className="step-content">
            <div className="text-center mb-4">
              <div className="step-icon mb-3">🏢</div>
              <h3>Work Address</h3>
              <p className="text-muted">Add your workplace details (optional but recommended)</p>
            </div>

            <Card className="mb-4 border-light bg-light">
              <Card.Body className="text-center">
                <Button
                  variant={showWorkSection ? "danger" : "primary"}
                  onClick={() => setShowWorkSection(!showWorkSection)}
                >
                  {showWorkSection ? "Remove Work Address" : "Add Work Address"}
                </Button>
                <p className="text-muted mt-2 mb-0">
                  Skip this step if you don't want to add work details
                </p>
              </Card.Body>
            </Card>

            {showWorkSection && (
              <Form>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Company/Institution <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="text"
                        name="work_company"
                        value={form.work_company}
                        onChange={handleChange}
                        isInvalid={!!fieldErrors.work_company}
                      />
                      <Form.Control.Feedback type="invalid">
                        {fieldErrors.work_company}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Department</Form.Label>
                      <Form.Control
                        type="text"
                        name="work_department"
                        value={form.work_department}
                        onChange={handleChange}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Building Name</Form.Label>
                  <Form.Control
                    type="text"
                    name="work_building"
                    value={form.work_building}
                    onChange={handleChange}
                  />
                </Form.Group>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Street <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="text"
                        name="work_street"
                        value={form.work_street}
                        onChange={handleChange}
                        isInvalid={!!fieldErrors.work_street}
                      />
                      <Form.Control.Feedback type="invalid">
                        {fieldErrors.work_street}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>District</Form.Label>
                      <Form.Control
                        type="text"
                        name="work_district"
                        value={form.work_district}
                        onChange={handleChange}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Town/City <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="text"
                        name="work_town"
                        value={form.work_town}
                        onChange={handleChange}
                        isInvalid={!!fieldErrors.work_town}
                      />
                      <Form.Control.Feedback type="invalid">
                        {fieldErrors.work_town}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>County/State</Form.Label>
                      <Form.Control
                        type="text"
                        name="work_county"
                        value={form.work_county}
                        onChange={handleChange}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Postcode/ZIP <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="text"
                        name="work_postcode"
                        value={form.work_postcode}
                        onChange={handleChange}
                        isInvalid={!!fieldErrors.work_postcode}
                      />
                      <Form.Control.Feedback type="invalid">
                        {fieldErrors.work_postcode}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>State (US only)</Form.Label>
                      <Form.Select
                        name="work_state"
                        value={form.work_state}
                        onChange={handleChange}
                      >
                        <option value="">Select state</option>
                        <option value="AL">Alabama</option>
                        <option value="CA">California</option>
                        <option value="FL">Florida</option>
                        <option value="NY">New York</option>
                        <option value="TX">Texas</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Country <span className="text-danger">*</span></Form.Label>
                      <CountryAutocomplete
                        name="work_country"
                        value={form.work_country}
                        onChange={handleChange}
                        isInvalid={!!fieldErrors.work_country}
                        feedback={fieldErrors.work_country}
                        placeholder="Select country"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Work Phone</Form.Label>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <PhoneCodeAutocomplete
                          countries={countryList}
                          selectedCountry={homePhoneCountry}
                          onSelect={(country) => setHomePhoneCountry(country)}
                          name="work_phone_code"
                        />
                        <Form.Control
                          type="tel"
                          name="work_phone"
                          value={form.work_phone}
                          onChange={handleChange}
                          style={{ flex: 1 }}
                        />
                      </div>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Work Email</Form.Label>
                      <Form.Control
                        type="email"
                        name="work_email"
                        value={form.work_email}
                        onChange={handleChange}
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Form>
            )}
          </div>
        );

      case 4:
        return (
          <div className="step-content">
            <div className="text-center mb-4">
              <div className="step-icon mb-3">📞</div>
              <h3>Contact Information</h3>
              <p className="text-muted">How can we reach you?</p>
            </div>

            <Form>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Home Phone <span className="text-danger">*</span></Form.Label>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <PhoneCodeAutocomplete
                        countries={countryList}
                        selectedCountry={homePhoneCountry}
                        onSelect={(country) => setHomePhoneCountry(country)}
                        name="home_phone_code"
                      />
                      <Form.Control
                        type="tel"
                        name="home_phone"
                        value={form.home_phone}
                        onChange={handleChange}
                        isInvalid={!!fieldErrors.home_phone}
                        ref={fieldRefs.home_phone}
                        style={{ flex: 1 }}
                      />
                    </div>
                    <Form.Control.Feedback type="invalid">
                      {fieldErrors.home_phone}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Mobile Phone <span className="text-danger">*</span></Form.Label>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <PhoneCodeAutocomplete
                        countries={countryList}
                        selectedCountry={mobilePhoneCountry}
                        onSelect={(country) => setMobilePhoneCountry(country)}
                        name="mobile_phone_code"
                      />
                      <Form.Control
                        type="tel"
                        name="mobile_phone"
                        value={form.mobile_phone}
                        onChange={handleChange}
                        isInvalid={!!fieldErrors.mobile_phone}
                        ref={fieldRefs.mobile_phone}
                        style={{ flex: 1 }}
                      />
                    </div>
                    <Form.Control.Feedback type="invalid">
                      {fieldErrors.mobile_phone}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-4">
                <Form.Label>Personal Email (optional)</Form.Label>
                <Form.Control
                  type="email"
                  name="personal_email"
                  value={form.personal_email}
                  onChange={handleChange}
                  placeholder="Different from main email"
                />
              </Form.Group>

              <h5 className="mb-3">Delivery Preferences</h5>
              
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Send invoices to <span className="text-danger">*</span></Form.Label>
                    <div className="mt-2">
                      <Form.Check
                        inline
                        type="radio"
                        label="Home Address"
                        name="send_invoices_to"
                        value="HOME"
                        checked={form.send_invoices_to === "HOME"}
                        onChange={handleChange}
                      />
                      <Form.Check
                        inline
                        type="radio"
                        label="Work Address"
                        name="send_invoices_to"
                        value="WORK"
                        checked={form.send_invoices_to === "WORK"}
                        onChange={handleChange}
                        disabled={!showWorkSection}
                      />
                    </div>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Send study materials to <span className="text-danger">*</span></Form.Label>
                    <div className="mt-2">
                      <Form.Check
                        inline
                        type="radio"
                        label="Home Address"
                        name="send_study_material_to"
                        value="HOME"
                        checked={form.send_study_material_to === "HOME"}
                        onChange={handleChange}
                      />
                      <Form.Check
                        inline
                        type="radio"
                        label="Work Address"
                        name="send_study_material_to"
                        value="WORK"
                        checked={form.send_study_material_to === "WORK"}
                        onChange={handleChange}
                        disabled={!showWorkSection}
                      />
                    </div>
                  </Form.Group>
                </Col>
              </Row>
            </Form>
          </div>
        );

      case 5:
        return (
          <div className="step-content">
            <div className="text-center mb-4">
              <div className="step-icon mb-3">🔒</div>
              <h3>Account Security</h3>
              <p className="text-muted">Create a secure password for your account</p>
            </div>

            <Form>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Password <span className="text-danger">*</span></Form.Label>
                    <Form.Control
                      type="password"
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      isInvalid={!!fieldErrors.password}
                      ref={fieldRefs.password}
                    />
                    <Form.Control.Feedback type="invalid">
                      {fieldErrors.password}
                    </Form.Control.Feedback>
                    <Form.Text className="text-muted">
                      Use at least 8 characters with a mix of letters, numbers, and symbols
                    </Form.Text>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Confirm Password <span className="text-danger">*</span></Form.Label>
                    <Form.Control
                      type="password"
                      name="confirmPassword"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      isInvalid={!!fieldErrors.confirmPassword}
                      ref={fieldRefs.confirmPassword}
                    />
                    <Form.Control.Feedback type="invalid">
                      {fieldErrors.confirmPassword}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
              </Row>

              <Alert variant="warning" className="mt-4">
                <Alert.Heading>
                  <i className="bi bi-info-circle me-2"></i>
                  Delivery Information
                </Alert.Heading>
                <p className="mb-0">
                  Please order your study materials well in advance. Materials are printed to order and may take 2+ weeks for delivery. 
                  Consider eBooks for faster access - they're usually processed in 2-3 working days.
                </p>
              </Alert>
            </Form>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="registration-wizard">
      <style jsx>{`
        .registration-wizard {
          max-width: 700px;
          margin: 0 auto;
        }
        .step-icon {
          font-size: 3rem;
        }
        .step-content {
          min-height: 400px;
        }
        @media (max-width: 768px) {
          .registration-wizard {
            margin: 0 10px;
          }
        }
      `}</style>

      <Card className="shadow">
        <Card.Header className="bg-primary text-white">
          <div className="text-center">
            <h2 className="mb-2">Create Your Account</h2>
            <p className="mb-3">Follow these simple steps to join our community</p>
            
            <ProgressBar
              now={getProgressPercentage()}
              className="mb-3"
              style={{ height: '8px' }}
            />
            
            <div className="d-flex justify-content-between text-sm">
              {STEPS.map((step) => (
                <div key={step.id} className="text-center" style={{ flex: 1 }}>
                  <div className={`step-indicator ${currentStep >= step.id ? 'active' : ''}`}>
                    <Badge 
                      bg={currentStep > step.id ? 'success' : currentStep === step.id ? 'light' : 'secondary'}
                      text={currentStep === step.id ? 'dark' : 'white'}
                      className="mb-1"
                    >
                      {step.id}
                    </Badge>
                  </div>
                  <small className={currentStep === step.id ? 'fw-bold' : 'opacity-75'}>
                    {step.title}
                  </small>
                </div>
              ))}
            </div>
          </div>
        </Card.Header>

        <Card.Body className="p-4">
          {renderStepContent()}
        </Card.Body>

        <Card.Footer className="d-flex justify-content-between align-items-center py-3">
          <div>
            {currentStep > 1 && (
              <Button
                variant="outline-secondary"
                onClick={handlePrevStep}
                disabled={isLoading}
              >
                <i className="bi bi-arrow-left me-2"></i>
                Previous
              </Button>
            )}
          </div>
          
          <div className="text-muted">
            Step {currentStep} of {STEPS.length}
          </div>
          
          <div>
            <Button
              variant="primary"
              onClick={handleNextStep}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Creating Account...
                </>
              ) : currentStep === 5 ? (
                <>
                  <i className="bi bi-check-circle me-2"></i>
                  Create Account
                </>
              ) : (
                <>
                  Next
                  <i className="bi bi-arrow-right ms-2"></i>
                </>
              )}
            </Button>
          </div>
        </Card.Footer>
      </Card>

      {onSwitchToLogin && (
        <div className="text-center mt-3">
          <Button variant="link" onClick={onSwitchToLogin}>
            Already have an account? Login
          </Button>
        </div>
      )}
    </div>
  );
};

export default RegistrationWizard;