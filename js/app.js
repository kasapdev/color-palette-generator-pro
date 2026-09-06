/* =====================================================================
   Color Palette Generator Pro — app.js
   Vanilla ES6+, classic script (no modules). Relies on window.WUS.
   ===================================================================== */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  var SWATCH_COUNT = 5;
  var SAVED_KEY = 'cpg.saved';      // array of {id, colors[], name, ts, fav}
  var STATE_KEY = 'cpg.state';      // {colors, locked, harmony}
  var A11Y_KEY = 'cpg.a11y';        // boolean — contrast-checker panel visible

  /* ============================================================
     COLOR MATH
     ============================================================ */

  // "#rrggbb" -> {r,g,b} (0-255). Tolerant of shorthand / missing #.
  function hexToRgb(hex) {
    var h = String(hex).trim().replace(/^#/, '');
    if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16)
    };
  }

  // {r,g,b} -> "#RRGGBB"
  function rgbToHex(r, g, b) {
    var to = function (n) {
      var s = Math.round(WUS.clamp(n, 0, 255)).toString(16);
      return s.length === 1 ? '0' + s : s;
    };
    return ('#' + to(r) + to(g) + to(b)).toUpperCase();
  }

  // {r,g,b} 0-255 -> {h:0-360, s:0-100, l:0-100}
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h = 0, s = 0, l = (max + min) / 2;
    var d = max - min;
    if (d !== 0) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        default: h = (r - g) / d + 4; break;
      }
      h *= 60;
    }
    return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  // {h:0-360,s:0-100,l:0-100} -> {r,g,b} 0-255
  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360; h /= 360;
    s = WUS.clamp(s, 0, 100) / 100;
    l = WUS.clamp(l, 0, 100) / 100;
    var r, g, b;
    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      var hue2rgb = function (p, q, t) {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
  }

  function hslToHex(h, s, l) { var c = hslToRgb(h, s, l); return rgbToHex(c.r, c.g, c.b); }

  // Relative luminance (WCAG) for picking readable ink color.
  function luminance(r, g, b) {
    var ch = [r, g, b].map(function (v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  }
  // Returns 'dark' (use light text) or 'light' (use dark text)
  function inkFor(hex) {
    var c = hexToRgb(hex) || { r: 0, g: 0, b: 0 };
    return luminance(c.r, c.g, c.b) > 0.42 ? 'light' : 'dark';
  }

  function rgbString(hex) { var c = hexToRgb(hex); return c ? 'rgb(' + c.r + ', ' + c.g + ', ' + c.b + ')' : ''; }
  function hslString(hex) {
    var c = hexToRgb(hex); if (!c) return '';
    var h = rgbToHsl(c.r, c.g, c.b);
    return 'hsl(' + h.h + ', ' + h.s + '%, ' + h.l + '%)';
  }

  // WCAG relative-luminance contrast ratio between two hex colors. 1 (no
  // contrast) to 21 (black on white). https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
  function contrastRatio(hexA, hexB) {
    var a = hexToRgb(hexA), b = hexToRgb(hexB);
    if (!a || !b) return 0;
    var la = luminance(a.r, a.g, a.b) + 0.05;
    var lb = luminance(b.r, b.g, b.b) + 0.05;
    return la > lb ? la / lb : lb / la;
  }

  // WCAG 2.x pass level for a contrast ratio: 'AAA' | 'AA' | 'Fail'.
  // Normal-text thresholds (7:1 / 4.5:1) unless largeText is true (4.5:1 / 3:1).
  function wcagLevel(ratio, largeText) {
    if (largeText) return ratio >= 4.5 ? 'AAA' : ratio >= 3 ? 'AA' : 'Fail';
    return ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : 'Fail';
  }

  /* ============================================================
     PALETTE GENERATION (HSL harmony math)
     ============================================================ */

  var rand = function (min, max) { return min + Math.random() * (max - min); };
  var wrapHue = function (h) { return ((h % 360) + 360) % 360; };

  // Build 5 colors from a base hue using the chosen harmony.
  function buildPalette(harmony, baseHex) {
    var base = hexToRgb(baseHex) || hexToRgb('#6366F1');
    var bh = rgbToHsl(base.r, base.g, base.b);
    var hue = bh.h;
    var out = [];

    switch (harmony) {
      case 'analogous': {
        // spread ±60° around base, varied lightness
        var offsets = [-40, -20, 0, 20, 40];
        offsets.forEach(function (o, i) {
          out.push(hslToHex(wrapHue(hue + o), WUS.clamp(bh.s + rand(-8, 8), 45, 90), WUS.clamp(38 + i * 9, 30, 82)));
        });
        break;
      }
      case 'complementary': {
        var comp = wrapHue(hue + 180);
        var sats = [70, 80, 60, 75, 65];
        var ligs = [40, 62, 50, 38, 70];
        out = [
          hslToHex(hue, sats[0], ligs[0]),
          hslToHex(hue, sats[1], ligs[1]),
          hslToHex(wrapHue(hue + rand(-12, 12)), sats[2], ligs[2]),
          hslToHex(comp, sats[3], ligs[3]),
          hslToHex(comp, sats[4], ligs[4])
        ];
        break;
      }
      case 'triadic': {
        var h2 = wrapHue(hue + 120), h3 = wrapHue(hue + 240);
        out = [
          hslToHex(hue, 72, 46),
          hslToHex(h2, 68, 52),
          hslToHex(h3, 70, 50),
          hslToHex(hue, 60, 70),
          hslToHex(h2, 64, 36)
        ];
        break;
      }
      case 'monochrome': {
        var sBase = WUS.clamp(bh.s, 40, 85);
        var ligsM = [22, 38, 54, 70, 86];
        ligsM.forEach(function (l) {
          out.push(hslToHex(hue, WUS.clamp(sBase + rand(-6, 6), 25, 92), l));
        });
        break;
      }
      default: { // auto / random — pleasant random across the wheel
        var start = rand(0, 360);
        for (var i = 0; i < SWATCH_COUNT; i++) {
          out.push(hslToHex(
            wrapHue(start + i * rand(18, 55)),
            rand(55, 85),
            rand(34, 78)
          ));
        }
        break;
      }
    }
    return out.slice(0, SWATCH_COUNT);
  }

  /* ============================================================
     APP STATE
     ============================================================ */

  var paletteEl = $('#palette');
  var harmonyEl = $('#harmony');
  var baseColorEl = $('#base-color');
  var baseHexEl = $('#base-hex');

  var state = {
    colors: [],
    locked: [false, false, false, false, false],
    harmony: 'auto'
  };
  var a11yOn = false;

  function loadState() {
    var saved = WUS.store.get(STATE_KEY, null);
    if (saved && Array.isArray(saved.colors) && saved.colors.length === SWATCH_COUNT) {
      state.colors = saved.colors.slice();
      state.locked = Array.isArray(saved.locked) ? saved.locked.slice() : [false, false, false, false, false];
      state.harmony = saved.harmony || 'auto';
    } else {
      state.harmony = 'auto';
      state.colors = buildPalette('auto', baseColorEl.value);
      state.locked = [false, false, false, false, false];
    }
  }
  function persistState() { WUS.store.set(STATE_KEY, state); }

  function loadA11y() { a11yOn = !!WUS.store.get(A11Y_KEY, false); }
  function persistA11y() { WUS.store.set(A11Y_KEY, a11yOn); }

  /* ============================================================
     GENERATION + RENDER
     ============================================================ */

  function generate() {
    try {
      var fresh = buildPalette(state.harmony, baseColorEl.value);
      state.colors = state.colors.map(function (c, i) {
        return state.locked[i] ? c : fresh[i];
      });
      // If nothing was locked or array empty, just use fresh
      if (state.colors.length !== SWATCH_COUNT) state.colors = fresh;
      render();
      persistState();
    } catch (err) {
      WUS.toast('Could not generate palette', 'error');
    }
  }

  // lock icon (locked / unlocked)
  function lockIcon(locked) {
    if (locked) {
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
    }
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>';
  }

  // One pill: contrast ratio + WCAG level of `fgHex` text on `bgHex`.
  function buildContrastRow(bgHex, fgHex, label) {
    var ratio = contrastRatio(bgHex, fgHex);
    var level = wcagLevel(ratio, false);
    var row = WUS.el('div', { class: 'contrast-row level-' + level.toLowerCase() });
    row.appendChild(WUS.el('span', { class: 'dot' }));
    row.appendChild(WUS.el('span', { class: 'contrast-label', text: label }));
    row.appendChild(WUS.el('span', { text: ratio.toFixed(2) + ':1' }));
    row.appendChild(WUS.el('span', { class: 'contrast-level', text: level }));
    row.setAttribute('title', label + ': ' + ratio.toFixed(2) + ':1 contrast — WCAG ' + level + ' (normal text)');
    return row;
  }

  // Accessibility panel: can white or black text sit on this swatch and stay readable?
  function buildContrastPanel(hex) {
    var wrap = WUS.el('div', { class: 'contrast', 'aria-label': 'Text contrast against this color' });
    wrap.appendChild(buildContrastRow(hex, '#FFFFFF', 'White text'));
    wrap.appendChild(buildContrastRow(hex, '#000000', 'Black text'));
    return wrap;
  }

  function buildSwatch(hex, index) {
    var ink = inkFor(hex);
    var sw = WUS.el('div', {
      class: 'swatch on-' + ink + (state.locked[index] ? ' is-locked' : ''),
      role: 'group',
      'aria-label': 'Swatch ' + (index + 1) + ' ' + hex,
      tabindex: '0'
    });
    sw.style.background = hex;
    sw.style.setProperty('--swatch-color', hex);

    // Toolbar
    var tools = WUS.el('div', { class: 'tools' });
    var mk = function (label, title, content, onClick) {
      var b = WUS.el('button', { class: 's-btn', type: 'button', title: title, 'aria-label': title });
      b.innerHTML = content;
      b.addEventListener('click', function (e) { e.stopPropagation(); onClick(); });
      return b;
    };
    tools.appendChild(mk('HEX', 'Copy HEX', 'HEX', function () { WUS.copy(hex, hex + ' copied'); }));
    tools.appendChild(mk('RGB', 'Copy RGB', 'RGB', function () { WUS.copy(rgbString(hex), 'RGB copied'); }));
    tools.appendChild(mk('HSL', 'Copy HSL', 'HSL', function () { WUS.copy(hslString(hex), 'HSL copied'); }));

    var lockBtn = WUS.el('button', {
      class: 's-btn lock-btn',
      type: 'button',
      title: state.locked[index] ? 'Unlock' : 'Lock',
      'aria-pressed': state.locked[index] ? 'true' : 'false',
      'aria-label': (state.locked[index] ? 'Unlock' : 'Lock') + ' swatch ' + (index + 1)
    });
    lockBtn.innerHTML = lockIcon(state.locked[index]);
    lockBtn.addEventListener('click', function (e) { e.stopPropagation(); toggleLock(index); });
    tools.appendChild(lockBtn);
    sw.appendChild(tools);

    // Body (hex + meta)
    var body = WUS.el('div', { class: 'body' });
    body.appendChild(WUS.el('div', { class: 'hex', text: hex }));
    var meta = WUS.el('div', { class: 'meta' });
    meta.appendChild(WUS.el('span', { text: rgbString(hex) }));
    meta.appendChild(WUS.el('span', { text: hslString(hex) }));
    body.appendChild(meta);
    if (a11yOn) body.appendChild(buildContrastPanel(hex));
    sw.appendChild(body);

    // Click anywhere copies HEX
    sw.addEventListener('click', function () { WUS.copy(hex, hex + ' copied'); });
    // Keyboard: Enter/Space copies, L toggles lock
    sw.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); WUS.copy(hex, hex + ' copied'); }
      else if (e.key.toLowerCase() === 'l') { e.preventDefault(); toggleLock(index); }
    });

    return sw;
  }

  function render() {
    paletteEl.innerHTML = '';
    state.colors.forEach(function (hex, i) {
      paletteEl.appendChild(buildSwatch(hex, i));
    });
  }

  function toggleLock(index) {
    state.locked[index] = !state.locked[index];
    render();
    persistState();
  }

  /* ============================================================
     HARMONY + BASE COLOR CONTROLS
     ============================================================ */

  harmonyEl.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-harmony]');
    if (!btn) return;
    $$('button', harmonyEl).forEach(function (b) {
      var on = b === btn;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    state.harmony = btn.getAttribute('data-harmony');
    persistState();
    generate();
  });

  function syncBaseHexField() { baseHexEl.value = baseColorEl.value.toUpperCase(); }

  baseColorEl.addEventListener('input', function () { syncBaseHexField(); });
  baseColorEl.addEventListener('change', function () {
    syncBaseHexField();
    if (state.harmony !== 'auto') generate();
  });
  baseHexEl.addEventListener('change', function () {
    var v = baseHexEl.value.trim();
    if (v && v[0] !== '#') v = '#' + v;
    var rgb = hexToRgb(v);
    if (!rgb) { WUS.toast('Invalid hex color', 'error'); syncBaseHexField(); return; }
    baseColorEl.value = rgbToHex(rgb.r, rgb.g, rgb.b);
    syncBaseHexField();
    if (state.harmony !== 'auto') generate();
  });

  /* ============================================================
     SAVE / SAVED LIST
     ============================================================ */

  var savedListEl = $('#saved-list');
  var savedFilterEl = $('#saved-filter');
  var savedFilter = 'all';

  function getSaved() {
    var arr = WUS.store.get(SAVED_KEY, []);
    return Array.isArray(arr) ? arr : [];
  }
  function setSaved(arr) { WUS.store.set(SAVED_KEY, arr); }

  function saveCurrent() {
    try {
      var arr = getSaved();
      // Avoid exact-duplicate of the most recent save
      var sig = state.colors.join(',').toUpperCase();
      if (arr.length && arr[0].colors.join(',').toUpperCase() === sig) {
        WUS.toast('Palette already saved');
        return;
      }
      arr.unshift({
        id: WUS.uid(),
        colors: state.colors.slice(),
        name: '',
        ts: Date.now(),
        fav: false
      });
      setSaved(arr);
      renderSaved();
      WUS.toast('Palette saved');
    } catch (err) {
      WUS.toast('Could not save palette', 'error');
    }
  }

  function loadPalette(item) {
    state.colors = item.colors.slice();
    state.locked = [false, false, false, false, false];
    render();
    persistState();
    WUS.toast('Palette loaded');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function deletePalette(id) {
    setSaved(getSaved().filter(function (p) { return p.id !== id; }));
    renderSaved();
    WUS.toast('Palette removed');
  }

  function toggleFav(id) {
    var arr = getSaved();
    var it = arr.filter(function (p) { return p.id === id; })[0];
    if (it) { it.fav = !it.fav; setSaved(arr); renderSaved(); }
  }

  function starIcon(fav) {
    var fill = fav ? 'currentColor' : 'none';
    return '<svg viewBox="0 0 24 24" fill="' + fill + '" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8 5.8 21l1.2-6.9-5-4.9 6.9-1z"/></svg>';
  }

  function buildSavedCard(item) {
    var card = WUS.el('div', { class: 'saved-card' });

    // strip (click loads)
    var strip = WUS.el('div', { class: 'saved-strip', title: 'Load this palette' });
    item.colors.forEach(function (c) {
      var seg = WUS.el('span'); seg.style.background = c; strip.appendChild(seg);
    });
    strip.addEventListener('click', function () { loadPalette(item); });
    card.appendChild(strip);

    // footer
    var foot = WUS.el('div', { class: 'saved-foot' });
    foot.appendChild(WUS.el('span', { class: 'saved-name', text: item.name || WUS.formatDate(item.ts) }));

    var favBtn = WUS.el('button', {
      class: 'icon-btn' + (item.fav ? ' is-fav' : ''),
      type: 'button',
      title: item.fav ? 'Unfavorite' : 'Favorite',
      'aria-label': item.fav ? 'Remove from favorites' : 'Add to favorites',
      'aria-pressed': item.fav ? 'true' : 'false'
    });
    favBtn.innerHTML = starIcon(item.fav);
    favBtn.addEventListener('click', function () { toggleFav(item.id); });
    foot.appendChild(favBtn);

    var copyBtn = WUS.el('button', { class: 'icon-btn', type: 'button', title: 'Copy HEX list', 'aria-label': 'Copy HEX list' });
    copyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
    copyBtn.addEventListener('click', function () { WUS.copy(item.colors.join(', '), 'Palette copied'); });
    foot.appendChild(copyBtn);

    var delBtn = WUS.el('button', { class: 'icon-btn del', type: 'button', title: 'Delete palette', 'aria-label': 'Delete palette' });
    delBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>';
    delBtn.addEventListener('click', function () { deletePalette(item.id); });
    foot.appendChild(delBtn);

    card.appendChild(foot);
    return card;
  }

  function renderSaved() {
    var arr = getSaved();
    // favorites pinned first, then by recency
    arr = arr.slice().sort(function (a, b) {
      if (!!b.fav !== !!a.fav) return (b.fav ? 1 : 0) - (a.fav ? 1 : 0);
      return b.ts - a.ts;
    });
    var list = savedFilter === 'favorites' ? arr.filter(function (p) { return p.fav; }) : arr;

    savedListEl.innerHTML = '';
    if (!list.length) {
      var empty = WUS.el('div', { class: 'saved-empty' });
      empty.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>'
        + '<p>' + (savedFilter === 'favorites'
          ? 'No favorites yet. Tap the star on a saved palette to pin it here.'
          : 'No saved palettes yet. Generate one you love and hit Save.') + '</p>';
      savedListEl.appendChild(empty);
      return;
    }
    list.forEach(function (item) { savedListEl.appendChild(buildSavedCard(item)); });
  }

  savedFilterEl.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-filter]');
    if (!btn) return;
    $$('button', savedFilterEl).forEach(function (b) {
      var on = b === btn;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    savedFilter = btn.getAttribute('data-filter');
    renderSaved();
  });

  $('#clear-saved').addEventListener('click', function () {
    if (!getSaved().length) { WUS.toast('Nothing to clear'); return; }
    setSaved([]);
    renderSaved();
    WUS.toast('Saved palettes cleared');
  });

  /* ============================================================
     EXPORT
     ============================================================ */

  function asCss() {
    var lines = state.colors.map(function (c, i) { return '  --color-' + (i + 1) + ': ' + c + ';'; });
    return ':root {\n' + lines.join('\n') + '\n}';
  }
  function asJson() { return JSON.stringify(state.colors, null, 2); }
  function asList() { return state.colors.join('\n'); }

  function exportPng() {
    try {
      var W = 1000, H = 320, n = state.colors.length;
      var canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      var ctx = canvas.getContext('2d');
      var bw = W / n;
      state.colors.forEach(function (hex, i) {
        ctx.fillStyle = hex;
        ctx.fillRect(i * bw, 0, Math.ceil(bw) + 1, H);
        // label
        var ink = inkFor(hex) === 'dark' ? '#ffffff' : '#0c0e1a';
        ctx.fillStyle = ink;
        ctx.font = '600 22px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(hex.toUpperCase(), i * bw + bw / 2, H - 28);
      });
      canvas.toBlob(function (blob) {
        if (blob) WUS.download('palette.png', blob, 'image/png');
        else WUS.toast('PNG export failed', 'error');
      }, 'image/png');
      WUS.toast('PNG downloaded');
    } catch (err) {
      WUS.toast('PNG export failed', 'error');
    }
  }

  $$('[data-export]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var t = btn.getAttribute('data-export');
      if (t === 'css') WUS.copy(asCss(), 'CSS variables copied');
      else if (t === 'json') WUS.copy(asJson(), 'JSON copied');
      else WUS.copy(asList(), 'Color list copied');
    });
  });

  $$('[data-download]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var t = btn.getAttribute('data-download');
      if (t === 'css') WUS.download('palette.css', asCss(), 'text/css;charset=utf-8');
      else if (t === 'json') WUS.download('palette.json', asJson(), 'application/json;charset=utf-8');
      else exportPng();
    });
  });

  function copyAllHex() { WUS.copy(state.colors.join(', '), 'All HEX copied'); }

  /* ============================================================
     MAIN BUTTON WIRING
     ============================================================ */

  $('#generate').addEventListener('click', generate);
  $('#save-btn').addEventListener('click', saveCurrent);
  $('#copy-all').addEventListener('click', copyAllHex);

  /* ============================================================
     ACCESSIBILITY / CONTRAST-CHECKER MODE
     ============================================================ */

  var a11yToggleEl = $('#a11y-toggle');
  function setA11y(on) {
    a11yOn = on;
    a11yToggleEl.setAttribute('aria-pressed', on ? 'true' : 'false');
    a11yToggleEl.classList.toggle('is-active', on);
    persistA11y();
    render();
  }
  function toggleA11y() { setA11y(!a11yOn); }
  a11yToggleEl.addEventListener('click', toggleA11y);

  /* ============================================================
     SHORTCUTS HELP MODAL
     ============================================================ */

  var helpModal = $('#help-modal');
  function openHelp() { helpModal.hidden = false; $('#help-close').focus(); }
  function closeHelp() { helpModal.hidden = true; }

  $('[data-shortcut-help]').addEventListener('click', openHelp);
  $('#help-close').addEventListener('click', closeHelp);
  helpModal.addEventListener('click', function (e) { if (e.target === helpModal) closeHelp(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !helpModal.hidden) closeHelp();
  });

  /* ============================================================
     GLOBAL SHORTCUTS
     ============================================================ */

  WUS.registerShortcut('space', generate, 'Generate new palette');
  WUS.registerShortcut('s', saveCurrent, 'Save current palette');
  WUS.registerShortcut('c', copyAllHex, 'Copy all HEX values');
  WUS.registerShortcut('?', openHelp, 'Show keyboard shortcuts');
  WUS.registerShortcut('a', toggleA11y, 'Toggle contrast checker');
  // 1-5 toggle locks
  for (var k = 1; k <= SWATCH_COUNT; k++) {
    (function (idx) {
      WUS.registerShortcut(String(idx), function () { toggleLock(idx - 1); }, 'Toggle lock on swatch ' + idx);
    })(k);
  }

  /* ============================================================
     INIT
     ============================================================ */

  function init() {
    loadState();
    loadA11y();
    a11yToggleEl.setAttribute('aria-pressed', a11yOn ? 'true' : 'false');
    a11yToggleEl.classList.toggle('is-active', a11yOn);
    // reflect harmony in segmented control
    $$('button', harmonyEl).forEach(function (b) {
      var on = b.getAttribute('data-harmony') === state.harmony;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    syncBaseHexField();
    render();
    renderSaved();
  }

  init();
})();
