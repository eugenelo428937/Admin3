import React, { useState } from 'react';
import { Form, Button, Alert, Container, Row, Col } from 'react-bootstrap';
import config from '../config';

const TestActivation = () => {
    const [uid, setUid] = useState('');
    const [token, setToken] = useState('');
    const [result, setResult] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const testActivation = async () => {
        if (!uid || !token) {
            setResult({ status: 'error', message: 'Please enter both UID and token' });
            return;
        }

        setIsLoading(true);
        setResult(null);

        try {
            const response = await fetch(`${config.apiBaseUrl}/api/auth/activate/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    uid: uid,
                    token: token
                })
            });

            const data = await response.json();
            
            if (response.ok) {
                setResult({ 
                    status: 'success', 
                    message: data.message || 'Account activated successfully!' 
                });
            } else {
                setResult({ 
                    status: 'error', 
                    message: data.error || 'Activation failed' 
                });
            }
        } catch (error) {
            setResult({ 
                status: 'error', 
                message: 'Network error: ' + error.message 
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Container className="mt-5">
            <Row className="justify-content-center">
                <Col md={8} lg={6}>
                    <div className="text-center mb-4">
                        <h2>Test Account Activation</h2>
                        <p className="text-muted">
                            Use this page to test account activation with UID and token from email
                        </p>
                    </div>

                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>UID</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Enter UID from activation link"
                                value={uid}
                                onChange={(e) => setUid(e.target.value)}
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Token</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Enter token from activation link"
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                            />
                        </Form.Group>

                        <div className="d-grid">
                            <Button 
                                variant="primary" 
                                onClick={testActivation}
                                disabled={isLoading}
                            >
                                {isLoading ? 'Testing...' : 'Test Activation'}
                            </Button>
                        </div>
                    </Form>

                    {result && (
                        <Alert 
                            variant={result.status === 'success' ? 'success' : 'danger'} 
                            className="mt-3"
                        >
                            <Alert.Heading>
                                {result.status === 'success' ? 'Success!' : 'Error'}
                            </Alert.Heading>
                            <p>{result.message}</p>
                        </Alert>
                    )}

                    <div className="mt-4">
                        <h5>Example Test Data:</h5>
                        <p><small>
                            You can get test UID and token by running:<br/>
                            <code>python manage.py test_account_activation</code>
                        </small></p>
                    </div>
                </Col>
            </Row>
        </Container>
    );
};

export default TestActivation; 