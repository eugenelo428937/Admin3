import React from 'react';
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
import { useTheme } from '@mui/material/styles';
/**
 * Component to render JSON-based content structure with Material UI components
 * Supports markdown-like syntax for bold text and links
 */
const JsonContentRenderer = ({ content, className }) => {
    const theme = useTheme();
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
            // Add text before the match
            if (match.index > lastIndex) {
                parts.push(text.slice(lastIndex, match.index));
            }
            // Add bold text
            parts.push(
                <strong key={`bold-${match.index}`}>{match[1]}</strong>
            );
            lastIndex = match.index + match[0].length;
        }
        
        // Add remaining text
        if (lastIndex < text.length) {
            parts.push(text.slice(lastIndex));
        }

        // Handle links [url](text) - simplified version
        return parts.map((part, index) => {
            if (typeof part === 'string') {
                const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
                const linkParts = [];
                let linkLastIndex = 0;
                let linkMatch;

                while ((linkMatch = linkRegex.exec(part)) !== null) {
                    // Add text before the link
                    if (linkMatch.index > linkLastIndex) {
                        linkParts.push(part.slice(linkLastIndex, linkMatch.index));
                    }
                    // Add link
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

                // Add remaining text
                if (linkLastIndex < part.length) {
                    linkParts.push(part.slice(linkLastIndex));
                }

                return linkParts.length > 0 ? linkParts : part;
            }
            return part;
        });
    };

    // Render different element types
    const renderElement = (item, index) => {
        const { element, text, seq, class: cssClass, text_align, title } = item;
        const key = seq || index;

        switch (element) {
            case 'container':
                return (
                    <Container 
                        key={key} 
                        className={cssClass}
                        sx={{ textAlign: text_align }}
                    >
                        {title && (
                            <Typography 
                                component={title || 'h4'} 
                                variant={title === 'h1' ? 'h4' : title === 'h2' ? 'h5' : 'h6'}
                                gutterBottom
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
                        sx={{ textAlign: text_align }}
                    >
                        {parseText(text)}
                    </Typography>
                );

            case 'ul':
                return (
                    <List key={key} className={cssClass}>
                        {Array.isArray(text) ? text.map((listItem, listIndex) => (
                            <ListItem key={listIndex} disablePadding>
                                <ListItemText 
                                    primary={parseText(listItem)}
                                    sx={{
                                        "& .MuiTypography-root": {
                                            fontSize: theme.typography.body1.fontSize,
                                        },
                                    }}
                                />
                            </ListItem>
                        )) : (
                            <ListItem disablePadding>
                                <ListItemText 
                                    primary={parseText(text)}
                                    sx={{
                                        "& .MuiTypography-root": {
                                            fontSize: theme.typography.body1.fontSize,
                                        },
                                    }}
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
                    'h1': 'h4',
                    'h2': 'h5',
                    'h3': 'h6',
                    'h4': 'h6',
                    'h5': 'subtitle1',
                    'h6': 'subtitle2'
                };
                
                return (
                    <Typography 
                        key={key}
                        component={element}
                        variant={variantMap[element]}
                        gutterBottom
                        className={cssClass}
                        sx={{ textAlign: text_align }}
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
                            // Add some styling for alert boxes
                            ...(cssClass && cssClass.includes('alert') && {
                                padding: '12px 16px',
                                borderRadius: '4px',
                                marginBottom: '16px',
                                border: '1px solid',
                                ...(cssClass.includes('alert-warning') && {
                                    backgroundColor: 'warning.light',
                                    borderColor: 'warning.main',
                                    color: 'warning.dark'
                                }),
                                ...(cssClass.includes('holiday-tips') && {
                                    backgroundColor: 'grey.100',
                                    borderColor: 'grey.300',
                                    color: 'text.secondary'
                                })
                            })
                        }}
                    >
                        {parseText(text)}
                        {item.content && item.content.map((child, childIndex) => 
                            renderElement(child, childIndex)
                        )}
                    </Box>
                );

            default:
                // Fallback to Typography for unknown elements
                return (
                    <Typography 
                        key={key}
                        variant="body1"
                        className={cssClass}
                        sx={{ textAlign: text_align }}
                    >
                        {parseText(text)}
                    </Typography>
                );
        }
    };

    return (
        <Box className={className}>
            {content.message_container && renderElement(content.message_container, 0)}
            {content.content && content.content.map((item, index) => 
                renderElement(item, index)
            )}
        </Box>
    );
};

export default JsonContentRenderer;