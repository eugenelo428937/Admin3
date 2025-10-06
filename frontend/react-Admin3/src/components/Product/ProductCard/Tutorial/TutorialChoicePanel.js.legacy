import React, { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Button,
  Chip,
  Card,
  CardContent,
  Stack,
  Divider,
  Select,
  MenuItem,
  FormControl,
  Alert,
  Collapse,
  Slide,
  useTheme,
  useMediaQuery,
  Badge,
} from "@mui/material";
import {
  Close,
  ExpandLess,
  ExpandMore,
  ShoppingCart,
  SwapVert,
  Delete,
  Add,
  AccessTime,
  LocationOn,
} from "@mui/icons-material";
import { useTutorialChoice } from "../../../../contexts/TutorialChoiceContext";
import { useCart } from "../../../../contexts/CartContext";

const TutorialChoicePanel = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [expandedSubjects, setExpandedSubjects] = useState({});
  
  const {
    showChoicePanel,
    activeSubject,
    tutorialChoices,
    hideChoicePanel,
    getSubjectChoices,
    getOrderedChoices,
    updateChoiceLevel,
    removeTutorialChoice,
    removeSubjectChoices,
    getTotalChoices,
    getSubjectPrice,
    getTotalPrice,
    markChoicesAsAdded,
  } = useTutorialChoice();

  const { addToCart } = useCart();

  const toggleSubjectExpansion = (subjectCode) => {
    setExpandedSubjects(prev => ({
      ...prev,
      [subjectCode]: !prev[subjectCode]
    }));
  };

  const handleChoiceLevelChange = (subjectCode, fromLevel, toLevel) => {
    if (fromLevel !== toLevel) {
      updateChoiceLevel(subjectCode, fromLevel, toLevel);
    }
  };

  const handleRemoveChoice = (subjectCode, choiceLevel) => {
    removeTutorialChoice(subjectCode, choiceLevel);
  };

  const handleRemoveSubject = (subjectCode) => {
    removeSubjectChoices(subjectCode);
  };

  const handleAddSubjectToCart = (subjectCode) => {
    const choices = getSubjectChoices(subjectCode);
    const orderedChoices = ["1st", "2nd", "3rd"]
      .filter(level => choices[level])
      .map(level => choices[level]);

    if (orderedChoices.length === 0) return;

    const primaryChoice = orderedChoices[0];
    const actualPrice = getSubjectPrice(subjectCode);

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
          location: primaryChoice.location,
          choices: locationChoices,
          choiceCount: locationChoices.length,
        }
      ],
      subjectCode: subjectCode,
      totalChoiceCount: locationChoices.length
    };

    addToCart({
      id: primaryChoice.productId,
      essp_id: primaryChoice.productId,
      product_id: primaryChoice.productId,
      subject_code: subjectCode,
      subject_name: primaryChoice.subjectName,
      product_name: `${subjectCode} Tutorial - ${primaryChoice.location}`,
      type: "Tutorial",
      quantity: 1
    }, {
      priceType: "standard",
      actualPrice: actualPrice,
      metadata: tutorialMetadata
    });

    // ✅ Mark choices as added to cart (isDraft: false)
    markChoicesAsAdded(subjectCode);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return "N/A";
    }
  };

  const getChoiceColor = (level) => {
    switch (level) {
      case "1st": return "success";
      case "2nd": return "warning";
      case "3rd": return "info";
      default: return "default";
    }
  };

  const renderChoiceItem = (subjectCode, level, choice) => (
    <Card 
      key={`${subjectCode}-${level}`}
      variant="outlined" 
      sx={{ 
        mb: 1,
        border: level === "1st" ? `2px solid ${theme.palette.success.main}` : undefined
      }}
    >
      <CardContent sx={{ pb: '12px !important' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Chip
                label={level}
                color={getChoiceColor(level)}
                size="small"
                sx={{ minWidth: 50 }}
              />
              <Typography variant="body2" fontWeight="medium">
                {choice.eventCode}
              </Typography>
              {level === "1st" && (
                <Chip
                  label="Charged"
                  color="success"
                  size="small"
                  variant="outlined"
                />
              )}
            </Box>
            <Typography variant="body2" color="text.secondary">
              {choice.venue} • {formatDate(choice.startDate)}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FormControl size="small" sx={{ minWidth: 60 }}>
              <Select
                value={level}
                onChange={(e) => handleChoiceLevelChange(subjectCode, level, e.target.value)}
              >
                <MenuItem value="1st">1st</MenuItem>
                <MenuItem value="2nd">2nd</MenuItem>
                <MenuItem value="3rd">3rd</MenuItem>
              </Select>
            </FormControl>
            <IconButton
              size="small"
              color="error"
              onClick={() => handleRemoveChoice(subjectCode, level)}
            >
              <Delete fontSize="small" />
            </IconButton>
          </Box>
        </Box>
        
        {level === "1st" && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="success.main" fontWeight="medium">
              Price: £{getSubjectPrice(subjectCode)}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  const renderSubjectSection = (subjectCode) => {
    const choices = getSubjectChoices(subjectCode);
    const orderedChoices = getOrderedChoices(subjectCode);
    const isExpanded = expandedSubjects[subjectCode];
    const isActiveSubject = activeSubject === subjectCode;

    return (
      <Card 
        key={subjectCode}
        variant="outlined" 
        sx={{ 
          mb: 2,
          border: isActiveSubject ? `2px solid ${theme.palette.primary.main}` : undefined
        }}
      >
        <CardContent sx={{ pb: '8px !important' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>
                {subjectCode}
                <Badge 
                  badgeContent={Object.keys(choices).length} 
                  color="primary" 
                  sx={{ ml: 1 }}
                />
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {orderedChoices.length} choice(s) • Price: £{getSubjectPrice(subjectCode)}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                size="small"
                variant="contained"
                color="success"
                onClick={() => handleAddSubjectToCart(subjectCode)}
                startIcon={<Add />}
              >
                Add to Cart
              </Button>
              <IconButton
                size="small"
                color="error"
                onClick={() => handleRemoveSubject(subjectCode)}
              >
                <Delete />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => toggleSubjectExpansion(subjectCode)}
              >
                {isExpanded ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            </Box>
          </Box>
          
          <Collapse in={isExpanded || isActiveSubject}>
            <Box sx={{ mt: 2 }}>
              {["1st", "2nd", "3rd"].map(level => {
                const choice = choices[level];
                if (!choice) return null;
                return renderChoiceItem(subjectCode, level, choice);
              })}
            </Box>
          </Collapse>
        </CardContent>
      </Card>
    );
  };

  if (!showChoicePanel) return null;

  const subjects = Object.keys(tutorialChoices);
  const totalChoices = getTotalChoices();
  const totalPrice = getTotalPrice();

  return (
    <Slide direction="up" in={showChoicePanel} mountOnEnter unmountOnExit>
      <Paper
        elevation={8}
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          maxHeight: '70vh',
          backgroundColor: 'background.paper',
          zIndex: theme.zIndex.drawer + 1,
          borderRadius: '16px 16px 0 0',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <Box sx={{ 
          p: 2, 
          borderBottom: `1px solid ${theme.palette.divider}`,
          backgroundColor: 'primary.main',
          color: 'primary.contrastText'
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>
                Tutorial Choices
                <Badge 
                  badgeContent={totalChoices} 
                  color="secondary" 
                  sx={{ ml: 1 }}
                />
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                {subjects.length} subject(s) • Total: £{totalPrice}
              </Typography>
            </Box>
            <IconButton 
              onClick={hideChoicePanel}
              sx={{ color: 'inherit' }}
            >
              <Close />
            </IconButton>
          </Box>
        </Box>

        {/* Content */}
        <Box sx={{ 
          flex: 1, 
          overflow: 'auto', 
          p: 2,
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#f1f1f1',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: theme.palette.grey[400],
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: theme.palette.grey[600],
          },
        }}>
          {subjects.length === 0 ? (
            <Alert severity="info">
              No tutorial choices selected yet. Select tutorials from the product cards to see them here.
            </Alert>
          ) : (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  You will only be charged for the 1st choice of each subject. 
                  Change preferences by using the dropdown menus.
                </Typography>
              </Alert>
              
              {subjects.map(renderSubjectSection)}
            </>
          )}
        </Box>

        {/* Footer */}
        {subjects.length > 0 && (
          <Box sx={{ 
            p: 2, 
            borderTop: `1px solid ${theme.palette.divider}`,
            backgroundColor: 'grey.50'
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="body1" fontWeight="medium">
                  Total: £{totalPrice}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {totalChoices} choice(s) across {subjects.length} subject(s)
                </Typography>
              </Box>
              <Button
                variant="contained"
                color="success"
                size="large"
                startIcon={<ShoppingCart />}
                onClick={() => {
                  // Add all subjects to cart
                  subjects.forEach(subjectCode => {
                    handleAddSubjectToCart(subjectCode);
                  });
                }}
              >
                Add All to Cart
              </Button>
            </Box>
          </Box>
        )}
      </Paper>
    </Slide>
  );
};

export default TutorialChoicePanel;