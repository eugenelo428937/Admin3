import React, { useState, useRef, useEffect, useCallback } from "react";
import { TextField, Paper, List, ListItem, ListItemText, Box, Typography, Portal } from "@mui/material";
import config from '../../config';
import type { Country } from "../../types/auth";

interface CountryWithIso extends Country {
  iso_code: string;
}

interface DropdownPosition {
  top: number;
  left: number;
  width: number;
}

interface CountryAutocompleteProps {
  value?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement> | { target: { value: string; name?: string } }) => void;
  placeholder?: string;
  isInvalid?: boolean;
  feedback?: string;
  inputRef?: React.Ref<HTMLInputElement>;
  name?: string;
  label?: string;
}

const frequentCountries: string[] = [
  "United Kingdom",
  "India",
  "South Africa"
];

const API_URL: string = (config as any).countryUrl || (config as any).apiBaseUrl + "/api/countries/";

const CountryAutocomplete: React.FC<CountryAutocompleteProps> = ({ value, onChange, placeholder, isInvalid, feedback, inputRef, name, label }) => {
  const [inputValue, setInputValue] = useState<string>(value || "");
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [countryList, setCountryList] = useState<CountryWithIso[]>([]);
  const [filtered, setFiltered] = useState<CountryWithIso[]>([]);
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition>({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const textFieldRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  useEffect(() => {
    fetch(API_URL)
      .then(res => res.json())
      .then((data: any) => {
        let countries: CountryWithIso[] = [];
			if (Array.isArray(data)) {
				countries = data;
			} else if (Array.isArray(data.results)) {
				countries = data.results;
			}
        // Place frequent countries at the top, preserving their order
        const frequent = frequentCountries
          .map(f => countries.find(c => c.name === f))
          .filter((c): c is CountryWithIso => Boolean(c));
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
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          containerRef.current && !containerRef.current.contains(event.target as Node)) {
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    onChange && onChange(e);
    calculateDropdownPosition();
    setShowDropdown(true);
  };

  const handleFocus = () => {
    calculateDropdownPosition();
    setShowDropdown(true);
  };

  const handleSelect = (country: CountryWithIso) => {
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
        inputRef={(node: HTMLInputElement | null) => {
          textFieldRef.current = node;
          if (typeof inputRef === 'function') {
            inputRef(node);
          } else if (inputRef && typeof inputRef === 'object') {
            (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
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

export default CountryAutocomplete;
