import React from "react";
import PropTypes from "prop-types";
import { Autocomplete, TextField, Box } from "@mui/material";

const PhoneCodeAutocomplete = ({ countries, selectedCountry, onSelect, name, placeholder }) => {
  const validCountries = countries.filter(c => c.phone_code);

  return (
    <Box sx={{ maxWidth: 120, mr: 1 }}>
      <Autocomplete
        value={selectedCountry || null}
        onChange={(event, newValue) => {
          if (newValue) {
            onSelect(newValue);
          }
        }}
        options={validCountries}
        getOptionLabel={(option) => option.phone_code || ""}
        renderOption={(props, option) => (
          <li {...props} key={option.iso_code}>
            {option.phone_code} {option.name}
          </li>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            name={name}
            placeholder={placeholder || "Code"}
            sx={{ minWidth: 80 }}
          />
        )}
        isOptionEqualToValue={(option, value) => option.iso_code === value.iso_code}
        filterOptions={(options, { inputValue }) => {
          if (!inputValue) return options;
          return options.filter(
            c => c.phone_code.replace('+', '').startsWith(inputValue.replace('+', ''))
              || c.name.toLowerCase().includes(inputValue.toLowerCase())
          );
        }}
        sx={{ display: "inline-block" }}
      />
    </Box>
  );
};

PhoneCodeAutocomplete.propTypes = {
  countries: PropTypes.array.isRequired,
  selectedCountry: PropTypes.object,
  onSelect: PropTypes.func.isRequired,
  name: PropTypes.string,
  placeholder: PropTypes.string
};

export default PhoneCodeAutocomplete;
