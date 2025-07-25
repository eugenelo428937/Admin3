import React, { useState, useRef, useEffect } from "react";
import { Form, Button, Alert, Row, Col } from "react-bootstrap";
import authService from "../../services/authService";
import config from "../../config";
import CountryAutocomplete from "../CountryAutocomplete";
import PhoneCodeDropdown from "./PhoneCodeDropdown";
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

const RegisterForm = ({
  registerError,
  isLoading: isLoadingProp,
  switchToLogin,
  handleRegister: handleRegisterProp,
  // New props for edit mode
  isEditMode = false,
  initialData = null,
  onSubmit = null,
  onError = null,
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
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [addressLookupLoading, setAddressLookupLoading] = useState(false);
  const [addressLookupError, setAddressLookupError] = useState("");
  const [showHomeAddressFields, setShowHomeAddressFields] = useState(false);
  const [homeAddressSearch, setHomeAddressSearch] = useState({ postcode: '', country: '', line1: '' });
  const [homeAddressResults, setHomeAddressResults] = useState([]);
  const [homeAddressSearchLoading, setHomeAddressSearchLoading] = useState(false);
  const [homeAddressSearchError, setHomeAddressSearchError] = useState("");
  const [countryList, setCountryList] = useState([]);
  const [homeCountryObj, setHomeCountryObj] = useState(null);
  const [homePhoneCode, setHomePhoneCode] = useState("");
  const [mobilePhoneCode, setMobilePhoneCode] = useState("");
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

  const focusFirstError = (errors) => {
    const errorOrder = [
      "first_name", "last_name", "email", "home_street", "home_town", "home_postcode", "home_state", "home_country", "home_phone", "mobile_phone", "password", "confirmPassword"
    ];
    for (const key of errorOrder) {
      if (errors[key] && fieldRefs[key] && fieldRefs[key].current) {
        fieldRefs[key].current.focus();
        break;
      }
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const validate = () => {
    console.log('validate called');
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
    
    // Password validation - only required in registration mode
    if (!isEditMode) {
      if (!form.password) errors.password = "Password is required.";
      if (!form.confirmPassword) errors.confirmPassword = "Please confirm your password.";
      if (form.password && form.confirmPassword && form.password !== form.confirmPassword) 
        errors.confirmPassword = "Passwords do not match.";
    } else {
      // In edit mode, password is optional but if provided, confirmation is required
      if (form.password && !form.confirmPassword) 
        errors.confirmPassword = "Please confirm your password.";
      if (form.password && form.confirmPassword && form.password !== form.confirmPassword) 
        errors.confirmPassword = "Passwords do not match.";
    }
    
    if (showWork) {
      if (!form.work_company) errors.work_company = "Work company is required.";
      if (!form.work_street) errors.work_street = "Work street is required.";
      if (!form.work_town) errors.work_town = "Work town/city is required.";
      if (!form.work_postcode) errors.work_postcode = "Work postcode/ZIP is required.";
      if (!form.work_state) errors.work_state = "Work state is required.";
      if (!form.work_country) errors.work_country = "Work country is required.";
      if (!form.work_phone) errors.work_phone = "Work phone is required.";
    }
    console.log("Validation errors:", errors);
    return errors;
  };

  // Debug: log fieldErrors to verify error messages
  useEffect(() => {
    if (Object.keys(fieldErrors).length > 0) {
      console.log('fieldErrors:', fieldErrors);
    }
  }, [fieldErrors]);

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
        // Set initial phone code if UK
        const uk = all.find(c => c.name === "United Kingdom");
        if (form.home_country === "United Kingdom" && uk) {
          setHomeCountryObj(uk);
          setHomePhoneCode(uk.phone_code);
          setMobilePhoneCode(uk.phone_code);
        }
      });
  }, []);

  useEffect(() => {
    // When home address country changes, update both phone countries
    const country = countryList.find(c => c.name === form.home_country);
    setHomeCountryObj(country || null);
    if (country && country.phone_code) {
      setHomePhoneCountry(country);
      setMobilePhoneCountry(country);
    }
  }, [form.home_country, countryList]);

  // useEffect to populate form data in edit mode
  useEffect(() => {
    if (isEditMode && initialData) {
      console.log("Edit mode: Populating form with initial data", initialData);
      
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
        
        // In edit mode, password fields are empty initially
        password: "",
        confirmPassword: ""
      };
      
      setForm(newForm);
      
      // Set work address visibility if work address exists
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
  }, [isEditMode, initialData]);

  const handleHomeAddressSearch = async () => {
    setHomeAddressSearchError("");
    setHomeAddressSearchLoading(true);
    setHomeAddressResults([]);
    const postcode = homeAddressSearch.postcode.trim();
    const country = homeAddressSearch.country.trim().toLowerCase();
    const line1 = homeAddressSearch.line1.trim();
    if (!postcode || !country) {
      setHomeAddressSearchError("Please enter both postcode and country.");
      setHomeAddressSearchLoading(false);
      return;
    }
    try {
      let addresses = [];
      if (country === "uk" || country === "united kingdom" || country === "gb" || country === "great britain") {
        // UK: Use backend proxy for getaddress.io
        const res = await fetch(
				config.apiBaseUrl +
					`/api/utils/address-lookup/?postcode=${encodeURIComponent(
						postcode
					)}`
			);
        if (res.status === 200) {
          const data = await res.json();
          addresses = (data.addresses || []).map(addr => {
            const lines = addr.lines || [];
            return {
					line1: addr.line_1 || "",
					line2: addr.line_2 || "",
					town: addr.town_or_city || "",
					county: addr.county || "",
					postcode: addr.postcode || postcode,
					country: "United Kingdom",
					state: "",
					district: "",
					building: addr.building_name || "",
				};
          });
        } else {
          throw new Error("No addresses found for this postcode.");
        }
      } else if (country === "india") {
        const res = await fetch(`https://api.postalpincode.in/pincode/${encodeURIComponent(postcode)}`);
        const data = await res.json();
        if (data[0].Status === "Success" && data[0].PostOffice && data[0].PostOffice.length > 0) {
          addresses = data[0].PostOffice.map(po => ({
            line1: po.Name || '',
            line2: po.BranchType || '',
            town: po.Block || po.Taluk || '',
            district: po.District || '',
            state: po.State || '',
            country: 'India',
            postcode: po.Pincode || postcode,
            county: '',
            building: '',
          }));
        } else {
          throw new Error("No addresses found for this postcode.");
        }
      } else if (country === "south africa" || country === "za") {
        const res = await fetch(`https://api.zippopotam.us/ZA/${encodeURIComponent(postcode)}`);
        if (res.status === 200) {
          const data = await res.json();
          addresses = (data.places || []).map(place => ({
            line1: '',
            line2: '',
            town: place["place name"] || '',
            state: place["state"] || '',
            country: 'South Africa',
            postcode: data["post code"] || postcode,
            county: '',
            district: '',
            building: '',
          }));
        } else {
          throw new Error("No addresses found for this postcode.");
        }
      } else {
        throw new Error("Address search not supported for this country.");
      }
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

  const handleEnterHomeAddressManually = () => {
    setShowHomeAddressFields(true);
  };

  const handleBackToHomeAddressSearch = () => {
    setShowHomeAddressFields(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('handleSubmit called, isEditMode:', isEditMode);
    setError("");
    const errors = validate();
    console.log('validate called, errors:', errors);
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
      if (isEditMode && onSubmit) {
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

        // Add password to payload if provided in edit mode
        if (form.password) {
          profileData.password = form.password;
        }

        console.log('Profile update payload:', profileData);
        await onSubmit(profileData);
        
      } else {
        // Registration mode (original logic)
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
        
        console.log('Register payload:', payload);
        const result = await authService.register(payload);
        
        if (result.status === "success") {
          setError("");
          setFieldErrors({});
          setRegistrationSuccess(true);
          setSuccessMessage(
            result.message || 
            "Account created successfully! Please check your email for account activation instructions."
          );
          
          // Reset form state for potential next registration
          setForm(initialForm);
          setShowWork(false);
          setShowHomeAddressFields(false);
          setHomeAddressSearch({ postcode: '', country: '', line1: '' });
          setHomeAddressResults([]);
          
          console.log('Registration successful:', result);
        } else {
          setError(result.message || "Registration failed");
          if (onError) {
            onError(result.message || "Registration failed");
          }
        }
      }
    } catch (err) {
      const errorMessage = err.message || (isEditMode ? "Profile update failed" : "Registration failed");
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Support for legacy handleRegister prop
  const handleRegister = handleRegisterProp || handleSubmit;

  return (
		<section
			className="register-form-panel"
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
				{title || (isEditMode ? "Update Profile" : "Register")}
			</h2>
			
			{/* Dynamic Subtitle */}
			{subtitle && (
				<p className="text-muted mb-4">{subtitle}</p>
			)}
			
			{/* Success Message - Only show in registration mode if showSuccessMessage is true */}
			{registrationSuccess && showSuccessMessage && !isEditMode && (
				<Alert variant="success" className="mb-4">
					<Alert.Heading>
						<i className="fas fa-check-circle me-2"></i>
						Registration Successful!
					</Alert.Heading>
					<p className="mb-3">
						{successMessage || "Account created successfully! Please check your email for account activation instructions."}
					</p>
					<div className="bg-light p-3 rounded mb-3">
						<p className="mb-2 fw-bold">
							<i className="fas fa-envelope me-2"></i>
							Next steps:
						</p>
						<ol className="mb-0">
							<li>Check your email inbox (and spam folder) for an activation email from ActEd</li>
							<li>Click the activation link in the email to verify your account</li>
							<li>Once activated, you can log in and start using your account</li>
						</ol>
					</div>
					<div className="d-flex gap-2 flex-wrap">
						<Button 
							variant="primary" 
							size="sm"
							onClick={() => {
								setRegistrationSuccess(false);
								setSuccessMessage("");
								setForm(initialForm);
							}}
						>
							<i className="fas fa-user-plus me-1"></i>
							Register Another Account
						</Button>
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
			{(registerError || error) && !registrationSuccess && (
				<Alert variant="danger">
					<i className="fas fa-exclamation-triangle me-2"></i>
					{registerError || error}
				</Alert>
			)}
			
			{/* Show form only if not successful OR in edit mode */}
			{(!registrationSuccess || isEditMode) && (
				<Form onSubmit={handleRegister} autoComplete="off">
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
					{isEditMode && (
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
					{/* Home Address */}
					<h5>Home Address</h5>
					{!showHomeAddressFields ? (
						<Row>
							<Col md={12}>
								<div
									style={{
										border: "1px solid #eee",
										borderRadius: 6,
										padding: 16,
										marginBottom: 16,
									}}>
									<div style={{ marginBottom: 8 }}>
										<Form.Label>Find your address</Form.Label>
									</div>
									<Row>
										<Col md={3}>
											<Form.Control
												type="text"
												placeholder="Postcode"
												value={homeAddressSearch.postcode}
												onChange={(e) =>
													setHomeAddressSearch((s) => ({
														...s,
														postcode: e.target.value,
													}))
												}
											/>
										</Col>
										<Col md={3}>
											<CountryAutocomplete
												name="country"
												value={homeAddressSearch.country}
												onChange={(e) =>
													setHomeAddressSearch((s) => ({
														...s,
														country: e.target.value,
													}))
												}
												placeholder="Country"
											/>
										</Col>
										<Col md={4}>
											<Form.Control
												type="text"
												placeholder="First line of address (optional)"
												value={homeAddressSearch.line1}
												onChange={(e) =>
													setHomeAddressSearch((s) => ({
														...s,
														line1: e.target.value,
													}))
												}
											/>
										</Col>
										<Col md={2}>
											<Button
												variant="primary"
												onClick={handleHomeAddressSearch}
												disabled={homeAddressSearchLoading}
												style={{ width: "100%" }}>
												{homeAddressSearchLoading
													? "Searching..."
													: "Search Address"}
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
											<div style={{ marginBottom: 8 }}>
												Select your address:
											</div>
											<ul
												style={{
													listStyle: "none",
													padding: 0,
													maxHeight: 200,
													overflowY: "auto",
												}}>
												{homeAddressResults.map((addr, idx) => (
													<li key={idx} style={{ marginBottom: 4 }}>
														<Button
															variant="outline-secondary"
															size="sm"
															style={{
																textAlign: "left",
																width: "100%",
															}}
															onClick={() =>
																handleSelectHomeAddress(addr)
															}>
															{[
																addr.line1,
																addr.line2,
																addr.town,
																addr.county,
																addr.state,
																addr.country,
																addr.postcode,
															]
																.filter(Boolean)
																.join(", ")}
														</Button>
													</li>
												))}
											</ul>
										</div>
									)}
									<div style={{ marginTop: 16 }}>
										<Button
											variant="link"
											onClick={handleEnterHomeAddressManually}>
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
									<Button
										variant="link"
										onClick={handleBackToHomeAddressSearch}>
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
					{/* Work Address (optional) */}
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
							<Row>
								<Col md={4}>
									<Form.Group className="mb-2">
										<Form.Label>Street</Form.Label>
										<Form.Control
											type="text"
											name="work_street"
											value={form.work_street || ""}
											onChange={handleChange}
											isInvalid={!!fieldErrors.work_street}
										/>
										<Form.Control.Feedback type="invalid">
											{fieldErrors.work_street}
										</Form.Control.Feedback>
									</Form.Group>
								</Col>
								<Col md={4}>
									<Form.Group className="mb-2">
										<Form.Label>District</Form.Label>
										<Form.Control
											type="text"
											name="work_district"
											value={form.work_district || ""}
											onChange={handleChange}
										/>
									</Form.Group>
								</Col>
								<Col md={4}>
									<Form.Group className="mb-2">
										<Form.Label>Town or City</Form.Label>
										<Form.Control
											type="text"
											name="work_town"
											value={form.work_town || ""}
											onChange={handleChange}
											isInvalid={!!fieldErrors.work_town}
										/>
										<Form.Control.Feedback type="invalid">
											{fieldErrors.work_town}
										</Form.Control.Feedback>
									</Form.Group>
								</Col>
							</Row>
							<Row>
								<Col md={4}>
									<Form.Group className="mb-2">
										<Form.Label>County</Form.Label>
										<Form.Control
											type="text"
											name="work_county"
											value={form.work_county || ""}
											onChange={handleChange}
										/>
									</Form.Group>
								</Col>
								<Col md={4}>
									<Form.Group className="mb-2">
										<Form.Label>Postcode/ZIP</Form.Label>
										<Form.Control
											type="text"
											name="work_postcode"
											value={form.work_postcode || ""}
											onChange={handleChange}
											isInvalid={!!fieldErrors.work_postcode}
											style={{ textTransform: "uppercase" }}
										/>
										<Form.Control.Feedback type="invalid">
											{fieldErrors.work_postcode}
										</Form.Control.Feedback>
									</Form.Group>
								</Col>
								<Col md={2}>
									<Form.Group className="mb-2">
										<Form.Label>State</Form.Label>
										<Form.Control
											type="text"
											name="work_state"
											value={form.work_state || ""}
											onChange={handleChange}
											isInvalid={!!fieldErrors.work_state}
										/>
										<Form.Control.Feedback type="invalid">
											{fieldErrors.work_state}
										</Form.Control.Feedback>
									</Form.Group>
								</Col>
								<Col md={2}>
									<Form.Group className="mb-2">
										<Form.Label>Country</Form.Label>
										<CountryAutocomplete
											name="work_country"
											value={form.work_country}
											onChange={handleChange}
											isInvalid={!!fieldErrors.work_country}
											feedback={fieldErrors.work_country}
											placeholder="Country"
										/>
									</Form.Group>
								</Col>
							</Row>
							<Row>
								<Col md={4}>
									<Form.Group className="mb-2">
										<Form.Label>Phone (work)</Form.Label>
										<Form.Control
											type="text"
											name="work_phone"
											value={form.work_phone || ""}
											onChange={handleChange}
											isInvalid={!!fieldErrors.work_phone}
										/>
										<Form.Control.Feedback type="invalid">
											{fieldErrors.work_phone}
										</Form.Control.Feedback>
									</Form.Group>
								</Col>
							</Row>
							<hr />
						</>
					)}
					{/* Preferences and Communication Details */}
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
										onSelect={(country) => {
											setHomePhoneCountry(country);
										}}
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
										onSelect={(country) => {
											setMobilePhoneCountry(country);
										}}
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
					{/* Auth */}
					<h5>{isEditMode ? "Change Password (Optional)" : "Set Password"}</h5>
					{isEditMode && (
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
								<Form.Label>Password {!isEditMode ? "*" : ""}</Form.Label>
								<Form.Control
									type="password"
									name="password"
									value={form.password || ""}
									onChange={handleChange}
									isInvalid={!!fieldErrors.password}
									ref={fieldRefs.password}
									placeholder={isEditMode ? "Enter new password (optional)" : ""}
								/>
								<Form.Control.Feedback type="invalid">
									{fieldErrors.password}
								</Form.Control.Feedback>
							</Form.Group>
						</Col>
						<Col md={6}>
							<Form.Group className="mb-2">
								<Form.Label>Confirm Password {!isEditMode ? "*" : ""}</Form.Label>
								<Form.Control
									type="password"
									name="confirmPassword"
									value={form.confirmPassword || ""}
									onChange={handleChange}
									isInvalid={!!fieldErrors.confirmPassword}
									ref={fieldRefs.confirmPassword}
									placeholder={isEditMode ? "Confirm new password" : ""}
								/>
								<Form.Control.Feedback type="invalid">
									{fieldErrors.confirmPassword}
								</Form.Control.Feedback>
							</Form.Group>
						</Col>
					</Row>
					<div className="d-flex justify-content-between align-items-center mt-3">
						<Button
							variant="primary"
							type="submit"
							disabled={isLoading || isLoadingProp || submitButtonDisabled}>
							{submitButtonText || (
								isLoading || isLoadingProp ? 
									(isEditMode ? "Updating..." : "Registering...") : 
									(isEditMode ? "Update Profile" : "Register")
							)}
						</Button>
						{switchToLogin && !isEditMode && (
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

export default RegisterForm;
