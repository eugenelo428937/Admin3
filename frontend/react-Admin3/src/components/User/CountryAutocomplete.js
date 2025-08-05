import React, { useState, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import { TextField, Paper, List, ListItem, ListItemText, Box, Typography } from "@mui/material";
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
  const containerRef = useRef(null);

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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    onChange && onChange(e);
    setShowDropdown(true);
  };

  const handleSelect = (country) => {
    setInputValue(country.name);
    onChange && onChange({ target: { value: country.name, name } });
    setShowDropdown(false);
  };

  return (
    <Box ref={containerRef} sx={{ position: "relative" }}>
      <TextField
        fullWidth
        type="text"
        name={name}
        label={label}
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => setShowDropdown(true)}
        autoComplete="off"
        placeholder={placeholder}
        error={isInvalid}
        helperText={isInvalid ? feedback : ''}
        inputRef={inputRef}
        variant="standard"
      />
      {showDropdown && (
        <Paper
          elevation={3}
          sx={{
            position: "absolute",
            zIndex: 1000,
            width: "100%",
            maxHeight: 300,
            overflowY: "auto",
            mt: 1
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
