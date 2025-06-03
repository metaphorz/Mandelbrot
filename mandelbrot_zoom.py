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
        self.ax.set_title("Mandelbrot Set Explorer\nDrag to zoom")
        self.selector = RectangleSelector(
            self.ax,
            self.onselect,
            useblit=True,
            button=[1],
            interactive=True,
        )
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


if __name__ == "__main__":
    MandelbrotExplorer()
