/**
 * Debug script to test navbar dropdown functionality
 * This helps identify exactly why the Tutorial format link isn't working
 */

const puppeteer = require('puppeteer');

async function debugNavbar() {
  console.log('🔍 Starting Navbar Dropdown Debug Session');
  console.log('==========================================\n');

  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: false, 
      slowMo: 100,
      devtools: true 
    });
    const page = await browser.newPage();
    
    // Enable console logging from the page
    page.on('console', msg => {
      console.log(`🌐 Browser Console: ${msg.type()}: ${msg.text()}`);
    });
    
    page.on('pageerror', error => {
      console.error(`❌ Page Error: ${error.message}`);
    });

    console.log('📱 Navigating to application...');
    await page.goto('http://127.0.0.1:3000');
    await page.waitForSelector('[data-testid="main-navbar"], .navbar', { timeout: 10000 });

    console.log('✅ Page loaded, testing navbar dropdowns...\n');

    // Test 1: Check if Tutorials dropdown exists and is clickable
    console.log('1️⃣ Testing Tutorials dropdown existence...');
    const tutorialsDropdown = await page.$('button:has-text("Tutorials"), .nav-link:contains("Tutorials")');
    if (!tutorialsDropdown) {
      console.log('❌ Tutorials dropdown element not found!');
      return;
    }
    console.log('✅ Tutorials dropdown element found\n');

    // Test 2: Check dropdown attributes and classes
    console.log('2️⃣ Analyzing dropdown element properties...');
    const dropdownInfo = await page.evaluate(() => {
      const tutorials = Array.from(document.querySelectorAll('*')).find(el => 
        el.textContent && el.textContent.includes('Tutorials') && 
        (el.tagName === 'BUTTON' || el.classList.contains('dropdown-toggle'))
      );
      
      if (!tutorials) return null;
      
      return {
        tagName: tutorials.tagName,
        className: tutorials.className,
        id: tutorials.id,
        disabled: tutorials.disabled,
        ariaExpanded: tutorials.getAttribute('aria-expanded'),
        dataTestId: tutorials.getAttribute('data-testid'),
        onclick: tutorials.onclick ? 'present' : 'missing',
        eventListeners: getEventListeners ? 'checking...' : 'not available'
      };
    });
    
    console.log('Dropdown properties:', dropdownInfo);

    // Test 3: Try clicking the dropdown
    console.log('\n3️⃣ Attempting to click Tutorials dropdown...');
    try {
      await page.click('button:has-text("Tutorials"), [class*="dropdown"]:has-text("Tutorials")');
      await page.waitForTimeout(1000); // Wait for dropdown to open
      
      // Check if dropdown opened
      const isExpanded = await page.evaluate(() => {
        const tutorials = Array.from(document.querySelectorAll('*')).find(el => 
          el.textContent && el.textContent.includes('Tutorials')
        );
        return tutorials ? tutorials.getAttribute('aria-expanded') === 'true' : false;
      });
      
      if (isExpanded) {
        console.log('✅ Dropdown opened successfully!');
        
        // Look for Face-to-face option
        console.log('\n4️⃣ Looking for Face-to-face tutorial option...');
        const faceToFaceOption = await page.$('*:has-text("Face-to-face"), *:has-text("face-to-face")');
        if (faceToFaceOption) {
          console.log('✅ Face-to-face option found!');
          
          // Try clicking it
          console.log('\n5️⃣ Clicking Face-to-face option...');
          await faceToFaceOption.click();
          await page.waitForTimeout(2000);
          
          // Check if URL changed or filters were applied
          const currentUrl = page.url();
          console.log(`Current URL after click: ${currentUrl}`);
          
          if (currentUrl.includes('tutorial') || currentUrl.includes('face-to-face')) {
            console.log('✅ SUCCESS: URL contains tutorial filter!');
          } else {
            console.log('❌ FAILED: URL did not change as expected');
          }
        } else {
          console.log('❌ Face-to-face option not found in dropdown');
        }
      } else {
        console.log('❌ Dropdown did not open');
        
        // Check for JavaScript errors
        console.log('\n🔍 Checking for JavaScript errors...');
        const errors = await page.evaluate(() => {
          return window.console ? 'Console available' : 'Console not available';
        });
        console.log('Console status:', errors);
      }
    } catch (clickError) {
      console.log('❌ Error clicking dropdown:', clickError.message);
    }

    // Test 4: Check if other dropdowns work
    console.log('\n6️⃣ Testing Subjects dropdown for comparison...');
    try {
      await page.click('button:has-text("Subjects")');
      await page.waitForTimeout(1000);
      
      const subjectsExpanded = await page.evaluate(() => {
        const subjects = Array.from(document.querySelectorAll('*')).find(el => 
          el.textContent && el.textContent.includes('Subjects') && el.tagName === 'BUTTON'
        );
        return subjects ? subjects.getAttribute('aria-expanded') === 'true' : false;
      });
      
      console.log(subjectsExpanded ? '✅ Subjects dropdown works!' : '❌ Subjects dropdown also broken');
    } catch (subjectsError) {
      console.log('❌ Error testing Subjects dropdown:', subjectsError.message);
    }

  } catch (error) {
    console.error('❌ Debug session failed:', error.message);
  } finally {
    if (browser) {
      console.log('\n🏁 Debug session complete. Closing browser...');
      await browser.close();
    }
  }
}

// Enhanced version with DOM inspection
async function inspectNavbarDOM() {
  console.log('\n🔬 DOM INSPECTION MODE');
  console.log('====================');

  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  await page.goto('http://127.0.0.1:3000');
  await page.waitForSelector('.navbar', { timeout: 10000 });

  // Extract the entire navbar HTML structure
  const navbarHTML = await page.evaluate(() => {
    const navbar = document.querySelector('.navbar, [class*="navbar"]');
    return navbar ? navbar.outerHTML : 'Navbar not found';
  });

  console.log('📄 Navbar HTML Structure:');
  console.log(navbarHTML.substring(0, 2000) + (navbarHTML.length > 2000 ? '...[truncated]' : ''));

  await browser.close();
}

// Run both debugging modes
if (require.main === module) {
  debugNavbar()
    .then(() => inspectNavbarDOM())
    .catch(console.error);
}

module.exports = { debugNavbar, inspectNavbarDOM };