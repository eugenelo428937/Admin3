import React, { useEffect, useState } from 'react';
import {
    Container,
    Paper,
    Typography,
    Box,
    CircularProgress,
    Alert,
    Chip,
    Button,
    Collapse,
    List,
    ListItem,
    ListItemText,
    Divider,
    IconButton,
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useNavigate, Link } from 'react-router-dom';
import { useEmailQueueDetailVM } from './useEmailQueueDetailVM';
import type { QueueStatus } from '../../../../types/email';

const STATUS_CHIP_COLOR: Record<QueueStatus, 'default' | 'info' | 'success' | 'error' | 'warning' | 'secondary'> = {
    pending: 'default',
    processing: 'info',
    sent: 'success',
    failed: 'error',
    cancelled: 'warning',
    retry: 'secondary',
};

const formatDateTime = (dateString: string | null): string => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
};

const EmailQueueDetail: React.FC = () => {
    const navigate = useNavigate();
    const vm = useEmailQueueDetailVM();

    const [showErrorDetails, setShowErrorDetails] = useState(false);
    const [showHtmlPreview, setShowHtmlPreview] = useState(false);
    const [showContext, setShowContext] = useState(false);

    useEffect(() => {
        vm.fetchDetail();
    }, [vm.fetchDetail]);

    if (vm.loading) {
        return (
            <Box sx={{ textAlign: 'center', mt: 5 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (vm.error) {
        return (
            <Container sx={{ mt: 4 }}>
                <Alert severity="error">{vm.error}</Alert>
                <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={() => navigate('/admin/email/queue')}
                    sx={{ mt: 2 }}
                >
                    Back to Queue
                </Button>
            </Container>
        );
    }

    if (!vm.queueItem) {
        return (
            <Container sx={{ mt: 4 }}>
                <Alert severity="warning">Queue item not found.</Alert>
                <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={() => navigate('/admin/email/queue')}
                    sx={{ mt: 2 }}
                >
                    Back to Queue
                </Button>
            </Container>
        );
    }

    const item = vm.queueItem;

    return (
        <Container sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
                <IconButton onClick={() => navigate('/admin/email/queue')}>
                    <ArrowBackIcon />
                </IconButton>
                <Typography variant="h4" component="h2">
                    Queue Item Detail
                </Typography>
                <Chip
                    label={item.status}
                    color={STATUS_CHIP_COLOR[item.status]}
                    sx={{ ml: 1 }}
                />
            </Box>

            {/* Section 1: Recipients */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Recipients
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                    <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                            To
                        </Typography>
                        <List dense disablePadding>
                            {item.to_emails.length > 0 ? (
                                item.to_emails.map((email, index) => (
                                    <ListItem key={index} disablePadding sx={{ py: 0.25 }}>
                                        <ListItemText primary={email} primaryTypographyProps={{ variant: 'body2' }} />
                                    </ListItem>
                                ))
                            ) : (
                                <Typography variant="body2" color="text.secondary">-</Typography>
                            )}
                        </List>
                    </Box>
                    <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                            CC
                        </Typography>
                        <List dense disablePadding>
                            {item.cc_emails.length > 0 ? (
                                item.cc_emails.map((email, index) => (
                                    <ListItem key={index} disablePadding sx={{ py: 0.25 }}>
                                        <ListItemText primary={email} primaryTypographyProps={{ variant: 'body2' }} />
                                    </ListItem>
                                ))
                            ) : (
                                <Typography variant="body2" color="text.secondary">-</Typography>
                            )}
                        </List>
                    </Box>
                    <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                            BCC
                        </Typography>
                        <List dense disablePadding>
                            {item.bcc_emails.length > 0 ? (
                                item.bcc_emails.map((email, index) => (
                                    <ListItem key={index} disablePadding sx={{ py: 0.25 }}>
                                        <ListItemText primary={email} primaryTypographyProps={{ variant: 'body2' }} />
                                    </ListItem>
                                ))
                            ) : (
                                <Typography variant="body2" color="text.secondary">-</Typography>
                            )}
                        </List>
                    </Box>
                    <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                            From
                        </Typography>
                        <Typography variant="body2">{item.from_email || '-'}</Typography>
                    </Box>
                    <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                            Reply-To
                        </Typography>
                        <Typography variant="body2">{item.reply_to_email || '-'}</Typography>
                    </Box>
                </Box>
            </Paper>

            {/* Section 2: Content */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Content
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
                    <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                            Subject
                        </Typography>
                        <Typography variant="body2">{item.subject || '-'}</Typography>
                    </Box>
                    <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                            Template
                        </Typography>
                        <Typography variant="body2">{item.template_name || '-'}</Typography>
                    </Box>
                    <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                            Priority
                        </Typography>
                        <Chip label={item.priority} size="small" variant="outlined" />
                    </Box>
                </Box>
            </Paper>

            {/* Section 3: Status */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Status
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
                    <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                            Status
                        </Typography>
                        <Chip
                            label={item.status}
                            color={STATUS_CHIP_COLOR[item.status]}
                            size="small"
                        />
                    </Box>
                    <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                            Attempts
                        </Typography>
                        <Typography variant="body2">
                            {item.attempts} / {item.max_attempts}
                        </Typography>
                    </Box>
                    <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                            Scheduled At
                        </Typography>
                        <Typography variant="body2">{formatDateTime(item.scheduled_at)}</Typography>
                    </Box>
                    <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                            Sent At
                        </Typography>
                        <Typography variant="body2">{formatDateTime(item.sent_at)}</Typography>
                    </Box>
                    <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                            Last Attempt At
                        </Typography>
                        <Typography variant="body2">{formatDateTime(item.last_attempt_at)}</Typography>
                    </Box>
                    <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                            Next Retry At
                        </Typography>
                        <Typography variant="body2">{formatDateTime(item.next_retry_at)}</Typography>
                    </Box>
                </Box>
            </Paper>

            {/* Section 4: Errors (conditional) */}
            {item.error_message && (
                <Paper sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" gutterBottom color="error">
                        Errors
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                            Error Message
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 2, color: 'error.main' }}>
                            {item.error_message}
                        </Typography>
                    </Box>
                    {item.error_details && Object.keys(item.error_details).length > 0 && (
                        <Box>
                            <Button
                                size="small"
                                onClick={() => setShowErrorDetails(!showErrorDetails)}
                                endIcon={showErrorDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            >
                                Error Details
                            </Button>
                            <Collapse in={showErrorDetails}>
                                <Box
                                    component="pre"
                                    sx={{
                                        mt: 1,
                                        p: 2,
                                        bgcolor: 'grey.100',
                                        borderRadius: 1,
                                        overflow: 'auto',
                                        maxHeight: 300,
                                        fontSize: '0.75rem',
                                        fontFamily: 'monospace',
                                    }}
                                >
                                    {JSON.stringify(item.error_details, null, 2)}
                                </Box>
                            </Collapse>
                        </Box>
                    )}
                </Paper>
            )}

            {/* Section 5: HTML Preview */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="h6">
                        HTML Preview
                    </Typography>
                    <Button
                        size="small"
                        onClick={() => setShowHtmlPreview(!showHtmlPreview)}
                        endIcon={showHtmlPreview ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    >
                        {showHtmlPreview ? 'Hide' : 'Show'}
                    </Button>
                </Box>
                <Collapse in={showHtmlPreview}>
                    <Divider sx={{ my: 2 }} />
                    {item.html_content ? (
                        <Box
                            sx={{
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1,
                                overflow: 'hidden',
                            }}
                        >
                            <iframe
                                srcDoc={item.html_content}
                                title="Email HTML Preview"
                                style={{
                                    width: '100%',
                                    minHeight: 400,
                                    border: 'none',
                                }}
                                sandbox="allow-same-origin allow-scripts"
                            />
                        </Box>
                    ) : (
                        <Typography variant="body2" color="text.secondary">
                            No HTML content available.
                        </Typography>
                    )}
                </Collapse>
            </Paper>

            {/* Section 6: Context */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="h6">
                        Email Context
                    </Typography>
                    <Button
                        size="small"
                        onClick={() => setShowContext(!showContext)}
                        endIcon={showContext ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    >
                        {showContext ? 'Hide' : 'Show'}
                    </Button>
                </Box>
                <Collapse in={showContext}>
                    <Divider sx={{ my: 2 }} />
                    {item.email_context && Object.keys(item.email_context).length > 0 ? (
                        <Box
                            component="pre"
                            sx={{
                                p: 2,
                                bgcolor: 'grey.100',
                                borderRadius: 1,
                                overflow: 'auto',
                                maxHeight: 400,
                                fontSize: '0.75rem',
                                fontFamily: 'monospace',
                            }}
                        >
                            {JSON.stringify(item.email_context, null, 2)}
                        </Box>
                    ) : (
                        <Typography variant="body2" color="text.secondary">
                            No context data available.
                        </Typography>
                    )}
                </Collapse>
            </Paper>

            {/* Duplicated From Link */}
            {item.duplicated_from && (
                <Paper sx={{ p: 3, mb: 3 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                        Duplicated From
                    </Typography>
                    <Button
                        component={Link}
                        to={`/admin/email/queue/${item.duplicated_from}`}
                        variant="text"
                        size="small"
                    >
                        View Original (ID: {item.duplicated_from})
                    </Button>
                </Paper>
            )}

            {/* Back Button */}
            <Box sx={{ mt: 3 }}>
                <Button
                    variant="outlined"
                    startIcon={<ArrowBackIcon />}
                    onClick={() => navigate('/admin/email/queue')}
                >
                    Back to Queue
                </Button>
            </Box>
        </Container>
    );
};

export default EmailQueueDetail;
