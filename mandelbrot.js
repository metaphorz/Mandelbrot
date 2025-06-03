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
  gl.attachShader(program, createShader(gl, gl.VERTEX_SHADER, vsSrc));
  gl.attachShader(program, createShader(gl, gl.FRAGMENT_SHADER, fsSrc));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
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
uniform float u_color;

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
    vec2 uv = (gl_FragCoord.xy / u_resolution - 0.5) * u_scale;
    vec2 c = uv + u_center;
    vec2 z = vec2(0.0);
    int i = 0;
    for (; i < 1000; i++) {
        if (i >= u_iter || dot(z, z) > 4.0) break;
        z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + c;
    }
    float f = float(i) / float(u_iter);
    vec3 col = hsv2rgb(vec3(u_color + f, 1.0, f < 1.0 ? 1.0 : 0.0));
    gl_FragColor = vec4(col, 1.0);
}`;

const program = createProgram(gl, vertexSrc, fragmentSrc);

const positionLoc = gl.getAttribLocation(program, 'position');
const centerLoc = gl.getUniformLocation(program, 'u_center');
const scaleLoc = gl.getUniformLocation(program, 'u_scale');
const resLoc = gl.getUniformLocation(program, 'u_resolution');
const iterLoc = gl.getUniformLocation(program, 'u_iter');
const colorLoc = gl.getUniformLocation(program, 'u_color');

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
let colorInput = document.getElementById('color');
let iterations = parseInt(iterInput.value);
let colorShift = parseFloat(colorInput.value) / 360.0;

iterInput.oninput = () => {
  iterations = parseInt(iterInput.value);
};
colorInput.oninput = () => {
  colorShift = parseFloat(colorInput.value) / 360.0;
};

let dragging = false;
let lastX = 0;
let lastY = 0;

canvas.addEventListener('mousedown', (e) => {
  dragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
});
canvas.addEventListener('mousemove', (e) => {
  if (!dragging) return;
  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;
  const factor = scale / canvas.height;
  center.x -= dx * factor;
  center.y += dy * factor;
  lastX = e.clientX;
  lastY = e.clientY;
});
window.addEventListener('mouseup', () => { dragging = false; });

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const zoom = e.deltaY > 0 ? 1.1 : 0.9;
  scale *= zoom;
});

function render() {
  gl.uniform2f(centerLoc, center.x, center.y);
  gl.uniform1f(scaleLoc, scale);
  gl.uniform1i(iterLoc, iterations);
  gl.uniform1f(colorLoc, colorShift);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  requestAnimationFrame(render);
}

render();
