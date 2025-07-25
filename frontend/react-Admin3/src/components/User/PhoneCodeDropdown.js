import React from "react";
import PropTypes from "prop-types";
import { Form } from "react-bootstrap";

const PhoneCodeDropdown = ({ countries, selectedCountry, onChange, name }) => {
  return (
    <Form.Select
      name={name}
      value={selectedCountry ? selectedCountry.phone_code : ""}
      onChange={e => {
        const code = e.target.value;
        const country = countries.find(c => c.phone_code === code);
        if (country) onChange(country);
      }}
      style={{ maxWidth: 100, display: "inline-block", marginRight: 8 }}
    >
      <option value="">Code</option>
      {countries
        .filter(c => c.phone_code)
        .map(c => (
          <option key={c.iso_code} value={c.phone_code}>
            {c.phone_code} {c.name}
          </option>
        ))}
    </Form.Select>
  );
};

PhoneCodeDropdown.propTypes = {
  countries: PropTypes.array.isRequired,
  selectedCountry: PropTypes.object,
  onChange: PropTypes.func.isRequired,
  name: PropTypes.string
};

export default PhoneCodeDropdown;
