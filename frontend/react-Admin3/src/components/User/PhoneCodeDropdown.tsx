import React from "react";
import { Select, MenuItem, SelectChangeEvent } from "@mui/material";
import type { Country } from "../../types/auth";

interface CountryWithIso extends Country {
  iso_code: string;
}

interface PhoneCodeDropdownProps {
  countries: CountryWithIso[];
  selectedCountry?: CountryWithIso | null;
  onChange: (country: CountryWithIso) => void;
  name?: string;
}

const PhoneCodeDropdown: React.FC<PhoneCodeDropdownProps> = ({ countries, selectedCountry, onChange, name }) => {
  return (
    <Select
      name={name}
      value={selectedCountry ? selectedCountry.phone_code : ""}
      onChange={(e: SelectChangeEvent<string>) => {
        const code = e.target.value;
        const country = countries.find(c => c.phone_code === code);
        if (country) onChange(country);
      }}
      sx={{ maxWidth: 100, display: "inline-block", mr: 1 }}
    >
      <MenuItem value="">Code</MenuItem>
      {countries
        .filter(c => c.phone_code)
        .map(c => (
          <MenuItem key={c.iso_code} value={c.phone_code}>
            {c.phone_code} {c.name}
          </MenuItem>
        ))}
    </Select>
  );
};

export default PhoneCodeDropdown;
