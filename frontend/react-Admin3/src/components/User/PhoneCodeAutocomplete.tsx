import React from "react";
import { Autocomplete, TextField, Box } from "@mui/material";
import type { Country } from "../../types/auth";

interface CountryWithIso extends Country {
  iso_code: string;
}

interface PhoneCodeAutocompleteProps {
  countries: CountryWithIso[];
  selectedCountry?: CountryWithIso | null;
  onSelect: (country: CountryWithIso) => void;
  name?: string;
  placeholder?: string;
}

const PhoneCodeAutocomplete: React.FC<PhoneCodeAutocompleteProps> = ({ countries, selectedCountry, onSelect, name, placeholder }) => {
  const validCountries = countries.filter(c => c.phone_code);

  return (
    <Box sx={{ maxWidth: 120, mr: 1 }}>
      <Autocomplete
        value={selectedCountry || null}
        onChange={(_event: React.SyntheticEvent, newValue: CountryWithIso | null) => {
          if (newValue) {
            onSelect(newValue);
          }
        }}
        options={validCountries}
        getOptionLabel={(option: CountryWithIso) => option.phone_code || ""}
        renderOption={(props, option: CountryWithIso) => (
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
        isOptionEqualToValue={(option: CountryWithIso, value: CountryWithIso) => option.iso_code === value.iso_code}
        filterOptions={(options: CountryWithIso[], { inputValue }: { inputValue: string }) => {
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

export default PhoneCodeAutocomplete;
