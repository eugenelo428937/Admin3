import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  IconButton,
  Collapse,
  Alert,
  useTheme,
  useMediaQuery,
  Stack,
  Divider,
  Fab,
  Badge,
} from "@mui/material";
import {
  Close,
  AccessTime,
  LocationOn,
  Person,
  ExpandMore,
  ExpandLess,
  Add,
  Check,
  Error,
  ShoppingCart,
} from "@mui/icons-material";
import { useTutorialChoice } from "../../../../contexts/TutorialChoiceContext";
import { useCart } from "../../../../contexts/CartContext";

const TutorialChoiceDialog = ({ 
  open, 
  onClose, 
  subjectCode, 
  subjectName, 
  location, 
  variations = [], 
  productId 
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [expandedEvents, setExpandedEvents] = useState({});
  
  const {
    getSubjectChoices,
    addTutorialChoice,
    removeTutorialChoice,
    isEventSelected,
    getEventChoiceLevel,
    getNextAvailableChoiceLevel,
    showChoicePanelForSubject,
    markChoicesAsAdded
  } = useTutorialChoice();
  
  const { addToCart, cartItems } = useCart();

  const subjectChoices = getSubjectChoices(subjectCode);
  const hasChoices = Object.keys(subjectChoices).length > 0;

  // Get choice levels occupied by cart items for this subject
  const cartOccupiedLevels = useMemo(() => {
    if (!cartItems || cartItems.length === 0) return [];

    const tutorialItems = cartItems.filter(item =>
      item.subject_code === subjectCode &&
      item.product_type === "tutorial"
    );

    const levels = [];
    tutorialItems.forEach(item => {
      const metadata = item.metadata || item.priceInfo?.metadata;
      if (metadata && metadata.locations) {
        metadata.locations.forEach(loc => {
          if (loc.choices) {
            loc.choices.forEach(choice => {
              if (choice.choice && !levels.includes(choice.choice)) {
                levels.push(choice.choice);
              }
            });
          }
        });
      }
    });

    return levels;
  }, [cartItems, subjectCode]);

  // Flatten all events from all variations for easier display
  const allEvents = useMemo(() => {
    const events = [];
    variations.forEach(variation => {
      if (variation.events) {
        variation.events.forEach(event => {
          events.push({
            ...event,
            variation,
            variationId: variation.id,
            variationName: variation.name,
            variationDescription: variation.description_short || variation.description
          });
        });
      }
    });
    
    // Sort by start date
    return events.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
  }, [variations]);

  const toggleEventExpansion = (eventId) => {
    setExpandedEvents(prev => ({
      ...prev,
      [eventId]: !prev[eventId]
    }));
  };

  const handleChoiceSelect = (event, choiceLevel) => {
    const eventData = {
      eventId: event.id,
      eventTitle: event.title,
      eventCode: event.code,
      venue: event.venue,
      startDate: event.start_date,
      endDate: event.end_date,
      variationId: event.variationId,
      variationName: event.variationName,
      variation: event.variation,
      subjectCode,
      subjectName,
      location,
      productId
    };

    addTutorialChoice(subjectCode, choiceLevel, eventData);
  };

  const handleChoiceRemove = (choiceLevel) => {
    removeTutorialChoice(subjectCode, choiceLevel);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return "N/A";
    }
  };

  const getEventStatus = (event) => {
    if (event.is_soldout) return { status: "soldout", color: "error", text: "Sold Out" };
    if (event.remain_space !== null && event.remain_space <= 5 && event.remain_space > 0) {
      return { status: "limited", color: "warning", text: `${event.remain_space} spaces` };
    }
    if (event.remain_space !== null && event.remain_space > 5) {
      return { status: "available", color: "success", text: "Available" };
    }
    return { status: "unknown", color: "default", text: "Check availability" };
  };

  const getChoiceButtons = (event) => {
    const isSelected = isEventSelected(subjectCode, event.id);
    const currentLevel = getEventChoiceLevel(subjectCode, event.id);
    const nextAvailable = getNextAvailableChoiceLevel(subjectCode);
    
    if (isSelected) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label={`${currentLevel} Choice`}
            color={currentLevel === "1st" ? "success" : currentLevel === "2nd" ? "warning" : "info"}
            variant="filled"
            size="small"
            icon={<Check />}
          />
          <Button
            size="small"
            color="error"
            onClick={() => handleChoiceRemove(currentLevel)}
          >
            Remove
          </Button>
        </Box>
      );
    }

    const availableLevels = [];
    ["1st", "2nd", "3rd"].forEach(level => {
      // Check if level is occupied in either context or cart
      const inContext = !!subjectChoices[level];
      const inCart = cartOccupiedLevels.includes(level);

      if (!inContext && !inCart) {
        availableLevels.push(level);
      }
    });

    if (availableLevels.length === 0) {
      return (
        <Chip
          label="All choices selected"
          color="default"
          size="small"
          disabled
        />
      );
    }

    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {availableLevels.map(level => (
          <Button
            key={level}
            size="small"
            variant={level === nextAvailable ? "contained" : "outlined"}
            color={level === "1st" ? "success" : level === "2nd" ? "warning" : "info"}
            onClick={() => handleChoiceSelect(event, level)}
            disabled={event.is_soldout}
          >
            {level}
          </Button>
        ))}
      </Box>
    );
  };

  const handleAddToCart = () => {
    const orderedChoices = ["1st", "2nd", "3rd"]
      .filter(level => subjectChoices[level])
      .map(level => subjectChoices[level]);

    if (orderedChoices.length === 0) return;

    const primaryChoice = orderedChoices[0]; // 1st choice for pricing
    const actualPrice = primaryChoice.variation.prices?.find(
      p => p.price_type === "standard"
    )?.amount;

    const locationChoices = orderedChoices.map(choice => ({
      choice: choice.choiceLevel,
      variationId: choice.variationId,
      eventId: choice.eventId,
      variationName: choice.variationName,
      eventTitle: choice.eventTitle,
      eventCode: choice.eventCode,
      venue: choice.venue,
      startDate: choice.startDate,
      endDate: choice.endDate,
      price: `£${actualPrice}`,
    }));

    const tutorialMetadata = {
      type: "tutorial",
      title: `${subjectCode} Tutorial`,
      locations: [
        {
          location: location,
          choices: locationChoices,
          choiceCount: locationChoices.length,
        }
      ],
      subjectCode: subjectCode,
      totalChoiceCount: locationChoices.length
    };

    addToCart({
      id: productId,
      essp_id: productId,
      product_id: productId,
      subject_code: subjectCode,
      subject_name: subjectName,
      product_name: `${subjectCode} Tutorial - ${location}`,
      type: "Tutorial",
      quantity: 1
    }, {
      priceType: "standard",
      actualPrice: actualPrice,
      metadata: tutorialMetadata
    });

    // ✅ Mark choices as added to cart (isDraft: false)
    markChoicesAsAdded(subjectCode);

    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          height: isMobile ? '100vh' : 'auto',
          maxHeight: isMobile ? '100vh' : '90vh',
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        pb: 1
      }}>
        <Box>
          <Typography variant="h6" component="div">
            {subjectCode} Tutorial - {location}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Select your tutorial preferences
          </Typography>
        </Box>
        <IconButton onClick={onClose} edge="end">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: isMobile ? 1 : 3, py: 1 }}>
        {/* Choice Summary */}
        {hasChoices && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              You have selected {Object.keys(subjectChoices).length} choice(s) for {subjectCode}.
              Only the 1st choice will be charged.
            </Typography>
          </Alert>
        )}

        {/* Current Choices Display */}
        {hasChoices && (
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent sx={{ pb: '16px !important' }}>
              <Typography variant="subtitle2" gutterBottom>
                Current Choices
              </Typography>
              <Stack spacing={1}>
                {["1st", "2nd", "3rd"].map(level => {
                  const choice = subjectChoices[level];
                  if (!choice) return null;
                  
                  return (
                    <Box key={level} sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      p: 1,
                      backgroundColor: 'grey.50',
                      borderRadius: 1
                    }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight="medium">
                          {level}: {choice.eventCode}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {choice.venue} • {formatDate(choice.startDate)}
                        </Typography>
                      </Box>
                      <Button
                        size="small"
                        color="error"
                        onClick={() => handleChoiceRemove(level)}
                      >
                        Remove
                      </Button>
                    </Box>
                  );
                })}
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* Events List */}
        <Typography variant="h6" gutterBottom>
          Available Tutorial Events
        </Typography>
        
        <Grid container spacing={2}>
          {allEvents.map((event) => {
            const isExpanded = expandedEvents[event.id];
            const status = getEventStatus(event);
            const isSelected = isEventSelected(subjectCode, event.id);
            
            return (
              <Grid size={{ xs: 12, md: 6 }} key={event.id}>
                <Card 
                  variant="outlined" 
                  sx={{ 
                    border: isSelected ? `2px solid ${theme.palette.primary.main}` : undefined,
                    position: 'relative'
                  }}
                >
                  <CardContent sx={{ pb: '8px !important' }}>
                    {/* Event Header */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" component="h3" sx={{ fontSize: '1rem' }}>
                          {event.code}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {event.variationDescription}
                        </Typography>
                      </Box>
                      <Chip
                        label={status.text}
                        color={status.color}
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    </Box>

                    {/* Event Details */}
                    <Stack spacing={1} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LocationOn fontSize="small" color="action" />
                        <Typography variant="body2">{event.venue}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AccessTime fontSize="small" color="action" />
                        <Typography variant="body2">
                          {formatDate(event.start_date)}
                        </Typography>
                      </Box>
                      {event.remain_space !== null && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Person fontSize="small" color="action" />
                          <Typography variant="body2">
                            {event.remain_space} spaces remaining
                          </Typography>
                        </Box>
                      )}
                    </Stack>

                    {/* Expandable Details */}
                    <Collapse in={isExpanded}>
                      <Divider sx={{ mb: 1 }} />
                      <Stack spacing={1}>
                        <Typography variant="body2">
                          <strong>End Date:</strong> {formatDate(event.end_date)}
                        </Typography>
                        {event.finalisation_date && (
                          <Typography variant="body2">
                            <strong>Finalisation Date:</strong> {formatDate(event.finalisation_date)}
                          </Typography>
                        )}
                        <Typography variant="body2">
                          <strong>Variation:</strong> {event.variationName}
                        </Typography>
                      </Stack>
                    </Collapse>

                    {/* Action Buttons */}
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      mt: 2
                    }}>
                      <Button
                        size="small"
                        onClick={() => toggleEventExpansion(event.id)}
                        startIcon={isExpanded ? <ExpandLess /> : <ExpandMore />}
                      >
                        {isExpanded ? 'Less' : 'More'}
                      </Button>
                      
                      {getChoiceButtons(event)}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        {allEvents.length === 0 && (
          <Alert severity="info">
            No tutorial events available for this subject and location.
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: isMobile ? 2 : 3, py: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
        {hasChoices && (
          <Button
            onClick={() => showChoicePanelForSubject(subjectCode)}
            variant="outlined"
            startIcon={<Badge badgeContent={Object.keys(subjectChoices).length} color="primary">
              <ShoppingCart />
            </Badge>}
          >
            View Choices
          </Button>
        )}
        {hasChoices && (
          <Button
            onClick={handleAddToCart}
            variant="contained"
            color="success"
            startIcon={<Add />}
          >
            Add to Cart
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default TutorialChoiceDialog;