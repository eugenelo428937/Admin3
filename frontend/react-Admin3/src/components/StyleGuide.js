import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Button,
  Chip,
  Alert,
  TextField,
  Checkbox,
  FormControlLabel,
  Radio,
  RadioGroup,
  Switch,
  Slider,
  Divider,
  Paper,
  Grid,
  IconButton,
  Fab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  AppBar,
  Toolbar,
  Menu,
  MenuItem,
  Breadcrumbs,
  Link,
  Badge,
  Avatar,
  CircularProgress,
  LinearProgress,
  Tabs,
  Tab,
  Tooltip,
  Container
} from '@mui/material';
import {
  Home,
  Star,
  Settings,
  Person,
  ShoppingCart,
  Favorite,
  ExpandMore,
  Add,
  Edit,
  Delete,
  Search,
  Notifications,
  Mail,
  MoreVert,
  ChevronRight,
  Download,
  Share,
  Save,
  Print,
  Info,
  Warning,
  Error,
  CheckCircle,
  School,
  Computer,
  LibraryBooks,
  LocalActivity,
  Inventory2,
  Rule,
  CalendarToday
} from '@mui/icons-material';
import '../styles/liftkit-css/globals.css';
import '../styles/liftkit-css/typography.css';
import '../styles/product_card.css';

