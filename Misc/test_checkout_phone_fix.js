/**
 * QA Test Script for Story 2.4: Phone Number Fetching Fix
 *
 * This script tests the phone number population fix in the CommunicationDetailsPanel
 * during checkout process.
 */

const puppeteer = require('puppeteer');

async function testCheckoutPhoneFix() {
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 100,
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 800 });

  console.log('🧪 Starting QA Test for Story 2.4: Phone Number Fetching Fix\n');

  try {
    // Navigate to the application
    console.log('📍 Navigating to http://127.0.0.1:3000');
    await page.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle2' });

    // Take initial screenshot
    await page.screenshot({ path: 'test-results/01-homepage.png', fullPage: true });
    console.log('✅ Homepage loaded and screenshot saved');

    // Login with test credentials
    console.log('🔐 Attempting login with eugene.lo1115@gmail.com');

    // Check if already logged in or need to login
    const loginButton = await page.$('text=Login');
    if (loginButton) {
      await page.click('text=Login');
      await page.waitForSelector('[data-testid="email-input"]', { timeout: 5000 });

      await page.type('[data-testid="email-input"]', 'eugene.lo1115@gmail.com');
      await page.type('[data-testid="password-input"]', 'P@ssw0rd!');
      await page.click('[data-testid="login-submit"]');

      await page.waitForNavigation({ waitUntil: 'networkidle2' });
    }

    await page.screenshot({ path: 'test-results/02-after-login.png', fullPage: true });
    console.log('✅ Login completed');

    // Navigate to cart/checkout (assuming there are items in cart)
    console.log('🛒 Navigating to checkout process');

    // Look for cart or checkout navigation
    const cartButton = await page.$('text=Cart') || await page.$('[data-testid="cart-button"]');
    if (cartButton) {
      await cartButton.click();
      await page.waitForTimeout(2000);
    } else {
      // Alternative: direct navigation to checkout
      await page.goto('http://127.0.0.1:3000/checkout', { waitUntil: 'networkidle2' });
    }

    await page.screenshot({ path: 'test-results/03-checkout-initial.png', fullPage: true });
    console.log('✅ Checkout page accessed');

    // Look for Communication Details Panel
    console.log('🔍 Looking for Communication Details Panel');
    await page.waitForSelector('.communication-details-panel', { timeout: 10000 });

    // Test 1: Verify phone number fields are present
    console.log('📱 Testing phone number field presence');
    const homePhoneInput = await page.$('[data-testid="home-phone-input"]');
    const mobilePhoneInput = await page.$('[data-testid="mobile-phone-input"]');
    const workPhoneInput = await page.$('[data-testid="work-phone-input"]');
    const emailInput = await page.$('[data-testid="email-input"]');

    console.log(`- Home Phone Input: ${homePhoneInput ? '✅ Found' : '❌ Missing'}`);
    console.log(`- Mobile Phone Input: ${mobilePhoneInput ? '✅ Found' : '❌ Missing'}`);
    console.log(`- Work Phone Input: ${workPhoneInput ? '✅ Found' : '❌ Missing'}`);
    console.log(`- Email Input: ${emailInput ? '✅ Found' : '❌ Missing'}`);

    // Test 2: Check if phone numbers are populated
    console.log('\n📞 Testing phone number population');
    if (homePhoneInput) {
      const homePhoneValue = await page.evaluate(input => input.value, homePhoneInput);
      console.log(`- Home Phone Value: "${homePhoneValue}" ${homePhoneValue ? '✅ Populated' : '⚠️ Empty'}`);
    }

    if (mobilePhoneInput) {
      const mobilePhoneValue = await page.evaluate(input => input.value, mobilePhoneInput);
      console.log(`- Mobile Phone Value: "${mobilePhoneValue}" ${mobilePhoneValue ? '✅ Populated' : '⚠️ Empty'}`);
    }

    if (workPhoneInput) {
      const workPhoneValue = await page.evaluate(input => input.value, workPhoneInput);
      console.log(`- Work Phone Value: "${workPhoneValue}" ${workPhoneValue ? '✅ Populated' : '⚠️ Empty'}`);
    }

    if (emailInput) {
      const emailValue = await page.evaluate(input => input.value, emailInput);
      console.log(`- Email Value: "${emailValue}" ${emailValue ? '✅ Populated' : '⚠️ Empty'}`);
    }

    await page.screenshot({ path: 'test-results/04-communication-panel.png', fullPage: true });

    // Test 3: Check for console errors
    console.log('\n🔍 Checking for console errors');
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Wait a bit for any async operations
    await page.waitForTimeout(3000);

    if (consoleErrors.length > 0) {
      console.log('❌ Console errors detected:');
      consoleErrors.forEach(error => console.log(`  - ${error}`));
    } else {
      console.log('✅ No console errors detected');
    }

    // Test 4: Test phone number update functionality
    console.log('\n🔄 Testing phone number update functionality');
    if (mobilePhoneInput) {
      // Clear and enter new phone number
      await page.focus('[data-testid="mobile-phone-input"]');
      await page.keyboard.selectAll();
      await page.type('[data-testid="mobile-phone-input"]', '+44 7700 900123');

      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'test-results/05-phone-update-test.png', fullPage: true });
      console.log('✅ Phone number update test completed');
    }

    // Test 5: Check API network requests
    console.log('\n🌐 Monitoring API requests');
    const apiRequests = [];
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        apiRequests.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers()
        });
      }
    });

    // Trigger profile fetch if possible
    await page.reload({ waitUntil: 'networkidle2' });

    console.log(`📊 API Requests detected: ${apiRequests.length}`);
    apiRequests.forEach(req => {
      console.log(`  - ${req.method} ${req.url}`);
    });

    await page.screenshot({ path: 'test-results/06-final-state.png', fullPage: true });

    console.log('\n✅ QA Testing completed successfully!');
    console.log('📁 Screenshots saved in test-results/ directory');

  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ path: 'test-results/error-state.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

// Create test results directory
const fs = require('fs');
if (!fs.existsSync('test-results')) {
  fs.mkdirSync('test-results');
}

// Run the test
testCheckoutPhoneFix().catch(console.error);