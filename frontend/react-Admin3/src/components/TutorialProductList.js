import React, { useEffect, useState } from 'react';
import axios from 'axios';
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
    // Replace with your actual API endpoint
    axios.get('/api/tutorials/events/')
      .then((res) => {
        // Group events by subject+location+mode
        const groups = {};
        res.data.forEach(event => {
          const key = `${event.subject}||${event.location}||${event.learning_mode}`;
          if (!groups[key]) {
            groups[key] = {
              title: `${event.subject} Tutorials`,
              location: event.location,
              mode: event.learning_mode_display,
              events: [],
            };
          }
          groups[key].events.push(event);
        });
        setGroupedTutorials(Object.values(groups));
        setLoading(false);
      })
      .catch((err) => {
        setError('Failed to load tutorials');
        setLoading(false);
      });
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
