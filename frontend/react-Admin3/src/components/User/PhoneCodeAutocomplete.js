import React, { useState, useMemo } from "react";
import PropTypes from "prop-types";
import { Form } from "react-bootstrap";

const PhoneCodeAutocomplete = ({ countries, selectedCountry, onSelect, name, placeholder }) => {
  const [inputValue, setInputValue] = useState(selectedCountry?.phone_code || "");
  const [showDropdown, setShowDropdown] = useState(false);

  const filtered = useMemo(() => {
    if (!inputValue) return countries.filter(c => c.phone_code);
    return countries.filter(
      c => c.phone_code && c.phone_code.replace('+', '').startsWith(inputValue.replace('+', ''))
        || c.name.toLowerCase().includes(inputValue.toLowerCase())
    );
  }, [inputValue, countries]);

  const handleSelect = (country) => {
    setInputValue(country.phone_code);
    onSelect(country);
    setShowDropdown(false);
  };

  return (
    <div style={{ position: "relative", maxWidth: 120, marginRight: 8 }}>
      <Form.Control
        type="text"
        name={name}
        value={inputValue}
        placeholder={placeholder || "Code"}
        autoComplete="off"
        onChange={e => {
          setInputValue(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => setShowDropdown(true)}
        style={{ minWidth: 80, display: "inline-block" }}
      />
      {showDropdown && (
        <div style={{
          position: "absolute",
          zIndex: 1000,
          background: "#fff",
          border: "1px solid #ccc",
          width: "100%",
          maxHeight: 200,
          overflowY: "auto"
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 8, color: '#888' }}>No codes found</div>
          ) : (
            filtered.map((country) => (
              <div
                key={country.iso_code}
                style={{ padding: 8, cursor: "pointer" }}
                onMouseDown={() => handleSelect(country)}
              >
                {country.phone_code} {country.name}
              </div>
            ))
          )}
        </div>
      )}
    </div>
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
