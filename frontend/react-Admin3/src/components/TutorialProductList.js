import React from 'react';
import PropTypes from 'prop-types';
import TutorialProductCard from './TutorialProductCard';
import { Container, Row, Alert, Spinner } from 'react-bootstrap';

/**
 * TutorialProductList
 * Displays tutorial products using pre-fetched comprehensive data
 */
const TutorialProductList = ({ tutorialData, loading }) => {
  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
        <div className="text-center">
          <Spinner animation="border" role="status" />
          <div className="mt-2">Loading tutorials...</div>
        </div>
      </Container>
    );
  }

  if (!tutorialData || tutorialData.length === 0) {
    return (
      <Container>
        <Alert variant="info">No tutorial products available at this time.</Alert>
      </Container>
    );
  }

  return (
    <Container fluid>
      <Row xs={1} md={2} lg={3} xl={4} className="g-4">
        {tutorialData.map((product) => (
          <TutorialProductCard
            key={`${product.subject_code}_${product.location}_${product.product_id}`}
            subjectCode={product.subject_code}
            subjectName={product.subject_name}
            location={product.location}
            productId={product.product_id}
            variations={product.variations} // Pass pre-loaded variations
          />
        ))}
      </Row>
    </Container>
  );
};

TutorialProductList.propTypes = {
  tutorialData: PropTypes.array.isRequired,
  loading: PropTypes.bool.isRequired,
};

export default TutorialProductList;
