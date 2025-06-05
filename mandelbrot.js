const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl');
if (!gl) {
  alert('WebGL not supported');
}

function createShader(gl, type, src) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl, vsSrc, fsSrc) {
  const program = gl.createProgram();
  const vs = createShader(gl, gl.VERTEX_SHADER, vsSrc);
  const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSrc);
  if (!vs || !fs) {
    return null;
  }
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

const vertexSrc = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const fragmentSrc = `
precision highp float;
uniform vec2 u_center;
uniform float u_scale;
uniform vec2 u_resolution;
uniform int u_iter;
uniform float u_brightness;
uniform float u_contrast;

void main() {
    vec2 uv = (gl_FragCoord.xy / u_resolution - 0.5) * u_scale;
    vec2 c = uv + u_center;
    vec2 z = vec2(0.0);
    int iter = 0;
    int maxIter = u_iter;
    
    // Loop until max iterations or escape
    for (int i = 0; i < 3000; i++) {
        if (i >= maxIter) {
            iter = maxIter;
            break;
        }
        
        // Check if point has escaped
        if (dot(z, z) > 4.0) {
            iter = i;
            break;
        }
        
        // Standard Mandelbrot iteration: z = z^2 + c
        z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + c;
    }
    
    // Direct mapping from iteration count to grayscale
    // Similar to: GRAYS = list(reversed([pygame.Color(*(int(255 * i / MAX_ITER),) * 3) for i in range(MAX_ITER + 1)]))
    float gray = 1.0 - (float(iter) / float(maxIter));
    
    // Apply brightness and contrast adjustments
    gray = (gray - 0.5) * u_contrast + 0.5;
    gray = gray * u_brightness;
    gray = clamp(gray, 0.0, 1.0);
    
    gl_FragColor = vec4(gray, gray, gray, 1.0);
}`;

const program = createProgram(gl, vertexSrc, fragmentSrc);
if (!program) {
  alert('Failed to create WebGL program');
  throw new Error('Program creation failed');
}

const positionLoc = gl.getAttribLocation(program, 'position');
const centerLoc = gl.getUniformLocation(program, 'u_center');
const scaleLoc = gl.getUniformLocation(program, 'u_scale');
const resLoc = gl.getUniformLocation(program, 'u_resolution');
const iterLoc = gl.getUniformLocation(program, 'u_iter');
const brightnessLoc = gl.getUniformLocation(program, 'u_brightness');
const contrastLoc = gl.getUniformLocation(program, 'u_contrast');

const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
const vertices = new Float32Array([
  -1, -1,
   1, -1,
  -1,  1,
  -1,  1,
   1, -1,
   1,  1
]);

gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

gl.useProgram(program);

gl.enableVertexAttribArray(positionLoc);
gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

gl.uniform2f(resLoc, canvas.width, canvas.height);

let center = {x: -0.5, y: 0};
let scale = 3.0;
let iterInput = document.getElementById('iter');
let brightnessInput = document.getElementById('brightness');
let contrastInput = document.getElementById('contrast');
let iterations = parseInt(iterInput.value);
let brightness = parseFloat(brightnessInput.value) / 50.0; // 0-2 range
let contrast = parseFloat(contrastInput.value) / 50.0;   // 0-2 range

// Get value display elements
let iterValueDisplay = document.getElementById('iter-value');
let brightnessValueDisplay = document.getElementById('brightness-value');
let contrastValueDisplay = document.getElementById('contrast-value');

iterInput.oninput = () => {
  iterations = parseInt(iterInput.value);
  iterValueDisplay.textContent = iterations;
  requestAnimationFrame(render);
};

brightnessInput.oninput = () => {
  brightness = parseFloat(brightnessInput.value) / 50.0;
  brightnessValueDisplay.textContent = brightness.toFixed(1);
  requestAnimationFrame(render);
};

contrastInput.oninput = () => {
  contrast = parseFloat(contrastInput.value) / 50.0;
  contrastValueDisplay.textContent = contrast.toFixed(1);
  requestAnimationFrame(render);
};

let dragging = false;
let lastX = 0;
let lastY = 0;

// For zoom box selection
let zoomBoxActive = false;
let zoomBoxStart = { x: 0, y: 0 };
let zoomBoxEnd = { x: 0, y: 0 };
let zoomBox = null;

