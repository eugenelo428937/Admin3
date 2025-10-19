import React from "react";
import PropTypes from "prop-types";
import { Select, MenuItem } from "@mui/material";

const PhoneCodeDropdown = ({ countries, selectedCountry, onChange, name }) => {
  return (
    <Select
      name={name}
      value={selectedCountry ? selectedCountry.phone_code : ""}
      onChange={e => {
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

PhoneCodeDropdown.propTypes = {
  countries: PropTypes.array.isRequired,
  selectedCountry: PropTypes.object,
  onChange: PropTypes.func.isRequired,
  name: PropTypes.string
};

export default PhoneCodeDropdown;
