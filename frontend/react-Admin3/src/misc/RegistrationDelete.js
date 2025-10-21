import React from "react";
import { Row, Col, Card } from "react-bootstrap";
import ProfileForm from "../components/ProfileForm";

const Registration = () => {
    return (
        <Row className="justify-content-center">
            <Col md={12} lg={10} xl={8}>
                <Card>
                    <Card.Header className="bg-success text-white">
                        <h4 className="mb-0">
                            <i className="bi bi-person-plus me-2"></i>
                            Create Your Account
                        </h4>
                    </Card.Header>
                    <Card.Body>
                        <ProfileForm
                            mode="registration"
                            title="Create Your ActEd Account"
                            subtitle="Join thousands of students studying with ActEd. Create your account to access study materials, book tutorials, and track your progress."
                            showSuccessMessage={true}
                        />
                    </Card.Body>
                </Card>
            </Col>
        </Row>
    );
};

export default Registration; 