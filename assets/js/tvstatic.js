// TV Static Shader with Instanced Per-Pixel Scaling
/**
 * TVStaticApp
 * Renders animated TV static using instanced WebGL2 quads with GPU-driven scaling.
 * Safe to use in two modes:
 *  - overlay mode (over the whole page) by calling createTVStaticOverlay()
 *  - standalone test page (tvstatic.html) with a canvas id of "glcanvas"
 *
 * Public API:
 *  - new TVStaticApp(options?)
 *  - destroy() to clean up listeners, timers, and GL resources
 */
class TVStaticApp {
    constructor(options = {}) {
        // Defaults kept in one place for clarity
        const DEFAULTS = {
            canvasId: 'glcanvas',
            overlay: false,
            showControls: true, // overridden to false in overlay helper
            pixelScale: 3,
            scaleIntensity: 100,
            rippleFalloff: 3.0,
            staticSpeed: 30,
            opacity: 1.0,
            zIndex: 'auto',
            // pointer events default depends on overlay, but allow override via options
            pointerEvents: undefined
        };

        // Merge options with defaults
        this.config = { ...DEFAULTS, ...options };
        if (this.config.pointerEvents === undefined) {
            this.config.pointerEvents = this.config.overlay ? 'none' : 'auto';
        }
        
        // Core state
        this.canvas = null;
        this.gl = null;
        this.program = null;
        this.uniforms = {};
        this.attributes = {};
        this.buffers = {};
        this.vao = null;

        // Timers and listeners for cleanup
        this._rafId = null;
        this._momentumTimer = null;
        this._onResize = null;
        this._onMouseMove = null;
        this._mouseTarget = null;
        
        // Interaction state
        this.mouse = { x: 0, y: 0, prevX: 0, prevY: 0, momentum: 0 };
        this.settings = {
            pixelScale: this.config.pixelScale,
            gridSizeX: 100, // Will be calculated based on canvas width
            gridSizeY: 100, // Will be calculated based on canvas height
            scaleIntensity: this.config.scaleIntensity,
            rippleFalloff: this.config.rippleFalloff,
            staticSpeed: this.config.staticSpeed,
            momentumDecay: 0.95,
            // Brightness range (0-255)
            minBrightness: this.config.overlay ? 0 : 0,
            maxBrightness: this.config.overlay ? 128 : 255
        };
        
        // GPU instance data
        this.instanceCount = 0;
        this.offsetArray = null;
        this.seedArray = null;
        
        // Kick off async initialization
        this.init();
    }
    
    async init() {
        try {
            if (!this.setupCanvas()) return; // hard fail if canvas missing
            if (!this.setupWebGL()) return;   // hard fail if WebGL2 missing
            await this.loadShaders();
            if (!this.program) return;        // shader/program failure
            this.setupGeometry();
            this.setupInstances();
            
            // Only setup controls if not in overlay mode
            if (this.config.showControls) {
                this.setupControls();
            }
            
            this.setupMouse();
            
            // Set optimal grid size for current screen
            this.calculateOptimalGridSize();
            
            this.startRenderLoop();
        } catch (err) {
            console.error('TVStaticApp initialization failed:', err);
        }
    }
    
    calculateOptimalGridSize() {
        // Calculate separate grid dimensions for square pixels
        const targetPixelScale = this.settings.pixelScale;
        
        // Calculate grid dimensions to achieve target pixel scale
        this.settings.gridSizeX = Math.floor(this.canvas.width / targetPixelScale);
        this.settings.gridSizeY = Math.floor(this.canvas.height / targetPixelScale);
        
        // Ensure minimum grid size
        this.settings.gridSizeX = Math.max(this.settings.gridSizeX, 10);
        this.settings.gridSizeY = Math.max(this.settings.gridSizeY, 10);
        
        // Update UI display only if controls are shown
        if (this.config.showControls) {
            this.updateGridSizeDisplay();
        }
        
        // Recreate instance data
        this.updateInstanceData();
        this.updateInstanceBuffers();
    }
    
    updateGridSizeDisplay() {
        const gridSizeValue = document.getElementById('gridSizeValue');
        if (gridSizeValue) {
            const actualScaleX = this.canvas.width / this.settings.gridSizeX;
            const actualScaleY = this.canvas.height / this.settings.gridSizeY;
            const avgScale = (actualScaleX + actualScaleY) / 2;
            gridSizeValue.textContent = `${this.settings.pixelScale}x target (${avgScale.toFixed(1)}x actual)`;
        }
    }
    
