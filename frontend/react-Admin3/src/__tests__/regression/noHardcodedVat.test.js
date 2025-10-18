/**
 * Phase 8 Regression Test - No Hardcoded VAT Logic
 *
 * This test ensures that no hardcoded VAT logic is reintroduced into the codebase.
 * It scans all component files to verify:
 * 1. No hardcoded "VAT (20%)", "VAT (15%)", or "VAT (0%)" strings
 * 2. No hardcoded "Price includes VAT" strings (outside of dynamic variables)
 * 3. All components using VAT display import from vatUtils
 */

import fs from 'fs';
import path from 'path';

describe('Phase 8 Regression - No Hardcoded VAT Logic', () => {
  const componentsDir = path.join(__dirname, '../../components');
  const utilsDir = path.join(__dirname, '../../utils');

  /**
   * Get all JavaScript/JSX files from a directory recursively
   */
  function getAllJsFiles(dir, fileList = []) {
    if (!fs.existsSync(dir)) {
      return fileList;
    }

    const files = fs.readdirSync(dir);

    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        // Skip node_modules, build, and test directories
        if (!['node_modules', 'build', 'dist', '__tests__', '__mocks__'].includes(file)) {
          getAllJsFiles(filePath, fileList);
        }
      } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
        // Skip test files
        if (!file.includes('.test.') && !file.includes('.spec.')) {
          fileList.push(filePath);
        }
      }
    });

    return fileList;
  }

  describe('No hardcoded VAT percentage labels', () => {
    test('no component files contain hardcoded "VAT (20%)"', () => {
      const files = getAllJsFiles(componentsDir);

      const violations = [];

      files.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        const relativePath = path.relative(componentsDir, file);

        // Check for hardcoded "VAT (20%)"
        if (content.match(/["']VAT \(20%\)["']/)) {
          violations.push({
            file: relativePath,
            pattern: 'VAT (20%)'
          });
        }
      });

      if (violations.length > 0) {
        const message = violations
          .map(v => `  - ${v.file}: Contains "${v.pattern}"`)
          .join('\n');

        throw new Error(
          `Found hardcoded VAT (20%) in component files:\n${message}\n\n` +
          `Use formatVatLabel(effectiveVatRate) from vatUtils instead.`
        );
      }

      expect(violations.length).toBe(0);
    });

    test('no component files contain hardcoded "VAT (15%)"', () => {
      const files = getAllJsFiles(componentsDir);

      const violations = [];

      files.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        const relativePath = path.relative(componentsDir, file);

        // Check for hardcoded "VAT (15%)"
        if (content.match(/["']VAT \(15%\)["']/)) {
          violations.push({
            file: relativePath,
            pattern: 'VAT (15%)'
          });
        }
      });

      expect(violations.length).toBe(0);
    });

    test('no component files contain hardcoded "VAT (0%)"', () => {
      const files = getAllJsFiles(componentsDir);

      const violations = [];

      files.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        const relativePath = path.relative(componentsDir, file);

        // Check for hardcoded "VAT (0%)"
        if (content.match(/["']VAT \(0%\)["']/)) {
          violations.push({
            file: relativePath,
            pattern: 'VAT (0%)'
          });
        }
      });

      expect(violations.length).toBe(0);
    });
  });

  describe('No hardcoded VAT status messages', () => {
    test('no component files contain static "Price includes VAT" strings', () => {
      const files = getAllJsFiles(componentsDir);

      const violations = [];

      files.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        const relativePath = path.relative(componentsDir, file);

        // Check for hardcoded "Price includes VAT" that's NOT in a template literal or variable
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          // Skip if it's inside a variable assignment like: vat_status_display = "Price includes VAT"
          if (line.includes('vat_status_display') || line.includes('vatStatusDisplay')) {
            return;
          }

          // Check for static "Price includes VAT" string
          if (line.match(/["']Price includes VAT["']/) && !line.includes('||') && !line.includes('?')) {
            violations.push({
              file: relativePath,
              line: index + 1,
              content: line.trim()
            });
          }
        });
      });

      if (violations.length > 0) {
        const message = violations
          .map(v => `  - ${v.file}:${v.line}: ${v.content}`)
          .join('\n');

        throw new Error(
          `Found hardcoded "Price includes VAT" in component files:\n${message}\n\n` +
          `Use product.vat_status_display or getVatStatusDisplay() from vatUtils instead.`
        );
      }

      expect(violations.length).toBe(0);
    });
  });

  describe('No frontend VAT calculation logic', () => {
    test('no component files contain hardcoded VAT multiplication (e.g., * 1.20)', () => {
      const files = getAllJsFiles(componentsDir);

      const violations = [];

      files.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        const relativePath = path.relative(componentsDir, file);

        // Check for VAT multiplication patterns
        const vatMultiplicationPatterns = [
          /\*\s*1\.20/,  // * 1.20 (UK VAT)
          /\*\s*1\.15/,  // * 1.15 (SA VAT)
          /\*\s*0\.20/,  // * 0.20 (VAT rate)
          /\*\s*0\.15/   // * 0.15 (VAT rate)
        ];

        vatMultiplicationPatterns.forEach(pattern => {
          if (content.match(pattern)) {
            const lines = content.split('\n');
            lines.forEach((line, index) => {
              if (line.match(pattern)) {
                violations.push({
                  file: relativePath,
                  line: index + 1,
                  pattern: pattern.toString()
                });
              }
            });
          }
        });
      });

      if (violations.length > 0) {
        const message = violations
          .map(v => `  - ${v.file}:${v.line}: Contains VAT calculation`)
          .join('\n');

        throw new Error(
          `Found frontend VAT calculation logic:\n${message}\n\n` +
          `VAT should be calculated by backend API only. Frontend should only display values from vatCalculations.`
        );
      }

      expect(violations.length).toBe(0);
    });
  });

  describe('Proper vatUtils imports', () => {
    test('components using vatCalculations import formatVatLabel from vatUtils', () => {
      const files = getAllJsFiles(componentsDir);

      const violations = [];

      files.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        const relativePath = path.relative(componentsDir, file);

        // Check if file uses vatCalculations but doesn't import from vatUtils
        const usesVatCalculations = content.includes('vatCalculations') && content.includes('effective_vat_rate');
        const importsVatUtils = content.match(/from ['"].*vatUtils['"]/);

        if (usesVatCalculations && !importsVatUtils) {
          violations.push({
            file: relativePath,
            reason: 'Uses vatCalculations.totals.effective_vat_rate but does not import formatVatLabel from vatUtils'
          });
        }
      });

      if (violations.length > 0) {
        const message = violations
          .map(v => `  - ${v.file}: ${v.reason}`)
          .join('\n');

        throw new Error(
          `Found components missing vatUtils import:\n${message}\n\n` +
          `Import { formatVatLabel } from '../../utils/vatUtils' to format VAT rates.`
        );
      }

      expect(violations.length).toBe(0);
    });

    test('components using vat_status_display handle missing data gracefully', () => {
      const files = getAllJsFiles(componentsDir);

      const violations = [];

      files.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        const relativePath = path.relative(componentsDir, file);

        // Check if file uses vat_status_display without fallback
        const usesVatStatus = content.match(/product\.vat_status_display/);

        if (usesVatStatus) {
          const lines = content.split('\n');
          let hasProperFallback = false;

          lines.forEach(line => {
            // Check for proper fallback patterns
            if (
              line.includes('product.vat_status_display') &&
              (line.includes('||') || line.includes('?') || line.includes('??'))
            ) {
              hasProperFallback = true;
            }
          });

          if (!hasProperFallback) {
            violations.push({
              file: relativePath,
              reason: 'Uses product.vat_status_display without fallback value'
            });
          }
        }
      });

      if (violations.length > 0) {
        const message = violations
          .map(v => `  - ${v.file}: ${v.reason}`)
          .join('\n');

        throw new Error(
          `Found components using vat_status_display without fallback:\n${message}\n\n` +
          `Use: product.vat_status_display || 'VAT calculated at checkout'`
        );
      }

      expect(violations.length).toBe(0);
    });
  });

  describe('vatUtils.js integrity', () => {
    test('vatUtils.js does not contain hardcoded VAT rates', () => {
      const vatUtilsPath = path.join(utilsDir, 'vatUtils.js');

      if (!fs.existsSync(vatUtilsPath)) {
        throw new Error('vatUtils.js not found! It should exist in src/utils/');
      }

      const content = fs.readFileSync(vatUtilsPath, 'utf8');

      // Check that vatUtils doesn't have getVatRate() function
      if (content.match(/export\s+(const|function)\s+getVatRate/)) {
        throw new Error(
          'vatUtils.js contains getVatRate() function!\n' +
          'This function should not exist. VAT rates come from API only.'
        );
      }

      // Check that vatUtils doesn't have calculateVat() function
      if (content.match(/export\s+(const|function)\s+calculateVat/)) {
        throw new Error(
          'vatUtils.js contains calculateVat() function!\n' +
          'This function should not exist. VAT calculation happens on backend only.'
        );
      }

      // Check for hardcoded rate objects
      if (content.match(/['"]UK['"]\s*:\s*0\.20/) || content.match(/['"]SA['"]\s*:\s*0\.15/)) {
        throw new Error(
          'vatUtils.js contains hardcoded VAT rate mappings!\n' +
          'VAT rates should come from API only.'
        );
      }

      expect(content).toBeTruthy();
    });

    test('vatUtils.js exports required formatting functions', () => {
      const vatUtilsPath = path.join(utilsDir, 'vatUtils.js');
      const content = fs.readFileSync(vatUtilsPath, 'utf8');

      // Check for required exports
      const requiredExports = [
        'formatVatLabel',
        'getVatStatusDisplay',
        'formatPrice'
      ];

      const missingExports = [];

      requiredExports.forEach(exportName => {
        if (!content.match(new RegExp(`export\\s+(const|function)\\s+${exportName}`))) {
          missingExports.push(exportName);
        }
      });

      if (missingExports.length > 0) {
        throw new Error(
          `vatUtils.js is missing required exports: ${missingExports.join(', ')}`
        );
      }

      expect(missingExports.length).toBe(0);
    });
  });

  describe('Documentation and comments', () => {
    test('components have comments explaining dynamic VAT source', () => {
      const files = getAllJsFiles(componentsDir);

      const filesUsingVat = [];
      const filesWithoutComments = [];

      files.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        const relativePath = path.relative(componentsDir, file);

        // Check if file uses vatCalculations
        if (content.includes('vatCalculations') || content.includes('vat_status_display')) {
          filesUsingVat.push(relativePath);

          // Check for Phase 8 comment or API comment
          const hasPhase8Comment = content.includes('Phase 8') ||
                                   content.includes('dynamic VAT') ||
                                   content.includes('VAT from API') ||
                                   content.includes('Uses dynamic VAT');

          if (!hasPhase8Comment) {
            filesWithoutComments.push(relativePath);
          }
        }
      });

      // This is a warning, not a hard failure
      if (filesWithoutComments.length > 0) {
        console.warn(
          `\nWARNING: The following files use VAT data but lack explanatory comments:\n` +
          filesWithoutComments.map(f => `  - ${f}`).join('\n') +
          `\n\nConsider adding comments like: "// Phase 8: Uses dynamic VAT from API"\n`
        );
      }

      // Test always passes, but we log warnings
      expect(filesUsingVat.length).toBeGreaterThanOrEqual(0);
    });
  });
});
