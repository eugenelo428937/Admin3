import React, { useState, useEffect } from 'react';
import TutorialProductCard from './TutorialProductCard';
import { Container, Row, Alert, Spinner } from 'react-bootstrap';
import tutorialService from '../../../../services/tutorialService';

/**
 * TutorialProductList
 * Displays tutorial products - fetches its own data when used standalone
 */
const TutorialProductList = ({ tutorialData: propTutorialData, loading: propLoading }) => {
  const [tutorialData, setTutorialData] = useState(propTutorialData || []);
  const [loading, setLoading] = useState(propLoading !== undefined ? propLoading : true);
  const [error, setError] = useState(null);

  // Fetch data if not provided via props (standalone mode)
  useEffect(() => {
    if (propTutorialData === undefined) {
      const fetchTutorialData = async () => {
        try {
          setLoading(true);
          setError(null);
          // Use existing tutorial service method to fetch tutorial products
          const response = await tutorialService.getComprehensiveTutorialData();
          setTutorialData(response || []);
        } catch (err) {
          console.error('Error fetching tutorial data:', err);
          setError('Failed to load tutorial products');
          setTutorialData([]);
        } finally {
          setLoading(false);
        }
      };

      fetchTutorialData();
    }
  }, [propTutorialData]);

  // Use prop data if provided, otherwise use state data
  const currentTutorialData = propTutorialData || tutorialData;
  const currentLoading = propLoading !== undefined ? propLoading : loading;
  if (error) {
    return (
      <Container>
        <Alert variant="danger">{error}</Alert>
      </Container>
    );
  }

  if (currentLoading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
        <div className="text-center">
          <Spinner animation="border" role="status" />
          <div className="mt-2">Loading tutorials...</div>
        </div>
      </Container>
    );
  }

  if (!currentTutorialData || currentTutorialData.length === 0) {
    return (
      <Container>
        <Alert variant="info">No tutorial products available at this time.</Alert>
      </Container>
    );
  }

  return (
    <Container fluid>
      <Row xs={1} md={2} lg={3} xl={4} className="g-4">
        {currentTutorialData.map((product) => (
          <TutorialProductCard
            key={`${product.subject_code}_${product.location}_${product.product_id}`}
            subjectCode={product.subject_code}
            subjectName={product.subject_name}
            location={product.location}
            productId={product.product_id}
            product={product}
            variations={product.variations} // Pass pre-loaded variations
          />
        ))}
      </Row>
    </Container>
  );
};

// Props are now optional - component can work standalone or with provided data
// No PropTypes needed since we handle undefined props gracefully

export default TutorialProductList;
