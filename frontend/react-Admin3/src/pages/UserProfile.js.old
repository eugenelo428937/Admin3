import React, { useState, useEffect } from "react";
import { Card, Row, Col, Alert, Spinner, Button, Badge } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import ProfileForm from "../components/User/ProfileForm";
import userService from "../services/userService";
import logger from "../services/loggerService";

const UserProfile = () => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);
    const [updating, setUpdating] = useState(false);
    const [emailVerificationSent, setEmailVerificationSent] = useState(false);
    
    const { user, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isAuthenticated) {
            navigate("/");
            return;
        }
        
        fetchProfile();
    }, [isAuthenticated, navigate]);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            setError(null);

            const result = await userService.getUserProfile();

            if (result.status === "success") {

                setProfile(result.data);
                logger.info("Profile loaded successfully");
            } else {
                console.error("UserProfile: API returned error", result.message);
                setError(result.message || "Failed to load profile");
                logger.error("Failed to load profile", { error: result.message });
            }
        } catch (err) {
            console.error("UserProfile: Exception occurred", err);
            setError("An unexpected error occurred while loading your profile");
            logger.error("Unexpected error loading profile", { error: err });
        } finally {
            setLoading(false);
        }
    };

    const handleProfileUpdate = async (formData) => {
        try {
            setUpdating(true);
            setError(null);
            setMessage(null);
            setEmailVerificationSent(false);
            
            logger.debug("Updating profile with data", { 
                hasUser: !!formData.user,
                emailChanged: formData.user?.email !== profile?.user?.email
            });

            const result = await userService.updateUserProfile(formData);
            
            if (result.status === "success") {
                setMessage(result.message);
                setEmailVerificationSent(result.email_verification_sent || false);
                
                // Refresh profile data
                await fetchProfile();
                
                logger.info("Profile updated successfully", {
                    emailVerificationSent: result.email_verification_sent
                });
            } else {
                setError(result.message || "Failed to update profile");
                logger.error("Failed to update profile", { error: result.message });
            }
        } catch (err) {
            setError("An unexpected error occurred while updating your profile");
            logger.error("Unexpected error updating profile", { error: err });
        } finally {
            setUpdating(false);
        }
    };

    const handleError = (errorMessage) => {
        setError(errorMessage);
        setMessage(null);
        setEmailVerificationSent(false);
    };

    const handleClearMessages = () => {
        setError(null);
        setMessage(null);
        setEmailVerificationSent(false);
    };

    if (!isAuthenticated) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "50vh" }}>
                <Spinner animation="border" variant="primary" />
            </div>
        );
    }

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "50vh" }}>
                <Spinner animation="border" variant="primary" />
                <span className="ms-2">Loading your profile...</span>
            </div>
        );
    }

    if (error && !profile) {
        return (
            <Row className="justify-content-center">
                <Col md={8} lg={6}>
                    <Card>
                        <Card.Body>
                            <Alert variant="danger">
                                <Alert.Heading>Error Loading Profile</Alert.Heading>
                                <p>{error}</p>
                                <hr />
                                <Button variant="outline-danger" onClick={fetchProfile}>
                                    Try Again
                                </Button>
                            </Alert>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        );
    }

    return (
        <Row className="justify-content-center">
            <Col md={12} lg={10} xl={8}>
                <Card>
                    <Card.Header className="bg-primary text-white">
                        <h4 className="mb-0">
                            <i className="bi bi-person-circle me-2"></i>
                            User Profile
                        </h4>
                    </Card.Header>
                    <Card.Body>
                        {/* Success/Error Messages */}
                        {message && (
                            <Alert variant="success" dismissible onClose={handleClearMessages}>
                                <div className="d-flex align-items-center">
                                    <i className="bi bi-check-circle-fill me-2"></i>
                                    <div>
                                        {message}
                                        {emailVerificationSent && (
                                            <div className="mt-2">
                                                <Badge bg="info" className="me-2">
                                                    <i className="bi bi-envelope-check me-1"></i>
                                                    Email Verification Sent
                                                </Badge>
                                                <small className="text-muted d-block">
                                                    Please check your new email address and click the verification link.
                                                </small>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Alert>
                        )}
                        
                        {error && (
                            <Alert variant="danger" dismissible onClose={handleClearMessages}>
                                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                                {error}
                            </Alert>
                        )}

                        {/* Profile Info Header */}
                        <div className="mb-4">
                            <div className="d-flex align-items-center mb-3">
                                <div className="bg-light rounded-circle p-3 me-3">
                                    <i className="bi bi-person-fill text-primary" style={{ fontSize: "1.5rem" }}></i>
                                </div>
                                <div>
                                    <h5 className="mb-1">
                                        {profile?.user?.first_name || ""} {profile?.user?.last_name || ""}
                                        {(!profile?.user?.first_name && !profile?.user?.last_name) && "Complete your profile"}
                                    </h5>
                                    <div className="text-muted">
                                        <small>
                                            <i className="bi bi-envelope me-1"></i>
                                            {profile?.user?.email}
                                        </small>
                                        {profile?.user?.is_active ? (
                                            <Badge bg="success" className="ms-2">Active</Badge>
                                        ) : (
                                            <Badge bg="warning" className="ms-2">Inactive</Badge>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Profile Form */}
                        <ProfileForm
                            mode="profile"
                            initialData={profile}
                            onSubmit={handleProfileUpdate}
                            onError={handleError}
                            isLoading={updating}
                            showSuccessMessage={false} // We handle success messages above
                            title="Update Your Information"
                            subtitle="Keep your profile information up to date"
                        />
                    </Card.Body>
                </Card>
            </Col>
        </Row>
    );
};

export default UserProfile; 