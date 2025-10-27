import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Form, Alert, Badge } from "react-bootstrap";
import ValidatedPhoneInput from "./ValidatedPhoneInput";
import phoneValidationService from "../../services/phoneValidationService";
import config from "../../config";

const PhoneValidationDemo = () => {
  const [countries, setCountries] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [validationResult, setValidationResult] = useState({ isValid: true, error: null });

  // Load countries
  useEffect(() => {
    fetch(config.apiBaseUrl + "/api/countries/")
      .then(res => res.json())
      .then(data => {
        let countryList = Array.isArray(data) ? data : data.results || [];
        const frequentCountries = ["United Kingdom", "India", "South Africa"];
        const frequent = frequentCountries
          .map(f => countryList.find(c => c.name === f))
          .filter(Boolean);
        const rest = countryList
          .filter(c => !frequentCountries.includes(c.name))
          .sort((a, b) => a.name.localeCompare(b.name));
        setCountries([...frequent, ...rest]);
        
        // Set UK as default
        const uk = countryList.find(c => c.name === "United Kingdom");
        if (uk) setSelectedCountry(uk);
      })
      .catch(err => console.error("Failed to load countries:", err));
  }, []);

  const handlePhoneChange = (e) => {
    setPhoneNumber(e.target.value);
  };

  const handleValidationChange = (result) => {
    setValidationResult(result);
  };

  const examples = [
    { country: "United Kingdom", number: "020 7946 0958", description: "London landline" },
    { country: "United Kingdom", number: "07911 123456", description: "UK mobile" },
    { country: "India", number: "9876543210", description: "Indian mobile" },
    { country: "South Africa", number: "021 123 4567", description: "Cape Town landline" },
    { country: "United States", number: "(555) 123-4567", description: "US number" }
  ];

  const loadExample = (country, number) => {
    const countryObj = countries.find(c => c.name === country);
    if (countryObj) {
      setSelectedCountry(countryObj);
      setPhoneNumber(number);
    }
  };

  return (
    <Container className="py-4">
      <Row>
        <Col lg={8} className="mx-auto">
          <Card>
            <Card.Header className="bg-primary text-white">
              <h4 className="mb-0">Phone Number Validation Demo</h4>
              <p className="mb-0 mt-2">
                Testing Google libphonenumber integration with international validation
              </p>
            </Card.Header>
            
            <Card.Body>
              <Form.Group className="mb-4">
                <Form.Label>
                  <strong>Phone Number</strong>
                  {validationResult.isValid && phoneNumber ? (
                    <Badge bg="success" className="ms-2">Valid</Badge>
                  ) : phoneNumber && !validationResult.isValid ? (
                    <Badge bg="danger" className="ms-2">Invalid</Badge>
                  ) : null}
                </Form.Label>
                
                <ValidatedPhoneInput
                  name="demo_phone"
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  onValidationChange={handleValidationChange}
                  countries={countries}
                  selectedCountry={selectedCountry}
                  onCountryChange={setSelectedCountry}
                  placeholder="Enter phone number to validate"
                />
              </Form.Group>

              {validationResult.isValid && phoneNumber && validationResult.formattedNumber && (
                <Alert variant="success">
                  <Alert.Heading className="h6">
                    <i className="bi bi-check-circle me-2"></i>
                    Valid Phone Number
                  </Alert.Heading>
                  <div className="mt-2">
                    <strong>National Format:</strong> {validationResult.formattedNumber}<br/>
                    <strong>International Format:</strong> {validationResult.internationalFormat}<br/>
                    <strong>E.164 Format:</strong> {validationResult.e164Format}
                  </div>
                </Alert>
              )}

              <div className="mt-4">
                <h6>Try These Examples:</h6>
                <Row>
                  {examples.map((example, index) => (
                    <Col md={6} key={index} className="mb-2">
                      <div 
                        className="border p-2 rounded cursor-pointer"
                        style={{ cursor: 'pointer' }}
                        onClick={() => loadExample(example.country, example.number)}
                      >
                        <div className="fw-bold">{example.country}</div>
                        <div className="text-muted">{example.number}</div>
                        <small className="text-secondary">{example.description}</small>
                      </div>
                    </Col>
                  ))}
                </Row>
              </div>

              <div className="mt-4">
                <h6>Features:</h6>
                <ul className="list-unstyled">
                  <li><i className="bi bi-check-circle text-success me-2"></i>Real-time validation using Google libphonenumber</li>
                  <li><i className="bi bi-check-circle text-success me-2"></i>Country-specific validation rules</li>
                  <li><i className="bi bi-check-circle text-success me-2"></i>Automatic formatting (National, International, E.164)</li>
                  <li><i className="bi bi-check-circle text-success me-2"></i>User-friendly error messages</li>
                  <li><i className="bi bi-check-circle text-success me-2"></i>Country code dropdown with search</li>
                  <li><i className="bi bi-check-circle text-success me-2"></i>Supports 240+ countries and territories</li>
                </ul>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default PhoneValidationDemo;