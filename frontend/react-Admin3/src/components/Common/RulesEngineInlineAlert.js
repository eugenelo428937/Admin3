/**
 * RulesEngineInlineAlert Component
 *
 * Displays rules engine messages with collapsible content.
 * Shows title and first line by default, with "see more" to expand full content.
 *
 * Supports multiple message formats:
 * - Format 1: { title, message, variant, template_id } (ProductList)
 * - Format 2: { message_type, content: { title, message }, template_id } (CartReviewStep)
 *
 * @param {Array} messages - Array of message objects
 * @param {boolean} loading - Loading state indicator
 * @param {string} loadingMessage - Custom loading message text
 * @param {Function} onDismiss - Optional callback when alert is dismissed
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
    onDismiss
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
     * Normalize message format to handle both ProductList and CartReviewStep formats
     */
    const normalizeMessage = (message) => {
        // Format 1: { title, message, variant } (ProductList)
        if (message.title && message.message) {
            return {
                title: message.title,
                message: message.message,
                variant: message.variant,
                template_id: message.template_id
            };
        }

        // Format 2: { message_type, content: { title, message } } (CartReviewStep)
        if (message.message_type && message.content) {
            return {
                title: message.content?.title || 'Notice',
                message: message.content?.message || message.content,
                variant: message.message_type,
                template_id: message.template_id
            };
        }

        // Fallback for unknown formats
        return {
            title: 'Notice',
            message: typeof message === 'string' ? message : JSON.stringify(message),
            variant: 'info',
            template_id: null
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

    // Show loading state
    if (loading) {
        return (
            <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'start', gap: 1 }}>
                    <CircularProgress size={20} />
                    <span>{loadingMessage}</span>
                </Box>
            </Alert>
        );
    }

    // Don't render if no messages
    if (!messages || messages.length === 0) {
        return null;
    }

    return (
        <>
            {messages.map((message, index) => {
                const normalized = normalizeMessage(message);
                const isExpanded = expandedMessages[index] || false;
                const firstLine = getFirstLine(normalized.message);
                const severity = getSeverity(normalized.variant);

                return (
                    <Alert
                        key={`message-${normalized.template_id || index}`}
                        severity={severity}
                        sx={{ mb: 2, alignItems: 'start', justifyContent: 'start', width: '100%' }}
                        data-testid="rules-engine-inline-alert"                        
                        onClose={message.dismissible !== false && onDismiss ? () => onDismiss(index) : undefined}
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
                                <Typography variant="h6" component="strong" sx={{ fontWeight: 600, px:0 }}>
                                    {normalized.title}
                                </Typography>

                                {/* Expand/Collapse Button */}
                                <IconButton
                                    size="small"
                                    onClick={() => handleToggleExpand(index)}
                                    sx={{ mt: -0.5 }}
                                    aria-label={isExpanded ? "Show less" : "Show more"}
                                >
                                    {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                </IconButton>
                            </Box>

                            {/* Content Preview (First Line) */}
                            {!isExpanded && (
                                <Container className="text-start" sx={{ textAlign: 'left', justifyContent: 'start', px: 0, width: '100%' }} disableGutters={true} maxWidth={false}>
                                    <Typography variant="body1" component="div" sx={{px:0}}>
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
                        </Container>
                    </Alert>
                );
            })}
        </>
    );
};

export default RulesEngineInlineAlert;
