/**
 * Pact test setup - shared configuration for all consumer tests.
 *
 * Uses PactV3 (Pact Specification v3) for consumer-driven contract testing.
 * Each consumer test creates a Pact provider mock, defines interactions,
 * and generates a JSON contract file in the /pacts directory.
 */
const path = require('path');
const { PactV3 } = require('@pact-foundation/pact');

const PACT_DIR = path.resolve(__dirname, '../../../../pacts');

const CONSUMER_NAME = 'Admin3Frontend';
const PROVIDER_NAME = 'Admin3Backend';

/**
 * Create a PactV3 provider instance for consumer tests.
 *
 * @param {object} [overrides] - Override default Pact options
 * @returns {PactV3} Configured Pact provider
 */
function createPactProvider(overrides = {}) {
  return new PactV3({
    consumer: CONSUMER_NAME,
    provider: PROVIDER_NAME,
    dir: PACT_DIR,
    logLevel: process.env.PACT_LOG_LEVEL || 'warn',
    ...overrides,
  });
}

module.exports = {
  createPactProvider,
  PACT_DIR,
  CONSUMER_NAME,
  PROVIDER_NAME,
};
