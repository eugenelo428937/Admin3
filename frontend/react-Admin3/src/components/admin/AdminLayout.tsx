import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Box, Drawer, useMediaQuery, useTheme } from '@mui/material';
import { useAuth } from '../../hooks/useAuth';
import AdminSidebar from './AdminSidebar';

const SIDEBAR_WIDTH = 240;

const AdminLayout: React.FC = () => {
    const { isSuperuser, isLoading } = useAuth() as any;
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    if (isLoading) return null;
    if (!isSuperuser) return <Navigate to="/" replace />;

    return (
        <Box sx={{ display: 'flex', minHeight: 'calc(100vh - 200px)' }}>
            {!isMobile && (
                <Drawer
                    variant="permanent"
                    sx={{
                        width: SIDEBAR_WIDTH,
                        flexShrink: 0,
                        '& .MuiDrawer-paper': {
                            width: SIDEBAR_WIDTH,
                            boxSizing: 'border-box',
                            position: 'relative',
                            height: '100%',
                            borderRight: '1px solid',
                            borderColor: 'divider',
                        },
                    }}
                >
                    <AdminSidebar />
                </Drawer>
            )}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: { xs: 1, md: 3 },
                    width: { xs: '100%', md: `calc(100% - ${SIDEBAR_WIDTH}px)` },
                }}
            >
                <Outlet />
            </Box>
        </Box>
    );
};

export default AdminLayout;
