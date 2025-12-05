#!/usr/bin/env node

/**
 * Test Script for Google libaddressinput API
 *
 * Usage: node scripts/test-libaddressinput.js [country_codes...]
 *
 * Examples:
 *   node scripts/test-libaddressinput.js           # Test common countries
 *   node scripts/test-libaddressinput.js GB US     # Test specific countries
 *   node scripts/test-libaddressinput.js --all     # Test all available countries
 *   node scripts/test-libaddressinput.js --raw GB  # Show raw API response only
 */

const GOOGLE_ADDRESS_DATA_URL = 'https://chromium-i18n.appspot.com/ssl-address/data';

// Field type mappings from Google's format to our format
const GOOGLE_FIELD_MAPPINGS = {
  'A': 'address',      // Street Address
  'C': 'city',         // City/Locality
  'S': 'state',        // State/Province/Region
  'Z': 'postal_code',  // Postal Code/ZIP
  'X': 'sorting_code', // Sorting Code
  'D': 'dependent_locality', // Dependent locality
  'O': 'organization', // Organization
  'N': 'name'          // Name
};

// Common countries to test by default
const COMMON_COUNTRIES = ['GB', 'US', 'DE', 'FR', 'AU', 'CA', 'IN', 'JP', 'CN', 'BR', 'MX', 'IE', 'NZ'];

// Helper functions
const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    countries: [],
    showRaw: false,
    showAll: false,
    compare: false
  };

  args.forEach(arg => {
    if (arg === '--raw') options.showRaw = true;
    else if (arg === '--all') options.showAll = true;
    else if (arg === '--compare') options.compare = true;
    else if (arg.length === 2) options.countries.push(arg.toUpperCase());
  });

  return options;
};

const fetchMetadata = async (countryCode) => {
  try {
    const url = `${GOOGLE_ADDRESS_DATA_URL}/${countryCode}`;
    const response = await fetch(url);

    if (!response.ok) {
      return { error: `HTTP ${response.status}` };
    }

    return await response.json();
  } catch (error) {
    return { error: error.message };
  }
};

const fetchAvailableCountries = async () => {
  try {
    const response = await fetch(GOOGLE_ADDRESS_DATA_URL);
    const data = await response.json();
    return data.countries ? data.countries.split('~') : [];
  } catch (error) {
    console.error('Failed to fetch country list:', error.message);
    return COMMON_COUNTRIES;
  }
};

const parseFormat = (format) => {
  if (!format) return [];
  const fields = [];
  const matches = format.match(/%[A-Z]/g) || [];

  matches.forEach(match => {
    const fieldKey = match.substring(1);
    const fieldName = GOOGLE_FIELD_MAPPINGS[fieldKey];
    if (fieldName && !fields.includes(fieldName)) {
      fields.push(fieldName);
    }
  });

  return fields;
};

const parseRequired = (requireString) => {
  if (!requireString) return [];
  const required = [];

  for (let i = 0; i < requireString.length; i++) {
    const fieldKey = requireString[i];
    const fieldName = GOOGLE_FIELD_MAPPINGS[fieldKey];
    if (fieldName && !required.includes(fieldName)) {
      required.push(fieldName);
    }
  }

  return required;
};

const formatRow = (label, value, width = 20) => {
  const paddedLabel = label.padEnd(width);
  return `  ${paddedLabel}: ${value}`;
};

const printDivider = (char = '-', length = 60) => {
  console.log(char.repeat(length));
};

const printCountryDetails = (countryCode, data, showRaw = false) => {
  console.log('\n');
  printDivider('=');
  console.log(`  Country: ${countryCode} - ${data.name || 'Unknown'}`);
  printDivider('=');

  if (data.error) {
    console.log(`  Error: ${data.error}`);
    return;
  }

  if (showRaw) {
    console.log('\n  Raw API Response:');
    console.log(JSON.stringify(data, null, 2).split('\n').map(l => '  ' + l).join('\n'));
    return;
  }

  // Key fields
  console.log('\n  === Format String ===');
  console.log(formatRow('Raw Format (fmt)', data.fmt || 'N/A'));
  console.log(formatRow('Required (require)', data.require || 'N/A'));
  console.log(formatRow('Uppercase (upper)', data.upper || 'N/A'));

  // Parsed fields
  const fields = parseFormat(data.fmt);
  const required = parseRequired(data.require);
  const optional = fields.filter(f => !required.includes(f));

  console.log('\n  === Parsed Fields ===');
  console.log(formatRow('All Fields', fields.join(', ') || 'None'));
  console.log(formatRow('Required', required.join(', ') || 'None'));
  console.log(formatRow('Optional', optional.join(', ') || 'None'));

  // Postcode info
  console.log('\n  === Postcode Info ===');
  console.log(formatRow('Has Postcode', fields.includes('postal_code') ? 'Yes' : 'No'));
  console.log(formatRow('Postcode Pattern (zip)', data.zip || 'N/A'));
  console.log(formatRow('Postcode Name', data.zip_name_type || 'postal code'));
  console.log(formatRow('Postcode Examples', data.zipex || 'N/A'));

  // State/region info
  console.log('\n  === State/Region Info ===');
  console.log(formatRow('Has States', data.sub_keys ? 'Yes' : 'No'));
  console.log(formatRow('State Name Type', data.state_name_type || 'state'));
  if (data.sub_keys) {
    const states = data.sub_keys.split('~');
    const stateNames = data.sub_names ? data.sub_names.split('~') : states;
    console.log(formatRow('State Count', states.length.toString()));
    console.log(formatRow('First 5 States', stateNames.slice(0, 5).join(', ')));
  }

  // Locality info
  console.log('\n  === Locality Info ===');
  console.log(formatRow('Locality Name', data.locality_name_type || 'city'));
  console.log(formatRow('Sublocality Name', data.sublocality_name_type || 'suburb'));

  // Language info
  console.log('\n  === Language Info ===');
  console.log(formatRow('Languages', data.languages || 'N/A'));
  console.log(formatRow('Input Latin', data.lfmt ? 'Yes' : 'No'));
  if (data.lfmt) {
    console.log(formatRow('Latin Format', data.lfmt));
  }
};

