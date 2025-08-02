const canvas = document.querySelector('.noise-layer');

if (canvas && window.PIXI) {
  const app = new PIXI.Application({
    view: canvas,
    resizeTo: window,
    transparent: true,
  });

  const frag = `
precision mediump float;
varying vec2 vTextureCoord;
uniform float time;
uniform vec2 resolution;
uniform vec2 cursor;
uniform float intensity;

float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

float noise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);
  float a = random(i);
  float b = random(i + vec2(1.0, 0.0));
  float c = random(i + vec2(0.0, 1.0));
  float d = random(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) +
         (c - a) * u.y * (1.0 - u.x) +
         (d - b) * u.x * u.y;
}

void main() {
  vec2 uv = vTextureCoord * resolution;
  float dist = distance(uv, cursor);
  float n = noise(uv * 0.8 + time);
  float wave = sin(dist * 0.05 - time * 2.0) * 0.5 + 0.5;
  float falloff = exp(-dist * 0.02);
  float amp = intensity * wave * falloff;
  gl_FragColor = vec4(vec3(n * amp), n * amp);
}
`;

  const filter = new PIXI.Filter(undefined, frag, {
    time: 0,
    resolution: [app.screen.width, app.screen.height],
    cursor: [0, 0],
    intensity: 0,
  });

  const sprite = new PIXI.Sprite(PIXI.Texture.WHITE);
  sprite.width = app.screen.width;
  sprite.height = app.screen.height;
  sprite.filters = [filter];
  sprite.blendMode = PIXI.BLEND_MODES.OVERLAY;
  app.stage.addChild(sprite);

  window.addEventListener('resize', () => {
    filter.uniforms.resolution = [app.screen.width, app.screen.height];
    sprite.width = app.screen.width;
    sprite.height = app.screen.height;
  });

  let current = 0;
  let target = 0;

  window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    filter.uniforms.cursor = [e.clientX - rect.left, e.clientY - rect.top];
    target = 1;
  });

  window.addEventListener('mouseout', () => {
    target = 0;
  });

  app.ticker.add((delta) => {
    filter.uniforms.time += 0.01 * delta;
    current += (target - current) * 0.05;
    filter.uniforms.intensity = current;
    if (target > 0) {
      target -= 0.01 * delta;
      if (target < 0) {
        target = 0;
      }
    }
  });
}

