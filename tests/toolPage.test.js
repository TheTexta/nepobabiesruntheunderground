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
  await page.waitForFunction(() => window.world); // ensure world is ready
  const start = await page.evaluate(() => ({ x: window.world.x, y: window.world.y }));
  const canvasSelector = 'canvas';
  const rect = await page.$eval(canvasSelector, el => {
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, width: r.width, height: r.height };
  });
  await page.mouse.move(rect.x + 100, rect.y + 100);
  await page.mouse.down();
  await page.mouse.move(rect.x + 150, rect.y + 150);
  await page.mouse.up();
  const end = await page.evaluate(() => ({ x: window.world.x, y: window.world.y }));
  assert.ok(end.x !== start.x || end.y !== start.y);
  await browser.close();
});

// upload test
test('uploading image adds sprite', async (t) => {
  const { browser, page } = await setup();
  await page.waitForFunction(() => window.world);
  const initialCount = await page.evaluate(() => window.world.children.length);
  const input = await page.$('#file-input');
  const imgPath = path.join(__dirname, '..', 'assets', 'images', 'favicon.png');
  await input.uploadFile(imgPath);
  await page.waitForFunction(() => window.world.children.length > 0);
  const finalCount = await page.evaluate(() => window.world.children.length);
  assert.ok(finalCount > initialCount);
  await browser.close();
});
