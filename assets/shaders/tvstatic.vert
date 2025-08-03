#version 300 es
in vec2 a_position;        // [-0.5, 0.5] quad coords
in vec2 a_instanceOffset;  // center of each cell in clip-space
in vec2 a_instanceSeed;    // 2D seed for noise

out vec2 v_quadUV;
out vec2 v_seed;

uniform float u_gridSizeX;
uniform float u_gridSizeY;
uniform vec2 u_mouseClip;
uniform float u_momentum;
uniform float u_scaleIntensity;
uniform float u_rippleFalloff;
uniform vec2 u_resolution;  // Canvas width and height for aspect ratio

void main() {
    // Pass quad UV (0,0 to 1,1) and seed to fragment shader
    v_quadUV = a_position + 0.5;  // maps [-0.5..0.5] → [0..1]
    v_seed = a_instanceSeed;
    
    // Compute aspect-ratio-corrected distance from mouse
    vec2 diff = a_instanceOffset - u_mouseClip;
    float aspectRatio = u_resolution.x / u_resolution.y;
    
    // Normalize difference to account for aspect ratio
    // Scale the difference so that 1 unit = same visual distance in both axes
    diff.x *= aspectRatio;
    
    float dist = length(diff);
    float influence = exp(-dist * u_rippleFalloff);
    float scale = 1.0 + u_momentum * (u_scaleIntensity / 100.0) * influence;
    
    // Base quad size accounts for different X/Y grid dimensions for square pixels
    vec2 baseQuadSize = vec2(2.0 / u_gridSizeX, 2.0 / u_gridSizeY);
    
    // Scale the quad around its center, then translate to position
    vec2 scaledPos = a_position * baseQuadSize * scale;
    vec2 finalPos = scaledPos + a_instanceOffset;
    
    gl_Position = vec4(finalPos, 0.0, 1.0);
}
