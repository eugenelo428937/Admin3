import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Alert } from 'react-bootstrap';
import DynamicAddressForm from '../components/Address/DynamicAddressForm';
import CountryAutocomplete from '../components/User/CountryAutocomplete';

const AddressFormDemo = () => {
  const [selectedCountry, setSelectedCountry] = useState('');
  const [addressValues, setAddressValues] = useState({});
  const [errors, setErrors] = useState({});

  const handleCountryChange = (e) => {
    setSelectedCountry(e.target.value);
    setAddressValues({}); // Reset address values when country changes
    setErrors({});
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setAddressValues(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const testCountries = [
    'United States',
    'United Kingdom',
    'Hong Kong',
    'Canada',
    'Australia',
    'Germany',
    'France',
    'Japan'
  ];

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col lg={10}>
          <Card>
            <Card.Header className="bg-primary text-white">
              <h3 className="mb-0">
                <i className="bi bi-geo-alt me-2"></i>
                Dynamic Address Form Demo
              </h3>
            </Card.Header>
            <Card.Body>
              <Alert variant="info">
                <Alert.Heading className="h6">
                  <i className="bi bi-info-circle me-2"></i>
                  Address Format Testing
                </Alert.Heading>
                <p className="mb-0">
                  Select different countries to see how address forms automatically adapt to 
                  country-specific formats, validation rules, and required fields.
                </p>
              </Alert>

              {/* Country Selection */}
              <Row className="mb-4">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="fw-bold">
                      Select Country to Test
                    </Form.Label>
                    <Form.Select
                      value={selectedCountry}
                      onChange={handleCountryChange}
                      size="lg"
                    >
                      <option value="">Choose a country...</option>
                      {testCountries.map(country => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

              {/* Dynamic Address Form */}
              {selectedCountry && (
                <Row>
                  <Col>
                    <Card className="border-light bg-light">
                      <Card.Body>
                        <h5 className="text-primary mb-3">
                          <i className="bi bi-house me-2"></i>
                          Address Form for {selectedCountry}
                        </h5>
                        
                        <DynamicAddressForm
                          country={selectedCountry}
                          values={addressValues}
                          onChange={handleAddressChange}
                          errors={errors}
                          fieldPrefix="demo"
                          showOptionalFields={true}
                        />
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              )}

              {/* Example Data Display */}
              {selectedCountry && Object.keys(addressValues).length > 0 && (
                <Row className="mt-4">
                  <Col>
                    <Card className="border-success">
                      <Card.Header className="bg-success text-white">
                        <h6 className="mb-0">
                          <i className="bi bi-code me-2"></i>
                          Form Data (JSON)
                        </h6>
                      </Card.Header>
                      <Card.Body>
                        <pre className="mb-0" style={{ fontSize: '0.9rem' }}>
                          <code>
                            {JSON.stringify({ 
                              country: selectedCountry, 
                              ...addressValues 
                            }, null, 2)}
                          </code>
                        </pre>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              )}

              {/* Country Format Examples */}
              <Row className="mt-4">
                <Col>
                  <Card className="border-info">
                    <Card.Header className="bg-info text-white">
                      <h6 className="mb-0">
                        <i className="bi bi-globe me-2"></i>
                        Address Format Examples
                      </h6>
                    </Card.Header>
                    <Card.Body>
                      <Row>
                        <Col md={4}>
                          <h6 className="text-primary">🇺🇸 United States</h6>
                          <ul className="small">
                            <li>Street Address (required)</li>
                            <li>City (required)</li>
                            <li>State dropdown (required)</li>
                            <li>ZIP Code with pattern validation</li>
                          </ul>
                        </Col>
                        <Col md={4}>
                          <h6 className="text-primary">🇬🇧 United Kingdom</h6>
                          <ul className="small">
                            <li>Street Address (required)</li>
                            <li>Town/City (required)</li>
                            <li>Postcode with UK format validation</li>
                            <li>Auto-uppercase transformation</li>
                          </ul>
                        </Col>
                        <Col md={4}>
                          <h6 className="text-primary">🇭🇰 Hong Kong</h6>
                          <ul className="small">
                            <li>Street Address (required)</li>
                            <li>District (required)</li>
                            <li>Area dropdown (required)</li>
                            <li>No postal code field</li>
                          </ul>
                        </Col>
                      </Row>
                      <Row>
                        <Col md={4}>
                          <h6 className="text-primary">🇨🇦 Canada</h6>
                          <ul className="small">
                            <li>Street Address (required)</li>
                            <li>City (required)</li>
                            <li>Province dropdown (required)</li>
                            <li>Postal Code (A1A 1A1 format)</li>
                          </ul>
                        </Col>
                        <Col md={4}>
                          <h6 className="text-primary">🌍 Others</h6>
                          <ul className="small">
                            <li>Uses default format</li>
                            <li>Basic field validation</li>
                            <li>Flexible layout</li>
                            <li>Standard address components</li>
                          </ul>
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default AddressFormDemo;