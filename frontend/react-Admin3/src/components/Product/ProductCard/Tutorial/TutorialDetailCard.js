import React from 'react';
import PropTypes from 'prop-types';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Box,
} from '@mui/material';
import moment from 'moment';
import { touchButtonStyle } from './tutorialStyles';

/**
 * TutorialDetailCard - Presentational component for displaying tutorial event details
 * with choice selection buttons.
 *
 * Contract: Controlled component with visual feedback for selection state
 * Optimized: Memoized to prevent unnecessary re-renders in grid layouts
 */
const TutorialDetailCard = React.memo(({
  event,
  variation,
  selectedChoiceLevel,
  onSelectChoice,
  subjectCode,
}) => {
  const {
    eventId,
    eventTitle,
    eventCode,
    location,
    venue,
    startDate,
    endDate,
  } = event;

  const { variationId, variationName, prices } = variation;

  // Format dates for display
  const formattedStartDate = moment(startDate).format('MMM DD, YYYY HH:mm');
  const formattedEndDate = moment(endDate).format('MMM DD, YYYY HH:mm');

  /**
   * Handle choice button click and propagate event data to parent
   * @param {string} choiceLevel - The choice level ('1st', '2nd', or '3rd')
   */
  const handleChoiceClick = (choiceLevel) => {
    const eventData = {
      eventId,
      eventTitle,
      eventCode,
      location,
      venue,
      startDate,
      endDate,
      variationId,
      variationName,
      prices,
    };
    onSelectChoice(choiceLevel, eventData);
  };

  /**
   * Determine button variant based on selection state
   * @param {string} choiceLevel - The choice level to check
   * @returns {string} 'contained' if selected, 'outlined' if not selected
   */
  const getButtonVariant = (choiceLevel) => {
    return selectedChoiceLevel === choiceLevel ? 'contained' : 'outlined';
  };

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '350px',
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        {/* Event Title - Semantic h3 */}
        <Typography
          variant="h6"
          component="h3"
          gutterBottom
          sx={{ fontWeight: 600 }}
        >
          {eventTitle}
        </Typography>

        {/* Event Details Section */}
        <Box component="section" sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            <strong>Event Code:</strong> {eventCode}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            <strong>Location:</strong> {location}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            <strong>Venue:</strong> {venue}
          </Typography>
        </Box>

        {/* Date Information Section */}
        <Box component="section">
          <Typography variant="body2" color="text.secondary" gutterBottom>
            <strong>Start:</strong> {formattedStartDate}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            <strong>End:</strong> {formattedEndDate}
          </Typography>
        </Box>
      </CardContent>

      {/* Choice Buttons */}
      <CardActions
        sx={{
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: 1,
          pb: 2,
        }}
      >
        <Button
          variant={getButtonVariant('1st')}
          color="primary"
          size="medium"
          onClick={() => handleChoiceClick('1st')}
          aria-pressed={selectedChoiceLevel === '1st'}
          sx={{
            minWidth: '80px',
            ...touchButtonStyle,
          }}
        >
          1st
        </Button>
        <Button
          variant={getButtonVariant('2nd')}
          color="primary"
          size="medium"
          onClick={() => handleChoiceClick('2nd')}
          aria-pressed={selectedChoiceLevel === '2nd'}
          sx={{
            minWidth: '80px',
            ...touchButtonStyle,
          }}
        >
          2nd
        </Button>
        <Button
          variant={getButtonVariant('3rd')}
          color="primary"
          size="medium"
          onClick={() => handleChoiceClick('3rd')}
          aria-pressed={selectedChoiceLevel === '3rd'}
          sx={{
            minWidth: '80px',
            ...touchButtonStyle,
          }}
        >
          3rd
        </Button>
      </CardActions>
    </Card>
  );
});

TutorialDetailCard.displayName = 'TutorialDetailCard';

TutorialDetailCard.propTypes = {
  event: PropTypes.shape({
    eventId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    eventTitle: PropTypes.string.isRequired,
    eventCode: PropTypes.string.isRequired,
    location: PropTypes.string.isRequired,
    venue: PropTypes.string,
    startDate: PropTypes.string.isRequired,
    endDate: PropTypes.string.isRequired,
  }).isRequired,
  variation: PropTypes.shape({
    variationId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    variationName: PropTypes.string.isRequired,
    prices: PropTypes.array,
  }).isRequired,
  selectedChoiceLevel: PropTypes.oneOf(['1st', '2nd', '3rd', null]),
  onSelectChoice: PropTypes.func.isRequired,
  subjectCode: PropTypes.string.isRequired,
};

export default TutorialDetailCard;
