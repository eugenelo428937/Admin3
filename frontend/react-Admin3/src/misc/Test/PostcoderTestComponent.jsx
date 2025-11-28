/**
 * Postcoder Address Lookup Test Component
 *
 * Manual testing component for the Postcoder.com address lookup integration.
 * Use this to verify the endpoint works correctly from the React frontend.
 */

import React, { useState } from 'react';
import {
    Box,
    Button,
    TextField,
    Paper,
    Typography,
    CircularProgress,
    Alert,
    Chip,
    Divider,
    List,
    ListItem,
    ListItemText,
    Grid,
} from '@mui/material';
import {
    Search as SearchIcon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    Speed as SpeedIcon,
    Cached as CachedIcon,
} from '@mui/icons-material';

const PostcoderTestComponent = () => {
    const [postcode, setPostcode] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const handleLookup = async () => {
        if (!postcode.trim()) {
            setError('Please enter a postcode');
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await fetch(
                `/api/utils/postcoder-address-lookup/?postcode=${encodeURIComponent(postcode)}`
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Lookup failed');
            }

            const data = await response.json();
            setResult(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleLookup();
        }
    };

    // Test postcodes for quick testing
    const testPostcodes = [
        { code: 'SW1A1AA', label: 'Downing Street' },
        { code: 'EC1A1BB', label: 'Bank of England' },
        { code: 'OX49EL', label: 'Oxford' },
        { code: 'M13NQ', label: 'Manchester' },
    ];

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
            <Paper elevation={3} sx={{ p: 3 }}>
                <Typography variant="h5" gutterBottom>
                    Postcoder.com Address Lookup Test
                </Typography>

                <Typography variant="body2" color="text.secondary" paragraph>
                    Test the Postcoder address lookup integration. First request will be cache miss,
                    subsequent requests for the same postcode will be cache hits.
                </Typography>

                <Divider sx={{ my: 2 }} />

                {/* Input Section */}
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={8}>
                        <TextField
                            fullWidth
                            label="UK Postcode"
                            value={postcode}
                            onChange={(e) => setPostcode(e.target.value.toUpperCase())}
                            onKeyPress={handleKeyPress}
                            placeholder="e.g., SW1A1AA"
                            disabled={loading}
                            variant="outlined"
                        />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <Button
                            fullWidth
                            variant="contained"
                            color="primary"
                            onClick={handleLookup}
                            disabled={loading}
                            startIcon={loading ? <CircularProgress size={20} /> : <SearchIcon />}
                        >
                            {loading ? 'Looking up...' : 'Lookup'}
                        </Button>
                    </Grid>
                </Grid>

                {/* Quick Test Buttons */}
                <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                        Quick Test:
                    </Typography>
                    <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {testPostcodes.map(({ code, label }) => (
                            <Chip
                                key={code}
                                label={`${code} (${label})`}
                                onClick={() => setPostcode(code)}
                                size="small"
                                variant="outlined"
                            />
                        ))}
                    </Box>
                </Box>

                <Divider sx={{ my: 3 }} />

                {/* Error Display */}
                {error && (
                    <Alert severity="error" icon={<ErrorIcon />} sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {/* Results Display */}
                {result && (
                    <Box>
                        {/* Stats Row */}
                        <Grid container spacing={2} sx={{ mb: 2 }}>
                            <Grid item xs={6} sm={3}>
                                <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
                                    {result.cache_hit ? (
                                        <CachedIcon color="success" />
                                    ) : (
                                        <CheckCircleIcon color="primary" />
                                    )}
                                    <Typography variant="caption" display="block">
                                        {result.cache_hit ? 'Cache Hit' : 'Cache Miss'}
                                    </Typography>
                                </Paper>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                                <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
                                    <SpeedIcon color="action" />
                                    <Typography variant="caption" display="block">
                                        {result.response_time_ms}ms
                                    </Typography>
                                </Paper>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                                <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
                                    <Typography variant="h6" color="primary">
                                        {result.addresses?.length || 0}
                                    </Typography>
                                    <Typography variant="caption" display="block">
                                        Addresses
                                    </Typography>
                                </Paper>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                                <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
                                    <Typography variant="body2" color="text.secondary">
                                        Postcoder
                                    </Typography>
                                    <Typography variant="caption" display="block">
                                        Provider
                                    </Typography>
                                </Paper>
                            </Grid>
                        </Grid>

                        {/* Addresses List */}
                        {result.addresses && result.addresses.length > 0 ? (
                            <Box>
                                <Typography variant="h6" gutterBottom>
                                    Addresses Found:
                                </Typography>
                                <List>
                                    {result.addresses.map((address, index) => (
                                        <ListItem
                                            key={index}
                                            sx={{
                                                bgcolor: 'background.default',
                                                mb: 1,
                                                borderRadius: 1,
                                            }}
                                        >
                                            <ListItemText
                                                primary={address.formatted_address?.join(', ')}
                                                secondary={
                                                    <>
                                                        {address.line_1}
                                                        {address.line_2 && `, ${address.line_2}`}
                                                        {address.line_3 && `, ${address.line_3}`}
                                                        <br />
                                                        {address.town_or_city}
                                                        {address.county && `, ${address.county}`}
                                                        <br />
                                                        <strong>{address.postcode}</strong>
                                                    </>
                                                }
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            </Box>
                        ) : (
                            <Alert severity="info">
                                No addresses found for this postcode.
                            </Alert>
                        )}
                    </Box>
                )}

                <Divider sx={{ my: 3 }} />

                {/* Instructions */}
                <Box sx={{ bgcolor: 'background.default', p: 2, borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
                        Testing Instructions:
                    </Typography>
                    <Typography variant="body2" component="div">
                        <ol>
                            <li>Enter a UK postcode or click a quick test button</li>
                            <li>First lookup will show "Cache Miss" (calls Postcoder API)</li>
                            <li>Lookup the same postcode again - should show "Cache Hit" (faster, from database)</li>
                            <li>Cache entries expire after 7 days</li>
                            <li>Check browser console for detailed logs</li>
                        </ol>
                    </Typography>
                </Box>
            </Paper>
        </Box>
    );
};

export default PostcoderTestComponent;
