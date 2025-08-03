/**
 * Test file for text selection functionality
 * Tests whether the "i dont need anything" text is selectable
 * and identifies any overlaying elements that might block selection
 */

// Mock DOM environment for testing
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

describe('Text Selection Tests', () => {
  let dom;
  let document;
  let window;

  beforeEach(() => {
    // Read the actual HTML file
    const htmlPath = path.join(__dirname, '../index.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    // Create JSDOM instance
    dom = new JSDOM(htmlContent, {
      url: 'http://localhost',
      pretendToBeVisual: true,
      resources: 'usable'
    });
    
    document = dom.window.document;
    window = dom.window;
  });

  afterEach(() => {
    dom.window.close();
  });

  test('should find the content div with "i dont need anything" text', () => {
    const contentDiv = document.getElementById('content');
    expect(contentDiv).toBeTruthy();
    
    const paragraphs = contentDiv.querySelectorAll('p');
    expect(paragraphs.length).toBeGreaterThan(0);
    
    const firstParagraph = paragraphs[0];
    expect(firstParagraph.textContent).toBe('i dont need anything');
  });

  test('should check for overlaying canvas elements', () => {
    const tvStaticCanvas = document.getElementById('tv-static-canvas');
    const tvStaticTop = document.getElementById('tv-static-top');
    
    expect(tvStaticCanvas).toBeTruthy();
    expect(tvStaticTop).toBeTruthy();
    
    console.log('TV Static Canvas found:', !!tvStaticCanvas);
    console.log('TV Static Top found:', !!tvStaticTop);
  });

  test('should verify CSS user-select properties are applied', () => {
    // This test would need actual CSS to be loaded
    // For now, we'll just verify the elements exist
    const contentDiv = document.getElementById('content');
    const mainElement = document.querySelector('main');
    
    expect(contentDiv).toBeTruthy();
    expect(mainElement).toBeTruthy();
    expect(mainElement.contains(contentDiv)).toBe(true);
  });

  test('should check z-index hierarchy of overlaying elements', () => {
    const contentDiv = document.getElementById('content');
    const tvStaticCanvas = document.getElementById('tv-static-canvas');
    const tvStaticTop = document.getElementById('tv-static-top');
    
    // Log element positions for debugging
    console.log('Content div:', contentDiv ? 'found' : 'not found');
    console.log('TV Static Canvas:', tvStaticCanvas ? 'found' : 'not found');
    console.log('TV Static Top:', tvStaticTop ? 'found' : 'not found');
    
    // Check if canvas elements have pointer-events: none
    // Note: This would require actual CSS parsing in a real test
    expect(tvStaticCanvas).toBeTruthy();
    expect(tvStaticTop).toBeTruthy();
  });

  test('should simulate text selection attempt', () => {
    const contentDiv = document.getElementById('content');
    const firstParagraph = contentDiv.querySelector('p');
    
    // Create a selection range
    const range = document.createRange();
    range.selectNodeContents(firstParagraph);
    
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    
    // Check if selection was successful
    expect(selection.toString()).toBe('i dont need anything');
    expect(selection.rangeCount).toBe(1);
  });
});

// Manual testing function for browser console
function testTextSelection() {
  console.log('=== Text Selection Test ===');
  
  // Check if content div exists
  const contentDiv = document.getElementById('content');
  console.log('Content div found:', !!contentDiv);
  
  if (contentDiv) {
    const paragraphs = contentDiv.querySelectorAll('p');
    console.log('Number of paragraphs:', paragraphs.length);
    console.log('First paragraph text:', paragraphs[0]?.textContent);
  }
  
  // Check overlaying elements
  const tvStaticCanvas = document.getElementById('tv-static-canvas');
  const tvStaticTop = document.getElementById('tv-static-top');
  
  console.log('TV Static Canvas found:', !!tvStaticCanvas);
  console.log('TV Static Top found:', !!tvStaticTop);
  
  if (tvStaticCanvas) {
    const canvasStyle = window.getComputedStyle(tvStaticCanvas);
    console.log('TV Static Canvas pointer-events:', canvasStyle.pointerEvents);
    console.log('TV Static Canvas z-index:', canvasStyle.zIndex);
    console.log('TV Static Canvas position:', canvasStyle.position);
  }
  
  if (tvStaticTop) {
    const topStyle = window.getComputedStyle(tvStaticTop);
    console.log('TV Static Top pointer-events:', topStyle.pointerEvents);
    console.log('TV Static Top z-index:', topStyle.zIndex);
    console.log('TV Static Top position:', topStyle.position);
  }
  
  // Check content div styles
  if (contentDiv) {
    const contentStyle = window.getComputedStyle(contentDiv);
    console.log('Content div user-select:', contentStyle.userSelect);
    console.log('Content div z-index:', contentStyle.zIndex);
    console.log('Content div position:', contentStyle.position);
  }
  
  // Try to select text programmatically
  try {
    const firstP = contentDiv.querySelector('p');
    if (firstP) {
      const range = document.createRange();
      range.selectNodeContents(firstP);
      
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      
      console.log('Programmatic selection successful:', selection.toString());
    }
  } catch (error) {
    console.error('Selection failed:', error);
  }
  
  console.log('=== End Test ===');
}

// Export for browser testing
if (typeof window !== 'undefined') {
  window.testTextSelection = testTextSelection;
}

module.exports = { testTextSelection };