const StyleGuide = () => {
  const [tabValue, setTabValue] = useState(0);
  const [sliderValue, setSliderValue] = useState(30);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom sx={{ mb: 4 }}>
        Admin3 Style Guide
      </Typography>
      
      <Typography variant="subtitle1" gutterBottom sx={{ mb: 6, color: 'text.secondary' }}>
        A comprehensive design system for the Admin3 Actuarial Education Online Store, 
        featuring Material-UI components, LiftKit CSS variables, and product-specific styling.
      </Typography>

      <Grid container spacing={4}>
        
        {/* Color Palette Section */}
        <Grid item xs={12}>
          <Card elevation={2} sx={{ mb: 4 }}>
            <CardHeader title="Color Palette" />
            <CardContent>
              <Typography variant="body2" gutterBottom sx={{ mb: 3 }}>
                Our color system is based on LiftKit design variables with Material Design 3 color tokens.
              </Typography>
              
              <Grid container spacing={2}>
                {/* Primary Colors */}
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>Primary Colors</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Box 
                        sx={{ 
                          width: 80, 
                          height: 80, 
                          backgroundColor: 'var(--light__primary_lkv)', 
                          borderRadius: 2,
                          mb: 1
                        }} 
                      />
                      <Typography variant="caption">Primary</Typography>
                      <Typography variant="caption" display="block">#4658ac</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center' }}>
                      <Box 
                        sx={{ 
                          width: 80, 
                          height: 80, 
                          backgroundColor: 'var(--light__primarycontainer_lkv)', 
                          borderRadius: 2,
                          mb: 1
                        }} 
                      />
                      <Typography variant="caption">Primary Container</Typography>
                      <Typography variant="caption" display="block">#dee1ff</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center' }}>
                      <Box 
                        sx={{ 
                          width: 80, 
                          height: 80, 
                          backgroundColor: 'var(--light__secondary_lkv)', 
                          borderRadius: 2,
                          mb: 1
                        }} 
                      />
                      <Typography variant="caption">Secondary</Typography>
                      <Typography variant="caption" display="block">#5a5d72</Typography>
                    </Box>
                  </Box>
                </Grid>

                {/* Product Type Colors */}
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>Product Type Colors</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Box 
                        sx={{ 
                          width: 80, 
                          height: 80, 
                          backgroundColor: 'rgba(240, 253, 244, 1)', 
                          border: '1px solid rgba(34, 197, 94, 0.3)',
                          borderRadius: 2,
                          mb: 1
                        }} 
                      />
                      <Typography variant="caption">Tutorial</Typography>
                      <Typography variant="caption" display="block">Green Theme</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center' }}>
                      <Box 
                        sx={{ 
                          width: 80, 
                          height: 80, 
                          backgroundColor: 'rgba(255, 247, 237, 1)', 
                          border: '1px solid rgba(251, 146, 60, 0.3)',
                          borderRadius: 2,
                          mb: 1
                        }} 
                      />
                      <Typography variant="caption">Marking</Typography>
                      <Typography variant="caption" display="block">Orange Theme</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center' }}>
                      <Box 
                        sx={{ 
                          width: 80, 
                          height: 80, 
                          backgroundColor: 'rgba(239, 246, 255, 1)', 
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          borderRadius: 2,
                          mb: 1
                        }} 
                      />
                      <Typography variant="caption">Material</Typography>
                      <Typography variant="caption" display="block">Blue Theme</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center' }}>
                      <Box 
                        sx={{ 
                          width: 80, 
                          height: 80, 
                          backgroundColor: 'rgb(251, 240, 253)', 
                          border: '1px solid rgba(168, 85, 247, 0.3)',
                          borderRadius: 2,
                          mb: 1
                        }} 
                      />
                      <Typography variant="caption">Online Classroom</Typography>
                      <Typography variant="caption" display="block">Purple Theme</Typography>
                    </Box>
                  </Box>
                </Grid>

                {/* Status Colors */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Status Colors</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Box 
                        sx={{ 
                          width: 80, 
                          height: 80, 
                          backgroundColor: 'var(--light__success_lkv)', 
                          borderRadius: 2,
                          mb: 1
                        }} 
                      />
                      <Typography variant="caption">Success</Typography>
                      <Typography variant="caption" display="block">#006d3d</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center' }}>
                      <Box 
                        sx={{ 
                          width: 80, 
                          height: 80, 
                          backgroundColor: 'var(--light__warning_lkv)', 
                          borderRadius: 2,
                          mb: 1
                        }} 
                      />
                      <Typography variant="caption">Warning</Typography>
                      <Typography variant="caption" display="block">#7c5800</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center' }}>
                      <Box 
                        sx={{ 
                          width: 80, 
                          height: 80, 
                          backgroundColor: 'var(--light__error_lkv)', 
                          borderRadius: 2,
                          mb: 1
                        }} 
                      />
                      <Typography variant="caption">Error</Typography>
                      <Typography variant="caption" display="block">#ba1a1a</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center' }}>
                      <Box 
                        sx={{ 
                          width: 80, 
                          height: 80, 
                          backgroundColor: 'var(--light__info_lkv)', 
                          borderRadius: 2,
                          mb: 1
                        }} 
                      />
                      <Typography variant="caption">Info</Typography>
                      <Typography variant="caption" display="block">#1758c7</Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Typography Section */}
        <Grid item xs={12}>
          <Card elevation={2} sx={{ mb: 4 }}>
            <CardHeader title="Typography" />
            <CardContent>
              <Typography variant="body2" gutterBottom sx={{ mb: 3 }}>
                Typography system based on LiftKit CSS with golden ratio scaling (1.618) and Material-UI integration.
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>LiftKit Classes</Typography>
                  <Box sx={{ '& > *': { mb: 2 } }}>
                    <div>
                      <Typography className="display1">Display 1</Typography>
                      <Typography variant="caption" color="text.secondary">
                        .display1 - Large display text
                      </Typography>
                    </div>
                    <div>
                      <Typography className="display2">Display 2</Typography>
                      <Typography variant="caption" color="text.secondary">
                        .display2 - Medium display text
                      </Typography>
                    </div>
                    <div>
                      <Typography className="title1">Title 1</Typography>
                      <Typography variant="caption" color="text.secondary">
                        .title1 - Large titles
                      </Typography>
                    </div>
                    <div>
                      <Typography className="title2">Title 2</Typography>
                      <Typography variant="caption" color="text.secondary">
                        .title2 - Medium titles
                      </Typography>
                    </div>
                    <div>
                      <Typography className="heading">Heading</Typography>
                      <Typography variant="caption" color="text.secondary">
                        .heading - Section headings
                      </Typography>
                    </div>
                    <div>
                      <Typography className="body">Body Text</Typography>
                      <Typography variant="caption" color="text.secondary">
                        .body - Regular body text
                      </Typography>
                    </div>
                    <div>
                      <Typography className="caption">Caption Text</Typography>
                      <Typography variant="caption" color="text.secondary">
                        .caption - Small supplementary text
                      </Typography>
                    </div>
                  </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>Material-UI Variants</Typography>
                  <Box sx={{ '& > *': { mb: 2 } }}>
                    <div>
                      <Typography variant="h1">H1 Headline</Typography>
                      <Typography variant="caption" color="text.secondary">
                        variant="h1" - Main page titles
                      </Typography>
                    </div>
                    <div>
                      <Typography variant="h2">H2 Headline</Typography>
                      <Typography variant="caption" color="text.secondary">
                        variant="h2" - Section titles
                      </Typography>
                    </div>
                    <div>
                      <Typography variant="h4">H4 Headline</Typography>
                      <Typography variant="caption" color="text.secondary">
                        variant="h4" - Subsection titles
                      </Typography>
                    </div>
                    <div>
                      <Typography variant="h6">H6 Headline</Typography>
                      <Typography variant="caption" color="text.secondary">
                        variant="h6" - Component titles
                      </Typography>
                    </div>
                    <div>
                      <Typography variant="body1">Body 1 text for main content</Typography>
                      <Typography variant="caption" color="text.secondary">
                        variant="body1" - Primary body text
                      </Typography>
                    </div>
                    <div>
                      <Typography variant="body2">Body 2 text for secondary content</Typography>
                      <Typography variant="caption" color="text.secondary">
                        variant="body2" - Secondary body text
                      </Typography>
                    </div>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Product Cards Section */}
        <Grid item xs={12}>
          <Card elevation={2} sx={{ mb: 4 }}>
            <CardHeader title="Product Cards" />
            <CardContent>
              <Typography variant="body2" gutterBottom sx={{ mb: 3 }}>
                Product cards with type-specific styling and consistent layouts.
              </Typography>
              
              <Grid container spacing={3}>
                {/* Tutorial Card */}
                <Grid item xs={12} sm={6} md={3}>
                  <Card elevation={2} className="product-card">
                    <CardHeader
                      className="product-card-header tutorial-header"
                      title={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <School fontSize="small" />
                          <Typography variant="h6" fontSize="1rem">Tutorial Product</Typography>
                        </Box>
                      }
                    />
                    <CardContent className="product-card-content">
                      <Chip label="CP1" size="small" variant="outlined" sx={{ mb: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        Location: London
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Date: 15-16 March 2024
                      </Typography>
                    </CardContent>
                    <Divider />
                    <Box className="product-card-actions" sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h6">£299.00</Typography>
                        <Button variant="contained" size="small" startIcon={<Add />}>
                          Add
                        </Button>
                      </Box>
                    </Box>
                  </Card>
                </Grid>

                {/* Marking Card */}
                <Grid item xs={12} sm={6} md={3}>
                  <Card elevation={2} className="product-card">
                    <CardHeader
                      className="product-card-header marking-header"
                      title={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Rule fontSize="small" />
                          <Typography variant="h6" fontSize="1rem">Marking Product</Typography>
                        </Box>
                      }
                    />
                    <CardContent className="product-card-content">
                      <Chip label="CP1" size="small" variant="outlined" sx={{ mb: 1 }} />
                      <Alert severity="warning" size="small" sx={{ mt: 1, py: 0.5 }}>
                        Next deadline: 15 Mar 2024
                      </Alert>
                    </CardContent>
                    <Divider />
                    <Box className="product-card-actions" sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h6">£150.00</Typography>
                        <Button variant="contained" size="small" startIcon={<Add />}>
                          Add
                        </Button>
                      </Box>
                    </Box>
                  </Card>
                </Grid>

                {/* Material Card */}
                <Grid item xs={12} sm={6} md={3}>
                  <Card elevation={2} className="product-card">
                    <CardHeader
                      className="product-card-header material-header"
                      title={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LibraryBooks fontSize="small" />
                          <Typography variant="h6" fontSize="1rem">Study Material</Typography>
                        </Box>
                      }
                    />
                    <CardContent className="product-card-content">
                      <Chip label="CP1" size="small" variant="outlined" sx={{ mb: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        Comprehensive study notes
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        <FormControlLabel
                          control={<Checkbox size="small" />}
                          label="Printed Version"
                          sx={{ fontSize: '0.875rem' }}
                        />
                      </Box>
                    </CardContent>
                    <Divider />
                    <Box className="product-card-actions" sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h6">£99.00</Typography>
                        <Button variant="contained" size="small" startIcon={<Add />}>
                          Add
                        </Button>
                      </Box>
                    </Box>
                  </Card>
                </Grid>

                {/* Online Classroom Card */}
                <Grid item xs={12} sm={6} md={3}>
                  <Card elevation={2} className="product-card">
                    <CardHeader
                      className="product-card-header online-classroom-header"
                      title={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Computer fontSize="small" />
                          <Typography variant="h6" fontSize="1rem">Online Classroom</Typography>
                        </Box>
                      }
                    />
                    <CardContent className="product-card-content">
                      <Chip label="CP1" size="small" variant="outlined" sx={{ mb: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        Live interactive sessions
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Access: 6 months
                      </Typography>
                    </CardContent>
                    <Divider />
                    <Box className="product-card-actions" sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h6">£399.00</Typography>
                        <Button variant="contained" size="small" startIcon={<Add />}>
                          Add
                        </Button>
                      </Box>
                    </Box>
                  </Card>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Buttons Section */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardHeader title="Buttons" />
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="subtitle2" gutterBottom>Contained Buttons</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button variant="contained">Primary</Button>
                    <Button variant="contained" color="secondary">Secondary</Button>
                    <Button variant="contained" color="success">Success</Button>
                    <Button variant="contained" color="warning">Warning</Button>
                    <Button variant="contained" color="error">Error</Button>
                  </Box>
                </Box>

                <Box>
                  <Typography variant="subtitle2" gutterBottom>Outlined Buttons</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button variant="outlined">Primary</Button>
                    <Button variant="outlined" color="secondary">Secondary</Button>
                    <Button variant="outlined" color="success">Success</Button>
                    <Button variant="outlined" color="warning">Warning</Button>
                    <Button variant="outlined" color="error">Error</Button>
                  </Box>
                </Box>

                <Box>
                  <Typography variant="subtitle2" gutterBottom>Text Buttons</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button>Primary</Button>
                    <Button color="secondary">Secondary</Button>
                    <Button color="success">Success</Button>
                    <Button color="warning">Warning</Button>
                    <Button color="error">Error</Button>
                  </Box>
                </Box>

                <Box>
                  <Typography variant="subtitle2" gutterBottom>Button Sizes</Typography>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Button variant="contained" size="small">Small</Button>
                    <Button variant="contained" size="medium">Medium</Button>
                    <Button variant="contained" size="large">Large</Button>
                  </Box>
                </Box>

                <Box>
                  <Typography variant="subtitle2" gutterBottom>Icon Buttons</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button variant="contained" startIcon={<Add />}>Add Item</Button>
                    <Button variant="outlined" startIcon={<Edit />}>Edit</Button>
                    <Button variant="text" startIcon={<Delete />} color="error">Delete</Button>
                    <IconButton color="primary"><Search /></IconButton>
                    <IconButton color="secondary"><Settings /></IconButton>
                    <IconButton color="error"><Delete /></IconButton>
                  </Box>
                </Box>

                <Box>
                  <Typography variant="subtitle2" gutterBottom>Floating Action Buttons</Typography>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Fab color="primary" size="small"><Add /></Fab>
                    <Fab color="secondary"><Edit /></Fab>
                    <Fab variant="extended" color="primary">
                      <Add sx={{ mr: 1 }} />
                      Extended
                    </Fab>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Form Components */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardHeader title="Form Components" />
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <TextField label="Text Field" variant="outlined" fullWidth />
                <TextField label="Required Field" variant="outlined" required fullWidth />
                <TextField 
                  label="Error State" 
                  variant="outlined" 
                  error 
                  helperText="This field has an error"
                  fullWidth 
                />
                
                <Box>
                  <Typography variant="subtitle2" gutterBottom>Checkboxes</Typography>
                  <FormControlLabel control={<Checkbox defaultChecked />} label="Checked" />
                  <FormControlLabel control={<Checkbox />} label="Unchecked" />
                  <FormControlLabel control={<Checkbox indeterminate />} label="Indeterminate" />
                </Box>

                <Box>
                  <Typography variant="subtitle2" gutterBottom>Radio Buttons</Typography>
                  <RadioGroup defaultValue="option1">
                    <FormControlLabel value="option1" control={<Radio />} label="Option 1" />
                    <FormControlLabel value="option2" control={<Radio />} label="Option 2" />
                    <FormControlLabel value="option3" control={<Radio />} label="Option 3" />
                  </RadioGroup>
                </Box>

                <Box>
                  <Typography variant="subtitle2" gutterBottom>Switches</Typography>
                  <FormControlLabel control={<Switch defaultChecked />} label="Enabled" />
                  <FormControlLabel control={<Switch />} label="Disabled" />
                </Box>

                <Box>
                  <Typography variant="subtitle2" gutterBottom>Slider</Typography>
                  <Slider
                    value={sliderValue}
                    onChange={(e, newValue) => setSliderValue(newValue)}
                    valueLabelDisplay="auto"
                    step={10}
                    marks
                    min={0}
                    max={100}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Alerts and Feedback */}
        <Grid item xs={12}>
          <Card elevation={2}>
            <CardHeader title="Alerts & Feedback" />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>Alert Severities</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Alert severity="success" icon={<CheckCircle />}>
                      Success alert - Operation completed successfully!
                    </Alert>
                    <Alert severity="info" icon={<Info />}>
                      Info alert - Here's some helpful information.
                    </Alert>
                    <Alert severity="warning" icon={<Warning />}>
                      Warning alert - Please review before continuing.
                    </Alert>
                    <Alert severity="error" icon={<Error />}>
                      Error alert - Something went wrong.
                    </Alert>
                  </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>Progress Indicators</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <Box>
                      <Typography variant="body2" gutterBottom>Circular Progress</Typography>
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <CircularProgress size={24} />
                        <CircularProgress color="secondary" size={24} />
                        <CircularProgress variant="determinate" value={75} size={24} />
                      </Box>
                    </Box>
                    
                    <Box>
                      <Typography variant="body2" gutterBottom>Linear Progress</Typography>
                      <LinearProgress sx={{ mb: 1 }} />
                      <LinearProgress color="secondary" sx={{ mb: 1 }} />
                      <LinearProgress variant="determinate" value={60} />
                    </Box>

                    <Box>
                      <Typography variant="body2" gutterBottom>Badges</Typography>
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <Badge badgeContent={4} color="primary">
                          <Mail />
                        </Badge>
                        <Badge badgeContent={99} color="secondary">
                          <Notifications />
                        </Badge>
                        <Badge variant="dot" color="error">
                          <Person />
                        </Badge>
                      </Box>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Chips */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardHeader title="Chips" />
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="subtitle2" gutterBottom>Basic Chips</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip label="Default" />
                    <Chip label="Primary" color="primary" />
                    <Chip label="Secondary" color="secondary" />
                    <Chip label="Success" color="success" />
                    <Chip label="Warning" color="warning" />
                    <Chip label="Error" color="error" />
                  </Box>
                </Box>

                <Box>
                  <Typography variant="subtitle2" gutterBottom>Chip Variants</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip label="Filled" variant="filled" color="primary" />
                    <Chip label="Outlined" variant="outlined" color="primary" />
                  </Box>
                </Box>

                <Box>
                  <Typography variant="subtitle2" gutterBottom>Chips with Icons</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip icon={<Star />} label="Starred" color="primary" />
                    <Chip avatar={<Avatar>A</Avatar>} label="Avatar" />
                    <Chip label="Deletable" onDelete={() => {}} color="secondary" />
                  </Box>
                </Box>

                <Box>
                  <Typography variant="subtitle2" gutterBottom>Subject Code Chips</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip label="CP1" size="small" variant="outlined" />
                    <Chip label="CP2" size="small" variant="outlined" />
                    <Chip label="CP3" size="small" variant="outlined" />
                    <Chip label="CB1" size="small" variant="outlined" />
                    <Chip label="CB2" size="small" variant="outlined" />
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Navigation Components */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardHeader title="Navigation" />
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box>
                  <Typography variant="subtitle2" gutterBottom>Tabs</Typography>
                  <Tabs value={tabValue} onChange={handleTabChange}>
                    <Tab label="All Products" />
                    <Tab label="Tutorials" />
                    <Tab label="Materials" />
                    <Tab label="Markings" />
                  </Tabs>
                </Box>

                <Box>
                  <Typography variant="subtitle2" gutterBottom>Breadcrumbs</Typography>
                  <Breadcrumbs>
                    <Link underline="hover" color="inherit" href="#">
                      Home
                    </Link>
                    <Link underline="hover" color="inherit" href="#">
                      Products
                    </Link>
                    <Link underline="hover" color="inherit" href="#">
                      CP1
                    </Link>
                    <Typography color="text.primary">Tutorials</Typography>
                  </Breadcrumbs>
                </Box>

                <Box>
                  <Typography variant="subtitle2" gutterBottom>Menu</Typography>
                  <Button
                    variant="outlined"
                    onClick={handleMenuClick}
                    endIcon={<MoreVert />}
                  >
                    Options
                  </Button>
                  <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={handleMenuClose}
                  >
                    <MenuItem onClick={handleMenuClose}>
                      <Download sx={{ mr: 1 }} />
                      Download
                    </MenuItem>
                    <MenuItem onClick={handleMenuClose}>
                      <Share sx={{ mr: 1 }} />
                      Share
                    </MenuItem>
                    <MenuItem onClick={handleMenuClose}>
                      <Print sx={{ mr: 1 }} />
                      Print
                    </MenuItem>
                  </Menu>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Layout Components */}
        <Grid item xs={12}>
          <Card elevation={2}>
            <CardHeader title="Layout & Data Display" />
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>Lists</Typography>
                  <Paper variant="outlined">
                    <List>
                      <ListItem>
                        <ListItemIcon>
                          <Home />
                        </ListItemIcon>
                        <ListItemText 
                          primary="Dashboard" 
                          secondary="Overview of your account"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon>
                          <ShoppingCart />
                        </ListItemIcon>
                        <ListItemText 
                          primary="Products" 
                          secondary="Browse available courses"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon>
                          <Person />
                        </ListItemIcon>
                        <ListItemText 
                          primary="Account" 
                          secondary="Manage your profile"
                        />
                      </ListItem>
                    </List>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>Accordion</Typography>
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography>Course Information</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body2" color="text.secondary">
                        Detailed information about the course content, duration, and requirements.
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography>Pricing & Payment</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body2" color="text.secondary">
                        Information about course pricing, payment options, and discount policies.
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* App Bar Example */}
        <Grid item xs={12}>
          <Card elevation={2}>
            <CardHeader title="App Bar Example" />
            <CardContent sx={{ p: 0 }}>
              <AppBar position="static" elevation={0}>
                <Toolbar>
                  <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                    Admin3 - Actuarial Education
                  </Typography>
                  <IconButton color="inherit">
                    <Badge badgeContent={3} color="error">
                      <Notifications />
                    </Badge>
                  </IconButton>
                  <IconButton color="inherit">
                    <ShoppingCart />
                  </IconButton>
                  <IconButton color="inherit">
                    <Person />
                  </IconButton>
                </Toolbar>
              </AppBar>
            </CardContent>
          </Card>
        </Grid>

        {/* Spacing & Layout Examples */}
        <Grid item xs={12}>
          <Card elevation={2}>
            <CardHeader title="Spacing & Layout System" />
            <CardContent>
              <Typography variant="body2" gutterBottom sx={{ mb: 3 }}>
                Based on LiftKit CSS golden ratio scaling and Material-UI spacing units.
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>LiftKit Spacing Variables</Typography>
                  <Box sx={{ '& > div': { mb: 1 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ width: 'var(--2xs)', height: 20, backgroundColor: 'primary.main' }} />
                      <Typography variant="body2">--2xs (0.238em)</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ width: 'var(--xs)', height: 20, backgroundColor: 'primary.main' }} />
                      <Typography variant="body2">--xs (0.618em)</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ width: 'var(--sm)', height: 20, backgroundColor: 'primary.main' }} />
                      <Typography variant="body2">--sm (0.786em)</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ width: 'var(--md)', height: 20, backgroundColor: 'primary.main' }} />
                      <Typography variant="body2">--md (1em)</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ width: 'var(--lg)', height: 20, backgroundColor: 'primary.main' }} />
                      <Typography variant="body2">--lg (1.618em)</Typography>
                    </Box>
                  </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>Material-UI Spacing</Typography>
                  <Box sx={{ '& > div': { mb: 1 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ width: 8, height: 20, backgroundColor: 'secondary.main' }} />
                      <Typography variant="body2">spacing(1) = 8px</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ width: 16, height: 20, backgroundColor: 'secondary.main' }} />
                      <Typography variant="body2">spacing(2) = 16px</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ width: 24, height: 20, backgroundColor: 'secondary.main' }} />
                      <Typography variant="body2">spacing(3) = 24px</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ width: 32, height: 20, backgroundColor: 'secondary.main' }} />
                      <Typography variant="body2">spacing(4) = 32px</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ width: 40, height: 20, backgroundColor: 'secondary.main' }} />
                      <Typography variant="body2">spacing(5) = 40px</Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Icons Section */}
        <Grid item xs={12}>
          <Card elevation={2}>
            <CardHeader title="Icon System" />
            <CardContent>
              <Typography variant="body2" gutterBottom sx={{ mb: 3 }}>
                Material-UI icons used throughout the application with product-specific meanings.
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>Product Type Icons</Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 2 }}>
                    <Box sx={{ textAlign: 'center', p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                      <School sx={{ fontSize: 32, color: 'success.main', mb: 1 }} />
                      <Typography variant="caption" display="block">Tutorial</Typography>
                      <Typography variant="caption" color="text.secondary">School</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center', p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                      <LibraryBooks sx={{ fontSize: 32, color: 'primary.main', mb: 1 }} />
                      <Typography variant="caption" display="block">Material</Typography>
                      <Typography variant="caption" color="text.secondary">LibraryBooks</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center', p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                      <Rule sx={{ fontSize: 32, color: 'warning.main', mb: 1 }} />
                      <Typography variant="caption" display="block">Marking</Typography>
                      <Typography variant="caption" color="text.secondary">Rule</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center', p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                      <Computer sx={{ fontSize: 32, color: 'secondary.main', mb: 1 }} />
                      <Typography variant="caption" display="block">Online Class</Typography>
                      <Typography variant="caption" color="text.secondary">Computer</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center', p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                      <LocalActivity sx={{ fontSize: 32, color: 'warning.main', mb: 1 }} />
                      <Typography variant="caption" display="block">Voucher</Typography>
                      <Typography variant="caption" color="text.secondary">LocalActivity</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center', p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                      <Inventory2 sx={{ fontSize: 32, color: 'info.main', mb: 1 }} />
                      <Typography variant="caption" display="block">Bundle</Typography>
                      <Typography variant="caption" color="text.secondary">Inventory2</Typography>
                    </Box>
                  </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>Common Action Icons</Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 2 }}>
                    <Box sx={{ textAlign: 'center', p: 1 }}>
                      <Add sx={{ fontSize: 24, mb: 0.5 }} />
                      <Typography variant="caption" display="block">Add</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center', p: 1 }}>
                      <Edit sx={{ fontSize: 24, mb: 0.5 }} />
                      <Typography variant="caption" display="block">Edit</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center', p: 1 }}>
                      <Delete sx={{ fontSize: 24, mb: 0.5 }} />
                      <Typography variant="caption" display="block">Delete</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center', p: 1 }}>
                      <Search sx={{ fontSize: 24, mb: 0.5 }} />
                      <Typography variant="caption" display="block">Search</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center', p: 1 }}>
                      <Settings sx={{ fontSize: 24, mb: 0.5 }} />
                      <Typography variant="caption" display="block">Settings</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center', p: 1 }}>
                      <CalendarToday sx={{ fontSize: 24, mb: 0.5 }} />
                      <Typography variant="caption" display="block">Calendar</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center', p: 1 }}>
                      <ShoppingCart sx={{ fontSize: 24, mb: 0.5 }} />
                      <Typography variant="caption" display="block">Cart</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center', p: 1 }}>
                      <Person sx={{ fontSize: 24, mb: 0.5 }} />
                      <Typography variant="caption" display="block">User</Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Usage Guidelines */}
        <Grid item xs={12}>
          <Card elevation={2}>
            <CardHeader title="Usage Guidelines" />
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>Design Principles</Typography>
                  <Box component="ul" sx={{ pl: 2 }}>
                    <li>
                      <Typography variant="body2" gutterBottom>
                        <strong>Consistency:</strong> Use the same components and patterns across the application
                      </Typography>
                    </li>
                    <li>
                      <Typography variant="body2" gutterBottom>
                        <strong>Accessibility:</strong> Ensure all components meet WCAG 2.1 AA standards
                      </Typography>
                    </li>
                    <li>
                      <Typography variant="body2" gutterBottom>
                        <strong>Responsiveness:</strong> Design for mobile-first with progressive enhancement
                      </Typography>
                    </li>
                    <li>
                      <Typography variant="body2" gutterBottom>
                        <strong>Performance:</strong> Minimize component complexity and bundle size
                      </Typography>
                    </li>
                  </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>Implementation Notes</Typography>
                  <Box component="ul" sx={{ pl: 2 }}>
                    <li>
                      <Typography variant="body2" gutterBottom>
                        <strong>CSS Classes:</strong> Use LiftKit CSS classes for typography and spacing
                      </Typography>
                    </li>
                    <li>
                      <Typography variant="body2" gutterBottom>
                        <strong>Material-UI:</strong> Prefer Material-UI components for interactive elements
                      </Typography>
                    </li>
                    <li>
                      <Typography variant="body2" gutterBottom>
                        <strong>Product Cards:</strong> Use specific header classes for product type identification
                      </Typography>
                    </li>
                    <li>
                      <Typography variant="body2" gutterBottom>
                        <strong>Icons:</strong> Use semantic icons that clearly represent their function
                      </Typography>
                    </li>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Sample Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Example Dialog</DialogTitle>
        <DialogContent>
          <Typography>
            This is an example dialog demonstrating the modal component styling.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={() => setDialogOpen(false)} variant="contained">Confirm</Button>
        </DialogActions>
      </Dialog>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        onClick={() => setDialogOpen(true)}
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
      >
        <Add />
      </Fab>

      {/* Footer */}
      <Box sx={{ mt: 6, py: 3, borderTop: '1px solid', borderColor: 'divider' }}>
        <Typography variant="body2" color="text.secondary" align="center">
          Admin3 Style Guide • Built with Material-UI and LiftKit CSS • 
          For Actuarial Education Online Store
        </Typography>
      </Box>
    </Container>
  );
};

export default StyleGuide;