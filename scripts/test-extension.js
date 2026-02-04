import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const extensionPath = join(__dirname, '..', 'dist', 'chrome');

const errors = [];
const logs = [];

async function testExtension() {
  console.log('Launching Chrome with extension...');
  console.log('Extension path:', extensionPath);

  const browser = await puppeteer.launch({
    headless: false, // Extensions require non-headless mode
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-first-run',
      '--no-default-browser-check',
    ],
  });

  // Wait for service worker to initialize
  await new Promise(r => setTimeout(r, 2000));

  // Get the service worker target
  const targets = await browser.targets();
  const serviceWorkerTarget = targets.find(
    t => t.type() === 'service_worker' && t.url().includes('service-worker')
  );

  if (serviceWorkerTarget) {
    console.log('✓ Service worker found:', serviceWorkerTarget.url());

    // Try to get the worker and check for errors
    try {
      const worker = await serviceWorkerTarget.worker();
      if (worker) {
        worker.on('console', msg => {
          const text = `[SW] ${msg.type()}: ${msg.text()}`;
          logs.push(text);
          console.log(text);
        });

        worker.on('pageerror', err => {
          const text = `[SW ERROR] ${err.message}`;
          errors.push(text);
          console.error(text);
        });
      }
    } catch (e) {
      console.log('Could not attach to service worker:', e.message);
    }
  } else {
    console.error('✗ Service worker NOT found!');
    errors.push('Service worker not found');
  }

  // Open a test page
  const page = await browser.newPage();

  page.on('console', msg => {
    const text = `[Page] ${msg.type()}: ${msg.text()}`;
    logs.push(text);
    console.log(text);
  });

  page.on('pageerror', err => {
    const text = `[Page ERROR] ${err.message}`;
    errors.push(text);
    console.error(text);
  });

  // Test 1: Navigate to blocked domain
  console.log('\n--- Test 1: Navigate to coinmarketcap.com ---');
  try {
    await page.goto('https://coinmarketcap.com', { waitUntil: 'domcontentloaded', timeout: 10000 });
    const url = page.url();
    console.log('Current URL:', url);

    if (url.includes('blocked.html')) {
      console.log('✓ Blocked page shown!');
    } else if (url.includes('coinmarketcap.com')) {
      console.log('✗ NOT blocked - reached coinmarketcap.com');
      errors.push('Domain blocking not working');
    }
  } catch (e) {
    console.log('Navigation result:', e.message);
  }

  // Test 2: Check extension popup
  console.log('\n--- Test 2: Check extension page ---');
  const extensionId = serviceWorkerTarget?.url()?.match(/chrome-extension:\/\/([^/]+)/)?.[1];
  if (extensionId) {
    console.log('Extension ID:', extensionId);
    try {
      await page.goto(`chrome-extension://${extensionId}/pages/options/options.html`, { waitUntil: 'domcontentloaded' });
      console.log('✓ Options page loaded');

      // Check if presets loaded
      const presetsText = await page.evaluate(() => {
        const el = document.getElementById('presets-list');
        return el ? el.innerText : 'NOT FOUND';
      });
      console.log('Presets content:', presetsText || '(empty)');
    } catch (e) {
      console.log('Options page error:', e.message);
    }
  }

  // Summary
  console.log('\n========== SUMMARY ==========');
  console.log('Errors:', errors.length);
  errors.forEach(e => console.log('  -', e));
  console.log('Logs collected:', logs.length);

  // Keep browser open for manual inspection
  console.log('\nBrowser will stay open for 30 seconds for manual inspection...');
  console.log('Press Ctrl+C to close earlier.');

  await new Promise(r => setTimeout(r, 30000));

  await browser.close();

  process.exit(errors.length > 0 ? 1 : 0);
}

testExtension().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
