// assets/js/noise.js

// Vertex shader source (full-screen quad)
const vertexShaderSource = `#version 300 es
in vec2 a_position;

out vec2 v_uv;

void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

// Fragment shader source - CRT TV interference effect (License: CC0)
const fragmentShaderSource = `#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;
uniform float u_momentum;
uniform sampler2D u_texture0;
uniform sampler2D u_texture1;

// Effect toggle uniforms
uniform float u_enable_base_interference;
uniform float u_enable_base_distortion;
uniform float u_enable_base_noise;
uniform float u_enable_scanlines;

// Adjustable parameter uniforms
uniform float u_mouse_influence_decay;
uniform float u_ripple_frequency;
uniform float u_ripple_speed;
uniform float u_ripple_decay;
uniform float u_distortion_strength;
uniform float u_noise_intensity;
uniform float u_scanline_intensity;

out vec4 fragColor;

const float interference = 1.0;
const float resolution = 256.0;

const float pi = 3.14159265359;

const vec4 noise_color = vec4(0.8);

// Simple noise function for texture replacement
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  return mix(
    mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), u.x),
    mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x),
    u.y);
}

void main() {
    vec2 fragCoord = gl_FragCoord.xy;
    vec2 iResolution = u_resolution;
    float iTime = u_time;
    vec2 iMouse = u_mouse;
    float momentum = u_momentum;
    
    vec2 uv = fragCoord / iResolution.xy;
    vec2 mouseUV = iMouse / iResolution.xy;
    
    // Distance and influence calculations
    float distanceFromMouse = length(uv - mouseUV);
    float mouseInfluence = exp(-distanceFromMouse * u_mouse_influence_decay);
    
    // Base interference (toggleable)
    float base_interference = max(0.0, 
        sin(uv.y * (8.1 - interference * 4.3) + iTime * 1.4) * 
        sin(uv.y * (3.2 - interference * 2.6) + iTime * 2.3)) * interference * u_enable_base_interference;
    
    // Momentum-based ripple interference (always enabled - mouse effect)
    float rippleAmplitude = momentum * mouseInfluence; // Combine momentum and distance
    float ripple_interference = sin((distanceFromMouse * u_ripple_frequency) - (iTime * u_ripple_speed)) * 
                               exp(-distanceFromMouse * u_ripple_decay) * rippleAmplitude;
    
    // Combined interference: base + ripple modulation
    float total_interference = base_interference + abs(ripple_interference) * 0.5;
    
    // Base horizontal distortion (toggleable)
    float base_horizontal_distortion = (
        sin(uv.y * 2.0 + iTime * 1.0) + 
        sin(uv.y * 50.0 + iTime * 5.7) * 0.3 + 
        sin(uv.y * 500.0 + iTime * 20.0) * 0.1) * u_distortion_strength * base_interference * u_enable_base_distortion;
    
    // Ripple-based horizontal distortion (always enabled - mouse effect)
    float mouseDistortX = (uv.x - mouseUV.x) * 2.0;
    float ripple_horizontal_distortion = sin((distanceFromMouse * u_ripple_frequency) - (iTime * u_ripple_speed * 0.75)) * 
                                        exp(-distanceFromMouse * u_ripple_decay * 0.75) * 
                                        u_distortion_strength * rippleAmplitude * 0.5;
    
    float horizontal_distortion = base_horizontal_distortion + ripple_horizontal_distortion;
    
    // Base vertical distortion (toggleable)
    float base_vertical_distortion = sin(uv.y * 2.5 + 5.1 + iTime * 1.4) * 
        sign(sin(uv.y * 3.6 + iTime * 2.4)) * u_distortion_strength * base_interference * u_enable_base_distortion;
    
    // Ripple-based vertical distortion (always enabled - mouse effect)
    float mouseDistortY = (uv.y - mouseUV.y) * 2.0;
    float ripple_vertical_distortion = cos((distanceFromMouse * u_ripple_frequency) - (iTime * u_ripple_speed * 0.75)) * 
                                      exp(-distanceFromMouse * u_ripple_decay * 0.75) * 
                                      u_distortion_strength * rippleAmplitude * 0.5;
    
    float vertical_distortion = base_vertical_distortion + ripple_vertical_distortion;
    
    vec2 rounded_uv = round(uv * resolution) / resolution;
    
    // Base scatter effect (toggleable)
    vec2 base_scatter = vec2(noise(uv + iTime), 0.0) * 
        max(0.0, base_interference - 0.5) * 0.1 * u_enable_base_distortion;
    
    // Ripple-based scatter effect (always enabled - mouse effect)
    vec2 ripple_scatter = vec2(noise(uv + iTime + mouseUV), 0.0) * 
        rippleAmplitude * 0.1;
    
    vec2 scatter = base_scatter + ripple_scatter;
    
    // Base noise (toggleable)
    float base_noise_alpha = (u_noise_intensity * interference + 
        base_interference * u_noise_intensity * 0.3) *
        sin(iTime * 23.4 + noise(rounded_uv) * 123.4) * u_enable_base_noise;
    
    // Momentum-enhanced noise (always enabled - mouse effect)
    float momentum_noise_alpha = rippleAmplitude * u_noise_intensity * 0.2 *
        sin(iTime * 23.4 + noise(rounded_uv + mouseUV * 0.1) * 123.4);
    
    float noise_alpha = base_noise_alpha + momentum_noise_alpha;
    
    vec2 image_uv = vec2(1.0 - uv.x + horizontal_distortion, 1.0 - uv.y + vertical_distortion) + scatter;
    float scanline = u_scanline_intensity * sin(uv.y * resolution * pi * 2.0) * u_enable_scanlines;
    
    // Sample the background texture without chromatic aberration
    vec3 image_color = min(noise_alpha * noise_color.rgb + texture(u_texture0, image_uv).rgb, 1.0) - scanline;

    fragColor = vec4(image_color.rgb, 1.0);
}`;

// Initialize WebGL context
const canvas = document.getElementById("glcanvas");
const gl = canvas.getContext("webgl2");
if (!gl) {
  console.error("WebGL2 not supported");
}

// Compile shader helper
function compileShader(source, type) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Shader compile failed:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

// Build program
const vs = compileShader(vertexShaderSource, gl.VERTEX_SHADER);
const fs = compileShader(fragmentShaderSource, gl.FRAGMENT_SHADER);
const program = gl.createProgram();
gl.attachShader(program, vs);
gl.attachShader(program, fs);
gl.linkProgram(program);
if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
  console.error("Program link failed:", gl.getProgramInfoLog(program));
}

// Lookup attributes/uniforms
const aPositionLoc = gl.getAttribLocation(program, "a_position");
const uResolutionLoc = gl.getUniformLocation(program, "u_resolution");
const uTimeLoc = gl.getUniformLocation(program, "u_time");
const uMouseLoc = gl.getUniformLocation(program, "u_mouse");
const uMomentumLoc = gl.getUniformLocation(program, "u_momentum");
const uTexture0Loc = gl.getUniformLocation(program, "u_texture0");

// Effect toggle uniform locations
const uEnableBaseInterferenceLoc = gl.getUniformLocation(program, "u_enable_base_interference");
const uEnableBaseDistortionLoc = gl.getUniformLocation(program, "u_enable_base_distortion");
const uEnableBaseNoiseLoc = gl.getUniformLocation(program, "u_enable_base_noise");
const uEnableScanLinesLoc = gl.getUniformLocation(program, "u_enable_scanlines");

// Adjustable parameter uniform locations
const uMouseInfluenceDecayLoc = gl.getUniformLocation(program, "u_mouse_influence_decay");
const uRippleFrequencyLoc = gl.getUniformLocation(program, "u_ripple_frequency");
const uRippleSpeedLoc = gl.getUniformLocation(program, "u_ripple_speed");
const uRippleDecayLoc = gl.getUniformLocation(program, "u_ripple_decay");
const uDistortionStrengthLoc = gl.getUniformLocation(program, "u_distortion_strength");
const uNoiseIntensityLoc = gl.getUniformLocation(program, "u_noise_intensity");
const uScanlineIntensityLoc = gl.getUniformLocation(program, "u_scanline_intensity");

// Create full-screen quad buffer
const quadBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
const quadVerts = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);

// Load background texture
const backgroundTexture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, backgroundTexture);

// Set temporary 1x1 pixel while loading
gl.texImage2D(
  gl.TEXTURE_2D,
  0,
  gl.RGBA,
  1,
  1,
  0,
  gl.RGBA,
  gl.UNSIGNED_BYTE,
  new Uint8Array([128, 128, 128, 255])
);

// Load the actual image
const backgroundImage = new Image();
backgroundImage.crossOrigin = "anonymous";
backgroundImage.onload = function () {
  gl.bindTexture(gl.TEXTURE_2D, backgroundTexture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    backgroundImage
  );

  // Set texture parameters
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
};
backgroundImage.src = "assets/images/background.jpg";

// Mouse state with momentum tracking
const mouse = { x: 0, y: 0, prevX: 0, prevY: 0, momentum: 0 };
canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  mouse.prevX = mouse.x;
  mouse.prevY = mouse.y;
  mouse.x = e.clientX - rect.left;
  mouse.y = rect.height - (e.clientY - rect.top);

  // Calculate momentum (speed of mouse movement)
  const deltaX = mouse.x - mouse.prevX;
  const deltaY = mouse.y - mouse.prevY;
  const currentMomentum = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

  // Smooth momentum with decay
  mouse.momentum = mouse.momentum * 0.8 + currentMomentum * 0.2;
});

// Effect toggles (set to false to disable non-mouse effects)
const effectToggles = {
  baseInterference: false,    // Base CRT interference patterns
  baseDistortion: false,      // Base horizontal/vertical distortion
  baseNoise: false,          // Base noise overlay
  scanlines: false           // CRT scanlines
};

// Adjustable parameters
const effectParams = {
  mouseInfluenceDecay: 3.0,    // Mouse effect radius (higher = smaller radius) - was hardcoded as 3.0
  rippleFrequency: 15.0,       // Ripple frequency - was hardcoded as 15.0
  rippleSpeed: 8.0,           // Ripple animation speed - was hardcoded as 8.0
  rippleDecay: 2.0,           // Ripple decay rate - was hardcoded as 2.0
  distortionStrength: 0.02,   // Overall distortion intensity - was horizontal_distort_distance and vertical_scroll_distance
  noiseIntensity: 0.8,        // Noise overlay intensity - was scrolling_noise (0.8)
  scanlineIntensity: 0.2      // Scanline visibility - was scanline_alpha (0.2)
};

// Initialize control panel event listeners
function initializeControls() {
  // Set initial checkbox states
  document.getElementById('baseInterference').checked = effectToggles.baseInterference;
  document.getElementById('baseDistortion').checked = effectToggles.baseDistortion;
  document.getElementById('baseNoise').checked = effectToggles.baseNoise;
  document.getElementById('scanlines').checked = effectToggles.scanlines;
  
  // Add event listeners for checkboxes
  document.getElementById('baseInterference').addEventListener('change', (e) => {
    effectToggles.baseInterference = e.target.checked;
  });
  
  document.getElementById('baseDistortion').addEventListener('change', (e) => {
    effectToggles.baseDistortion = e.target.checked;
  });
  
  document.getElementById('baseNoise').addEventListener('change', (e) => {
    effectToggles.baseNoise = e.target.checked;
  });
  
  document.getElementById('scanlines').addEventListener('change', (e) => {
    effectToggles.scanlines = e.target.checked;
  });
  
  // Add event listeners for sliders
  document.getElementById('mouseDecay').addEventListener('input', (e) => {
    effectParams.mouseInfluenceDecay = parseFloat(e.target.value);
    document.getElementById('mouseDecayValue').textContent = effectParams.mouseInfluenceDecay.toFixed(1);
  });
  
  document.getElementById('rippleFreq').addEventListener('input', (e) => {
    effectParams.rippleFrequency = parseFloat(e.target.value);
    document.getElementById('rippleFreqValue').textContent = effectParams.rippleFrequency.toFixed(1);
  });
  
  document.getElementById('rippleSpeed').addEventListener('input', (e) => {
    effectParams.rippleSpeed = parseFloat(e.target.value);
    document.getElementById('rippleSpeedValue').textContent = effectParams.rippleSpeed.toFixed(1);
  });
  
  document.getElementById('rippleDecay').addEventListener('input', (e) => {
    effectParams.rippleDecay = parseFloat(e.target.value);
    document.getElementById('rippleDecayValue').textContent = effectParams.rippleDecay.toFixed(1);
  });
  
  document.getElementById('distortion').addEventListener('input', (e) => {
    effectParams.distortionStrength = parseFloat(e.target.value);
    document.getElementById('distortionValue').textContent = (effectParams.distortionStrength * 100).toFixed(1) + '%';
  });
  
  document.getElementById('noise').addEventListener('input', (e) => {
    effectParams.noiseIntensity = parseFloat(e.target.value);
    document.getElementById('noiseValue').textContent = (effectParams.noiseIntensity * 100).toFixed(0) + '%';
  });
  
  document.getElementById('scanlineIntensity').addEventListener('input', (e) => {
    effectParams.scanlineIntensity = parseFloat(e.target.value);
    document.getElementById('scanlineValue').textContent = (effectParams.scanlineIntensity * 100).toFixed(0) + '%';
  });
}

// Resize canvas helper
function resize() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  gl.viewport(0, 0, canvas.width, canvas.height);
}
window.addEventListener("resize", resize);
resize();

// Initialize the control panel event listeners
initializeControls();

// Render loop
function render(time) {
  time *= 0.001; // to seconds

  // Decay momentum when not moving
  mouse.momentum *= 0.95;

  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(program);

  // Bind quad
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
  gl.enableVertexAttribArray(aPositionLoc);
  gl.vertexAttribPointer(aPositionLoc, 2, gl.FLOAT, false, 0, 0);

  // Set uniforms
  gl.uniform2f(uResolutionLoc, canvas.width, canvas.height);
  gl.uniform1f(uTimeLoc, time);
  gl.uniform2f(uMouseLoc, mouse.x, mouse.y);
  gl.uniform1f(uMomentumLoc, Math.min(mouse.momentum / 20.0, 2.0)); // Normalize and cap momentum

  // Set effect toggle uniforms
  gl.uniform1f(uEnableBaseInterferenceLoc, effectToggles.baseInterference ? 1.0 : 0.0);
  gl.uniform1f(uEnableBaseDistortionLoc, effectToggles.baseDistortion ? 1.0 : 0.0);
  gl.uniform1f(uEnableBaseNoiseLoc, effectToggles.baseNoise ? 1.0 : 0.0);
  gl.uniform1f(uEnableScanLinesLoc, effectToggles.scanlines ? 1.0 : 0.0);

  // Set adjustable parameter uniforms
  gl.uniform1f(uMouseInfluenceDecayLoc, effectParams.mouseInfluenceDecay);
  gl.uniform1f(uRippleFrequencyLoc, effectParams.rippleFrequency);
  gl.uniform1f(uRippleSpeedLoc, effectParams.rippleSpeed);
  gl.uniform1f(uRippleDecayLoc, effectParams.rippleDecay);
  gl.uniform1f(uDistortionStrengthLoc, effectParams.distortionStrength);
  gl.uniform1f(uNoiseIntensityLoc, effectParams.noiseIntensity);
  gl.uniform1f(uScanlineIntensityLoc, effectParams.scanlineIntensity);

  // Bind background texture
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, backgroundTexture);
  gl.uniform1i(uTexture0Loc, 0);

  // Draw
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  requestAnimationFrame(render);
}
requestAnimationFrame(render);
