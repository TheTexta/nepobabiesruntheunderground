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

out vec4 fragColor;

const float interference = 1.0;
const float resolution = 256.0;

const float pi = 3.14159265359;

const float scanline_alpha = 0.2;

const float constant_noise = 0.1;
const float scrolling_noise = 0.8;
const vec4 noise_color = vec4(0.8);

const float horizontal_distort_distance = 0.02;
const float vertical_scroll_distance = 0.05;

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
    float mouseInfluence = exp(-distanceFromMouse * 3.0);
    
    // Base interference (toggleable)
    float base_interference = max(0.0, 
        sin(uv.y * (8.1 - interference * 4.3) + iTime * 1.4) * 
        sin(uv.y * (3.2 - interference * 2.6) + iTime * 2.3)) * interference * u_enable_base_interference;
    
    // Momentum-based ripple interference (always enabled - mouse effect)
    float rippleFreq = 15.0;
    float rippleSpeed = 8.0;
    float rippleDecay = 2.0;
    float rippleAmplitude = momentum * mouseInfluence; // Combine momentum and distance
    float ripple_interference = sin((distanceFromMouse * rippleFreq) - (iTime * rippleSpeed)) * 
                               exp(-distanceFromMouse * rippleDecay) * rippleAmplitude;
    
    // Combined interference: base + ripple modulation
    float total_interference = base_interference + abs(ripple_interference) * 0.5;
    
    // Base horizontal distortion (toggleable)
    float base_horizontal_distortion = (
        sin(uv.y * 2.0 + iTime * 1.0) + 
        sin(uv.y * 50.0 + iTime * 5.7) * 0.3 + 
        sin(uv.y * 500.0 + iTime * 20.0) * 0.1) * horizontal_distort_distance * base_interference * u_enable_base_distortion;
    
    // Ripple-based horizontal distortion (always enabled - mouse effect)
    float mouseDistortX = (uv.x - mouseUV.x) * 2.0;
    float ripple_horizontal_distortion = sin((distanceFromMouse * rippleFreq) - (iTime * rippleSpeed * 0.75)) * 
                                        exp(-distanceFromMouse * rippleDecay * 0.75) * 
                                        horizontal_distort_distance * rippleAmplitude * 0.5;
    
    float horizontal_distortion = base_horizontal_distortion + ripple_horizontal_distortion;
    
    // Base vertical distortion (toggleable)
    float base_vertical_distortion = sin(uv.y * 2.5 + 5.1 + iTime * 1.4) * 
        sign(sin(uv.y * 3.6 + iTime * 2.4)) * vertical_scroll_distance * base_interference * u_enable_base_distortion;
    
    // Ripple-based vertical distortion (always enabled - mouse effect)
    float mouseDistortY = (uv.y - mouseUV.y) * 2.0;
    float ripple_vertical_distortion = cos((distanceFromMouse * rippleFreq) - (iTime * rippleSpeed * 0.75)) * 
                                      exp(-distanceFromMouse * rippleDecay * 0.75) * 
                                      vertical_scroll_distance * rippleAmplitude * 0.5;
    
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
    float base_noise_alpha = (constant_noise * interference + 
        base_interference * scrolling_noise * 0.3) *
        sin(iTime * 23.4 + noise(rounded_uv) * 123.4) * u_enable_base_noise;
    
    // Momentum-enhanced noise (always enabled - mouse effect)
    float momentum_noise_alpha = rippleAmplitude * scrolling_noise * 0.2 *
        sin(iTime * 23.4 + noise(rounded_uv + mouseUV * 0.1) * 123.4);
    
    float noise_alpha = base_noise_alpha + momentum_noise_alpha;
    
    vec2 image_uv = vec2(1.0 - uv.x + horizontal_distortion, 1.0 - uv.y + vertical_distortion) + scatter;
    float scanline = scanline_alpha * sin(uv.y * resolution * pi * 2.0) * u_enable_scanlines;
    
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

// Resize canvas helper
function resize() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  gl.viewport(0, 0, canvas.width, canvas.height);
}
window.addEventListener("resize", resize);
resize();

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

  // Bind background texture
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, backgroundTexture);
  gl.uniform1i(uTexture0Loc, 0);

  // Draw
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  requestAnimationFrame(render);
}
requestAnimationFrame(render);
