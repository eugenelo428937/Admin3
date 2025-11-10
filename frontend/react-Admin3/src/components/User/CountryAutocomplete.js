import React, { useState, useRef, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { TextField, Paper, List, ListItem, ListItemText, Box, Typography, Portal } from "@mui/material";
import config from "../../config";

const frequentCountries = [
  "United Kingdom",
  "India",
  "South Africa"
];

const API_URL = config.countryUrl || config.apiBaseUrl + "/api/countries/";

const CountryAutocomplete = ({ value, onChange, placeholder, isInvalid, feedback, inputRef, name, label }) => {
  const [inputValue, setInputValue] = useState(value || "");
  const [showDropdown, setShowDropdown] = useState(false);
  const [countryList, setCountryList] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef(null);
  const textFieldRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  useEffect(() => {
    fetch(API_URL)
      .then(res => res.json())
      .then(data => {
        let countries = [];
			if (Array.isArray(data)) {
				countries = data;
			} else if (Array.isArray(data.results)) {
				countries = data.results;
			}
        // Place frequent countries at the top, preserving their order
        const frequent = frequentCountries
          .map(f => countries.find(c => c.name === f))
          .filter(Boolean);
        const rest = countries
          .filter(c => !frequentCountries.includes(c.name))
          .sort((a, b) => a.name.localeCompare(b.name));
        setCountryList([...frequent, ...rest]);
        setFiltered([...frequent, ...rest]);
      });
  }, []);

  useEffect(() => {
    if (inputValue === "") {
      setFiltered(countryList);
    } else {
      setFiltered(
        countryList.filter((c) =>
          c.name.toLowerCase().startsWith(inputValue.toLowerCase())
        )
      );
    }
  }, [inputValue, countryList]);

  // Calculate dropdown position
  const calculateDropdownPosition = useCallback(() => {
    if (textFieldRef.current) {
      const rect = textFieldRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8, // Position below the input
        left: rect.left,
        width: rect.width
      });
    }
  }, []);

  // Handle click outside, scroll, and resize
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          containerRef.current && !containerRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    const handleScrollOrResize = () => {
      if (showDropdown) {
        calculateDropdownPosition();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [showDropdown, calculateDropdownPosition]);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    onChange && onChange(e);
    calculateDropdownPosition();
    setShowDropdown(true);
  };

  const handleFocus = () => {
    calculateDropdownPosition();
    setShowDropdown(true);
  };

  const handleSelect = (country) => {
    setInputValue(country.name);
    onChange && onChange({ target: { value: country.name, name } });
    setShowDropdown(false);
  };

  return (
    <Box ref={containerRef}>
      <TextField
        fullWidth
        type="text"
        name={name}
        label={label}
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        autoComplete="off"
        placeholder={placeholder}
        error={isInvalid}
        helperText={isInvalid ? feedback : ''}
        inputRef={(node) => {
          textFieldRef.current = node;
          if (typeof inputRef === 'function') {
            inputRef(node);
          } else if (inputRef) {
            inputRef.current = node;
          }
        }}
        variant="standard"
      />
      {showDropdown && (
        <Portal>
          <Paper
            ref={dropdownRef}
            elevation={8}
            sx={{
              position: "fixed",
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
              zIndex: 1300, // Same as address suggestions dropdown
              maxHeight: 300,
              overflowY: "auto"
            }}
          >
            <List disablePadding>
              {filtered.length === 0 ? (
                <ListItem>
                  <ListItemText
                    primary={<Typography color="text.secondary">No countries found</Typography>}
                  />
                </ListItem>
              ) : (
                filtered.map((country) => (
                  <ListItem
                    key={country.iso_code}
                    component="div"
                    onMouseDown={() => handleSelect(country)}
                    sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                  >
                    <ListItemText
                      primary={country.name}
                      secondary={country.phone_code && `${country.phone_code}`}
                    />
                  </ListItem>
                ))
              )}
            </List>
          </Paper>
        </Portal>
      )}
    </Box>
  );
};

CountryAutocomplete.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  isInvalid: PropTypes.bool,
  feedback: PropTypes.string,
  inputRef: PropTypes.any,
  name: PropTypes.string,
  label: PropTypes.string
};

export default CountryAutocomplete;
