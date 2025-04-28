import React, { useState, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import { Form } from "react-bootstrap";
import config from "../config";

const frequentCountries = [
  "United Kingdom",
  "India",
  "South Africa"
];

const API_URL = config.countryUrl || "/api/countries/countries/";

const CountryAutocomplete = ({ value, onChange, placeholder, isInvalid, feedback, inputRef, name }) => {
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
    <div ref={containerRef} style={{ position: "relative" }}>
      <Form.Control
        type="text"
        name={name}
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => setShowDropdown(true)}
        autoComplete="off"
        placeholder={placeholder}
        isInvalid={isInvalid}
        ref={inputRef}
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
            <div style={{ padding: 8, color: '#888' }}>No countries found</div>
          ) : (
            filtered.map((country) => (
              <div
                key={country.iso_code}
                style={{ padding: 8, cursor: "pointer" }}
                onMouseDown={() => handleSelect(country)}
              >
                {country.name} {country.phone_code && <span style={{color:'#888'}}>({country.phone_code})</span>}
              </div>
            ))
          )}
        </div>
      )}
      {feedback && isInvalid && (
        <div className="invalid-feedback" style={{ display: 'block' }}>{feedback}</div>
      )}
    </div>
  );
};

CountryAutocomplete.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  isInvalid: PropTypes.bool,
  feedback: PropTypes.string,
  inputRef: PropTypes.any,
  name: PropTypes.string
};

export default CountryAutocomplete;
