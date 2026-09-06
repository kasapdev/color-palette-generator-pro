# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.1.0] - 2026-09-06

### Added

- Contrast checker mode (toggle button in the topbar, or press `A`): each swatch shows its WCAG contrast ratio against white and black text with an AAA/AA/Fail badge, computed from the same relative-luminance math already used to pick readable ink color. The preference persists in `localStorage`.

## [1.0.1] - 2026-09-06

### Fixed

- Fixed garbled text encoding in `index.html` — the em dash in the page `<title>`, the middle dot in the footer ("Part of the Web Utility Suite"), and the en dash in the keyboard-shortcuts modal ("1–5") were mojibake (`â€”`, `Â·`, `â€“`) instead of the intended Unicode characters, so they rendered as literal garbage text in the browser tab, footer, and shortcuts help dialog.
