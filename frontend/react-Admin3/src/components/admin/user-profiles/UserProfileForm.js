// src/components/admin/user-profiles/UserProfileForm.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  TextField, Button, Container, Alert, Box, Typography,
  FormControl, FormLabel, CircularProgress, Tabs, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper
} from '@mui/material';
import { useNavigate, useParams, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import userProfileService from '../../../services/userProfileService';

const TabPanel = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
};

const AdminUserProfileForm = () => {
  const { isSuperuser } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();

  const [formData, setFormData] = useState({
    title: '',
    send_invoices_to: '',
    send_study_material_to: '',
    remarks: '',
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  // Sub-resource state
  const [addresses, setAddresses] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [emails, setEmails] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [emailsLoading, setEmailsLoading] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const data = await userProfileService.getById(id);
      setFormData({
        title: data.title || '',
        send_invoices_to: data.send_invoices_to || '',
        send_study_material_to: data.send_study_material_to || '',
        remarks: data.remarks || '',
      });
    } catch (err) {
      setError('Failed to fetch user profile details. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchAddresses = useCallback(async () => {
    setAddressesLoading(true);
    try {
      const data = await userProfileService.getAddresses(id);
      setAddresses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching addresses:', err);
    } finally {
      setAddressesLoading(false);
    }
  }, [id]);

  const fetchContacts = useCallback(async () => {
    setContactsLoading(true);
    try {
      const data = await userProfileService.getContacts(id);
      setContacts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching contacts:', err);
    } finally {
      setContactsLoading(false);
    }
  }, [id]);

  const fetchEmails = useCallback(async () => {
    setEmailsLoading(true);
    try {
      const data = await userProfileService.getEmails(id);
      setEmails(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching emails:', err);
    } finally {
      setEmailsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchProfile();
      fetchAddresses();
      fetchContacts();
      fetchEmails();
    }
  }, [id, fetchProfile, fetchAddresses, fetchContacts, fetchEmails]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await userProfileService.update(id, formData);
      navigate('/admin/user-profiles');
    } catch (err) {
      setError('Failed to update user profile. Please check your input and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isSuperuser) return <Navigate to="/" replace />;
  if (loading) return <Box sx={{ textAlign: 'center', mt: 5 }}><CircularProgress /></Box>;

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h4" component="h2" sx={{ mb: 4 }}>
        Edit User Profile
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Box component="form" onSubmit={handleSubmit}>
        <FormControl fullWidth sx={{ mb: 3 }}>
          <FormLabel>Title</FormLabel>
          <TextField
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Enter title"
            fullWidth
            disabled={isSubmitting}
          />
        </FormControl>

        <FormControl fullWidth sx={{ mb: 3 }}>
          <FormLabel>Send Invoices To</FormLabel>
          <TextField
            name="send_invoices_to"
            value={formData.send_invoices_to}
            onChange={handleChange}
            placeholder="Enter invoice recipient"
            fullWidth
            disabled={isSubmitting}
          />
        </FormControl>

        <FormControl fullWidth sx={{ mb: 3 }}>
          <FormLabel>Send Study Material To</FormLabel>
          <TextField
            name="send_study_material_to"
            value={formData.send_study_material_to}
            onChange={handleChange}
            placeholder="Enter study material recipient"
            fullWidth
            disabled={isSubmitting}
          />
        </FormControl>

        <FormControl fullWidth sx={{ mb: 3 }}>
          <FormLabel>Remarks</FormLabel>
          <TextField
            name="remarks"
            value={formData.remarks}
            onChange={handleChange}
            placeholder="Enter remarks"
            fullWidth
            multiline
            rows={4}
            disabled={isSubmitting}
          />
        </FormControl>

        <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
          <Button variant="contained" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Update Profile'}
          </Button>
          <Button
            variant="outlined"
            onClick={() => navigate('/admin/user-profiles')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </Box>
      </Box>

      {/* Sub-resource tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="profile sub-resources">
          <Tab label="Addresses" id="profile-tab-0" aria-controls="profile-tabpanel-0" />
          <Tab label="Contacts" id="profile-tab-1" aria-controls="profile-tabpanel-1" />
          <Tab label="Emails" id="profile-tab-2" aria-controls="profile-tabpanel-2" />
        </Tabs>
      </Box>

      {/* Addresses Tab */}
      <TabPanel value={tabValue} index={0}>
        {addressesLoading ? (
          <Box sx={{ textAlign: 'center', mt: 3 }}><CircularProgress /></Box>
        ) : addresses.length === 0 ? (
          <Alert severity="info">No addresses found for this profile.</Alert>
        ) : (
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Address Line 1</TableCell>
                  <TableCell>City</TableCell>
                  <TableCell>Postcode</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {addresses.map((address) => (
                  <TableRow key={address.id} hover>
                    <TableCell>{address.address_line_1}</TableCell>
                    <TableCell>{address.city}</TableCell>
                    <TableCell>{address.postcode}</TableCell>
                    <TableCell>
                      <Button
                        component={Link}
                        to={`/admin/user-profiles/${id}/addresses/${address.id}/edit`}
                        variant="contained"
                        color="warning"
                        size="small"
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>

      {/* Contacts Tab */}
      <TabPanel value={tabValue} index={1}>
        {contactsLoading ? (
          <Box sx={{ textAlign: 'center', mt: 3 }}><CircularProgress /></Box>
        ) : contacts.length === 0 ? (
          <Alert severity="info">No contacts found for this profile.</Alert>
        ) : (
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Contact Type</TableCell>
                  <TableCell>Contact Number</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {contacts.map((contact) => (
                  <TableRow key={contact.id} hover>
                    <TableCell>{contact.contact_type}</TableCell>
                    <TableCell>{contact.contact_number}</TableCell>
                    <TableCell>
                      <Button
                        component={Link}
                        to={`/admin/user-profiles/${id}/contacts/${contact.id}/edit`}
                        variant="contained"
                        color="warning"
                        size="small"
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>

      {/* Emails Tab */}
      <TabPanel value={tabValue} index={2}>
        {emailsLoading ? (
          <Box sx={{ textAlign: 'center', mt: 3 }}><CircularProgress /></Box>
        ) : emails.length === 0 ? (
          <Alert severity="info">No emails found for this profile.</Alert>
        ) : (
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Email</TableCell>
                  <TableCell>Is Primary</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {emails.map((email) => (
                  <TableRow key={email.id} hover>
                    <TableCell>{email.email}</TableCell>
                    <TableCell>{email.is_primary ? 'Yes' : 'No'}</TableCell>
                    <TableCell>
                      <Button
                        component={Link}
                        to={`/admin/user-profiles/${id}/emails/${email.id}/edit`}
                        variant="contained"
                        color="warning"
                        size="small"
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>
    </Container>
  );
};

export default AdminUserProfileForm;
