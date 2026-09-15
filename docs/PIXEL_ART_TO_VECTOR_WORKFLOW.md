# Pixel Art & Mosaic Master Vector (SVG) Conversion Guide

> **Specification & Quality Benchmark**: Designed for **Pixel Art** and **Geometric Mosaic** modes following [`Pixel_Art_Master_Prompt.txt`](file:///c:/Projects/pixel-art-actionplan%20-%20backup%20v16%20try%20final%20website/Pixel_Art_Master_Prompt.txt) and [`Mosaic_Engine_PRD_v2_Dual_Input_System.md`](file:///c:/Projects/pixel-art-actionplan%20-%20backup%20v16%20try%20final%20website/docs/Mosaic_Engine_PRD_v2_Dual_Input_System.md).

---

## 1. Overview: Dual Vector Engine System

The **Pixel & Vector Creative Suite** supports two dedicated vectorization engines:
1. **Pixel Art Engine**: Direct Cell Extraction for standard pixel matrices ($8\times8$, $16\times16$, $32\times32$, $64\times64$).
2. **Mosaic Engine**: Geometric Tile Grid Construction for staggered shapes (**Square**, **Circle**, **Triangle**, **Diamond**, **Hexagon**).

Both engines export **100% true vector SVG graphics** with zero raster embedded images, crisp edge rendering, and 1-click color layer grouping.

---

## 2. Part A: Pixel Art Direct Grid-Cell Extraction Workflow

When source artwork is **already designed as pixel art**:
* Select target grid dimension: **$8\times 8\text{ px}$**, **$16\times 16\text{ px}$**, **$32\times 32\text{ px}$**, or **$64\times 64\text{ px}$**.
* Center-pixel sampling extracts the **100% exact original color** of each cell (`colorMode: 'original'`).
* Merges adjacent matching row cells into clean horizontal SVG `<rect>` shapes grouped by color hex code.

| Selected Grid Size | Resolution | Best Use Case | Extraction Mode |
| :--- | :--- | :--- | :--- |
| **8 × 8 px** | Micro Grid | Micro-details, bitmap glyphs, status icons | Direct 1:1 Cell Extraction |
| **16 × 16 px** | Standard Grid | Primary icons, badges, item sprites | Direct 1:1 Cell Extraction |
| **32 × 32 px** | Medium Grid | App windows, detailed items, compound containers | Direct 1:1 Cell Extraction |
| **64 × 64 px** | High-Detail Grid | Detailed character sprites, hero frames | Direct 1:1 Cell Extraction |

---

## 3. Part B: Mosaic Engine Vector Workflow & Tile Features

The **Mosaic Engine** converts artwork into structured geometric tile matrices with cell-level trimming and 100% boundary cell preservation.

### Supported Geometric Vector Tile Shapes:
* ⏹️ **Square**: Solid grid cells using clamped `<rect x="..." y="..." width="..." height="..." />`.
* ⏺️ **Circle**: Smooth vector dots using `<circle cx="..." cy="..." r="..." />`.
* 🔺 **Triangle**: 3-point directional polygons using `<polygon points="x1,y1 x2,y2 x3,y3" />`.
* 🔶 **Diamond**: 4-point rotated polygons using `<polygon points="top right bottom left" />`.
* ⬡ **Hexagon**: 6-point honeycombed polygons using `<polygon points="p1 p2 p3 p4 p5 p6" />`.

### Mosaic Vector Pipeline:
```
[ Input Artwork / Source Image ]
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: Multi-Mode Sampling & Continuous Shading            │
│ • Sample tile colors via Perceptual, Dominant, or Median    │
│ • Preserve continuous gradients & color transitions         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: Staggered Geometric Grid Construction               │
│ • Construct tile grid with selected shape (Rect, Circle,    │
│   Triangle, Diamond, Hexagon)                               │
│ • Apply precise tile rotation, scale, and opacity           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: Background Removal & Cell-Level Mosaic Trim         │
│ • Scope-aware background classifier removes background tiles │
│ • Cell-level trim preserves subject boundaries & sharp edges│
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: True Vector SVG Export (`SvgExporter.exportMosaic`) │
│ • Group tiles into `<g id="layer-color-XXXXXX">`            │
│ • Default transparent background (`transparentBg: true`)     │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Codebase Engine Implementation Reference

In your application, both workflows are powered by [`PixelArtEngine.js`](file:///c:/Projects/pixel-art-actionplan%20-%20backup%20v16%20try%20final%20website/src/core/pixel-art/PixelArtEngine.js), [`MosaicEngine.js`](file:///c:/Projects/pixel-art-actionplan%20-%20backup%20v16%20try%20final%20website/src/core/mosaic/MosaicEngine.js), and [`SvgExporter.js`](file:///c:/Projects/pixel-art-actionplan%20-%20backup%20v16%20try%20final%20website/src/core/export/SvgExporter.js):

```javascript
// =========================================================================
// 1. Pixel Art Engine Vector Export
// =========================================================================
const pixelGrid = PixelArtEngine.process(sourceImage, {
  gridWidth: 16,          // 8, 16, 32, or 64
  gridHeight: 16,
  colorMode: 'original',   // Preserve 100% exact original colors
  samplingMethod: 'median'
});

const pixelSvg = SvgExporter.exportPixelArt(pixelGrid, {
  mode: 'grouped',
  transparentBg: true
});

// =========================================================================
// 2. Mosaic Engine Vector Export
// =========================================================================
const mosaicResult = MosaicEngine.process(sourceImage, {
  tileSize: 16,
  tileShape: 'square',    // 'square', 'circle', 'triangle', 'diamond', 'hexagon'
  backgroundRemoval: true
});

const mosaicSvg = SvgExporter.exportMosaic(mosaicResult, {
  mode: 'grouped',
  transparentBg: true
});
```

---

## 5. ✅ 100% Quality Verification Checklist

- [x] **Pixel Art Modes**: $8\times8$, $16\times16$, $32\times32$, and $64\times64$ grid cell options.
- [x] **Mosaic Tile Shapes**: Full vector support for Square, Circle, Triangle, Diamond, and Hexagon shapes.
- [x] **0 Mismatched Pixels**: 1:1 bitwise parity between input cells and SVG vector tiles.
- [x] **Original Color Parity**: 100% color retention using `'original'` color mode.
- [x] **Zero Mixels**: 100% scale consistency across all canvas elements.
- [x] **Zero Anti-Aliasing**: Hard discrete borders with `shape-rendering="crispEdges"`.
- [x] **1-Click Color Ungrouping**: Organized into `<g id="layer-color-XXXXXX">`.
- [x] **Clean Seams**: 0px gap rendering artifacts between vector rectangles/polygons.
