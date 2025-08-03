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
    
    // 3) Pure square pixels - no circular effects at all
    vec3 color = vec3(raw);  // raw ∈ [0,1], pure grayscale
    fragColor = vec4(color, 1.0);  // Fully opaque squares
}
