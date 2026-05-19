import React from 'react';
import { Card, CardContent, Box, Typography, Chip, Stack } from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import AssignmentIcon from '@mui/icons-material/Assignment';
import LocationOnIcon from '@mui/icons-material/LocationOn';

const formatPrice = ({ amount, currency }) => {
  const symbols = { GBP: '£', USD: '$', EUR: '€' };
  const symbol = symbols[currency] || '';
  return `${symbol}${amount}`;
};

const TutorialBody = ({ product }) => (
  <>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
      <SchoolIcon fontSize="small" color="primary" />
      <Typography variant="body2" color="text.secondary">
        Tutorial
      </Typography>
    </Box>
    {product.tutorial_location_name && (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
        <LocationOnIcon fontSize="small" />
        <Typography variant="body2">{product.tutorial_location_name}</Typography>
      </Box>
    )}
    <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
      {product.format_display || product.product_name}
    </Typography>
  </>
);

const MarkingBody = ({ product }) => (
  <>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
      <AssignmentIcon fontSize="small" color="primary" />
      <Typography variant="body2" color="text.secondary">
        Marking
      </Typography>
    </Box>
    <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
      {product.marking_template_name || product.product_name}
    </Typography>
    {product.marking_template_code && (
      <Typography variant="caption" color="text.secondary">
        {product.marking_template_code}
      </Typography>
    )}
  </>
);

const SearchPreviewCard = ({ product }) => {
  const isTutorial = product.kind === 'tutorial';
  const isMarking = product.kind === 'marking';
  const standardPrice = (product.prices || []).find((p) => p.price_type === 'standard');

  return (
    <Card sx={{ width: '100%', minHeight: 200 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
          <Chip
            label={product.subject_code}
            size="small"
            color="primary"
            variant="outlined"
          />
          {product.exam_session_code && (
            <Typography variant="caption" color="text.secondary">
              {product.exam_session_code}
            </Typography>
          )}
        </Box>

        {isTutorial && <TutorialBody product={product} />}
        {isMarking && <MarkingBody product={product} />}

        {standardPrice && (
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Chip
              label={`${formatPrice(standardPrice)} ${standardPrice.currency || ''}`.trim()}
              size="small"
              variant="outlined"
            />
          </Stack>
        )}
      </CardContent>
    </Card>
  );
};

export default SearchPreviewCard;
