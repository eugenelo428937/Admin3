import React from 'react';
import { Box, Typography, Grid, Paper, Tooltip } from '@mui/material';
import { scales, md3 } from '../../theme/tokens/colors';

export default {
  title: 'Design System/Colors/BPP Brand Scales',
  parameters: {
    docs: {
      description: {
        component: 'BPP brand color scales with 10-100 tonal steps plus accent (110).',
      },
    },
  },
};

const ColorSwatch = ({ color, label, scale }) => {
  const isLight = [10, 20, 30].includes(parseInt(label));

  return (
    <Tooltip title={`${scale}.${label}: ${color}`} arrow>
      <Paper
        elevation={1}
        sx={{
          width: 60,
          height: 60,
          backgroundColor: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 1,
          cursor: 'pointer',
          transition: 'transform 0.2s',
          '&:hover': {
            transform: 'scale(1.1)',
            zIndex: 1,
          },
        }}
        onClick={() => navigator.clipboard.writeText(color)}
      >
        <Typography
          variant="caption"
          sx={{
            color: isLight ? '#000' : '#fff',
            fontWeight: 600,
            fontSize: '0.65rem',
          }}
        >
          {label}
        </Typography>
      </Paper>
    </Tooltip>
  );
};

const ColorScale = ({ name, colors }) => (
  <Box sx={{ mb: 4 }}>
    <Typography variant="h6" sx={{ mb: 1, textTransform: 'capitalize' }}>
      {name}
    </Typography>
    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
      {Object.entries(colors).map(([key, value]) => (
        <ColorSwatch key={key} color={value} label={key} scale={name} />
      ))}
    </Box>
  </Box>
);

export const AllScales = () => (
  <Box sx={{ p: 3 }}>
    <Typography variant="h4" sx={{ mb: 3 }}>
      BPP Brand Color Scales
    </Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
      Click any swatch to copy the hex value. Scales range from 10 (lightest) to 100 (darkest), with 110 as accent.
    </Typography>

    {Object.entries(scales).map(([name, colors]) => (
      <ColorScale key={name} name={name} colors={colors} />
    ))}
  </Box>
);

export const Purple = () => <ColorScale name="purple" colors={scales.purple} />;
Purple.storyName = 'Purple (Primary)';

export const Sky = () => <ColorScale name="sky" colors={scales.sky} />;
Sky.storyName = 'Sky (Material Cards)';

export const Mint = () => <ColorScale name="mint" colors={scales.mint} />;
Mint.storyName = 'Mint (Accent)';

export const Green = () => <ColorScale name="green" colors={scales.green} />;
Green.storyName = 'Green (Bundle Cards)';

export const Orange = () => <ColorScale name="orange" colors={scales.orange} />;
Orange.storyName = 'Orange (Marking Voucher)';

export const Pink = () => <ColorScale name="pink" colors={scales.pink} />;
Pink.storyName = 'Pink (Marking Cards)';

export const Cobalt = () => <ColorScale name="cobalt" colors={scales.cobalt} />;
Cobalt.storyName = 'Cobalt (Online Classroom)';

export const Granite = () => <ColorScale name="granite" colors={scales.granite} />;
Granite.storyName = 'Granite (Neutrals)';

// MD3 System Colors
const MD3ColorGrid = ({ colors, title }) => (
  <Box sx={{ mb: 4 }}>
    <Typography variant="h6" sx={{ mb: 2 }}>{title}</Typography>
    <Grid container spacing={1}>
      {Object.entries(colors).map(([key, value]) => (
        <Grid item key={key}>
          <Tooltip title={`md3.${key}: ${value}`} arrow>
            <Paper
              elevation={1}
              sx={{
                width: 100,
                p: 1,
                backgroundColor: value,
                cursor: 'pointer',
                '&:hover': { transform: 'scale(1.05)' },
              }}
              onClick={() => navigator.clipboard.writeText(value)}
            >
              <Typography
                variant="caption"
                sx={{
                  color: key.startsWith('on') || key.includes('Dark') ? '#fff' : '#000',
                  fontSize: '0.6rem',
                  wordBreak: 'break-word',
                }}
              >
                {key}
              </Typography>
            </Paper>
          </Tooltip>
        </Grid>
      ))}
    </Grid>
  </Box>
);

export const MaterialDesign3 = () => {
  const grouped = {
    Primary: { primary: md3.primary, onPrimary: md3.onPrimary, primaryContainer: md3.primaryContainer, onPrimaryContainer: md3.onPrimaryContainer },
    Secondary: { secondary: md3.secondary, onSecondary: md3.onSecondary, secondaryContainer: md3.secondaryContainer, onSecondaryContainer: md3.onSecondaryContainer },
    Tertiary: { tertiary: md3.tertiary, onTertiary: md3.onTertiary, tertiaryContainer: md3.tertiaryContainer, onTertiaryContainer: md3.onTertiaryContainer },
    Error: { error: md3.error, onError: md3.onError, errorContainer: md3.errorContainer, onErrorContainer: md3.onErrorContainer },
    Surface: { surface: md3.surface, onSurface: md3.onSurface, surfaceVariant: md3.surfaceVariant, onSurfaceVariant: md3.onSurfaceVariant },
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>Material Design 3 Colors</Typography>
      {Object.entries(grouped).map(([title, colors]) => (
        <MD3ColorGrid key={title} title={title} colors={colors} />
      ))}
    </Box>
  );
};
MaterialDesign3.storyName = 'MD3 System Colors';
