import React from 'react';
import { Box, Typography, Avatar, Paper } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { LibraryBooksSharp } from '@mui/icons-material';

const ThemeTest = () => {
    const theme = useTheme();
    
    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
                Theme Debug Test Component
            </Typography>
            
            {/* Test md3.onPrimary directly */}
            <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                    Direct theme.palette.md3.onPrimary test:
                </Typography>
                <Avatar 
                    sx={{ 
                        backgroundColor: theme.palette.md3.onPrimary,
                        color: theme.palette.md3.primary,
                        mb: 1
                    }}
                >
                    <LibraryBooksSharp />
                </Avatar>
                <Typography variant="body2">
                    Expected: White background ({theme.palette.md3.onPrimary})
                </Typography>
            </Paper>

            {/* Test other theme values */}
            <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                    Other MD3 Colors:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Box 
                        sx={{ 
                            width: 40, 
                            height: 40, 
                            backgroundColor: theme.palette.md3.primary,
                            border: '1px solid #ccc'
                        }} 
                        title={`Primary: ${theme.palette.md3.primary}`}
                    />
                    <Box 
                        sx={{ 
                            width: 40, 
                            height: 40, 
                            backgroundColor: theme.palette.md3.secondary,
                            border: '1px solid #ccc'
                        }} 
                        title={`Secondary: ${theme.palette.md3.secondary}`}
                    />
                    <Box 
                        sx={{ 
                            width: 40, 
                            height: 40, 
                            backgroundColor: theme.palette.md3.background,
                            border: '1px solid #ccc'
                        }} 
                        title={`Background: ${theme.palette.md3.background}`}
                    />
                </Box>
            </Paper>

            {/* JSON dump for debugging */}
            <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                    Full MD3 Palette:
                </Typography>
                <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                    {JSON.stringify(theme.palette.md3, null, 2)}
                </pre>
            </Paper>
        </Box>
    );
};

export default ThemeTest;