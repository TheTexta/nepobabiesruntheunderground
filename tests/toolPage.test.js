const path = require('path');
const { test } = require('node:test');
const assert = require('assert');
const puppeteer = require('puppeteer');

const filePath = path.join(__dirname, '..', 'tool.html');
const url = 'file://' + filePath;

async function setup() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--allow-file-access-from-files', '--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.goto(url);
  return { browser, page };
}

// drag test
test('dragging moves world container', async (t) => {
  const { browser, page } = await setup();
  
  try {
    // Wait for world with a timeout
    await page.waitForFunction(() => window.world, { timeout: 10000 });
    
    const start = await page.evaluate(() => ({ x: window.world.x, y: window.world.y }));
    const canvasSelector = 'canvas';
    
    // Wait for canvas to be ready
    await page.waitForSelector(canvasSelector, { timeout: 5000 });
    
    const rect = await page.$eval(canvasSelector, el => {
      const r = el.getBoundingClientRect();
      return { x: r.left, y: r.top, width: r.width, height: r.height };
    });
    
    await page.mouse.move(rect.x + 100, rect.y + 100);
    await page.mouse.down();
    await page.mouse.move(rect.x + 150, rect.y + 150);
    await page.mouse.up();
    
    const end = await page.evaluate(() => ({ x: window.world.x, y: window.world.y }));
    assert.ok(end.x !== start.x || end.y !== start.y, 'World position should change after dragging');
  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
});

// upload test
test('uploading image adds sprite', async (t) => {
  const { browser, page } = await setup();
  
  try {
    // Wait for world with a timeout
    await page.waitForFunction(() => window.world, { timeout: 10000 });
    
    const initialCount = await page.evaluate(() => window.world.children.length);
    
    // First, open the menu to make the file input visible
    await page.click('#menu-button');
    await page.waitForSelector('#menu.show', { timeout: 5000 });
    
    const input = await page.$('#file-input');
    
    const imgPath = path.join(__dirname, '..', 'assets', 'images', 'favicons', 'favicon.png');
    await input.uploadFile(imgPath);
    
    // Wait for the file item to appear in the UI
    await page.waitForSelector('.file-item', { timeout: 5000 });
    
    // Click the create button to actually create the sprite
    const createButton = await page.$('.file-item button[data-action="create"]');
    if (!createButton) {
      throw new Error('Create button not found');
    }
    await createButton.click();
    
    // Wait for the image to load and sprite to be created
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const finalCount = await page.evaluate(() => window.world.children.length);
    
    assert.ok(finalCount > initialCount, `World should have more children after uploading and creating a sprite. Initial: ${initialCount}, Final: ${finalCount}`);
  } catch (error) {
    console.error('Upload test failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
});