// Create zoom box element
function createZoomBox() {
  if (zoomBox) return;
  
  zoomBox = document.createElement('div');
  zoomBox.style.position = 'absolute';
  zoomBox.style.border = '2px dashed white';
  zoomBox.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
  zoomBox.style.pointerEvents = 'none';
  zoomBox.style.display = 'none';
  document.body.appendChild(zoomBox);
}

// Position the zoom box
function updateZoomBox() {
  if (!zoomBox) return;
  
  const rect = canvas.getBoundingClientRect();
  const left = Math.min(zoomBoxStart.x, zoomBoxEnd.x);
  const top = Math.min(zoomBoxStart.y, zoomBoxEnd.y);
  const width = Math.abs(zoomBoxEnd.x - zoomBoxStart.x);
  const height = Math.abs(zoomBoxEnd.y - zoomBoxStart.y);
  
  zoomBox.style.left = left + 'px';
  zoomBox.style.top = top + 'px';
  zoomBox.style.width = width + 'px';
  zoomBox.style.height = height + 'px';
  zoomBox.style.display = 'block';
}

// Apply zoom to selected area
function applyZoomBox() {
  if (!zoomBoxActive || !zoomBox) return;
  
  const rect = canvas.getBoundingClientRect();
  const canvasX1 = (zoomBoxStart.x - rect.left) / rect.width;
  const canvasY1 = (zoomBoxStart.y - rect.top) / rect.height;
  const canvasX2 = (zoomBoxEnd.x - rect.left) / rect.width;
  const canvasY2 = (zoomBoxEnd.y - rect.top) / rect.height;
  
  // Convert to mandelbrot coordinates
  const x1 = (canvasX1 - 0.5) * scale + center.x;
  const y1 = (0.5 - canvasY1) * scale + center.y;
  const x2 = (canvasX2 - 0.5) * scale + center.x;
  const y2 = (0.5 - canvasY2) * scale + center.y;
  
  // Set new center and scale
  center.x = (x1 + x2) / 2;
  center.y = (y1 + y2) / 2;
  scale = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
  
  // Hide zoom box
  zoomBox.style.display = 'none';
  zoomBoxActive = false;
  
  requestAnimationFrame(render);
}

// Initialize zoom box
createZoomBox();

// Handle mouse events
canvas.addEventListener('mousedown', (e) => {
  if (e.shiftKey) {
    // Start zoom box selection
    zoomBoxActive = true;
    zoomBoxStart = { x: e.clientX, y: e.clientY };
    zoomBoxEnd = { x: e.clientX, y: e.clientY };
    updateZoomBox();
  } else {
    // Start panning
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
  }
});

canvas.addEventListener('mousemove', (e) => {
  if (zoomBoxActive) {
    // Update zoom box
    zoomBoxEnd = { x: e.clientX, y: e.clientY };
    updateZoomBox();
  } else if (dragging) {
    // Pan the view
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    const factor = scale / canvas.height;
    center.x -= dx * factor;
    center.y += dy * factor;
    lastX = e.clientX;
    lastY = e.clientY;
    requestAnimationFrame(render);
  }
});

window.addEventListener('mouseup', (e) => { 
  if (zoomBoxActive) {
    applyZoomBox();
  }
  dragging = false;
  zoomBoxActive = false;
});

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  
  // Simple zoom approach
  if (e.deltaY < 0) {
    // Zoom in (wheel up)
    scale *= 0.9;
  } else {
    // Zoom out (wheel down)
    scale *= 1.1;
  }
  
  // Ensure scale stays within reasonable bounds
  scale = Math.max(0.00001, Math.min(10, scale));
  
  console.log('Mouse wheel zoom, new scale:', scale);
  
  // Request a new frame to render the updated view
  requestAnimationFrame(render);
});

