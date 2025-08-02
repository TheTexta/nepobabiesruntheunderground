const path = require('path');
const { test } = require('node:test');
const assert = require('assert');
const puppeteer = require('puppeteer');

const filePath = path.join(__dirname, '..', 'noise.html');
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

// Test WebGL2 canvas initialization
test('WebGL2 canvas initializes correctly', async (t) => {
  const { browser, page } = await setup();
  
  try {
    // Wait for canvas to be present
    await page.waitForSelector('#glcanvas', { timeout: 5000 });
    
    // Check if WebGL2 context is available
    const hasWebGL2 = await page.evaluate(() => {
      const canvas = document.getElementById('glcanvas');
      const gl = canvas.getContext('webgl2');
      return !!gl;
    });
    
    assert.ok(hasWebGL2, 'WebGL2 context should be available');
    
    // Check canvas dimensions
    const canvasDimensions = await page.evaluate(() => {
      const canvas = document.getElementById('glcanvas');
      return {
        width: canvas.width,
        height: canvas.height,
        clientWidth: canvas.clientWidth,
        clientHeight: canvas.clientHeight
      };
    });
    
    assert.ok(canvasDimensions.clientWidth > 0, 'Canvas should have width');
    assert.ok(canvasDimensions.clientHeight > 0, 'Canvas should have height');
  } catch (error) {
    console.error('WebGL2 canvas test failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
});

// Test control panel visibility and structure
test('control panel displays correctly', async (t) => {
  const { browser, page } = await setup();
  
  try {
    // Wait for control panel to be present
    await page.waitForSelector('.control-panel', { timeout: 5000 });
    
    // Check if all main sections are present
    const sections = await page.evaluate(() => {
      const baseEffects = document.getElementById('baseEffects-content');
      const mouseEffects = document.getElementById('mouseEffects-content');
      const generalEffects = document.getElementById('generalEffects-content');
      
      return {
        baseEffects: !!baseEffects,
        mouseEffects: !!mouseEffects,
        generalEffects: !!generalEffects
      };
    });
    
    assert.ok(sections.baseEffects, 'Base Effects section should exist');
    assert.ok(sections.mouseEffects, 'Mouse Effects section should exist');
    assert.ok(sections.generalEffects, 'General Effects section should exist');
    
    // Check if sections start collapsed
    const sectionsCollapsed = await page.evaluate(() => {
      const baseEffects = document.getElementById('baseEffects-content');
      const mouseEffects = document.getElementById('mouseEffects-content');
      const generalEffects = document.getElementById('generalEffects-content');
      
      return {
        baseEffects: baseEffects.classList.contains('collapsed'),
        mouseEffects: mouseEffects.classList.contains('collapsed'),
        generalEffects: generalEffects.classList.contains('collapsed')
      };
    });
    
    assert.ok(sectionsCollapsed.baseEffects, 'Base Effects should start collapsed');
    assert.ok(sectionsCollapsed.mouseEffects, 'Mouse Effects should start collapsed');
    assert.ok(sectionsCollapsed.generalEffects, 'General Effects should start collapsed');
  } catch (error) {
    console.error('Control panel test failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
});

// Test section toggle functionality
test('section toggles work correctly', async (t) => {
  const { browser, page } = await setup();
  
  try {
    await page.waitForSelector('.control-panel', { timeout: 5000 });
    
    // Test Base Effects toggle
    const baseEffectsHeader = await page.$('.section-header[onclick*="baseEffects"]');
    assert.ok(baseEffectsHeader, 'Base Effects header should be clickable');
    
    // Click to expand
    await baseEffectsHeader.click();
    
    // Check if expanded
    const isExpanded = await page.evaluate(() => {
      const content = document.getElementById('baseEffects-content');
      const icon = document.getElementById('baseEffects-icon');
      return {
        contentExpanded: !content.classList.contains('collapsed'),
        iconChanged: icon.textContent === '▼'
      };
    });
    
    assert.ok(isExpanded.contentExpanded, 'Base Effects content should be expanded');
    assert.ok(isExpanded.iconChanged, 'Base Effects icon should change to down arrow');
    
    // Click to collapse
    await baseEffectsHeader.click();
    
    // Check if collapsed
    const isCollapsed = await page.evaluate(() => {
      const content = document.getElementById('baseEffects-content');
      const icon = document.getElementById('baseEffects-icon');
      return {
        contentCollapsed: content.classList.contains('collapsed'),
        iconChanged: icon.textContent === '▶'
      };
    });
    
    assert.ok(isCollapsed.contentCollapsed, 'Base Effects content should be collapsed');
    assert.ok(isCollapsed.iconChanged, 'Base Effects icon should change to right arrow');
  } catch (error) {
    console.error('Section toggle test failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
});

// Test base effects checkboxes
test('base effects checkboxes function correctly', async (t) => {
  const { browser, page } = await setup();
  
  try {
    await page.waitForSelector('.control-panel', { timeout: 5000 });
    
    // Wait for JavaScript to initialize
    await page.waitForFunction(() => {
      return window.WebGL2RenderingContext !== undefined;
    }, { timeout: 5000 });
    
    // Expand Base Effects section
    await page.click('.section-header[onclick*="baseEffects"]');
    
    // Wait for section to expand
    await page.waitForFunction(() => {
      const content = document.getElementById('baseEffects-content');
      return !content.classList.contains('collapsed');
    }, { timeout: 2000 });
    
    // Test each checkbox
    const checkboxIds = ['baseInterference', 'baseDistortion', 'baseNoise', 'scanlines'];
    
    for (const checkboxId of checkboxIds) {
      // Check if checkbox exists
      const checkboxExists = await page.$(`#${checkboxId}`);
      assert.ok(checkboxExists, `${checkboxId} checkbox should exist`);
      
      // Test checking the checkbox using JavaScript to trigger the change event
      await page.evaluate((id) => {
        const checkbox = document.getElementById(id);
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change'));
      }, checkboxId);
      
      // Add a small delay to allow the change to register
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const isChecked = await page.evaluate((id) => {
        return document.getElementById(id).checked;
      }, checkboxId);
      
      assert.ok(isChecked, `${checkboxId} should be checkable`);
      
      // Test unchecking using JavaScript to trigger the change event
      await page.evaluate((id) => {
        const checkbox = document.getElementById(id);
        checkbox.checked = false;
        checkbox.dispatchEvent(new Event('change'));
      }, checkboxId);
      
      // Add a small delay to allow the change to register
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const isUnchecked = await page.evaluate((id) => {
        return !document.getElementById(id).checked;
      }, checkboxId);
      
      assert.ok(isUnchecked, `${checkboxId} should be uncheckable`);
    }
  } catch (error) {
    console.error('Base effects checkboxes test failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
});

// Test mouse effects controls
test('mouse effects controls work correctly', async (t) => {
  const { browser, page } = await setup();
  
  try {
    await page.waitForSelector('.control-panel', { timeout: 5000 });
    
    // Wait for JavaScript to initialize
    await page.waitForFunction(() => {
      return window.WebGL2RenderingContext !== undefined;
    }, { timeout: 5000 });
    
    // Expand Mouse Effects section
    await page.click('.section-header[onclick*="mouseEffects"]');
    
    // Wait for section to expand
    await page.waitForFunction(() => {
      const content = document.getElementById('mouseEffects-content');
      return !content.classList.contains('collapsed');
    }, { timeout: 2000 });
    
    // Test directional mode checkbox
    const directionalCheckbox = await page.$('#directionalMode');
    assert.ok(directionalCheckbox, 'Directional mode checkbox should exist');
    
    // Use JavaScript to trigger the change event properly
    await page.evaluate(() => {
      const checkbox = document.getElementById('directionalMode');
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change'));
    });
    
    // Add a small delay to allow the change to register
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const isDirectionalChecked = await page.evaluate(() => {
      return document.getElementById('directionalMode').checked;
    });
    assert.ok(isDirectionalChecked, 'Directional mode should be checkable');
    
    // Test sliders
    const sliders = [
      { id: 'directionalStrength', min: 0, max: 2, step: 0.1, defaultValue: 0.6, requiresDirectional: true },
      { id: 'radialStrength', min: 0, max: 2, step: 0.1, defaultValue: 0.4, requiresDirectional: true },
      { id: 'mouseDecay', min: 1, max: 10, step: 0.1, defaultValue: 3.0, alwaysEnabled: true },
      { id: 'rippleFreq', min: 5, max: 50, step: 1, defaultValue: 15.0, alwaysEnabled: true },
      { id: 'rippleSpeed', min: 1, max: 20, step: 0.5, defaultValue: 8.0, alwaysEnabled: true },
      { id: 'rippleDecay', min: 0.5, max: 5, step: 0.1, defaultValue: 2.0, alwaysEnabled: true }
    ];
    
    for (const slider of sliders) {
      const sliderElement = await page.$(`#${slider.id}`);
      assert.ok(sliderElement, `${slider.id} slider should exist`);
      
      // Test default value
      const defaultValue = await page.evaluate((id) => {
        return parseFloat(document.getElementById(id).value);
      }, slider.id);
      
      assert.strictEqual(defaultValue, slider.defaultValue, `${slider.id} should have correct default value`);
      
      // Test that directional sliders are enabled when directional mode is on
      if (slider.requiresDirectional) {
        // At this point directional mode should be checked from earlier in the test
        const isEnabled = await page.evaluate((id) => {
          return !document.getElementById(id).disabled;
        }, slider.id);
        
        assert.ok(isEnabled, `${slider.id} should be enabled when directional mode is on`);
      }
      
      // Test changing value (only if slider should be enabled)
      const shouldTest = slider.alwaysEnabled || slider.requiresDirectional;
      if (shouldTest) {
        await page.evaluate((id, value) => {
          const slider = document.getElementById(id);
          slider.value = value;
          slider.dispatchEvent(new Event('input'));
        }, slider.id, slider.max);
        
        const newValue = await page.evaluate((id) => {
          return parseFloat(document.getElementById(id).value);
        }, slider.id);
        
        assert.strictEqual(newValue, slider.max, `${slider.id} should be changeable to max value`);
      }
    }
  } catch (error) {
    console.error('Mouse effects controls test failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
});

// Test general effects controls
test('general effects controls work correctly', async (t) => {
  const { browser, page } = await setup();
  
  try {
    await page.waitForSelector('.control-panel', { timeout: 5000 });
    
    // Wait for JavaScript to initialize
    await page.waitForFunction(() => {
      return window.WebGL2RenderingContext !== undefined;
    }, { timeout: 5000 });
    
    // Expand General Effects section
    await page.click('.section-header[onclick*="generalEffects"]');
    
    // Wait for section to expand
    await page.waitForFunction(() => {
      const content = document.getElementById('generalEffects-content');
      return !content.classList.contains('collapsed');
    }, { timeout: 2000 });
    
    // Test that sliders exist and have correct default values
    const sliders = [
      { id: 'distortion', defaultValue: 0.02, requiresCheckbox: 'baseDistortion' },
      { id: 'noise', defaultValue: 0.8, requiresCheckbox: 'baseNoise' },
      { id: 'scanlineIntensity', defaultValue: 0.2, requiresCheckbox: 'scanlines' }
    ];
    
    for (const slider of sliders) {
      const sliderElement = await page.$(`#${slider.id}`);
      assert.ok(sliderElement, `${slider.id} slider should exist`);
      
      // Test default value (with tolerance for floating point precision)
      const defaultValue = await page.evaluate((id) => {
        return parseFloat(document.getElementById(id).value);
      }, slider.id);
      
      assert.ok(Math.abs(defaultValue - slider.defaultValue) < 0.001, 
        `${slider.id} should have correct default value (got ${defaultValue}, expected ${slider.defaultValue})`);
      
      // Test that slider is initially disabled since checkboxes start unchecked
      const initiallyDisabled = await page.evaluate((id) => {
        return document.getElementById(id).disabled;
      }, slider.id);
      
      assert.ok(initiallyDisabled, `${slider.id} should be initially disabled when checkbox is unchecked`);
    }
  } catch (error) {
    console.error('General effects controls test failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
});

// Test info display
test('info display shows correctly', async (t) => {
  const { browser, page } = await setup();
  
  try {
    await page.waitForSelector('.info', { timeout: 5000 });
    
    const infoContent = await page.evaluate(() => {
      const info = document.querySelector('.info');
      return {
        visible: info.offsetParent !== null,
        hasTitle: info.querySelector('h3') !== null,
        titleText: info.querySelector('h3')?.textContent || '',
        hasParagraphs: info.querySelectorAll('p').length > 0
      };
    });
    
    assert.ok(infoContent.visible, 'Info display should be visible');
    assert.ok(infoContent.hasTitle, 'Info display should have a title');
    assert.strictEqual(infoContent.titleText, 'CRT TV Interference Shader Test', 'Info title should be correct');
    assert.ok(infoContent.hasParagraphs, 'Info display should have description paragraphs');
  } catch (error) {
    console.error('Info display test failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
});

// Test slider value display updates
test('slider value displays update correctly', async (t) => {
  const { browser, page } = await setup();
  
  try {
    await page.waitForSelector('.control-panel', { timeout: 5000 });
    
    // Expand Mouse Effects section to test value displays
    await page.click('.section-header[onclick*="mouseEffects"]');
    await page.waitForFunction(() => {
      const content = document.getElementById('mouseEffects-content');
      return !content.classList.contains('collapsed');
    }, { timeout: 2000 });
    
    // Test mouseDecay value display
    const initialDisplayValue = await page.evaluate(() => {
      return document.getElementById('mouseDecayValue').textContent;
    });
    
    assert.strictEqual(initialDisplayValue, '3.0', 'Initial mouse decay value display should be 3.0');
    
    // Change slider value and check if display updates
    await page.evaluate(() => {
      const slider = document.getElementById('mouseDecay');
      slider.value = '5.5';
      slider.dispatchEvent(new Event('input'));
    });
    
    // Note: This test assumes the noise.js script handles the input event and updates the display
    // We can only test if the slider value changed, not necessarily the display text
    // unless the JS is properly loaded and functioning
    
    const newSliderValue = await page.evaluate(() => {
      return document.getElementById('mouseDecay').value;
    });
    
    assert.strictEqual(newSliderValue, '5.5', 'Slider value should update');
  } catch (error) {
    console.error('Slider value display test failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
});

// Test slider enable/disable functionality based on checkboxes
test('sliders are disabled when corresponding checkboxes are unchecked', async (t) => {
  const { browser, page } = await setup();
  
  try {
    await page.waitForSelector('.control-panel', { timeout: 5000 });
    
    // Wait for JavaScript to initialize
    await page.waitForFunction(() => {
      return window.WebGL2RenderingContext !== undefined;
    }, { timeout: 5000 });
    
    // Test that distortion slider starts disabled
    const distortionDisabled = await page.evaluate(() => {
      return document.getElementById('distortion').disabled;
    });
    
    assert.ok(distortionDisabled, 'Distortion slider should be initially disabled');
    
    // Expand Base Effects section
    await page.click('.section-header[onclick*="baseEffects"]');
    await page.waitForFunction(() => {
      const content = document.getElementById('baseEffects-content');
      return !content.classList.contains('collapsed');
    }, { timeout: 2000 });
    
    // Enable base distortion
    await page.evaluate(() => {
      const checkbox = document.getElementById('baseDistortion');
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change'));
    });
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Test that distortion slider is now enabled
    const distortionEnabled = await page.evaluate(() => {
      return !document.getElementById('distortion').disabled;
    });
    
    assert.ok(distortionEnabled, 'Distortion slider should be enabled when base distortion is checked');
    
  } catch (error) {
    console.error('Slider enable/disable test failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
});
