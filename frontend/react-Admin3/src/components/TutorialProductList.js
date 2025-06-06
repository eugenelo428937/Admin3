import React, { useEffect, useState } from 'react';
import tutorialService from '../services/tutorialService';
import TutorialProductCard from './TutorialProductCard';
import { Container, Row, Col, Alert, Spinner, Button } from 'react-bootstrap';

/**
 * TutorialProductList
 * Fetches and displays tutorial products grouped by subject and location
 */
const TutorialProductList = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tutorialProducts, setTutorialProducts] = useState([]);
  const [retryCount, setRetryCount] = useState(0);

  const fetchTutorialProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all tutorial products without specific parameters
      const products = await tutorialService.getAllTutorialProducts();
      setTutorialProducts(products || []);
      setRetryCount(0); // Reset retry count on success
    } catch (err) {
      console.error('Error fetching tutorial products:', err);
      
      // Provide more specific error messages based on error type
      let errorMessage = 'Failed to load tutorial products';
      if (err.response?.status === 500) {
        errorMessage = 'Server error occurred. Please try again later or contact support if the issue persists.';
      } else if (err.response?.status === 404) {
        errorMessage = 'Tutorial products service not found. Please contact support.';
      } else if (err.code === 'NETWORK_ERROR' || !err.response) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    fetchTutorialProducts();
  };

  useEffect(() => {
    fetchTutorialProducts();
  }, []);

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
        <div className="text-center">
          <Spinner animation="border" role="status" />
          <div className="mt-2">Loading tutorials...</div>
          {retryCount > 0 && (
            <small className="text-muted">Retry attempt {retryCount}</small>
          )}
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert variant="danger">
          <Alert.Heading>Unable to Load Tutorial Products</Alert.Heading>
          <p>{error}</p>
          <hr />
          <div className="d-flex justify-content-end">
            <Button variant="outline-danger" onClick={handleRetry}>
              Try Again
            </Button>
          </div>
        </Alert>
      </Container>
    );
  }

  if (tutorialProducts.length === 0) {
    return (
      <Container>
        <Alert variant="info">No tutorial products available at this time.</Alert>
      </Container>
    );
  }

  return (
    <Container fluid>
      <Row xs={1} md={2} lg={3} xl={4} className="g-4">
        {tutorialProducts.map((product) => (
          <TutorialProductCard
            key={`${product.subject_code}_${product.location}_${product.product_id}`}
            subjectCode={product.subject_code}
            subjectName={product.subject_name}
            location={product.location}
            productId={product.product_id}
          />
        ))}
      </Row>
    </Container>
  );
};

export default TutorialProductList;
