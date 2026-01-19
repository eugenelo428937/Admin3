import React from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { semantic } from '../../theme/semantic/common';
import { navigation } from '../../theme/semantic/navigation';
import * as productCards from '../../theme/semantic/productCards';

export default {
  title: 'Design System/Tokens/Semantic',
  parameters: {
    docs: {
      description: {
        component: 'Semantic tokens map raw colors to purpose. Change token values here to update entire app.',
      },
    },
  },
};

const TokenRow = ({ name, value, description }) => (
  <TableRow>
    <TableCell>
      <Typography variant="body2" fontFamily="monospace" fontWeight={600}>
        {name}
      </Typography>
    </TableCell>
    <TableCell>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          sx={{
            width: 24,
            height: 24,
            backgroundColor: value,
            borderRadius: 0.5,
            border: '1px solid rgba(0,0,0,0.1)',
          }}
        />
        <Typography variant="caption" fontFamily="monospace">
          {value}
        </Typography>
      </Box>
    </TableCell>
    <TableCell>
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
    </TableCell>
  </TableRow>
);

const TokenTable = ({ title, tokens, prefix = '' }) => (
  <Box sx={{ mb: 4 }}>
    <Typography variant="h6" sx={{ mb: 2 }}>{title}</Typography>
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow sx={{ backgroundColor: 'grey.100' }}>
            <TableCell width="30%"><strong>Token</strong></TableCell>
            <TableCell width="30%"><strong>Value</strong></TableCell>
            <TableCell width="40%"><strong>Usage</strong></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {tokens.map(({ name, value, description }) => (
            <TokenRow key={name} name={`${prefix}${name}`} value={value} description={description} />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
);

export const CommonTokens = () => {
  const tokens = [
    { name: 'textPrimary', value: semantic.textPrimary, description: 'Primary text color (dark on light backgrounds)' },
    { name: 'textSecondary', value: semantic.textSecondary, description: 'Secondary/muted text color' },
    { name: 'textInverse', value: semantic.textInverse, description: 'Text on dark backgrounds' },
    { name: 'bgPrimary', value: semantic.bgPrimary, description: 'Primary background color' },
    { name: 'bgSecondary', value: semantic.bgSecondary, description: 'Secondary/subtle background' },
    { name: 'bgElevated', value: semantic.bgElevated, description: 'Elevated surface (cards, modals)' },
    { name: 'borderDefault', value: semantic.borderDefault, description: 'Default border color' },
    { name: 'borderSubtle', value: semantic.borderSubtle, description: 'Subtle divider lines' },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 1 }}>Common Semantic Tokens</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Flat semantic tokens from <code>theme/semantic/common.js</code>
      </Typography>
      <TokenTable title="Text & Background" tokens={tokens} prefix="semantic." />
    </Box>
  );
};

export const NavigationTokens = () => {
  const textTokens = [
    { name: 'text.primary', value: navigation.text.primary, description: 'Primary nav text (white)' },
    { name: 'text.secondary', value: navigation.text.secondary, description: 'Secondary nav text (off-white)' },
    { name: 'text.muted', value: navigation.text.muted, description: 'Muted/disabled nav text' },
    { name: 'text.inverse', value: navigation.text.inverse, description: 'Inverse nav text' },
  ];

  const bgTokens = [
    { name: 'background.active', value: navigation.background.active, description: 'Active nav background (dark gray)' },
    { name: 'background.hover', value: navigation.background.hover, description: 'Hover state background' },
  ];

  const borderTokens = [
    { name: 'border.subtle', value: navigation.border.subtle, description: 'Subtle nav borders' },
    { name: 'border.divider', value: navigation.border.divider, description: 'Nav section dividers' },
  ];

  const buttonTokens = [
    { name: 'button.color', value: navigation.button.color, description: 'Nav button text color' },
    { name: 'button.hoverColor', value: navigation.button.hoverColor, description: 'Nav button hover color' },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 1 }}>Navigation Tokens</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Nested navigation tokens from <code>theme/semantic/navigation.js</code>
      </Typography>
      <TokenTable title="Text" tokens={textTokens} prefix="navigation." />
      <TokenTable title="Background" tokens={bgTokens} prefix="navigation." />
      <TokenTable title="Border" tokens={borderTokens} prefix="navigation." />
      <TokenTable title="Button" tokens={buttonTokens} prefix="navigation." />
    </Box>
  );
};
NavigationTokens.storyName = 'Navigation';

export const ProductCardTokens = () => {
  const cardTypes = [
    { name: 'Tutorial', data: productCards.tutorial, color: 'purple' },
    { name: 'Material', data: productCards.material, color: 'sky' },
    { name: 'Marking', data: productCards.marking, color: 'pink' },
    { name: 'Bundle', data: productCards.bundle, color: 'green' },
    { name: 'Online Classroom', data: productCards.onlineClassroom, color: 'cobalt' },
    { name: 'Marking Voucher', data: productCards.markingVoucher, color: 'orange' },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 1 }}>Product Card Tokens</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Each product type has its own color theme from <code>theme/semantic/productCards.js</code>
      </Typography>

      {cardTypes.map(({ name, data, color }) => (
        <Box key={name} sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {name} <Typography component="span" variant="caption" color="text.secondary">({color})</Typography>
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {Object.entries(data).map(([key, value]) => (
              <Paper
                key={key}
                variant="outlined"
                sx={{ p: 1, minWidth: 100, textAlign: 'center' }}
              >
                <Box
                  sx={{
                    width: '100%',
                    height: 40,
                    backgroundColor: value,
                    borderRadius: 0.5,
                    mb: 0.5,
                  }}
                />
                <Typography variant="caption" fontFamily="monospace">
                  {key}
                </Typography>
              </Paper>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
};
ProductCardTokens.storyName = 'Product Cards';

export const ThemeAccess = () => (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 1 }}>Accessing Tokens in Components</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        How to use semantic tokens in your components
      </Typography>

      <Paper variant="outlined" sx={{ p: 2, mb: 3, backgroundColor: 'grey.50' }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Via useTheme hook:</Typography>
        <pre style={{ margin: 0, fontSize: '0.85rem' }}>
{`const theme = useTheme();

// Navigation tokens
theme.palette.navigation.text.primary
theme.palette.navigation.background.active

// Product card tokens
theme.palette.productCards.tutorial.header
theme.palette.productCards.material.button

// Common semantic tokens
theme.palette.semantic.textPrimary`}
        </pre>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, backgroundColor: 'grey.50' }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Via sx prop:</Typography>
        <pre style={{ margin: 0, fontSize: '0.85rem' }}>
{`<Box sx={{
  color: 'navigation.text.primary',
  backgroundColor: 'navigation.background.active',
}} />

<Button sx={{
  color: (theme) => theme.palette.productCards.material.button,
}} />`}
        </pre>
      </Paper>
    </Box>
);
ThemeAccess.storyName = 'Usage Guide';
