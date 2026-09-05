# Color Palette Generator Pro

[![CI](https://github.com/kasapdev/color-palette-generator-pro/actions/workflows/ci.yml/badge.svg)](https://github.com/kasapdev/color-palette-generator-pro/actions/workflows/ci.yml) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE) ![Vanilla JS](https://img.shields.io/badge/Vanilla-JS-F7DF1E?logo=javascript&logoColor=black)

Generate, lock and export gorgeous color palettes in HEX, RGB & HSL.

> A fast, offline-first palette generator with harmony modes, per-swatch locking, saved-palette management, and one-click export to CSS, JSON, plain list and PNG. Zero dependencies, zero build step — open `index.html` and create.

## Overview

Color Palette Generator Pro is part of the **Web Utility Suite**, a collection of premium, framework-free browser tools. It produces five-color palettes using real HSL color-harmony math (analogous, complementary, triadic, monochrome) seeded from a base color, or fully random in Auto mode. Every swatch shows its HEX, RGB and HSL values, automatically picks readable black/white text via WCAG luminance, and can be individually locked so you only regenerate what you want. Palettes you love can be saved, favorited and exported in the format your project needs.

Everything runs locally in the browser. There are no network calls, no CDNs and no tracking — your palettes are stored in `localStorage` on your machine.

## Features

- **Five large, responsive swatches** that fill the row on desktop and stack cleanly on mobile.
- **Per-swatch toolbar** — copy HEX, copy RGB, copy HSL, and a lock toggle.
- **Click-to-copy** — clicking any swatch copies its HEX instantly.
- **Lock & regenerate** — locked swatches are preserved; only unlocked colors change.
- **Harmony modes** — Auto/Random, Analogous, Complementary, Triadic, Monochrome, computed from HSL math around a base hue.
- **Base color seed** — pick a color (or type a hex) to drive the harmony; Auto mode ignores it for full randomness.
- **Readable text everywhere** — black/white ink chosen per swatch using relative luminance.
- **Live RGB & HSL** — shown in mono text on hover (always visible on mobile).
- **Saved palettes** — save, load, copy, delete, and favorite. Favorites are pinned to the top and filterable, with polished empty states.
- **Export anywhere** — copy as CSS variables, JSON array or plain list; download `.css`, `.json`, or a rendered `.png` of the palette.
- **Keyboard-first** — generate, save, copy and lock without touching the mouse, plus a shortcuts help modal.
- **Dark & light themes** and a fully responsive, accessible layout.

## Installation

No dependencies, no build step.

```bash
git clone https://github.com/your-org/web-utility-suite.git
cd web-utility-suite/color-palette-generator
```

Then open `index.html` directly in any modern browser (it works from `file://`), or serve the suite root with any static file server.

## Usage

1. Choose a **harmony mode** (Auto, Analogous, Complementary, Triadic, Monochrome).
2. Optionally set a **base color** with the picker or by typing a hex value — this seeds every mode except Auto.
3. Press **Generate** (or hit `Space`) for a new palette.
4. **Lock** swatches you want to keep, then regenerate to vary only the rest.
5. **Copy** any value from a swatch's toolbar, or click the swatch to copy its HEX.
6. **Save** palettes you like; load, favorite, copy or delete them from the Saved section.
7. **Export** the current palette as CSS variables, JSON, a plain list, or download it as `.css`, `.json` or `.png`.

## Keyboard Shortcuts

| Shortcut        | Action                       |
| --------------- | ---------------------------- |
| `Space`         | Generate a new palette       |
| `S`             | Save the current palette     |
| `C`             | Copy all HEX values          |
| `1` – `5`       | Toggle lock on that swatch   |
| `?`             | Open the shortcuts help      |
| `Esc`           | Close the open dialog        |

> Bare-key shortcuts are ignored while you're typing in an input, so editing the base hex never triggers a regenerate.

## Screenshots

> _Screenshots coming soon._

![screenshot](docs/screenshot-1.png)
![screenshot](docs/screenshot-2.png)

## Roadmap

- [ ] Adjustable palette size (3–8 swatches)
- [ ] Per-swatch fine-tuning sliders (hue / saturation / lightness)
- [ ] Color-blindness simulation preview
- [ ] Import palettes from an uploaded image
- [ ] Shareable palette links via URL hash

## License

MIT Licensed — part of the [Web Utility Suite](../index.html).
