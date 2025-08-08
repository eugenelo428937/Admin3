import React, { useState, useEffect } from 'react';
import {
    Typography,
    Box,
    List,
    ListItem,
    ListItemText,
    Link,
    Container,
    Paper
} from '@mui/material';
import httpService from '../../services/httpService';

/**
 * Enhanced JsonContentRenderer with dynamic styling from backend
 * Fetches style configurations from the Django admin interface
 */
const DynamicJsonContentRenderer = ({ content, templateId, className }) => {
    const [styles, setStyles] = useState({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (templateId) {
            fetchStyles(templateId);
        }
    }, [templateId]);

    const fetchStyles = async (templateId) => {
        try {
            setLoading(true);
            const response = await httpService.get(`/api/rules/engine/template-styles/${templateId}/`);
            if (response.data && response.data.styles) {
                setStyles(response.data.styles);
            }
        } catch (error) {
            console.warn('Failed to fetch dynamic styles, falling back to defaults:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!content) return null;

    // Parse markdown-like syntax in text
    const parseText = (text) => {
        if (!text || typeof text !== 'string') return text;

        // Handle bold text **text**
        const boldRegex = /\*\*(.*?)\*\*/g;
        let parts = [];
        let lastIndex = 0;
        let match;

        while ((match = boldRegex.exec(text)) !== null) {
            if (match.index > lastIndex) {
                parts.push(text.slice(lastIndex, match.index));
            }
            parts.push(
                <strong key={`bold-${match.index}`}>{match[1]}</strong>
            );
            lastIndex = match.index + match[0].length;
        }
        
        if (lastIndex < text.length) {
            parts.push(text.slice(lastIndex));
        }

        // Handle links [url](text)
        return parts.map((part, index) => {
            if (typeof part === 'string') {
                const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
                const linkParts = [];
                let linkLastIndex = 0;
                let linkMatch;

                while ((linkMatch = linkRegex.exec(part)) !== null) {
                    if (linkMatch.index > linkLastIndex) {
                        linkParts.push(part.slice(linkLastIndex, linkMatch.index));
                    }
                    linkParts.push(
                        <Link 
                            key={`link-${index}-${linkMatch.index}`}
                            href={linkMatch[1]}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {linkMatch[2]}
                        </Link>
                    );
                    linkLastIndex = linkMatch.index + linkMatch[0].length;
                }

                if (linkLastIndex < part.length) {
                    linkParts.push(part.slice(linkLastIndex));
                }

                return linkParts.length > 0 ? linkParts : part;
            }
            return part;
        });
    };

    // Get dynamic styles for an element
    const getDynamicStyles = (element, cssClass) => {
        let dynamicStyles = {};

        // Try to match by CSS class first (most specific)
        if (cssClass && styles[cssClass]) {
            dynamicStyles = { ...dynamicStyles, ...styles[cssClass] };
        }

        // Try to match by element type
        if (styles[element]) {
            dynamicStyles = { ...dynamicStyles, ...styles[element] };
        }

        // Try combined selector (element + class)
        const combinedKey = `${element}.${cssClass}`;
        if (styles[combinedKey]) {
            dynamicStyles = { ...dynamicStyles, ...styles[combinedKey] };
        }

        return dynamicStyles;
    };

    // Render different element types with dynamic styling
    const renderElement = (item, index) => {
        const { element, text, seq, class: cssClass, text_align, title } = item;
        const key = seq || index;
        
        // Get dynamic styles for this element
        const dynamicStyles = getDynamicStyles(element, cssClass);

        switch (element) {
            case 'container':
                return (
                    <Container 
                        key={key} 
                        className={cssClass}
                        sx={{ 
                            textAlign: text_align,
                            ...dynamicStyles
                        }}
                    >
                        {title && (
                            <Typography 
                                component={title || 'h4'} 
                                variant={title === 'h1' ? 'h4' : title === 'h2' ? 'h5' : 'h6'}
                                gutterBottom
                                sx={getDynamicStyles(title, `${cssClass}-title`)}
                            >
                                {parseText(text)}
                            </Typography>
                        )}
                        {item.content && item.content.map((child, childIndex) => 
                            renderElement(child, childIndex)
                        )}
                    </Container>
                );

            case 'p':
                return (
                    <Typography 
                        key={key}
                        component="p"
                        variant="body1"
                        paragraph
                        className={cssClass}
                        sx={{ 
                            textAlign: text_align,
                            ...dynamicStyles
                        }}
                    >
                        {parseText(text)}
                    </Typography>
                );

            case 'ul':
                return (
                    <List 
                        key={key} 
                        className={cssClass}
                        sx={dynamicStyles}
                    >
                        {Array.isArray(text) ? text.map((listItem, listIndex) => (
                            <ListItem 
                                key={listIndex} 
                                disablePadding
                                sx={getDynamicStyles('li', `${cssClass}-item`)}
                            >
                                <ListItemText 
                                    primary={parseText(listItem)}
                                    primaryTypographyProps={{ 
                                        variant: 'body2',
                                        sx: getDynamicStyles('li-text', `${cssClass}-item-text`)
                                    }}
                                />
                            </ListItem>
                        )) : (
                            <ListItem disablePadding>
                                <ListItemText 
                                    primary={parseText(text)}
                                    primaryTypographyProps={{ variant: 'body2' }}
                                />
                            </ListItem>
                        )}
                    </List>
                );

            case 'h1':
            case 'h2':
            case 'h3':
            case 'h4':
            case 'h5':
            case 'h6':
                const variantMap = {
                    'h1': 'h4', 'h2': 'h5', 'h3': 'h6',
                    'h4': 'h6', 'h5': 'subtitle1', 'h6': 'subtitle2'
                };
                
                return (
                    <Typography 
                        key={key}
                        component={element}
                        variant={variantMap[element]}
                        gutterBottom
                        className={cssClass}
                        sx={{ 
                            textAlign: text_align,
                            ...dynamicStyles
                        }}
                    >
                        {parseText(text)}
                    </Typography>
                );

            case 'box':
                return (
                    <Box 
                        key={key}
                        className={cssClass}
                        sx={{ 
                            textAlign: text_align,
                            // Apply dynamic styles (these will override defaults)
                            ...dynamicStyles
                        }}
                    >
                        {parseText(text)}
                        {item.content && item.content.map((child, childIndex) => 
                            renderElement(child, childIndex)
                        )}
                    </Box>
                );

            default:
                return (
                    <Typography 
                        key={key}
                        variant="body1"
                        className={cssClass}
                        sx={{ 
                            textAlign: text_align,
                            ...dynamicStyles
                        }}
                    >
                        {parseText(text)}
                    </Typography>
                );
        }
    };

    if (loading) {
        return (
            <Box className={className} sx={{ opacity: 0.7 }}>
                Loading styles...
            </Box>
        );
    }

    return (
        <Box className={className}>
            {content.message_container && renderElement(content.message_container, 0)}
            {content.content && content.content.map((item, index) => 
                renderElement(item, index)
            )}
        </Box>
    );
};

export default DynamicJsonContentRenderer;