    setupCanvas() {
        this.canvas = document.getElementById(this.config.canvasId);
        if (!this.canvas) {
            console.warn(`TVStaticApp: canvas with id "${this.config.canvasId}" not found`);
            return false;
        }
        
        // Apply overlay styles if configured
        if (this.config.overlay) {
            // Only set dynamic properties that may vary per instance
            if (this.config.opacity !== 1.0) {
                this.canvas.style.opacity = this.config.opacity;
            }
            if (this.config.zIndex !== 'auto') {
                this.canvas.style.zIndex = this.config.zIndex;
            }
            // Respect explicit pointer-events if provided
            if (typeof this.config.pointerEvents === 'string') {
                this.canvas.style.pointerEvents = this.config.pointerEvents;
            }
        }
        
        this.resizeCanvas();
        this._onResize = () => this.resizeCanvas();
        window.addEventListener('resize', this._onResize, { passive: true });
        return true;
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        if (this.gl) {
            this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        }
        
        // Recalculate optimal grid size for new dimensions
        if (this.offsetArray) {
            this.calculateOptimalGridSize();
            // Update the control display after resize
            this.updateGridSizeDisplay();
        }
    }
    
    setupWebGL() {
        this.gl = this.canvas.getContext('webgl2');
        
        if (!this.gl) {
            console.warn('WebGL2 is not supported by your browser');
            return false;
        }
        
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        
        // Enable blending with screen blend mode for proper overlapping
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.ONE, this.gl.ONE_MINUS_SRC_COLOR);
        return true;
    }
    
    async loadShaders() {
        const vertexShaderSource = await this.fetchShader('assets/shaders/tvstatic.vert');
        const fragmentShaderSource = await this.fetchShader('assets/shaders/tvstatic.frag');
        
        const vertexShader = this.compileShader(this.gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);
        
        this.program = this.createProgram(vertexShader, fragmentShader);
        this.gl.useProgram(this.program);
        
        // Get uniform locations
        this.uniforms = {
            time: this.gl.getUniformLocation(this.program, 'u_time'),
            staticSpeed: this.gl.getUniformLocation(this.program, 'u_staticSpeed'),
            gridSizeX: this.gl.getUniformLocation(this.program, 'u_gridSizeX'),
            gridSizeY: this.gl.getUniformLocation(this.program, 'u_gridSizeY'),
            mouseClip: this.gl.getUniformLocation(this.program, 'u_mouseClip'),
            momentum: this.gl.getUniformLocation(this.program, 'u_momentum'),
            scaleIntensity: this.gl.getUniformLocation(this.program, 'u_scaleIntensity'),
            rippleFalloff: this.gl.getUniformLocation(this.program, 'u_rippleFalloff'),
            resolution: this.gl.getUniformLocation(this.program, 'u_resolution'),
            minBrightness: this.gl.getUniformLocation(this.program, 'u_minBrightness'),
            maxBrightness: this.gl.getUniformLocation(this.program, 'u_maxBrightness')
        };
        
        // Get attribute locations
        this.attributes = {
            position: this.gl.getAttribLocation(this.program, 'a_position'),
            instanceOffset: this.gl.getAttribLocation(this.program, 'a_instanceOffset'),
            instanceSeed: this.gl.getAttribLocation(this.program, 'a_instanceSeed')
        };
    }
    
    async fetchShader(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load shader: ${url}`);
        }
        return await response.text();
    }
    
    compileShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('Shader compilation error:', this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }
        
        return shader;
    }
    
    createProgram(vertexShader, fragmentShader) {
        const program = this.gl.createProgram();
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);
        
        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            console.error('Program linking error:', this.gl.getProgramInfoLog(program));
            this.gl.deleteProgram(program);
            return null;
        }
        
        return program;
    }
    
    setupGeometry() {
        // Create VAO
        this.vao = this.gl.createVertexArray();
        this.gl.bindVertexArray(this.vao);
        
        // Create unit quad (centered at origin, size 1x1)
        const quadVertices = new Float32Array([
            -0.5, -0.5,  // bottom-left
             0.5, -0.5,  // bottom-right
            -0.5,  0.5,  // top-left
            -0.5,  0.5,  // top-left
             0.5, -0.5,  // bottom-right
             0.5,  0.5   // top-right
        ]);
        
        // Create and bind vertex buffer
        this.buffers.vertex = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.vertex);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, quadVertices, this.gl.STATIC_DRAW);
        
        // Setup vertex attributes
        this.gl.enableVertexAttribArray(this.attributes.position);
        this.gl.vertexAttribPointer(this.attributes.position, 2, this.gl.FLOAT, false, 0, 0);
    }
    
    setupInstances() {
        this.updateInstanceData();
        
        // Create instance buffers (no scale buffer needed anymore)
        this.buffers.instanceOffset = this.gl.createBuffer();
        this.buffers.instanceSeed = this.gl.createBuffer();
        
        // Bind instance offset buffer
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.instanceOffset);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, this.offsetArray, this.gl.STATIC_DRAW);
        this.gl.enableVertexAttribArray(this.attributes.instanceOffset);
        this.gl.vertexAttribPointer(this.attributes.instanceOffset, 2, this.gl.FLOAT, false, 0, 0);
        this.gl.vertexAttribDivisor(this.attributes.instanceOffset, 1);
        
        // Bind instance seed buffer (now 2D)
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.instanceSeed);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, this.seedArray, this.gl.STATIC_DRAW);
        this.gl.enableVertexAttribArray(this.attributes.instanceSeed);
        this.gl.vertexAttribPointer(this.attributes.instanceSeed, 2, this.gl.FLOAT, false, 0, 0);
        this.gl.vertexAttribDivisor(this.attributes.instanceSeed, 1);
        
        this.gl.bindVertexArray(null);
    }
    
    updateInstanceData() {
        const gridSizeX = this.settings.gridSizeX;
        const gridSizeY = this.settings.gridSizeY;
        this.instanceCount = gridSizeX * gridSizeY;
        
        // Allocate arrays
        this.offsetArray = new Float32Array(this.instanceCount * 2);
        this.seedArray = new Float32Array(this.instanceCount * 2);
        
        // Fill arrays
        let idx = 0;
        for (let y = 0; y < gridSizeY; y++) {
            for (let x = 0; x < gridSizeX; x++, idx++) {
                // Map grid coordinates to clip space [-1, 1]
                this.offsetArray[idx * 2] = (x + 0.5) / gridSizeX * 2.0 - 1.0;
                // Flip Y coordinate to match screen coordinates
                this.offsetArray[idx * 2 + 1] = -((y + 0.5) / gridSizeY * 2.0 - 1.0);
                
                // 2D seed for proper noise generation
                this.seedArray[idx * 2] = x;
                this.seedArray[idx * 2 + 1] = y;
            }
        }
    }
    
    setupMouse() {
        const mouseTarget = this.config.overlay ? document : this.canvas;
        this._mouseTarget = mouseTarget;

        this._onMouseMove = (e) => {
            let newX, newY;
            
            if (this.config.overlay) {
                // For overlay mode, use screen coordinates
                newX = e.clientX;
                newY = window.innerHeight - e.clientY; // Flip Y coordinate
            } else {
                // For normal mode, use canvas-relative coordinates
                const rect = this.canvas.getBoundingClientRect();
                newX = e.clientX - rect.left;
                newY = rect.height - (e.clientY - rect.top); // Flip Y coordinate
            }
            
            // Calculate movement delta
            const deltaX = newX - this.mouse.x;
            const deltaY = newY - this.mouse.y;
            const speed = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            
            // Update mouse position
            this.mouse.prevX = this.mouse.x;
            this.mouse.prevY = this.mouse.y;
            this.mouse.x = newX;
            this.mouse.y = newY;
            
            // Update momentum with smoothing
            const targetMomentum = Math.min(speed * 0.1, 10.0); // Cap momentum
            this.mouse.momentum = this.mouse.momentum * 0.8 + targetMomentum * 0.2;
        };

        mouseTarget.addEventListener('mousemove', this._onMouseMove, { passive: true });
        
        // Decay momentum over time
        this._momentumTimer = setInterval(() => {
            this.mouse.momentum *= this.settings.momentumDecay;
        }, 16); // ~60fps
    }
    
    setupControls() {
        // Pixel Scale - simple 1-10x scale
        const gridSizeSlider = document.getElementById('gridSize');
        const gridSizeValue = document.getElementById('gridSizeValue');
        gridSizeSlider.min = 1;
        gridSizeSlider.max = 10;
        gridSizeSlider.step = 1;
        gridSizeSlider.value = this.settings.pixelScale;
        
        gridSizeSlider.addEventListener('input', (e) => {
            this.settings.pixelScale = parseInt(e.target.value);
            
            // Recalculate grid dimensions
            this.calculateOptimalGridSize();
        });
        
        // Scale Intensity
        const scaleIntensitySlider = document.getElementById('scaleIntensity');
        const scaleIntensityValue = document.getElementById('scaleIntensityValue');
        scaleIntensitySlider.addEventListener('input', (e) => {
            this.settings.scaleIntensity = parseFloat(e.target.value);
            scaleIntensityValue.textContent = `${this.settings.scaleIntensity}%`;
        });
        
        // Ripple Falloff
        const rippleFalloffSlider = document.getElementById('rippleFalloff');
        const rippleFalloffValue = document.getElementById('rippleFalloffValue');
        rippleFalloffSlider.addEventListener('input', (e) => {
            this.settings.rippleFalloff = parseFloat(e.target.value);
            rippleFalloffValue.textContent = this.settings.rippleFalloff;
        });
        
        // Static Speed
        const staticSpeedSlider = document.getElementById('staticSpeed');
        const staticSpeedValue = document.getElementById('staticSpeedValue');
        staticSpeedSlider.addEventListener('input', (e) => {
            this.settings.staticSpeed = parseFloat(e.target.value);
            staticSpeedValue.textContent = this.settings.staticSpeed;
        });
        
        // Min Brightness
        const minBrightnessSlider = document.getElementById('minBrightness');
        const minBrightnessValue = document.getElementById('minBrightnessValue');
        minBrightnessSlider.value = this.settings.minBrightness;
        minBrightnessValue.textContent = this.settings.minBrightness;
        minBrightnessSlider.addEventListener('input', (e) => {
            this.settings.minBrightness = parseInt(e.target.value);
            minBrightnessValue.textContent = this.settings.minBrightness;
            
            // Ensure min doesn't exceed max
            if (this.settings.minBrightness > this.settings.maxBrightness) {
                this.settings.maxBrightness = this.settings.minBrightness;
                const maxBrightnessSlider = document.getElementById('maxBrightness');
                const maxBrightnessValue = document.getElementById('maxBrightnessValue');
                maxBrightnessSlider.value = this.settings.maxBrightness;
                maxBrightnessValue.textContent = this.settings.maxBrightness;
            }
        });
        
        // Max Brightness
        const maxBrightnessSlider = document.getElementById('maxBrightness');
        const maxBrightnessValue = document.getElementById('maxBrightnessValue');
        maxBrightnessSlider.value = this.settings.maxBrightness;
        maxBrightnessValue.textContent = this.settings.maxBrightness;
        maxBrightnessSlider.addEventListener('input', (e) => {
            this.settings.maxBrightness = parseInt(e.target.value);
            maxBrightnessValue.textContent = this.settings.maxBrightness;
            
            // Ensure max doesn't go below min
            if (this.settings.maxBrightness < this.settings.minBrightness) {
                this.settings.minBrightness = this.settings.maxBrightness;
                const minBrightnessSlider = document.getElementById('minBrightness');
                const minBrightnessValue = document.getElementById('minBrightnessValue');
                minBrightnessSlider.value = this.settings.minBrightness;
                minBrightnessValue.textContent = this.settings.minBrightness;
            }
        });
    }
    
    updateInstanceBuffers() {
        // Update offset buffer
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.instanceOffset);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, this.offsetArray, this.gl.STATIC_DRAW);
        
        // Update seed buffer
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.instanceSeed);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, this.seedArray, this.gl.STATIC_DRAW);
    }
    
    startRenderLoop() {
        const render = (timestamp) => {
            const time = timestamp * 0.001;
            
            // Update momentum display
            const momentumDisplay = document.getElementById('momentumDisplay');
            if (momentumDisplay) {
                momentumDisplay.textContent = this.mouse.momentum.toFixed(2);
            }
            
            // Convert mouse to clip space coordinates
            const mouseClipX = (this.mouse.x / this.canvas.width) * 2.0 - 1.0;
            const mouseClipY = (this.mouse.y / this.canvas.height) * 2.0 - 1.0;
            
            // Set uniforms (scale computation now happens in GPU)
            if (this.program) {
                this.gl.uniform1f(this.uniforms.time, time);
                this.gl.uniform1f(this.uniforms.staticSpeed, this.settings.staticSpeed);
                this.gl.uniform1f(this.uniforms.gridSizeX, this.settings.gridSizeX);
                this.gl.uniform1f(this.uniforms.gridSizeY, this.settings.gridSizeY);
                this.gl.uniform2f(this.uniforms.mouseClip, mouseClipX, mouseClipY);
                this.gl.uniform1f(this.uniforms.momentum, this.mouse.momentum);
                this.gl.uniform1f(this.uniforms.scaleIntensity, this.settings.scaleIntensity);
                this.gl.uniform1f(this.uniforms.rippleFalloff, this.settings.rippleFalloff);
                this.gl.uniform2f(this.uniforms.resolution, this.canvas.width, this.canvas.height);
                this.gl.uniform1f(this.uniforms.minBrightness, this.settings.minBrightness / 255.0);
                this.gl.uniform1f(this.uniforms.maxBrightness, this.settings.maxBrightness / 255.0);
            }
            
            // Clear and draw
            this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
            this.gl.clear(this.gl.COLOR_BUFFER_BIT);
            
            // Bind VAO and draw instances
            this.gl.bindVertexArray(this.vao);
            this.gl.drawArraysInstanced(this.gl.TRIANGLES, 0, 6, this.instanceCount);
            
            this._rafId = requestAnimationFrame(render);
        };
        
        this._rafId = requestAnimationFrame(render);
    }

    // Cleanup to avoid leaks when replacing or navigating
    destroy() {
        try {
            if (this._rafId) cancelAnimationFrame(this._rafId);
            if (this._momentumTimer) clearInterval(this._momentumTimer);
            if (this._onResize) window.removeEventListener('resize', this._onResize);
            if (this._mouseTarget && this._onMouseMove) {
                this._mouseTarget.removeEventListener('mousemove', this._onMouseMove);
            }

            if (this.gl) {
                if (this.buffers.instanceOffset) this.gl.deleteBuffer(this.buffers.instanceOffset);
                if (this.buffers.instanceSeed) this.gl.deleteBuffer(this.buffers.instanceSeed);
                if (this.buffers.vertex) this.gl.deleteBuffer(this.buffers.vertex);
                if (this.vao) this.gl.deleteVertexArray(this.vao);
                if (this.program) this.gl.deleteProgram(this.program);
            }
        } catch (e) {
            console.warn('TVStaticApp destroy error:', e);
        }
    }
}

// Utility function to create a TV static overlay
window.createTVStaticOverlay = function(canvasId = 'tv-static-canvas', options = {}) {
    // If the canvas isn't present, do nothing (helps when a layer is intentionally removed)
    const el = document.getElementById(canvasId);
    if (!el) {
        console.warn(`TV static overlay skipped: canvas "${canvasId}" not found`);
        return null;
    }
    return new TVStaticApp({
        canvasId: canvasId,
        overlay: true,
        showControls: false,
        pixelScale: 2,
        scaleIntensity: 100,
        staticSpeed: 24,
        opacity: 1,
        rippleFalloff: 3.0,
        ...options
    });
};

// Optional: expose constructor for advanced usage
window.TVStaticApp = TVStaticApp;

// Initialize the app when the page loads (only if glcanvas exists - for tvstatic.html)
document.addEventListener('DOMContentLoaded', () => {
    // Allow host page to disable auto-init via window.TVSTATIC_AUTO_INIT = false
    if (window.TVSTATIC_AUTO_INIT === false) {
        return;
    }

    const mainCanvas = document.getElementById('glcanvas');
    if (mainCanvas) {
        new TVStaticApp();
    }
    
    // Auto-initialize overlay if tv-static-canvas exists
    const overlayCanvas = document.getElementById('tv-static-canvas');
    if (overlayCanvas) {
        window.createTVStaticOverlay();
    }
    
    // Auto-initialize top layer if tv-static-top exists
    const topCanvas = document.getElementById('tv-static-top');
    if (topCanvas) {
        // Ensure styling is applied via CSS class
        if (!topCanvas.classList.contains('tv-static-top')) {
            topCanvas.classList.add('tv-static-top');
        }
        window.createTVStaticOverlay('tv-static-top', {
            pixelScale: 4,        // Larger pixels for top layer
            scaleIntensity: 100,   // Less intense scaling
            staticSpeed: 15,      // Slower animation
            rippleFalloff: 5.0    // Wider ripple effect
            // Note: opacity and z-index are handled by CSS, not overridden here
        });
    }
});
