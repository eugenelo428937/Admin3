import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Card, Collapse, Button } from 'react-bootstrap';

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
    <Card className="h-100 shadow-sm">
      <Card.Header className="bg-primary text-white">
        <h5 className="mb-0">{title}</h5>
      </Card.Header>
      <Card.Body>
        <Card.Subtitle className="mb-2 text-muted">
          {location} &mdash; {mode}
        </Card.Subtitle>
        <Button 
          variant={expanded ? "outline-primary" : "primary"}
          size="sm"
          onClick={handleExpandClick}
        >
          {expanded ? 'Hide Events' : 'Show Events'}
        </Button>
        <Collapse in={expanded}>
          <div className="mt-3">
            {events.map((event) => (
              <div key={event.id} className="border-bottom py-2">
                <h6 className="mb-1">{event.title}</h6>
                <small className="text-muted d-block">
                  Start: {event.lms_start_date || event.classroom_start_date}
                </small>
                <small className="text-muted d-block">
                  Instructor: {event.primary_instructor_name}
                </small>
                <small className="text-muted d-block">
                  Venue: {event.venue}
                </small>
              </div>
            ))}
          </div>
        </Collapse>
      </Card.Body>
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
