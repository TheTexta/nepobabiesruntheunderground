const path = require('path');
const { test } = require('node:test');
const assert = require('assert');
const puppeteer = require('puppeteer');
const fs = require('fs');

const filePath = path.join(__dirname, '..', 'tool.html');
const url = 'file://' + filePath;

async function setup() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--allow-file-access-from-files', '--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  const pixiUrl = 'https://cdn.jsdelivr.net/npm/pixi.js@8.11.0/dist/pixi.min.js';
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (req.url() === pixiUrl) {
      const body = fs.readFileSync(path.join(__dirname, '..', 'node_modules', 'pixi.js', 'dist', 'pixi.min.js'));
      req.respond({ status: 200, contentType: 'application/javascript', body });
    } else {
      req.continue();
    }
  });
  await page.goto(url);
  return { browser, page };
}

// drag test
test('dragging moves world container', async (t) => {
  const { browser, page } = await setup();
  await page.waitForSelector('canvas');
  await page.waitForSelector('#mouse-pos');
  const rect = await page.$eval('canvas', el => {
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, width: r.width, height: r.height };
  });
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;

  const getWorld = async () => {
    const text = await page.$eval('#mouse-pos', el => el.textContent);
    const match = text.match(/World\(([-\d]+), ([-\d]+)\)/);
    return { x: parseInt(match[1], 10), y: parseInt(match[2], 10) };
  };

  await page.mouse.move(centerX, centerY);
  const start = await getWorld();

  await page.mouse.down();
  await page.mouse.move(centerX + 50, centerY + 50);
  await page.mouse.up();

  await page.mouse.move(centerX, centerY);
  const end = await getWorld();
  assert.ok(end.x !== start.x || end.y !== start.y);
  await browser.close();
});

// upload test
test('uploading image adds sprite', async (t) => {
  const { browser, page } = await setup();
  await page.waitForSelector('canvas');
  await page.waitForSelector('#file-input');
  const initialItems = await page.$$eval('#file-list .file-item', els => els.length);
  const input = await page.$('#file-input');
  const imgPath = path.join(__dirname, '..', 'assets', 'images', 'favicon.png');
  await input.uploadFile(imgPath);
  await page.evaluate(() => {
    const input = document.getElementById('file-input');
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForSelector('#file-list .file-item');
  await page.evaluate(() => {
    document.querySelector('#file-list .file-item button[data-action="create"]').click();
  });
  await page.waitForSelector('#file-list .file-item.created');
  const createdCount = await page.$$eval('#file-list .file-item.created', els => els.length);
  assert.ok(createdCount > initialItems);
  await browser.close();
});
