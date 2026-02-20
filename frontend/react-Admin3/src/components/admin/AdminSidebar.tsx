import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Collapse,
    Divider,
    Box,
    Typography,
} from '@mui/material';
import {
    ExpandLess,
    ExpandMore,
    School as SchoolIcon,
    CalendarMonth as CalendarIcon,
    Inventory as InventoryIcon,
    Store as StoreIcon,
    PriceChange as PriceIcon,
    Redeem as BundleIcon,
    Email as EmailIcon,
    Settings as SettingsIcon,
    Description as TemplateIcon,
    Queue as QueueIcon,
    AttachFile as AttachmentIcon,
    Rule as RuleIcon,
    Code as PlaceholderIcon,
    People as PeopleIcon,
    Badge as StaffIcon,
    Tune as SetupIcon,
    Category as CategoryIcon,
    Link as LinkIcon,
    ViewModule as VariationIcon,
    Recommend as RecommendIcon,
    Create as SalutationIcon,
} from '@mui/icons-material';

interface NavItem {
    label: string;
    path: string;
    icon: React.ReactNode;
}

interface NavGroup {
    label: string;
    icon: React.ReactNode;
    items: NavItem[];
}

const navGroups: NavGroup[] = [
    {
        label: 'Catalog',
        icon: <SchoolIcon />,
        items: [
            { label: 'Subjects', path: '/admin/subjects', icon: <SchoolIcon fontSize="small" /> },
            { label: 'Exam Sessions', path: '/admin/exam-sessions', icon: <CalendarIcon fontSize="small" /> },
            { label: 'Products', path: '/admin/products', icon: <InventoryIcon fontSize="small" /> },
            { label: 'ESS Links', path: '/admin/exam-session-subjects', icon: <LinkIcon fontSize="small" /> },
            { label: 'Variations', path: '/admin/product-variations', icon: <VariationIcon fontSize="small" /> },
            { label: 'Product Bundles', path: '/admin/product-bundles', icon: <BundleIcon fontSize="small" /> },
        ],
    },
    {
        label: 'Store',
        icon: <StoreIcon />,
        items: [
            { label: 'Store Products', path: '/admin/store-products', icon: <StoreIcon fontSize="small" /> },
            { label: 'Prices', path: '/admin/prices', icon: <PriceIcon fontSize="small" /> },
            { label: 'Store Bundles', path: '/admin/store-bundles', icon: <BundleIcon fontSize="small" /> },
            { label: 'Recommendations', path: '/admin/recommendations', icon: <RecommendIcon fontSize="small" /> },
        ],
    },
    {
        label: 'Email System',
        icon: <EmailIcon />,
        items: [
            { label: 'Settings', path: '/admin/email/settings', icon: <SettingsIcon fontSize="small" /> },
            { label: 'Templates', path: '/admin/email/templates', icon: <TemplateIcon fontSize="small" /> },
            { label: 'Queue', path: '/admin/email/queue', icon: <QueueIcon fontSize="small" /> },
            { label: 'Attachments', path: '/admin/email/attachments', icon: <AttachmentIcon fontSize="small" /> },
            { label: 'Content Rules', path: '/admin/email/content-rules', icon: <RuleIcon fontSize="small" /> },
            { label: 'Placeholders', path: '/admin/email/placeholders', icon: <PlaceholderIcon fontSize="small" /> },
            { label: 'Salutations', path: '/admin/email/closing-salutations', icon: <SalutationIcon fontSize="small" /> },
        ],
    },
    {
        label: 'Users',
        icon: <PeopleIcon />,
        items: [
            { label: 'User Profiles', path: '/admin/user-profiles', icon: <PeopleIcon fontSize="small" /> },
            { label: 'Staff', path: '/admin/staff', icon: <StaffIcon fontSize="small" /> },
        ],
    },
    {
        label: 'Setup',
        icon: <SetupIcon />,
        items: [
            { label: 'New Session Setup', path: '/admin/new-session-setup', icon: <SetupIcon fontSize="small" /> },
        ],
    },
];

const AdminSidebar: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();

    // Initialize open groups based on current path
    const getInitialOpenGroups = (): Record<string, boolean> => {
        const openGroups: Record<string, boolean> = {};
        navGroups.forEach((group) => {
            const isActive = group.items.some((item) =>
                location.pathname.startsWith(item.path)
            );
            openGroups[group.label] = isActive;
        });
        return openGroups;
    };

    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(getInitialOpenGroups);

    const handleToggleGroup = (label: string) => {
        setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
    };

    const isItemActive = (path: string): boolean => {
        return location.pathname === path || location.pathname.startsWith(path + '/');
    };

    return (
        <Box sx={{ width: '100%', py: 1 }}>
            <Box sx={{ px: 2, py: 1.5 }}>
                <Typography variant="subtitle2" color="text.secondary" fontWeight={600}>
                    Admin Panel
                </Typography>
            </Box>
            <Divider />
            <List component="nav" disablePadding>
                {navGroups.map((group) => (
                    <React.Fragment key={group.label}>
                        <ListItemButton
                            onClick={() => handleToggleGroup(group.label)}
                            sx={{ py: 0.75 }}
                        >
                            <ListItemIcon sx={{ minWidth: 36 }}>
                                {group.icon}
                            </ListItemIcon>
                            <ListItemText
                                primary={group.label}
                                primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
                            />
                            {openGroups[group.label] ? <ExpandLess /> : <ExpandMore />}
                        </ListItemButton>
                        <Collapse in={openGroups[group.label]} timeout="auto" unmountOnExit>
                            <List component="div" disablePadding>
                                {group.items.map((item) => (
                                    <ListItemButton
                                        key={item.path}
                                        onClick={() => navigate(item.path)}
                                        selected={isItemActive(item.path)}
                                        sx={{ pl: 4, py: 0.5 }}
                                    >
                                        <ListItemIcon sx={{ minWidth: 28 }}>
                                            {item.icon}
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={item.label}
                                            primaryTypographyProps={{ fontSize: '0.8125rem' }}
                                        />
                                    </ListItemButton>
                                ))}
                            </List>
                        </Collapse>
                    </React.Fragment>
                ))}
            </List>
        </Box>
    );
};

export default AdminSidebar;
