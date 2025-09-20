#version 300 es
precision highp float;

in vec2 v_quadUV;
in vec2 v_seed;
out vec4 fragColor;

uniform float u_time;
uniform float u_staticSpeed;
uniform float u_gridSizeX;
uniform float u_gridSizeY;
uniform float u_momentum;
uniform float u_scaleIntensity;
uniform float u_rippleFalloff;
uniform float u_minBrightness;
uniform float u_maxBrightness;
uniform vec2 u_resolution;
uniform vec2 u_mouseClip;
uniform int u_mouseFollower;

// PCG hash for excellent distribution with minimal operations
uint pcg_hash(uint x) {
    x = x * 747796405u + 2891336453u;
    uint word = ((x >> ((x >> 28u) + 4u)) ^ x) * 277803737u;
    return (word >> 22u) ^ word;
}

void main() {
    // 1) Frame-varying seed using PCG hash
    uint frame = uint(floor(u_time * u_staticSpeed));
    uint pixelID = uint(v_seed.x + v_seed.y * u_gridSizeX);
    
    // 2) Generate uncorrelated bits per pixel using PCG
    uint seed = pixelID + frame * 1664525u;  // frame multiplier for variation
    uint hashResult = pcg_hash(seed);
    float raw = float(hashResult) / float(0xffffffffu);
    
    // 3) Map raw [0,1] to brightness range [minBrightness, maxBrightness]
    float brightness = u_minBrightness + raw * (u_maxBrightness - u_minBrightness);

    // 4) Optional mouse follower mode: brighten pixels near cursor regardless of momentum
    if (u_mouseFollower == 1) {
        // Reconstruct the instance center position in clip space from v_seed
        // v_seed encodes (x,y) indices in the grid; derive the same mapping as in JS:
        // a_instanceOffset.x = (x + 0.5) / gridX * 2.0 - 1.0
        // a_instanceOffset.y = -((y + 0.5) / gridY * 2.0 - 1.0)
        float gx = (v_seed.x + 0.5) / u_gridSizeX * 2.0 - 1.0;
        float gy = -((v_seed.y + 0.5) / u_gridSizeY * 2.0 - 1.0);

        // Aspect-corrected distance to mouse clip coords (match vertex shader logic)
        float aspect = u_resolution.x / u_resolution.y;
        vec2 diff = vec2(gx - u_mouseClip.x, gy - u_mouseClip.y);
        diff.x *= aspect;
        float dist = length(diff);

        // Use the same falloff parameter to shape the brightening influence
        float influence = exp(-dist * u_rippleFalloff);

        // Boost brightness toward full white so the effect is visible even
    // when overlay maxBrightness is capped. Clamp to 1.0.
    float target = 1.0;
    float boost = influence * 0.85; // overall strength
    brightness = min(1.0, mix(brightness, target, boost));
    }
    vec3 color = vec3(brightness);  // Controlled brightness range
    fragColor = vec4(color, 1.0);  // Fully opaque squares
}
