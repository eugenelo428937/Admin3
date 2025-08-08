import React from 'react';
import { 
  Box, 
  Button,
  Tooltip
} from '@mui/material';
import { 
  Search as SearchIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

const TopNavActions = ({ onOpenSearch }) => {
  const theme = useTheme();

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      {/* Brochure Download - Desktop Only */}
      <Tooltip title="Download Brochure">
        <Button
          component="a"
          href="/brochure"
          target="_blank"
          startIcon={<DownloadIcon />}
          sx={{
            textTransform: "none",
            color: theme.palette.liftkit?.light?.background || "text.primary",
            display: { xs: "none", md: "flex" },
          }}>
          Brochure
        </Button>
      </Tooltip>

      {/* Search Button */}
      <Tooltip title="Search Products (Ctrl+K)">
        <Button
          onClick={onOpenSearch}
          sx={{ color: theme.palette.liftkit?.light?.background || "text.primary" }}
          aria-label="search products">
          <SearchIcon />
          Search
        </Button>
      </Tooltip>
    </Box>
  );
};

export default TopNavActions;