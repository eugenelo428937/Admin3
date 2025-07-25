import React from 'react';
import { Box, Typography, Chip } from '@mui/material';

const FilterDebugger = ({ 
    urlFilters, 
    panelFilters, 
    navbarFilters, 
    finalParams 
}) => {
    if (process.env.NODE_ENV !== 'development') {
        return null;
    }

    return (
        <Box sx={{ 
            p: 2, 
            mb: 2, 
            backgroundColor: '#f5f5f5', 
            borderRadius: 1,
            fontSize: '0.875rem'
        }}>
            <Typography variant="h6" gutterBottom>
                🔍 Filter Debug (Development Only)
            </Typography>
            
            <Box sx={{ mb: 1 }}>
                <Typography variant="subtitle2">URL Filters:</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                    {Object.entries(urlFilters || {}).map(([key, value]) => (
                        value && (
                            <Chip
                                key={key}
                                label={`${key}: ${value}`}
                                size="small"
                                color="primary"
                                variant="outlined"
                            />
                        )
                    ))}
                </Box>
            </Box>

            <Box sx={{ mb: 1 }}>
                <Typography variant="subtitle2">Panel Filters:</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                    {Object.entries(panelFilters || {}).map(([key, values]) => (
                        values?.length > 0 && (
                            <Chip
                                key={key}
                                label={`${key}: [${values.join(', ')}]`}
                                size="small"
                                color="secondary"
                                variant="outlined"
                            />
                        )
                    ))}
                </Box>
            </Box>

            <Box sx={{ mb: 1 }}>
                <Typography variant="subtitle2">Navbar Filters:</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                    {Object.entries(navbarFilters || {}).map(([key, value]) => (
                        value && (
                            <Chip
                                key={key}
                                label={`${key}: ${value}`}
                                size="small"
                                color="warning"
                                variant="outlined"
                            />
                        )
                    ))}
                </Box>
            </Box>

            <Box>
                <Typography variant="subtitle2">Final API Params:</Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', mt: 0.5 }}>
                    {finalParams || 'No params'}
                </Typography>
            </Box>
        </Box>
    );
};

export default FilterDebugger;