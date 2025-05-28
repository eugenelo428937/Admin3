import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Card, CardContent, Typography, Collapse, Button, List, ListItem, ListItemText } from '@mui/material';

/**
 * TutorialProductCard
 * Shows a card for a subject/location/mode (e.g. CM1 London, CM1 Live Online)
 * Expands to show all tutorial events for that location/mode
 */
const TutorialProductCard = ({ title, location, mode, events }) => {
  const [expanded, setExpanded] = useState(false);

  const handleExpandClick = () => {
    setExpanded(!expanded);
  };

  return (
    <Card sx={{ marginBottom: 2 }}>
      <CardContent>
        <Typography variant="h6">{title}</Typography>
        <Typography variant="subtitle1" color="text.secondary">
          {location} &mdash; {mode}
        </Typography>
        <Button onClick={handleExpandClick} sx={{ mt: 1 }}>
          {expanded ? 'Hide Events' : 'Show Events'}
        </Button>
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <List>
            {events.map((event) => (
              <ListItem key={event.id} alignItems="flex-start">
                <ListItemText
                  primary={event.title}
                  secondary={
                    <>
                      <div>Start: {event.lms_start_date || event.classroom_start_date}</div>
                      <div>Instructor: {event.primary_instructor_name}</div>
                      <div>Venue: {event.venue}</div>
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Collapse>
      </CardContent>
    </Card>
  );
};

TutorialProductCard.propTypes = {
  title: PropTypes.string.isRequired,
  location: PropTypes.string.isRequired,
  mode: PropTypes.string.isRequired,
  events: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    title: PropTypes.string,
    lms_start_date: PropTypes.string,
    classroom_start_date: PropTypes.string,
    primary_instructor_name: PropTypes.string,
    venue: PropTypes.string,
  })).isRequired,
};

export default TutorialProductCard;
