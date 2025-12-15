/**
 * RulesEngineInlineAlert Component
 *
 * Displays rules engine messages with collapsible content.
 * Shows title and first line by default, with "see more" to expand full content.
 *
 * Supports multiple message formats:
 * - Format 1: { title, message, variant, template_id } (ProductList)
 * - Format 2: { message_type, content: { title, message }, template_id } (CartReviewStep)
 * - Format 3: { parsed: { title, message, variant } } (Home page rules engine)
 *
 * @param {Array} messages - Array of message objects
 * @param {boolean} loading - Loading state indicator
 * @param {string} loadingMessage - Custom loading message text
 * @param {Function} onDismiss - Optional callback when alert is dismissed
 * @param {boolean} fullWidth - If true, alert container takes full width (default: false)
 * @param {string} width - Custom width for the alert (e.g., '400px', '50%', '30rem')
 * @param {boolean} float - If true, enables floating positioning (default: false)
 * @param {string} floatPosition - Position when floating: 'left', 'right', 'center' (default: 'left')
 * @param {boolean} showMoreLess - If true, shows collapsible expand/collapse functionality (default: true)
 */

import React, { useState } from 'react';
import {
    Alert,
    Box,
    Container,
    IconButton,
    Collapse,
    Typography,
    CircularProgress
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

const RulesEngineInlineAlert = ({
    messages = [],
    loading = false,
    loadingMessage = 'Loading information...',
    onDismiss,
    fullWidth = false,
    width = null,
    float = false,
    floatPosition = 'left',
    showMoreLess = true
}) => {
    // Track expanded state for each message by index
    const [expandedMessages, setExpandedMessages] = useState({});

    /**
     * Toggle expand/collapse for a specific message
     */
    const handleToggleExpand = (index) => {
        setExpandedMessages(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    /**
     * Extract first line of message content for preview
     */
    const getFirstLine = (htmlContent) => {
        if (!htmlContent) return '';

        // Strip HTML tags and get first sentence or 200 characters
        const textContent = htmlContent.replace(/<[^>]*>/g, ' ').trim();
        const firstSentence = textContent.split(/[.!?]/)[0];

        if (firstSentence.length > 200) {
            return firstSentence.substring(0, 200) + '...';
        }

        return firstSentence + (textContent.length > firstSentence.length ? '...' : '');
    };

    /**
     * Normalize message format to handle ProductList, CartReviewStep, and Home page formats
     */
    const normalizeMessage = (message) => {
        // Format 1: { title, message, variant } (ProductList)
        if (message.title && message.message) {
            return {
                title: message.title,
                message: message.message,
                variant: message.variant,
                template_id: message.template_id,
                dismissible: message.dismissible
            };
        }

        // Format 2: { message_type, content: { title, message } } (CartReviewStep)
        if (message.message_type && message.content) {
            return {
                title: message.content?.title || 'Notice',
                message: message.content?.message || message.content,
                variant: message.message_type,
                template_id: message.template_id,
                dismissible: message.dismissible
            };
        }

        // Format 3: { parsed: { title, message, variant } } (Home page rules engine)
        if (message.parsed) {
            const parsed = message.parsed;
            return {
                title: parsed.title || 'Notice',
                message: parsed.message || 'No message content',
                variant: parsed.variant,
                template_id: message.template_id,
                dismissible: parsed.dismissible
            };
        }

        // Fallback for unknown formats
        return {
            title: 'Notice',
            message: typeof message === 'string' ? message : JSON.stringify(message),
            variant: 'info',
            template_id: null,
            dismissible: true
        };
    };

    /**
     * Determine Material-UI Alert severity from message variant
     */
    const getSeverity = (variant) => {
        const severityMap = {
            'warning': 'warning',
            'error': 'error',
            'info': 'info',
            'success': 'success'
        };
        return severityMap[variant] || 'info';
    };

    /**
     * Compute container styles based on props
     */
    const getContainerStyles = () => {
        const styles = {};

        // Width handling
        if (fullWidth) {
            styles.width = '100%';
        } else if (width) {
            styles.width = width;
        }

        // Float handling
        if (float) {
            switch (floatPosition) {
                case 'right':
                    styles.float = 'right';
                    break;
                case 'center':
                    styles.marginLeft = 'auto';
                    styles.marginRight = 'auto';
                    break;
                case 'left':
                default:
                    styles.float = 'left';
                    break;
            }
        }

        return styles;
    };

    /**
     * Compute alert styles based on props
     */
    const getAlertStyles = () => {
        const styles = {
            mb: 2,
            alignItems: 'start',
            justifyContent: 'start'
        };

        // Width handling for alert
        if (fullWidth) {
            styles.width = '100%';
        } else if (width) {
            styles.width = width;
        }

        return styles;
    };

    const containerStyles = getContainerStyles();
    const alertStyles = getAlertStyles();

    // Show loading state
    if (loading) {
        return (
            <Box sx={containerStyles}>
                <Alert severity="info" sx={{ ...alertStyles, mt: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'start', gap: 1 }}>
                        <CircularProgress size={20} />
                        <span>{loadingMessage}</span>
                    </Box>
                </Alert>
            </Box>
        );
    }

    // Don't render if no messages
    if (!messages || messages.length === 0) {
        return null;
    }

    return (
        <Box sx={containerStyles}>
            {messages.map((message, index) => {
                const normalized = normalizeMessage(message);
                const isExpanded = expandedMessages[index] || false;
                const firstLine = getFirstLine(normalized.message);
                const severity = getSeverity(normalized.variant);

                return (
                    <Alert
                        key={`message-${normalized.template_id || index}`}
                        severity={severity}
                        sx={alertStyles}
                        data-testid="rules-engine-inline-alert"
                        onClose={normalized.dismissible !== false && onDismiss ? () => onDismiss(index) : undefined}
                    >
                        <Container sx={{ alignItems: 'start', justifyContent: 'start', paddingLeft: 0, paddingRight: 0, width: '100%' }} disableGutters={true} maxWidth={false}>
                            {/* Title */}
                            <Box sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                textAlign: 'left',
                                px: 0,
                                width: '100%'
                            }}>
                                <Typography variant="h6" component="strong" sx={{ fontWeight: 600, px: 0 }}>
                                    {normalized.title}
                                </Typography>

                                {/* Expand/Collapse Button - only show if showMoreLess is enabled */}
                                {showMoreLess && (
                                    <IconButton
                                        size="small"
                                        onClick={() => handleToggleExpand(index)}
                                        sx={{ mt: -0.5 }}
                                        aria-label={isExpanded ? "Show less" : "Show more"}
                                    >
                                        {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                    </IconButton>
                                )}
                            </Box>

                            {/* Content - Collapsible or Full based on showMoreLess prop */}
                            {showMoreLess ? (
                                <>
                                    {/* Content Preview (First Line) - collapsed state */}
                                    {!isExpanded && (
                                        <Container className="text-start" sx={{ textAlign: 'left', justifyContent: 'start', px: 0, width: '100%' }} disableGutters={true} maxWidth={false}>
                                            <Typography variant="body1" component="div" sx={{ px: 0 }}>
                                                {firstLine}
                                            </Typography>
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    color: 'primary.main',
                                                    cursor: 'pointer',
                                                    display: 'inline-block',
                                                    '&:hover': { textDecoration: 'underline' }
                                                }}
                                                onClick={() => handleToggleExpand(index)}
                                            >
                                                see more
                                            </Typography>
                                        </Container>
                                    )}

                                    {/* Full Content (Expanded) */}
                                    <Collapse in={isExpanded} timeout="auto" unmountOnExit className="text-start" sx={{ width: '100%' }}>
                                        <Box>
                                            <div
                                                dangerouslySetInnerHTML={{
                                                    __html: normalized.message || 'No message content'
                                                }}
                                            />
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    color: 'primary.main',
                                                    cursor: 'pointer',
                                                    mt: 1,
                                                    display: 'inline-block',
                                                    '&:hover': { textDecoration: 'underline' }
                                                }}
                                                onClick={() => handleToggleExpand(index)}
                                            >
                                                see less
                                            </Typography>
                                        </Box>
                                    </Collapse>
                                </>
                            ) : (
                                /* Full content always visible when showMoreLess is disabled */
                                <Box className="text-start" sx={{ textAlign: 'left', width: '100%' }}>
                                    <div
                                        dangerouslySetInnerHTML={{
                                            __html: normalized.message || 'No message content'
                                        }}
                                    />
                                </Box>
                            )}
                        </Container>
                    </Alert>
                );
            })}
        </Box>
    );
};

export default RulesEngineInlineAlert;