function render() {
  gl.uniform2f(centerLoc, center.x, center.y);
  gl.uniform1f(scaleLoc, scale);
  gl.uniform1i(iterLoc, iterations);
  gl.uniform1f(brightnessLoc, brightness);
  gl.uniform1f(contrastLoc, contrast);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

// Add instructions to the page
const instructions = document.createElement('div');
instructions.innerHTML = `
  <p style="margin: 5px 0">
    <b>Controls:</b> 
    Drag to pan | 
    Mouse wheel to zoom | 
    Hold Shift + drag to select zoom area | 
    Reset button to return to initial view
  </p>
`;
canvas.parentNode.insertBefore(instructions, canvas);

// Store initial state for reset functionality
const initialState = {
  center: { x: -0.5, y: 0 },
  scale: 3.0,
  iterations: 50,
  brightness: 1.0,
  contrast: 1.0
};

// Reset button functionality
const resetButton = document.getElementById('reset');
resetButton.addEventListener('click', () => {
  // Reset view parameters
  center = { x: initialState.center.x, y: initialState.center.y };
  scale = initialState.scale;
  
  // Reset control values
  iterInput.value = initialState.iterations;
  iterations = initialState.iterations;
  iterValueDisplay.textContent = initialState.iterations;
  
  brightnessInput.value = 50; // Middle value
  brightness = initialState.brightness;
  brightnessValueDisplay.textContent = initialState.brightness.toFixed(1);
  
  contrastInput.value = 50; // Middle value
  contrast = initialState.contrast;
  contrastValueDisplay.textContent = initialState.contrast.toFixed(1);
  
  console.log('View reset to initial state');
  requestAnimationFrame(render);
});

// Download button functionality
const downloadButton = document.getElementById('download');
downloadButton.addEventListener('click', () => {
  // Create a high-resolution off-screen canvas
  const hiResCanvas = document.createElement('canvas');
  hiResCanvas.width = 3000;  // High resolution width
  hiResCanvas.height = 3000; // High resolution height
  
  const hiResGl = hiResCanvas.getContext('webgl');
  if (!hiResGl) {
    alert('Could not create WebGL context for high-res image');
    return;
  }
  
  // Create a program for the high-res canvas
  const hiResProgram = createProgram(hiResGl, vertexSrc, fragmentSrc);
  if (!hiResProgram) {
    alert('Failed to create WebGL program for high-res image');
    return;
  }
  
  // Set up the high-res canvas just like the main canvas
  const hiResPositionBuffer = hiResGl.createBuffer();
  hiResGl.bindBuffer(hiResGl.ARRAY_BUFFER, hiResPositionBuffer);
  hiResGl.bufferData(hiResGl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), hiResGl.STATIC_DRAW);
  
  hiResGl.useProgram(hiResProgram);
  
  // Get attribute and uniform locations
  const hiResPositionLoc = hiResGl.getAttribLocation(hiResProgram, 'position');
  const hiResCenterLoc = hiResGl.getUniformLocation(hiResProgram, 'u_center');
  const hiResScaleLoc = hiResGl.getUniformLocation(hiResProgram, 'u_scale');
  const hiResResolutionLoc = hiResGl.getUniformLocation(hiResProgram, 'u_resolution');
  const hiResIterLoc = hiResGl.getUniformLocation(hiResProgram, 'u_iter');
  const hiResBrightnessLoc = hiResGl.getUniformLocation(hiResProgram, 'u_brightness');
  const hiResContrastLoc = hiResGl.getUniformLocation(hiResProgram, 'u_contrast');
  
  // Set attributes and uniforms
  hiResGl.enableVertexAttribArray(hiResPositionLoc);
  hiResGl.vertexAttribPointer(hiResPositionLoc, 2, hiResGl.FLOAT, false, 0, 0);
  
  hiResGl.uniform2f(hiResCenterLoc, center.x, center.y);
  hiResGl.uniform1f(hiResScaleLoc, scale);
  hiResGl.uniform2f(hiResResolutionLoc, hiResCanvas.width, hiResCanvas.height);
  hiResGl.uniform1i(hiResIterLoc, iterations);
  hiResGl.uniform1f(hiResBrightnessLoc, brightness);
  hiResGl.uniform1f(hiResContrastLoc, contrast);
  
  // Draw the high-res Mandelbrot
  hiResGl.viewport(0, 0, hiResCanvas.width, hiResCanvas.height);
  hiResGl.drawArrays(hiResGl.TRIANGLE_STRIP, 0, 4);
  
  // Create a download link
  try {
    const dataURL = hiResCanvas.toDataURL('image/png');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const downloadLink = document.createElement('a');
    downloadLink.href = dataURL;
    downloadLink.download = `mandelbrot-${timestamp}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    console.log('High-resolution image download initiated');
  } catch (error) {
    console.error('Error creating download:', error);
    alert('Failed to create download. See console for details.');
  }
});

// Initial render
requestAnimationFrame(render);
