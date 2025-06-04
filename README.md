# Mandelbrot Explorer

This repository provides a small Python script to interactively explore the Mandelbrot set using Matplotlib.

## Requirements

- Python 3
- NumPy
- Matplotlib

Install the dependencies with:

```bash
pip install numpy matplotlib
```

## Usage (Python)

Run the script with:

```bash
python mandelbrot_zoom.py
```

An interactive window will open. Drag with the left mouse button to draw a rectangle and zoom in on that region of the Mandelbrot set. You can also use the mouse scroll wheel to zoom in and out around the cursor position and drag with the right mouse button to pan around the current view.

## WebGL Explorer

A browser-based explorer is available using WebGL for fast rendering. Open `index.html` in a modern browser. Use the sliders to adjust the number of iterations and color shift. Click and drag to pan and use the mouse wheel to zoom.

If your browser blocks loading the file directly, start a local server:

```bash
python -m http.server
```

Then visit `http://localhost:8000/index.html`.

## Troubleshooting

If the WebGL canvas only shows a white screen, open the browser's developer console and check for shader compilation errors. One common issue is an empty initializer in the fragment shader loop. The loop counter must be declared and assigned in the `for` statement, as shown in `mandelbrot.js`:

```glsl
for (int iter = 0; iter < 1000; iter++) {
    if (iter >= u_iter || dot(z, z) > 4.0) break;
    z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + c;
}
```

Updating the shader in this way resolves the "Invalid init declaration" error
and prevents `attachShader` exceptions during program creation.

## License

This project is licensed under the [MIT License](LICENSE).
