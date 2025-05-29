import React, { useEffect, useState } from 'react';
import tutorialService from '../services/tutorialService';
import TutorialProductCard from './TutorialProductCard';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';

/**
 * TutorialProductList
 * Fetches and groups tutorial events by subject/location/mode for display
 */
const TutorialProductList = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [groupedTutorials, setGroupedTutorials] = useState([]);

  useEffect(() => {
    const fetchTutorials = async () => {
      try {
        const events = await tutorialService.getAllEvents();
        // Group events by subject+location+mode
        const groups = {};
        (events || []).forEach(event => {          const key = `${event.course_code}||${event.location_name}||${event.learning_mode}`;
          if (!groups[key]) {
            groups[key] = {
              title: `${event.course_code} Tutorials`,
              location: event.location_name,
              mode: event.learning_mode_display,
              events: [],
            };
          }
          groups[key].events.push(event);
        });
        setGroupedTutorials(Object.values(groups));
        setLoading(false);
      } catch (err) {
        console.error('Error fetching tutorials:', err);
        setError('Failed to load tutorials');
        setLoading(false);
      }
    };

    fetchTutorials();
  }, []);

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Tutorials</Typography>
      {groupedTutorials.map((group, idx) => (
        <TutorialProductCard key={idx} {...group} />
      ))}
    </Box>
  );
};

export default TutorialProductList;
