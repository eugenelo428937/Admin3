import React from 'react';
import { Box, Alert } from '@mui/material';

interface MjmlPreviewPaneProps {
    html: string;
    error: string | null;
}

const MjmlPreviewPane: React.FC<MjmlPreviewPaneProps> = ({ html, error }) => {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {error && (
                <Alert severity="error" sx={{ mb: 1 }}>
                    {error}
                </Alert>
            )}
            <Box
                sx={{
                    flexGrow: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    overflow: 'hidden',
                    minHeight: 500,
                    backgroundColor: '#fff',
                }}
            >
                <iframe
                    title="MJML Preview"
                    srcDoc={html || '<p style="color:#999;text-align:center;padding:2rem;">No preview available</p>'}
                    sandbox="allow-same-origin allow-scripts"
                    style={{
                        width: '100%',
                        height: '100%',
                        minHeight: 500,
                        border: 'none',
                    }}
                />
            </Box>
        </Box>
    );
};

export default MjmlPreviewPane;
