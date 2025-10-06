import React, { useState, useEffect } from 'react';
import TutorialProductCard from './TutorialProductCard';
import TutorialSelectionSummaryBar from './TutorialSelectionSummaryBar';
import { Container, Row, Alert, Spinner } from 'react-bootstrap';
import { Box } from '@mui/material';
import tutorialService from '../../../../services/tutorialService';
import { useTutorialChoice } from '../../../../contexts/TutorialChoiceContext';
import { useCart } from '../../../../contexts/CartContext';
import {
  buildTutorialMetadata,
  buildTutorialProductData,
  buildTutorialPriceData
} from '../../../../utils/tutorialMetadataBuilder';

/**
 * TutorialProductList
 * Displays tutorial products - fetches its own data when used standalone
 */
const TutorialProductList = ({ tutorialData: propTutorialData, loading: propLoading }) => {
  const [tutorialData, setTutorialData] = useState(propTutorialData || []);
  const [loading, setLoading] = useState(propLoading !== undefined ? propLoading : true);
  const [error, setError] = useState(null);
  const [dialogOpenForSubject, setDialogOpenForSubject] = useState(null);

  const { tutorialChoices, removeTutorialChoice, getSubjectChoices, markChoicesAsAdded } = useTutorialChoice();
  const { addToCart } = useCart();

  // Get all subjects that have active choices for vertical stacking
  const subjectsWithChoices = Object.keys(tutorialChoices);

  // Handler: Open dialog for editing choices
  const handleEdit = (subjectCode) => {
    setDialogOpenForSubject(subjectCode);
  };

  // Handler: Close dialog
  const handleDialogClose = () => {
    setDialogOpenForSubject(null);
  };

  // Handler: Add tutorial choices to cart
  const handleAddToCart = async (subjectCode) => {
    const product = currentTutorialData.find(p => p.subject_code === subjectCode);
    if (!product) return;

    const subjectChoices = getSubjectChoices(subjectCode);

    // Build metadata and product data
    const metadata = buildTutorialMetadata(subjectChoices, subjectCode, product.subject_name);
    const productData = buildTutorialProductData(product, metadata);
    const priceData = buildTutorialPriceData(subjectChoices['1st']);

    try {
      await addToCart(productData, priceData);
      markChoicesAsAdded(subjectCode);
      console.log('✅ [TutorialProductList] Choices added to cart for', subjectCode);
    } catch (error) {
      console.error('❌ [TutorialProductList] Error adding to cart:', error);
    }
  };

  // Handler: Remove draft choices
  const handleRemove = (subjectCode) => {
    const subjectChoices = getSubjectChoices(subjectCode);
    Object.entries(subjectChoices).forEach(([level, choice]) => {
      if (choice.isDraft) {
        removeTutorialChoice(subjectCode, level);
      }
    });
  };

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
    <>
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
              dialogOpen={dialogOpenForSubject === product.subject_code}
              onDialogClose={handleDialogClose}
            />
          ))}
        </Row>
      </Container>

      {/* Render all summary bars stacked vertically at bottom-left */}
      <Box
        sx={{
          position: 'fixed',
          bottom: { xs: 8, lg: 24 },
          left: { xs: 8, lg: 24 },
          zIndex: 1300, // Above most content but below modals
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          maxWidth: { xs: 'calc(100% - 16px)', sm: '600px' },
        }}
      >
        {subjectsWithChoices.map((subjectCode) => (
          <TutorialSelectionSummaryBar
            key={subjectCode}
            subjectCode={subjectCode}
            onEdit={() => handleEdit(subjectCode)}
            onAddToCart={() => handleAddToCart(subjectCode)}
            onRemove={() => handleRemove(subjectCode)}
          />
        ))}
      </Box>
    </>
  );
};

// Props are now optional - component can work standalone or with provided data
// No PropTypes needed since we handle undefined props gracefully

export default TutorialProductList;