const printComparisonTable = (results) => {
  console.log('\n');
  printDivider('=', 100);
  console.log('  COMPARISON TABLE');
  printDivider('=', 100);

  // Headers
  const headers = ['Country', 'Fields', 'Required', 'Has Postcode', 'Has States', 'Postcode Pattern'];
  console.log('  ' + headers.map((h, i) => h.padEnd(i === 0 ? 10 : 15)).join(' | '));
  printDivider('-', 100);

  // Rows
  results.forEach(({ countryCode, data }) => {
    if (data.error) {
      console.log(`  ${countryCode.padEnd(10)} | Error: ${data.error}`);
      return;
    }

    const fields = parseFormat(data.fmt);
    const required = parseRequired(data.require);

    const row = [
      countryCode,
      fields.length.toString(),
      required.length.toString(),
      fields.includes('postal_code') ? 'Yes' : 'No',
      data.sub_keys ? 'Yes' : 'No',
      data.zip ? data.zip.substring(0, 15) + '...' : 'N/A'
    ];

    console.log('  ' + row.map((r, i) => r.padEnd(i === 0 ? 10 : 15)).join(' | '));
  });
};

const printFieldAnalysis = (results) => {
  console.log('\n');
  printDivider('=', 80);
  console.log('  FIELD ANALYSIS');
  printDivider('=', 80);

  const fieldUsage = {};
  const requiredUsage = {};

  results.forEach(({ countryCode, data }) => {
    if (data.error) return;

    const fields = parseFormat(data.fmt);
    const required = parseRequired(data.require);

    fields.forEach(field => {
      if (!fieldUsage[field]) fieldUsage[field] = [];
      fieldUsage[field].push(countryCode);
    });

    required.forEach(field => {
      if (!requiredUsage[field]) requiredUsage[field] = [];
      requiredUsage[field].push(countryCode);
    });
  });

  console.log('\n  Field Usage Across Countries:');
  Object.entries(fieldUsage)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([field, countries]) => {
      const pct = Math.round((countries.length / results.length) * 100);
      console.log(`    ${field.padEnd(20)}: ${countries.length} countries (${pct}%)`);
    });

  console.log('\n  Required Field Usage:');
  Object.entries(requiredUsage)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([field, countries]) => {
      const pct = Math.round((countries.length / results.length) * 100);
      console.log(`    ${field.padEnd(20)}: ${countries.length} countries (${pct}%)`);
    });
};

// Main execution
const main = async () => {
  const options = parseArgs();

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║     Google libaddressinput API Test Script                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\n  API URL: ${GOOGLE_ADDRESS_DATA_URL}`);

  // Determine which countries to test
  let countries;
  if (options.showAll) {
    console.log('\n  Fetching list of all available countries...');
    countries = await fetchAvailableCountries();
    console.log(`  Found ${countries.length} countries`);
  } else if (options.countries.length > 0) {
    countries = options.countries;
  } else {
    countries = COMMON_COUNTRIES;
    console.log('\n  Testing common countries (use --all for all countries)');
  }

  console.log(`\n  Countries to test: ${countries.join(', ')}`);

  // Fetch metadata for all countries
  const results = [];
  for (const countryCode of countries) {
    process.stdout.write(`  Fetching ${countryCode}...`);
    const data = await fetchMetadata(countryCode);
    results.push({ countryCode, data });
    console.log(' done');
  }

  // Display results
  if (options.compare || countries.length > 5) {
    printComparisonTable(results);
    printFieldAnalysis(results);
  }

  // Show individual country details
  for (const { countryCode, data } of results) {
    printCountryDetails(countryCode, data, options.showRaw);
  }

  console.log('\n');
  printDivider('=');
  console.log('  Test complete!');
  printDivider('=');
  console.log('\n');
};

main().catch(console.error);
