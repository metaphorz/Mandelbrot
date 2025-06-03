import numpy as np
import matplotlib.pyplot as plt
from matplotlib.widgets import RectangleSelector


class MandelbrotExplorer:
    def __init__(self, xlim=(-2.0, 1.0), ylim=(-1.5, 1.5), width=800, height=800, max_iter=200):
        self.xlim = list(xlim)
        self.ylim = list(ylim)
        self.width = width
        self.height = height
        self.max_iter = max_iter

        self.fig, self.ax = plt.subplots()
        self.ax.set_title("Mandelbrot Set Explorer\nDrag to zoom, scroll to change scale")
        self.selector = RectangleSelector(
            self.ax,
            self.onselect,
            useblit=True,
            button=[1],
            interactive=True,
        )

        # Variables for panning with the right mouse button
        self._dragging = False
        self._press_event = None
        self._press_xlim = None
        self._press_ylim = None

        # Connect additional event handlers
        self.fig.canvas.mpl_connect("scroll_event", self.onscroll)
        self.fig.canvas.mpl_connect("button_press_event", self.onpress)
        self.fig.canvas.mpl_connect("button_release_event", self.onrelease)
        self.fig.canvas.mpl_connect("motion_notify_event", self.onmotion)

        self.draw()
        plt.show()

    def mandelbrot(self):
        x = np.linspace(self.xlim[0], self.xlim[1], self.width)
        y = np.linspace(self.ylim[0], self.ylim[1], self.height)
        X, Y = np.meshgrid(x, y)
        C = X + 1j * Y
        Z = np.zeros_like(C)
        output = np.zeros(Z.shape, dtype=int)
        mask = np.full(Z.shape, True, dtype=bool)

        for i in range(self.max_iter):
            Z[mask] = Z[mask] ** 2 + C[mask]
            mask = mask & (np.abs(Z) < 2)
            output[mask] = i
        return output

    def draw(self):
        self.ax.clear()
        m = self.mandelbrot()
        self.ax.imshow(
            m,
            extent=(self.xlim[0], self.xlim[1], self.ylim[0], self.ylim[1]),
            origin="lower",
            cmap="hot",
        )
        self.ax.set_xlabel("Re")
        self.ax.set_ylabel("Im")
        self.fig.canvas.draw()

    def onselect(self, eclick, erelease):
        if eclick.xdata is None or erelease.xdata is None:
            return
        x1, y1 = eclick.xdata, eclick.ydata
        x2, y2 = erelease.xdata, erelease.ydata
        self.xlim = sorted([x1, x2])
        self.ylim = sorted([y1, y2])
        self.draw()

    def onscroll(self, event):
        if event.xdata is None or event.ydata is None:
            return
        scale = 0.9 if event.button == "up" else 1.1
        xrel = (event.xdata - self.xlim[0]) / (self.xlim[1] - self.xlim[0])
        yrel = (event.ydata - self.ylim[0]) / (self.ylim[1] - self.ylim[0])
        xwidth = (self.xlim[1] - self.xlim[0]) * scale
        ywidth = (self.ylim[1] - self.ylim[0]) * scale
        self.xlim = [
            event.xdata - xwidth * xrel,
            event.xdata + xwidth * (1 - xrel),
        ]
        self.ylim = [
            event.ydata - ywidth * yrel,
            event.ydata + ywidth * (1 - yrel),
        ]
        self.draw()

    def onpress(self, event):
        if event.button != 3 or event.xdata is None or event.ydata is None:
            return
        self._dragging = True
        self._press_event = event
        self._press_xlim = list(self.xlim)
        self._press_ylim = list(self.ylim)

    def onmotion(self, event):
        if not self._dragging or event.xdata is None or event.ydata is None:
            return
        dx = event.xdata - self._press_event.xdata
        dy = event.ydata - self._press_event.ydata
        self.xlim = [self._press_xlim[0] - dx, self._press_xlim[1] - dx]
        self.ylim = [self._press_ylim[0] - dy, self._press_ylim[1] - dy]
        self.draw()

    def onrelease(self, event):
        if event.button != 3:
            return
        self._dragging = False


if __name__ == "__main__":
    MandelbrotExplorer()
