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
import type { RulesEngineInlineAlertProps, NormalizedMessage, RawRulesMessage } from '../../types/rulesEngine';

type AlertSeverity = 'info' | 'warning' | 'error' | 'success';

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
 * Note: dangerouslySetInnerHTML is used intentionally here to render server-controlled
 * rules engine HTML content. The content is sanitized server-side via the Rules Engine's
 * MessageTemplateService XSS sanitization (whitelist approach).
 */
const RulesEngineInlineAlert: React.FC<RulesEngineInlineAlertProps> = ({
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
    const [expandedMessages, setExpandedMessages] = useState<Record<number, boolean>>({});

    /**
     * Toggle expand/collapse for a specific message
     */
    const handleToggleExpand = (index: number): void => {
        setExpandedMessages(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    /**
     * Extract first line of message content for preview
     */
    const getFirstLine = (htmlContent: string): string => {
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
    const normalizeMessage = (message: RawRulesMessage): NormalizedMessage => {
        // Format 1: { title, message, variant } (ProductList)
        if (message.title && (message as any).message) {
            return {
                title: message.title as string,
                message: (message as any).message,
                variant: message.variant || 'info',
                template_id: message.template_id || null,
                dismissible: message.dismissible !== false
            };
        }

        // Format 2: { message_type, content: { title, message } } (CartReviewStep)
        if (message.message_type && message.content) {
            return {
                title: message.content?.title || 'Notice',
                message: message.content?.message || message.content,
                variant: message.message_type,
                template_id: message.template_id || null,
                dismissible: message.dismissible !== false
            };
        }

        // Format 3: { parsed: { title, message, variant } } (Home page rules engine)
        if ((message as any).parsed) {
            const parsed = (message as any).parsed;
            return {
                title: parsed.title || 'Notice',
                message: parsed.message || 'No message content',
                variant: parsed.variant || 'info',
                template_id: message.template_id || null,
                dismissible: parsed.dismissible !== false
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
    const getSeverity = (variant: string): AlertSeverity => {
        const severityMap: Record<string, AlertSeverity> = {
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
    const getContainerStyles = (): Record<string, any> => {
        const styles: Record<string, any> = {};

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
    const getAlertStyles = (): Record<string, any> => {
        const styles: Record<string, any> = {
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
                const severity = getSeverity(normalized.variant as string);

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
                                        <Container sx={{ textAlign: 'left', justifyContent: 'start', px: 0, width: '100%' }} disableGutters={true} maxWidth={false}>
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
                                    <Collapse in={isExpanded} timeout="auto" unmountOnExit sx={{ textAlign: 'left', width: '100%' }}>
                                        <Box>
                                            {/* Server-controlled HTML content, sanitized by backend MessageTemplateService */}
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
                                <Box sx={{ textAlign: 'left', width: '100%' }}>
                                    {/* Server-controlled HTML content, sanitized by backend MessageTemplateService */}
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
