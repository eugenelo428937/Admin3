import React from 'react';
import { Container, Card } from 'react-bootstrap';
import { Grid } from '@mui/material';
import AddressSelectionPanel from '../components/Address/AddressSelectionPanel';

const TestAddressPanel = () => {
  // Mock user profile data
  const mockUserProfile = {
    user: {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      first_name: 'John',
      last_name: 'Doe'
    },
    profile: {
      send_invoices_to: 'HOME',
      send_study_material_to: 'WORK'
    },
    home_address: {
      building: '123 Main Street',
      street: 'Apartment 4B',
      district: 'Westminster',
      town: 'London',
      postcode: 'SW1A 1AA',
      country: 'United Kingdom'
    },
    work_address: {
      company: 'Tech Solutions Ltd',
      department: 'Engineering',
      building: '456 Business Park',
      street: 'Tower 2, Floor 5',
      district: 'Canary Wharf',
      town: 'London',
      postcode: 'E14 5AB',
      country: 'United Kingdom'
    }
  };

  const handleAddressChange = (addressInfo) => {
    console.log('Address changed:', addressInfo);
  };

  return (
    <Container className="py-4">
      <h2 className="mb-4">Address Selection Panel Test</h2>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <Card.Header>
              <h5>Delivery Address</h5>
            </Card.Header>
            <Card.Body>
              <AddressSelectionPanel
                addressType="delivery"
                userProfile={mockUserProfile}
                onAddressChange={handleAddressChange}
              />
            </Card.Body>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <Card.Header>
              <h5>Invoice Address</h5>
            </Card.Header>
            <Card.Body>
              <AddressSelectionPanel
                addressType="invoice"
                userProfile={mockUserProfile}
                onAddressChange={handleAddressChange}
              />
            </Card.Body>
          </Card>
        </Grid>
      </Grid>

      <div className="mt-4">
        <h5>User Profile Preferences:</h5>
        <ul>
          <li>Send study material to: <strong>{mockUserProfile.profile.send_study_material_to}</strong></li>
          <li>Send invoices to: <strong>{mockUserProfile.profile.send_invoices_to}</strong></li>
        </ul>
      </div>
    </Container>
  );
};

export default TestAddressPanel;