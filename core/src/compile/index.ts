/**
 * Compiler: Motion IR (Score) → one self-contained deterministic HTML page.
 *
 * Determinism obligations (ADR-0002): stable element IDs, one paused master
 * GSAP timeline driven only via seek, inline fonts (no network), seeded
 * randomness, no wall-clock reads, no CSS animations/transitions.
 *
 * The page contract (mirrors the seek protocol HyperFrames converged on):
 *   window.__chitra = {
 *     durationMs, fps, width, height,
 *     seek(ms),                    // deterministic paint for time ms
 *     ready(),                     // resolves when fonts+layout settled
 *     textRegions(),               // visible text boxes for contrast gates
 *   }
 */
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { AnimationT, SceneT, ScoreT, ElementT } from "../ir/schema.js";
import { resolveProjectAsset } from "../assets/local.js";
import {
  CHOREOGRAPHY,
  DURATIONS,
  EASINGS,
  PRESETS,
  TYPE_SCALE,
  type DurationToken,
  type EasingToken,
  type PresetName,
} from "../motion/tokens.js";

const require_ = createRequire(import.meta.url);

// ── Assets inlined at compile time ─────────────────────────────────────────
function gsapSource(): string {
  return readFileSync(require_.resolve("gsap/dist/gsap.min.js"), "utf8");
}

/** ADR-0010: Three.js is ESM-only; inline the unminified module and reference
 *  its exported classes by bare name in one module scope. Only inlined when a
 *  scene3d element is present (1.2MB). */
function threeSource(): string {
  // three's exports map blocks subpath + package.json resolution; resolve the
  // main entry (lands in build/) and read three.module.js from that same dir.
  const buildDir = path.dirname(require_.resolve("three"));
  return readFileSync(path.join(buildDir, "three.module.js"), "utf8");
}

const FONT_FILES: Record<string, { pkg: string; file: string; weights: number[] }> = {
  Inter: { pkg: "@fontsource/inter", file: "inter-latin-{w}-normal.woff2", weights: [400, 500, 600] },
  "Space Grotesk": { pkg: "@fontsource/space-grotesk", file: "space-grotesk-latin-{w}-normal.woff2", weights: [400, 500, 700] },
  "Instrument Serif": { pkg: "@fontsource/instrument-serif", file: "instrument-serif-latin-{w}-normal.woff2", weights: [400] },
  "JetBrains Mono": { pkg: "@fontsource/jetbrains-mono", file: "jetbrains-mono-latin-{w}-normal.woff2", weights: [400, 500] },
};

function fontFaces(families: string[]): string {
  const seen = new Set<string>();
  let css = "";
  for (const fam of families) {
    if (seen.has(fam)) continue;
    seen.add(fam);
    const spec = FONT_FILES[fam];
    if (!spec) throw new Error(`No bundled font for family "${fam}"`);
    const pkgDir = path.dirname(require_.resolve(`${spec.pkg}/package.json`));
    for (const w of spec.weights) {
      const file = path.join(pkgDir, "files", spec.file.replace("{w}", String(w)));
      const b64 = readFileSync(file).toString("base64");
      css += `@font-face{font-family:'${fam}';font-style:normal;font-weight:${w};src:url(data:font/woff2;base64,${b64}) format('woff2');}\n`;
    }
  }
  return css;
}

// ── Timing resolution ──────────────────────────────────────────────────────
export interface ResolvedAnim {
  anim: AnimationT;
  startMs: number; // relative to scene start
  durationMs: number;
  ease: string;
}

/** ADR-0011/0013: onBeat needs absolute scene start + beat grid; frame tracks
 *  need FPS. Callers that have them (compiler, gates) pass ctx. */
export function resolveSceneTimeline(scene: SceneT, ctx?: { sceneStartMs: number; beats?: number[]; fps?: number }): ResolvedAnim[] {
  const byId = new Map<string, ResolvedAnim>();
  const out: ResolvedAnim[] = [];
  for (const anim of scene.choreography) {
    const preset = PRESETS[anim.preset as PresetName];
    const durationMs = anim.preset === "keyframe-track" && anim.keyframes?.length
      ? (anim.keyframes[anim.keyframes.length - 1].frame / (ctx?.fps ?? 30)) * 1000
      : anim.override?.durationMs ?? DURATIONS[(anim.duration ?? preset.defaultDuration) as DurationToken];
    const ease =
      anim.override?.gsapEase ??
      EASINGS[(anim.easing ?? preset.defaultEasing) as EasingToken];
    let base = 0;
    if (anim.at.onBeat != null) {
      const beats = ctx?.beats;
      if (!beats?.length) throw new Error(`Scene "${scene.id}": animation "${anim.id}" uses at.onBeat but audio.music.beats is not declared (run \`chitra analyze-audio\`)`);
      if (anim.at.onBeat >= beats.length) throw new Error(`Scene "${scene.id}": animation "${anim.id}" onBeat ${anim.at.onBeat} exceeds ${beats.length} detected beats`);
      base = Math.max(0, beats[anim.at.onBeat] - (ctx?.sceneStartMs ?? 0));
    } else if (anim.at.after !== "scene-start") {
      const dep = byId.get(anim.at.after);
      if (!dep) throw new Error(`Scene "${scene.id}": animation "${anim.id}" waits on unknown animation "${anim.at.after}"`);
      base = dep.startMs + dep.durationMs;
    }
    const resolved: ResolvedAnim = { anim, startMs: base + anim.at.offsetMs, durationMs, ease };
    byId.set(anim.id, resolved);
    out.push(resolved);
  }
  return out;
}

export function totalDurationMs(score: ScoreT): number {
  return score.scenes.reduce((s, sc) => s + sc.durationMs, 0);
}

// ── Rendering helpers ──────────────────────────────────────────────────────
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

type Palette = ScoreT["style"]["palette"];

function colorOf(palette: Palette, key: string): string {
  const map: Record<string, string> = {
    bg: palette.bg,
    surface: palette.surface,
    primary: palette.primary,
    accent: palette.accent,
    text: palette.text,
    "text-dim": palette.textDim,
    textDim: palette.textDim,
    "on-media": palette.onMedia,
  };
  return map[key] ?? palette.text;
}

const ANCHOR_DEFAULT_XY: Record<string, [number, number]> = {
  center: [50, 50],
  "top-left": [8, 8],
  top: [50, 8],
  "top-right": [92, 8],
  left: [8, 50],
  right: [92, 50],
  "bottom-left": [8, 88],
  bottom: [50, 88],
  "bottom-right": [92, 88],
};

/**
 * Anchor positioning. Right/bottom anchors MUST use `right`/`bottom` offsets:
 * an absolutely-positioned box computes shrink-to-fit width from its `left`
 * offset to the container edge BEFORE transforms, so `left + translateX(-100%)`
 * squeezes right-anchored text into the right margin (caught by the critique
 * loop on the first score to use anchor:right).
 */
function posStyle(el: { position: { anchor: string; x?: number; y?: number } }): string {
  const a = el.position.anchor;
  const [dx, dy] = ANCHOR_DEFAULT_XY[a];
  const x = el.position.x ?? dx;
  const y = el.position.y ?? dy;
  const xPart = a.includes("right") ? `right:${(100 - x).toFixed(3)}%;` : `left:${x}%;`;
  const yPart = a.includes("bottom") ? `bottom:${(100 - y).toFixed(3)}%;` : `top:${y}%;`;
  const tx = a.includes("left") || a.includes("right") ? "0" : "-50%";
  const ty = a.includes("top") || a.includes("bottom") ? "0" : "-50%";
  return `${xPart}${yPart}transform:translate(${tx},${ty});`;
}

function formatStat(value: number, format: string, decimals: number): string {
  switch (format) {
    case "percent":
      return `${value.toFixed(decimals)}%`;
    case "compact":
      return Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: decimals }).format(value);
    case "currency-usd":
      return Intl.NumberFormat("en", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: decimals }).format(value);
    default:
      return Intl.NumberFormat("en", { maximumFractionDigits: decimals }).format(value);
  }
}

/** ADR-0008: whitelist-style sanitizer for figure fragments. Removes script,
 *  event handlers, javascript: URLs, and external references — determinism and
 *  safety over expressiveness. The fragment keeps full HTML/CSS otherwise. */
export function sanitizeFragment(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<(iframe|object|embed|link|meta|base|form)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<(iframe|object|embed|link|meta|base|form)\b[^>]*\/?>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(src|href|xlink:href)\s*=\s*("|')(?:https?:|\/\/)[^"']*\2/gi, '$1=$2$2')
    .replace(/url\(\s*("|')?(?:https?:|\/\/)[^)]*\)/gi, "none")
    .replace(/javascript:/gi, "");
}

function figureAssetReferences(html: string): string[] {
  if (/\bsrcset\s*=/i.test(html) || /@import\b/i.test(html) || /image-set\s*\(/i.test(html))
    throw new Error("figure srcset, CSS @import, and image-set assets are unsupported; use one declared src or url() dependency");
  const references = new Set<string>();
  const add = (raw: string) => {
    const value = raw.trim();
    if (!value || value.startsWith("#")) return;
    if (/^(?:data:|blob:|file:)/i.test(value)) throw new Error(`figure inline or file URL assets are forbidden: ${value.slice(0, 80)}`);
    references.add(value);
  };
  for (const match of html.matchAll(/(?:src|href|poster|xlink:href)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) add(match[1] ?? match[2] ?? "");
  for (const match of html.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)'"\s]+))\s*\)/gi)) add(match[1] ?? match[2] ?? match[3] ?? "");
  return [...references].sort();
}

/** ADR-0009: deterministic per-formation dot coordinates in element-box percent
 *  (0..100 within the particle element's own box). Pure math → identical every
 *  render. `n` is fixed per element (max of grid cols*rows and count) so a morph
 *  never adds or drops dots. */
type Dot = { x: number; y: number; size?: number; opacity?: number };
function formationDots(el: { formation: string; cols: number; rows: number; count: number; radius: number; seed: number; points?: Dot[] }, formation: string, n: number, boxWpct: number, boxHpct: number, customPoints?: Dot[]): Dot[] {
  const dots: Dot[] = [];
  if (formation === "custom") {
    return (customPoints ?? el.points ?? []).map((point) => ({ ...point }));
  } else if (formation === "grid") {
    const cols = el.cols, rows = el.rows;
    for (let i = 0; i < n; i++) {
      const c = i % cols, r = Math.floor(i / cols) % rows;
      dots.push({ x: cols === 1 ? 50 : 12 + (c / (cols - 1)) * 76, y: rows === 1 ? 50 : 12 + (r / (rows - 1)) * 76 });
    }
  } else if (formation === "ring") {
    // radius expressed in element-box percent (relative to the smaller axis)
    const rr = Math.min(boxWpct, boxHpct) === 0 ? el.radius : (el.radius / Math.max(boxWpct, 1)) * 100;
    const rpct = Math.min(42, rr);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      dots.push({ x: 50 + Math.cos(a) * rpct, y: 50 + Math.sin(a) * rpct });
    }
  } else {
    // scatter: seeded LCG, deterministic
    let s = (el.seed * 2654435761) >>> 0;
    const rnd = () => ((s = (1664525 * s + 1013904223) >>> 0) / 4294967296);
    for (let i = 0; i < n; i++) dots.push({ x: 8 + rnd() * 84, y: 8 + rnd() * 84 });
  }
  return dots;
}

/** Cursor pointer SVG — theme-aware fill, macOS-weight silhouette. */
function cursorSvg(variant: string, sizePx: number): string {
  const arrow = `<path d="M5 3 L5 21 L9.6 16.6 L12.4 23 L15.2 21.8 L12.4 15.4 L19 15.4 Z" fill="#fff" stroke="#1a1a1a" stroke-width="1.4" stroke-linejoin="round"/>`;
  const hand = `<path d="M9 11 V5.5 a1.5 1.5 0 0 1 3 0 V10 m0-2.5 a1.5 1.5 0 0 1 3 0 V10 m0-1 a1.5 1.5 0 0 1 3 0 V11 m0 0 a1.5 1.5 0 0 1 3 0 v4 c0 4-2.5 7-6.5 7 h-1 c-2.5 0-4-1-5.2-3 L6 15.5 a1.6 1.6 0 0 1 2.6-1.8 L9 14.5 Z" fill="#fff" stroke="#1a1a1a" stroke-width="1.4" stroke-linejoin="round"/>`;
  return `<svg width="${sizePx}" height="${sizePx}" viewBox="0 0 24 24" style="filter:drop-shadow(0 2px 6px rgba(0,0,0,0.35));display:block;">${variant === "hand" ? hand : arrow}</svg>`;
}

function renderElement(el: ElementT, score: ScoreT, scale: number, sceneId: string, projectDir: string): string {
  const p = score.style.palette;
  const wrap = (inner: string, extra = "") =>
    `<div class="pos" style="${posStyle(el as never)}${extra}"><div class="el" id="${sceneId}--${el.id}">${inner}</div></div>`;

  switch (el.type) {
    case "text": {
      const sizePx = Math.round(TYPE_SCALE[el.textRole as keyof typeof TYPE_SCALE] * scale);
      const fam = el.textRole === "display" || el.textRole === "headline" || el.textRole === "title"
        ? score.style.fonts.display
        : score.style.fonts.text;
      const weight = el.textRole === "kicker" ? 600 : el.textRole === "display" || el.textRole === "headline" ? score.style.displayWeight : score.style.textWeight;
      const tracking = el.textRole === "kicker" ? "0.14em" : el.textRole === "display" || el.textRole === "headline" ? `${score.style.trackingDisplay}em` : "0";
      const transform = el.textRole === "kicker" ? "text-transform:uppercase;" : "";
      const maxW = el.maxWidth ? `max-width:${el.maxWidth * (score.meta.width / 100)}px;` : "";
      const lh = el.textRole === "body" || el.textRole === "caption" ? 1.5 : 1.08;
      // ADR-0008 type-in: split into char spans + caret when targeted by the preset
      const scene = score.scenes.find((s) => s.id === sceneId);
      const typed = scene?.choreography.some((a) => a.preset === "type-in" && a.target === el.id);
      if (typed) {
        const chars = [...el.content]
          .map((c) => `<span class="ch" style="display:inline-block;max-width:0;overflow:hidden;white-space:pre;vertical-align:top;">${c === " " ? "&nbsp;" : esc(c)}</span>`)
          .join("");
        const caretH = Math.round(sizePx * 0.9);
        return wrap(
          `<div class="txt" data-text-role="${el.textRole}" style="font-family:'${fam}';font-weight:${weight};font-size:${sizePx}px;letter-spacing:${tracking};${transform}color:${colorOf(p, el.color)};text-align:${el.align};line-height:${lh};${maxW}white-space:pre-wrap;">${chars}<span class="caret" style="height:${caretH}px;background:${colorOf(p, el.color)};"></span></div>`
        );
      }
      return wrap(
        `<div class="txt" data-text-role="${el.textRole}" style="font-family:'${fam}';font-weight:${weight};font-size:${sizePx}px;letter-spacing:${tracking};${transform}color:${colorOf(p, el.color)};text-align:${el.align};line-height:${lh};${maxW}white-space:pre-wrap;">${esc(el.content)}</div>`
      );
    }
    case "shape": {
      const w = (el.width * score.meta.width) / 100;
      const h = el.shape === "line" ? Math.max(2, 2 * scale) : (el.height * score.meta.height) / 100;
      const r = el.shape === "circle" ? "50%" : `${(el.radius * Math.min(score.meta.width, score.meta.height)) / 100}px`;
      const bgStyle =
        el.shape === "gradient-field"
          ? // centered ellipse fading fully inside the box — off-center ellipses
            // paint hard rectangle edges that read as compositing seams
            `background:radial-gradient(ellipse at 50% 50%, ${colorOf(p, el.color)} 0%, transparent 68%);`
          : `background:${colorOf(p, el.color)};`;
      return wrap(`<div style="width:${w}px;height:${h}px;border-radius:${r};${bgStyle}opacity:${el.opacity};"></div>`);
    }
    case "image": {
      const w = (el.width * score.meta.width) / 100;
      const h = (el.height * score.meta.height) / 100;
      const r = `${(el.radius * Math.min(score.meta.width, score.meta.height)) / 100}px`;
      const scrim = el.scrim > 0 ? `<div style="position:absolute;inset:0;background:rgba(0,0,0,${el.scrim});border-radius:${r};"></div>` : "";
      return wrap(
        `<div style="position:relative;width:${w}px;height:${h}px;border-radius:${r};overflow:hidden;"><img src="${esc(el.src)}" style="width:100%;height:100%;object-fit:${el.fit};display:block;"/>${scrim}</div>`
      );
    }
    case "video": {
      // ADR-0007: rendered as a per-frame image swap. The renderer pre-extracts
      // the clip to JPEGs (deterministic; headless <video> seeking is not) and
      // injects the frame directory via __chitra.setMedia; the seek runtime
      // swaps src and awaits decode before any capture.
      const w = (el.width * score.meta.width) / 100;
      const h = (el.height * score.meta.height) / 100;
      const r = `${(el.radius * Math.min(score.meta.width, score.meta.height)) / 100}px`;
      const scrim = el.scrim > 0 ? `<div style="position:absolute;inset:0;background:rgba(0,0,0,${el.scrim});border-radius:${r};"></div>` : "";
      return wrap(
        `<div style="position:relative;width:${w}px;height:${h}px;border-radius:${r};overflow:hidden;background:#000;"><img class="chitra-vid" data-vid="${esc(sceneId)}--${esc(el.id)}" style="width:100%;height:100%;object-fit:${el.fit};display:block;"/>${scrim}</div>`
      );
    }
    case "figure": {
      const w = (el.width * score.meta.width) / 100;
      const h = (el.height * score.meta.height) / 100;
      const r = `${(el.radius * Math.min(score.meta.width, score.meta.height)) / 100}px`;
      const file = resolveProjectAsset(projectDir, el.src);
      const fragment = sanitizeFragment(readFileSync(file, "utf8"));
      const declared = new Set(el.assets.map((asset) => asset.src));
      for (const reference of figureAssetReferences(fragment))
        if (!declared.has(reference)) throw new Error(`figure ${el.id} references undeclared asset: ${reference}`);
      for (const asset of el.assets) resolveProjectAsset(projectDir, asset.src);
      const shadow = el.shadow ? `box-shadow:0 ${18 * scale}px ${60 * scale}px rgba(0,0,0,0.45);` : "";
      // Token bridge: fragments style themselves ONLY through these variables.
      const vars =
        `--bg:${p.bg};--surface:${p.surface};--primary:${p.primary};--accent:${p.accent};` +
        `--text:${p.text};--text-dim:${p.textDim};--on-media:${p.onMedia};` +
        `--font-display:'${score.style.fonts.display}';--font-text:'${score.style.fonts.text}';--font-mono:'${score.style.fonts.mono}';`;
      return wrap(
        `<div class="figure" data-chitra-scene="${esc(sceneId)}" data-chitra-figure="${esc(el.id)}" style="position:relative;width:${w}px;height:${h}px;border-radius:${r};overflow:hidden;${shadow}${vars}">${fragment}</div>`
      );
    }
    case "particles": {
      const w = (el.width * score.meta.width) / 100;
      const h = (el.height * score.meta.height) / 100;
      const n = el.formation === "grid" ? el.cols * el.rows : el.formation === "custom" ? el.points!.length : el.count;
      const dots = formationDots(el, el.formation, n, el.width, el.height);
      const col = colorOf(p, el.color);
      // Seeded phase per dot for the shimmer — deterministic twinkle.
      let s = ((el.seed + 7) * 2654435761) >>> 0;
      const rnd = () => ((s = (1664525 * s + 1013904223) >>> 0) / 4294967296);
      const dotDivs = dots
        .map((d, i) => {
          // Preserve legacy rounding when size is absent; clamp authored
          // appearance so the schema's minimum cannot disappear at small output.
          const ds = d.size == null
            ? Math.round(el.dotSize * scale)
            : Math.max(1, Math.round(el.dotSize * scale * d.size));
          const opacity = d.opacity == null ? "" : `opacity:${d.opacity.toFixed(3)};`;
          return `<div class="pdot" data-phase="${rnd().toFixed(4)}" style="left:${d.x.toFixed(3)}%;top:${d.y.toFixed(3)}%;width:${ds}px;height:${ds}px;margin-left:${-ds / 2}px;margin-top:${-ds / 2}px;background:${col};${opacity}box-shadow:0 0 ${(ds * el.glow).toFixed(1)}px ${col};" data-i="${i}"></div>`;
        })
        .join("");
      return wrap(`<div class="pfield" style="position:relative;width:${w}px;height:${h}px;">${dotDivs}</div>`);
    }
    case "scene3d": {
      const w = Math.round((el.width * score.meta.width) / 100);
      const h = Math.round((el.height * score.meta.height) / 100);
      // Canvas is driven by the inlined Three runtime via data-3d = scene--id.
      return wrap(
        `<canvas class="scene3d" data-3d="${esc(sceneId)}--${esc(el.id)}" width="${w}" height="${h}" style="width:${w}px;height:${h}px;display:block;"></canvas>`
      );
    }
    case "cursor": {
      const sizePx = Math.round(28 * scale * el.scale);
      // Cursor coordinates mean the pointer TIP (the OS hot-spot), not the box
      // center — the arrow's tip sits at ~21%,12.5% of its viewBox, so the
      // wrapper translate overrides the anchor transform to pin it there.
      return wrap(
        `<div style="position:relative;">${cursorSvg(el.variant, sizePx)}<div class="click-ring" style="width:${sizePx * 1.6}px;height:${sizePx * 1.6}px;left:${-sizePx * 0.22}px;top:${-sizePx * 0.22}px;"></div></div>`,
        "z-index:90;transform:translate(-21%,-12.5%);"
      );
    }
    case "stat": {
      const sizePx = Math.round(TYPE_SCALE.display * scale);
      const labelPx = Math.round(TYPE_SCALE.kicker * scale);
      const label = el.label
        ? `<div class="txt" data-text-role="kicker" style="font-family:'${score.style.fonts.text}';font-weight:600;font-size:${labelPx}px;letter-spacing:0.14em;text-transform:uppercase;color:${p.textDim};margin-top:${12 * scale}px;text-align:center;">${esc(el.label)}</div>`
        : "";
      return wrap(
        `<div class="stat-num txt" data-text-role="display" data-value="${el.value}" data-format="${el.format}" data-decimals="${el.decimals}" style="font-family:'${score.style.fonts.display}';font-weight:${score.style.displayWeight};font-size:${sizePx}px;letter-spacing:${score.style.trackingDisplay}em;color:${colorOf(p, el.color)};text-align:center;font-variant-numeric:tabular-nums;">${formatStat(el.value, el.format, el.decimals)}</div>${label}`
      );
    }
    case "chart-bar": {
      const w = (el.width * score.meta.width) / 100;
      const h = (el.height * score.meta.height) / 100;
      const max = Math.max(...el.series.map((s) => s.value));
      const n = el.series.length;
      const gap = w * 0.04;
      const barW = (w - gap * (n - 1)) / n;
      const labelPx = Math.round(TYPE_SCALE.caption * scale * 0.9);
      const labelH = labelPx * 1.8;
      const plotH = h - labelH;
      let bars = "";
      el.series.forEach((s, i) => {
        const bh = (s.value / max) * plotH;
        const x = i * (barW + gap);
        // non-highlight bars: dim but legible on both bg and surface backgrounds
        const fill = i === el.highlight ? p.accent : p.textDim;
        const fillOpacity = i === el.highlight ? "1" : "0.28";
        bars += `<g><rect class="bar" id="${sceneId}--${el.id}-bar-${i}" x="${x.toFixed(2)}" y="${(plotH - bh).toFixed(2)}" width="${barW.toFixed(2)}" height="${bh.toFixed(2)}" rx="${Math.min(6, barW / 6).toFixed(2)}" fill="${fill}" fill-opacity="${fillOpacity}" style="transform-origin:${(x + barW / 2).toFixed(2)}px ${plotH.toFixed(2)}px;"/><text x="${(x + barW / 2).toFixed(2)}" y="${(plotH + labelPx * 1.3).toFixed(2)}" text-anchor="middle" font-family="${score.style.fonts.text}" font-size="${labelPx}" fill="${p.textDim}">${esc(s.label)}</text></g>`;
      });
      return wrap(`<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bars}</svg>`);
    }
    case "group":
      throw new Error(`Group "${el.id}" must be rendered through its scene composition`);
  }
}

/** ADR-0021: group siblings under a full-stage parent transform context. */
function renderSceneElements(elements: ElementT[], score: ScoreT, scale: number, sceneId: string, projectDir: string): string {
  const byId = new Map(elements.map((element) => [element.id, element]));
  const owner = new Map<string, string>();
  for (const group of elements.filter((element) => element.type === "group")) {
    for (const childId of group.children) {
      const child = byId.get(childId);
      if (!child) throw new Error(`Scene "${sceneId}": group "${group.id}" references missing child "${childId}"`);
      if (child.type === "group") throw new Error(`Scene "${sceneId}": group "${group.id}" cannot contain group "${childId}" (ADR-0021 is one level)`);
      const prior = owner.get(childId);
      if (prior) throw new Error(`Scene "${sceneId}": element "${childId}" belongs to both groups "${prior}" and "${group.id}"`);
      owner.set(childId, group.id);
    }
  }
  return elements.filter((element) => !owner.has(element.id)).map((element) => {
    if (element.type !== "group") return renderElement(element, score, scale, sceneId, projectDir);
    const children = element.children.map((childId) => renderElement(byId.get(childId)!, score, scale, sceneId, projectDir)).join("\n");
    return `<div class="pos" style="left:0;top:0;"><div class="el group" id="${sceneId}--${element.id}" style="position:relative;width:${score.meta.width}px;height:${score.meta.height}px;">${children}</div></div>`;
  }).join("\n");
}

// ── Choreography → GSAP tween specs (serialized into the page) ────────────
interface TweenSpec {
  targets: string; // CSS selector
  vars: Record<string, unknown>;
  from?: Record<string, unknown>;
  atMs: number; // absolute time on master timeline
  durationMs: number;
  ease: string;
  stagger?: { each: number; from: string };
  kind: string;
}

const TRANSFORM_ORIGINS: Record<string, string> = {
  center: "50% 50%",
  "top-left": "0% 0%",
  top: "50% 0%",
  "top-right": "100% 0%",
  left: "0% 50%",
  right: "100% 50%",
  "bottom-left": "0% 100%",
  bottom: "50% 100%",
  "bottom-right": "100% 100%",
};

function presetTweens(
  r: ResolvedAnim,
  scene: SceneT,
  sceneStartMs: number,
  score: ScoreT
): TweenSpec[] {
  const { anim, startMs, durationMs, ease } = r;
  const scale = Math.min(score.meta.width, score.meta.height) / 1080;
  const dist = (anim.distance ?? 4) * (score.meta.height / 100);
  const dir = anim.direction ?? "up";
  const dx = dir === "left" ? -dist : dir === "right" ? dist : 0;
  const dy = dir === "up" ? dist : dir === "down" ? -dist : 0; // enters travel opposite
  const isChart = scene.elements.some((e) => e.id === anim.target && e.type === "chart-bar");
  const sel = isChart
    ? `#${scene.id}--${anim.target} .bar`
    : anim.target.includes("/")
      ? `#${scene.id}--${anim.target.split("/")[0]} #${anim.target.split("/")[1]}` // figure internals (ADR-0008)
      : anim.target.endsWith("*")
        ? `[id^="${scene.id}--${anim.target.slice(0, -1)}"].el, [id^="${scene.id}--${anim.target.slice(0, -1)}"]`
        : `#${scene.id}--${anim.target}`;
  const at = sceneStartMs + startMs;
  const stg = anim.stagger ? { each: anim.stagger.eachMs / 1000, from: anim.stagger.from } : undefined;
  const base = { targets: sel, atMs: at, durationMs, ease, stagger: stg, kind: PRESETS[anim.preset as PresetName].kind };

  switch (anim.preset as PresetName) {
    case "fade-in":
      return [{ ...base, from: { autoAlpha: 0 }, vars: { autoAlpha: 1 } }];
    case "fade-up":
      return [{ ...base, from: { autoAlpha: 0, x: dx, y: dy }, vars: { autoAlpha: 1, x: 0, y: 0 } }];
    case "slide-in":
      return [{ ...base, from: { autoAlpha: 0, x: dx || -dist, y: dy }, vars: { autoAlpha: 1, x: 0, y: 0 } }];
    case "scale-settle":
      if (isChart)
        // bars grow from their baseline (transform-origin is set per bar)
        return [{ ...base, from: { scaleY: 0 }, vars: { scaleY: 1 } }];
      return [{ ...base, from: { autoAlpha: 0, scale: 0.9 }, vars: { autoAlpha: 1, scale: 1 } }];
    case "wipe-reveal":
      return [{ ...base, from: { clipPath: "inset(0% 100% 0% 0%)" }, vars: { clipPath: "inset(0% 0% 0% 0%)" } }];
    case "line-reveal":
      return [
        { ...base, from: { clipPath: "inset(0% 0% 100% 0%)", y: dist * 0.4 }, vars: { clipPath: "inset(0% 0% -10% 0%)", y: 0 } },
      ];
    case "blur-focus":
      return [{ ...base, from: { autoAlpha: 0, filter: `blur(${12 * scale}px)` }, vars: { autoAlpha: 1, filter: "blur(0px)" } }];
    case "count-up":
      return [{ ...base, vars: { __countUp: true } }];
    case "draw-line":
      return [{ ...base, from: { scaleX: 0, transformOrigin: "left center" }, vars: { scaleX: 1 } }];
    case "drift":
      return [{ ...base, from: { x: -dx || 0, y: -dy || 0 }, vars: { x: dx || 0, y: dy || 0 } }];
    case "scale-drift":
      return [{ ...base, from: { scale: 1 }, vars: { scale: 1.06 } }];
    case "cursor-move": {
      // Waypoints in stage units → px offsets from the cursor's authored position
      const cur = scene.elements.find((e) => e.id === anim.target);
      const bx = cur && "position" in cur ? (cur.position.x ?? 50) : 50;
      const by = cur && "position" in cur ? (cur.position.y ?? 50) : 50;
      const pts = (anim.waypoints ?? []).map((w) => ({
        x: ((w.x - bx) / 100) * score.meta.width,
        y: ((w.y - by) / 100) * score.meta.height,
      }));
      // One continuous gesture: easeEach none + overall ease, so the easing
      // spans the whole path — per-segment easing restarts read as abrupt
      // stop-and-go at every waypoint (a hand doesn't move like that).
      return [
        { ...base, vars: { keyframes: { x: pts.map((pt) => pt.x), y: pts.map((pt) => pt.y), easeEach: "none" } } },
      ];
    }
    case "cursor-click":
      return [
        { ...base, vars: { keyframes: [{ scale: 0.82 }, { scale: 1 }] } },
        {
          ...base,
          targets: `${sel} .click-ring`,
          from: { autoAlpha: 0.75, scale: 0.2 },
          vars: { autoAlpha: 0, scale: 1 },
        },
      ];
    case "type-in": {
      const target = scene.elements.find((e) => e.id === anim.target);
      const n = target && target.type === "text" ? Math.max([...target.content].length, 1) : 1;
      return [
        // chars appear discretely at a fixed cadence — typing, not fading
        { ...base, targets: `${sel} .ch`, from: { maxWidth: 0 }, vars: { maxWidth: "1.2em", duration: 0.001, ease: "none" }, stagger: { each: durationMs / n / 1000, from: "start" } },
        // caret: visible during the reveal, blinks, then exits
        { ...base, targets: `${sel} .caret`, from: { autoAlpha: 0 }, vars: { keyframes: [{ autoAlpha: 1 }, { autoAlpha: 1 }, { autoAlpha: 0.15 }, { autoAlpha: 1 }, { autoAlpha: 0.15 }, { autoAlpha: 1 }, { autoAlpha: 0 }] } },
      ];
    }
    case "pulse":
      return [{ ...base, vars: { keyframes: [{ scale: 0.94 }, { scale: 1 }] } }];
    case "particle-shimmer":
      // Per-dot opacity twinkle, phase-offset by data-phase. __shimmer marks it
      // for the runtime, which builds a looping tween per dot from data-phase.
      return [{ ...base, targets: `${sel} .pdot`, vars: { __shimmer: true } }];
    case "particle-form":
      // Radial assemble: dots fade+scale in, staggered center-out.
      return [{ ...base, targets: `${sel} .pdot`, from: { autoAlpha: 0, scale: 0.2 }, vars: { autoAlpha: 1, scale: 1 }, stagger: { each: 0.012, from: "center" } }];
    case "particle-morph": {
      // Precompute per-dot pixel deltas from the element's base formation to
      // morphTo (single-morph model; matches the reference's usage). Runtime
      // applies x/y per dot by index.
      const pEl = scene.elements.find((e) => e.id === anim.target);
      const to = (anim as { morphTo?: string }).morphTo ?? "grid";
      let deltas: Array<{ x: number; y: number }> = [];
      if (pEl && pEl.type === "particles") {
        const n = pEl.formation === "grid" ? pEl.cols * pEl.rows : pEl.formation === "custom" ? pEl.points!.length : pEl.count;
        const boxW = (pEl.width * score.meta.width) / 100;
        const boxH = (pEl.height * score.meta.height) / 100;
        const from = formationDots(pEl, pEl.formation, n, pEl.width, pEl.height);
        const dst = formationDots(pEl, to, n, pEl.width, pEl.height, (anim as { morphPoints?: Dot[] }).morphPoints);
        if (dst.length !== from.length)
          throw new Error(`Scene "${scene.id}": particle-morph "${anim.id}" has ${dst.length} destination points for ${from.length} source dots`);
        deltas = from.map((d, i) => ({ x: ((dst[i].x - d.x) / 100) * boxW, y: ((dst[i].y - d.y) / 100) * boxH }));
      }
      return [{ ...base, targets: `${sel} .pdot`, vars: { __morphDeltas: deltas } }];
    }
    case "keyframe-track": {
      if (!anim.keyframes?.length)
        throw new Error(`Scene "${scene.id}": keyframe-track "${anim.id}" has no keyframes`);
      const track = anim.keyframes.map((k, i) => {
        const vars: Record<string, unknown> = {};
        if (k.x != null) vars.x = (k.x * score.meta.width) / 100;
        if (k.y != null) vars.y = (k.y * score.meta.height) / 100;
        if (k.scale != null) vars.scale = k.scale;
        if (k.scaleX != null) vars.scaleX = k.scaleX;
        if (k.scaleY != null) vars.scaleY = k.scaleY;
        if (k.rotationXDeg != null) vars.rotationX = k.rotationXDeg;
        if (k.rotationYDeg != null) vars.rotationY = k.rotationYDeg;
        if (k.rotationZDeg != null) vars.rotation = k.rotationZDeg;
        if (k.opacity != null) vars.opacity = k.opacity;
        if (k.perspectivePx != null) vars.transformPerspective = k.perspectivePx;
        if (k.origin != null) vars.transformOrigin = TRANSFORM_ORIGINS[k.origin];
        const prevFrame = i === 0 ? 0 : anim.keyframes![i - 1].frame;
        return {
          startMs: at + (prevFrame / score.meta.fps) * 1000,
          durationMs: ((k.frame - prevFrame) / score.meta.fps) * 1000,
          ease: EASINGS[(k.easing ?? anim.easing ?? "move-through") as EasingToken],
          vars,
        };
      });
      return [{ ...base, vars: { __keyframeTrack: track } }];
    }
    case "hide":
      // Instant, invisible state declaration — used to carry figure-internal
      // end-states across match cuts (IR-FIG-1). Not a visible exit.
      // At scene-start it must hold from timeline build (immediateRender):
      // transitions reveal the next scene EARLY, under the outgoing scene's
      // fade — a start-scheduled hide would ghost for the fade duration.
      if (startMs === 0)
        return [{ ...base, durationMs: 1, from: { autoAlpha: 0 }, vars: { autoAlpha: 0, duration: 0.001, ease: "none" } }];
      return [{ ...base, durationMs: 1, vars: { autoAlpha: 0, duration: 0.001, ease: "none" } }];
    case "fade-out":
      return [{ ...base, vars: { autoAlpha: 0 } }];
    case "fade-down-out":
      return [{ ...base, vars: { autoAlpha: 0, y: dist * 0.6 } }];
    case "scale-out":
      return [{ ...base, vars: { autoAlpha: 0, scale: 0.96 } }];
  }
}

// ── Static text-over-media map (for contrast gate) ────────────────────────
function textOverMedia(scene: SceneT): Set<string> {
  const over = new Set<string>();
  const hasBgImage = scene.background === "image";
  const mediaIds = scene.elements.filter((e) => e.type === "image" || e.type === "video").map((e) => e.id);
  for (const el of scene.elements) {
    if (el.type !== "text" && el.type !== "stat") continue;
    if (hasBgImage || mediaIds.length > 0) over.add(el.id); // v0 conservative: any media in scene
  }
  return over;
}

// ── Main entry ─────────────────────────────────────────────────────────────
export interface CompileResult {
  html: string;
  durationMs: number;
  fps: number;
  width: number;
  height: number;
  sceneBoundsMs: Array<{ id: string; startMs: number; endMs: number }>;
}

export function compile(score: ScoreT, projectDir = "."): CompileResult {
  const { width, height, fps } = score.meta;
  const scale = Math.min(width, height) / 1080;
  const p = score.style.palette;
  const durationMs = totalDurationMs(score);

  // Scene DOM + tween specs
  let scenesHtml = "";
  const tweens: TweenSpec[] = [];
  const sceneBoundsMs: CompileResult["sceneBoundsMs"] = [];
  const textMeta: Array<{ sel: string; sceneId: string; color: string; overMedia: boolean }> = [];
  let cursor = 0;

  for (const scene of score.scenes) {
    const bg =
      scene.background === "image" && scene.backgroundImage
        ? `background:${p.bg} url('${esc(scene.backgroundImage)}') center/cover no-repeat;`
        : `background:${colorOf(p, scene.background)};`;
    const els = renderSceneElements(scene.elements, score, scale, scene.id, projectDir);
    scenesHtml += `<div class="scene" id="scene-${scene.id}" style="${bg}">${els}</div>\n`;

    const overMedia = textOverMedia(scene);
    for (const el of scene.elements) {
      if (el.type === "text" || el.type === "stat") {
        textMeta.push({
          sel: `#${scene.id}--${el.id}`,
          sceneId: scene.id,
          color: colorOf(p, (el as { color?: string }).color ?? "text"),
          overMedia: overMedia.has(el.id),
        });
      }
    }

    const resolved = resolveSceneTimeline(scene, { sceneStartMs: cursor, beats: score.audio?.music?.beats, fps });
    // Elements with an enter animation start hidden; compiler sets initial state.
    for (const r of resolved) tweens.push(...presetTweens(r, scene, cursor, score));

    sceneBoundsMs.push({ id: scene.id, startMs: cursor, endMs: cursor + scene.durationMs });
    cursor += scene.durationMs;
  }

  // Scene visibility + transitions on the master timeline.
  // Non-cut transitions overlap: the incoming scene becomes visible when the
  // transition starts and the outgoing scene (z-lifted above it) animates away.
  // fade-through-black instead drives a dedicated #blackout layer whose
  // fade-out extends into the incoming scene's first frames.
  const sceneCues: Array<Record<string, unknown>> = [];
  const setCues: Array<{ sel: string; vars: Record<string, unknown>; atMs: number }> = [];
  for (let i = 0; i < score.scenes.length; i++) {
    const sc = score.scenes[i];
    const b = sceneBoundsMs[i];
    const prevTr = i > 0 ? score.scenes[i - 1].transitionOut : null;
    const overlapMs =
      prevTr && (prevTr.type === "fade" || prevTr.type === "wipe" || prevTr.type === "push")
        ? DURATIONS[prevTr.duration as DurationToken]
        : 0;
    sceneCues.push({ sel: `#scene-${sc.id}`, showMs: b.startMs - overlapMs, hideMs: b.endMs, index: i });

    const tr = sc.transitionOut;
    if (tr.type !== "cut" && i < score.scenes.length - 1) {
      const trMs = DURATIONS[tr.duration as DurationToken];
      const start = b.endMs - trMs;
      if (tr.type === "fade-through-black") {
        tweens.push({ targets: "#blackout", from: {}, vars: { opacity: 1 }, atMs: start, durationMs: trMs, ease: EASINGS["move-through"], kind: "transition" });
        tweens.push({ targets: "#blackout", from: {}, vars: { opacity: 0 }, atMs: b.endMs, durationMs: trMs, ease: EASINGS["move-through"], kind: "transition" });
      } else {
        // Outgoing scene sits above the (already visible) incoming scene.
        setCues.push({ sel: `#scene-${sc.id}`, vars: { zIndex: 2 }, atMs: start });
        if (tr.type === "fade") {
          tweens.push({ targets: `#scene-${sc.id}`, from: {}, vars: { opacity: 0 }, atMs: start, durationMs: trMs, ease: EASINGS["move-through"], kind: "transition" });
        } else if (tr.type === "wipe") {
          tweens.push({ targets: `#scene-${sc.id}`, from: {}, vars: { clipPath: "inset(0% 100% 0% 0%)" }, atMs: start, durationMs: trMs, ease: EASINGS["move-through"], kind: "transition" });
        } else if (tr.type === "push") {
          tweens.push({ targets: `#scene-${sc.id}`, from: {}, vars: { xPercent: -100 }, atMs: start, durationMs: trMs, ease: EASINGS["move-through"], kind: "transition" });
        }
      }
    }
  }

  // ADR-0010: collect scene3d specs (resolved colors + box + scene start).
  let s3cursor = 0;
  const scene3dSpecs: Array<Record<string, unknown>> = [];
  for (const sc of score.scenes) {
    for (const el of sc.elements) {
      if (el.type === "scene3d")
        scene3dSpecs.push({
          key: `${sc.id}--${el.id}`,
          primitive: el.primitive,
          base: colorOf(p, el.baseColor),
          env: el.envTint === "neutral" ? "#8a8a8a" : colorOf(p, el.envTint),
          metalness: el.metalness,
          roughness: el.roughness,
          spinDeg: el.spinDeg,
          tiltDeg: el.tiltDeg,
          exposure: el.exposure,
          w: Math.round((el.width * width) / 100),
          h: Math.round((el.height * height) / 100),
          sceneStartMs: s3cursor,
        });
    }
    s3cursor += sc.durationMs;
  }
  const hasScene3d = scene3dSpecs.length > 0;

  const grain =
    score.style.grain > 0
      ? `<svg class="grain" width="100%" height="100%"><filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${score.meta.seed}" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(#g)" opacity="${score.style.grain}"/></svg>`
      : "";

  const fonts = fontFaces([
    score.style.fonts.display,
    score.style.fonts.text,
    score.style.fonts.mono,
  ]);

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${esc(score.meta.title)}</title>
<style>
${fonts}
*{margin:0;padding:0;box-sizing:border-box;animation:none!important;transition:none!important;}
html,body{background:#000;}
#stage{position:relative;width:${width}px;height:${height}px;overflow:hidden;background:${p.bg};}
.scene{position:absolute;inset:0;visibility:hidden;}
.pos{position:absolute;}
.el{will-change:transform,opacity;}
#blackout{position:absolute;inset:0;background:#000;opacity:0;pointer-events:none;z-index:95;}
.grain{position:absolute;inset:0;pointer-events:none;z-index:99;}
.click-ring{position:absolute;border-radius:50%;border:2.5px solid #fff;opacity:0;box-shadow:0 0 12px rgba(255,255,255,0.35);}
.caret{display:inline-block;width:0.09em;margin-left:0.06em;vertical-align:-0.12em;opacity:0;}
.figure{font-family:var(--font-text);color:var(--text);}
.pfield{position:relative;}
.pdot{position:absolute;border-radius:50%;}
</style></head>
<body>
<div id="stage">
${scenesHtml}<div id="blackout"></div>${grain}
</div>
<script>${gsapSource()}</script>
<script>
"use strict";
var SPECS = ${JSON.stringify(tweens)};
var CUES = ${JSON.stringify(sceneCues)};
var SETCUES = ${JSON.stringify(setCues)};
var TEXTMETA = ${JSON.stringify(textMeta)};
var DURATION_MS = ${durationMs};

function fmtStat(v, format, decimals) {
  var o = { maximumFractionDigits: decimals };
  if (format === "percent") return v.toFixed(decimals) + "%";
  if (format === "compact") o.notation = "compact";
  if (format === "currency-usd") { o.notation = "compact"; o.style = "currency"; o.currency = "USD"; }
  return new Intl.NumberFormat("en", o).format(v);
}

gsap.config({ autoSleep: 999999, force3D: true, nullTargetWarn: true });
gsap.ticker.lagSmoothing(0);
var tl = gsap.timeline({ paused: true });

// Scene visibility cues (set() = zero-duration, deterministic at boundaries)
CUES.forEach(function (c) {
  if (c.index === 0 || c.showMs <= 0) gsap.set(c.sel, { visibility: "visible" });
  else tl.set(c.sel, { visibility: "visible" }, c.showMs / 1000);
  if (c.hideMs < DURATION_MS) tl.set(c.sel, { visibility: "hidden" }, c.hideMs / 1000);
});
SETCUES.forEach(function (c) { tl.set(c.sel, c.vars, c.atMs / 1000); });

var MISSING = [];
SPECS.forEach(function (s) {
  var targets = gsap.utils.toArray(s.targets);
  if (!targets.length) { MISSING.push(s.targets); return; }
  var vars = { duration: s.durationMs / 1000, ease: s.ease, lazy: false };
  if (s.stagger) vars.stagger = { each: s.stagger.each, from: s.stagger.from };
  if (s.vars.__countUp) {
    targets.forEach(function (el) {
      var end = parseFloat(el.getAttribute("data-value"));
      var format = el.getAttribute("data-format");
      var dec = parseInt(el.getAttribute("data-decimals"), 10);
      var proxy = { v: 0 };
      tl.to(proxy, { v: end, duration: s.durationMs / 1000, ease: s.ease, lazy: false,
        onUpdate: function () { el.textContent = fmtStat(proxy.v, format, dec); } }, s.atMs / 1000);
      el.textContent = fmtStat(0, format, dec);
    });
    return;
  }
  if (s.vars.__shimmer) {
    // ADR-0009: per-dot opacity twinkle, phase-offset by data-phase and anchored
    // at master time 0 so every seek is deterministic. Floor 0.22 (MO-PART-1:
    // dots never fully vanish). period = the preset duration.
    var period = s.durationMs / 1000;
    targets.forEach(function (dot) {
      var phase = parseFloat(dot.getAttribute("data-phase")) || 0;
      tl.to(dot, { opacity: 0.22, duration: period / 2, ease: "sine.inOut", yoyo: true, repeat: -1, lazy: false }, phase * period);
    });
    return;
  }
  if (s.vars.__morphDeltas) {
    var deltas = s.vars.__morphDeltas;
    targets.forEach(function (dot, i) {
      var d = deltas[i] || { x: 0, y: 0 };
      tl.to(dot, { x: d.x, y: d.y, duration: s.durationMs / 1000, ease: s.ease, lazy: false }, s.atMs / 1000);
    });
    return;
  }
  if (s.vars.__keyframeTrack) {
    var track = s.vars.__keyframeTrack;
    if (track.length < 2) return;
    var firstFrom = { immediateRender: true, lazy: false };
    for (var fk in track[0].vars) firstFrom[fk] = track[0].vars[fk];
    var firstTo = { duration: track[1].durationMs / 1000, ease: track[1].ease, lazy: false };
    for (var ftk in track[1].vars) firstTo[ftk] = track[1].vars[ftk];
    tl.fromTo(targets, firstFrom, firstTo, track[1].startMs / 1000);
    for (var ti = 2; ti < track.length; ti++) {
      var tv = { duration: track[ti].durationMs / 1000, ease: track[ti].ease, lazy: false };
      for (var tk in track[ti].vars) tv[tk] = track[ti].vars[tk];
      tl.to(targets, tv, track[ti].startMs / 1000);
    }
    return;
  }
  for (var k in s.vars) vars[k] = s.vars[k];
  if (s.from && Object.keys(s.from).length) {
    vars.immediateRender = true;
    var fromVars = { immediateRender: true, lazy: false };
    for (var k2 in s.from) fromVars[k2] = s.from[k2];
    tl.fromTo(targets, fromVars, vars, s.atMs / 1000);
  } else {
    tl.to(targets, vars, s.atMs / 1000);
  }
});

// Force initial state paint
tl.time(0, false); tl.pause(0);

// ADR-0007: video elements as frame swaps. VIDMETA carries scene-local timing;
// setMedia() (called by the renderer after pre-extraction) supplies frame dirs.
var VIDMETA = ${JSON.stringify(
      score.scenes.flatMap((scene) => {
        let acc = 0;
        for (const s of score.scenes) {
          if (s.id === scene.id) break;
          acc += s.durationMs;
        }
        return scene.elements
          .filter((e) => e.type === "video")
          .map((e) => ({ key: `${scene.id}--${e.id}`, sceneStartMs: acc, sceneEndMs: acc + scene.durationMs }));
      })
    )};
var MEDIA = {};
function pad5(n) { return ("0000" + n).slice(-5); }

window.__chitra = {
  durationMs: DURATION_MS,
  fps: ${fps},
  width: ${width},
  height: ${height},
  missingTargets: MISSING,
  setMedia: function (map) { MEDIA = map || {}; },
  seek: function (ms) {
    tl.time(Math.min(ms, DURATION_MS - 0.001) / 1000, false);
    if (window.__three3d) window.__three3d.forEach(function (u) { u(ms); });
    var waits = [];
    VIDMETA.forEach(function (v) {
      var m = MEDIA[v.key];
      var img = document.querySelector('img[data-vid="' + v.key + '"]');
      if (!m || !img) return;
      var local = Math.min(Math.max(ms - v.sceneStartMs, 0), v.sceneEndMs - v.sceneStartMs);
      var idx = Math.min(Math.floor((local / 1000) * m.fps), m.count - 1);
      var src = m.base + "/f" + pad5(idx + 1) + ".jpg";
      if (img.getAttribute("src") !== src) {
        img.setAttribute("src", src);
        if (img.decode) waits.push(img.decode().catch(function () {}));
      }
    });
    return waits.length ? Promise.all(waits).then(function () { return true; }) : true;
  },
  ready: function () {
    var families = ${JSON.stringify([score.style.fonts.display, score.style.fonts.text])};
    var need3d = ${hasScene3d};
    var wait3d = need3d
      ? new Promise(function (res) {
          var tries = 0;
          (function poll() {
            if (window.__three3dReady || tries++ > 200) return res();
            setTimeout(poll, 25);
          })();
        })
      : Promise.resolve();
    return wait3d.then(function () { return Promise.all(
      families.map(function (f) { return document.fonts.load("16px '" + f + "'"); })
    ); }).then(function () {
      return document.fonts.ready;
    }).then(function () {
      // Images must be decoded before any capture — a late-arriving image
      // would make frames depend on load timing.
      return Promise.all(Array.prototype.map.call(document.images, function (img) {
        return img.decode ? img.decode().catch(function () {}) : Promise.resolve();
      }));
    }).then(function () {
      var ok = families.every(function (f) { return document.fonts.check("16px '" + f + "'"); });
      var badImages = Array.prototype.filter.call(document.images, function (img) {
        // chitra-vid frames get src injected by the renderer post-load
        return img.getAttribute("src") && !(img.complete && img.naturalWidth > 0);
      }).map(function (img) { return img.getAttribute("src"); });
      return { fontsOk: ok, missingTargets: MISSING, badImages: badImages, glError: window.__three3dError || null };
    });
  },
  textRegions: function () {
    var stageEl = document.getElementById("stage");
    var stage = stageEl.getBoundingClientRect();
    var regions = TEXTMETA.map(function (m) {
      var el = document.querySelector(m.sel);
      if (!el) return null;
      var st = getComputedStyle(el);
      var vis = st.visibility !== "hidden" && parseFloat(st.opacity || "1") > 0.05;
      // walk up: scene hidden ⇒ not visible
      var scene = document.getElementById("scene-" + m.sceneId);
      if (scene && getComputedStyle(scene).visibility === "hidden") vis = false;
      var r = el.getBoundingClientRect();
      var inner = el.querySelector(".txt") || el;
      var fs = parseFloat(getComputedStyle(inner).fontSize);
      return { sel: m.sel, scene: m.sceneId, visible: vis, overMedia: m.overMedia, color: m.color,
        fontSizePx: fs, x: r.left - stage.left, y: r.top - stage.top, w: r.width, h: r.height,
        origin: "score", text: (inner.textContent || "").trim() };
    }).filter(Boolean);
    function colorInfo(value) {
      var m = String(value || "").match(/rgba?\\(\\s*([\\d.]+)[, ]+\\s*([\\d.]+)[, ]+\\s*([\\d.]+)(?:\\s*[,/]\\s*([\\d.]+))?/i);
      if (!m) return { hex: "#000000", alpha: 1 };
      var h = function (n) { return Math.max(0, Math.min(255, Math.round(Number(n)))).toString(16).padStart(2, "0"); };
      return { hex: "#" + h(m[1]) + h(m[2]) + h(m[3]), alpha: m[4] == null ? 1 : Number(m[4]) };
    }
    Array.prototype.forEach.call(document.querySelectorAll(".figure[data-chitra-figure]"), function (figure) {
      var sceneId = figure.getAttribute("data-chitra-scene");
      var figureId = figure.getAttribute("data-chitra-figure");
      var walker = document.createTreeWalker(figure, NodeFilter.SHOW_TEXT);
      var node, textIndex = 0;
      while ((node = walker.nextNode())) {
        var index = textIndex++;
        var text = String(node.nodeValue || "").replace(/\\s+/g, " ").trim();
        var parent = node.parentElement;
        if (!text || !parent || /^(STYLE|SCRIPT|NOSCRIPT|TEMPLATE)$/.test(parent.tagName)) continue;
        var range = document.createRange();
        range.selectNodeContents(node);
        var r = range.getBoundingClientRect();
        var visible = true, current = parent;
        var left = r.left, top = r.top, right = r.right, bottom = r.bottom;
        while (current) {
          var currentStyle = getComputedStyle(current);
          if (currentStyle.display === "none" || currentStyle.visibility === "hidden" || parseFloat(currentStyle.opacity || "1") <= 0.05) { visible = false; break; }
          var currentRect = current.getBoundingClientRect();
          if (currentStyle.overflowX !== "visible") { left = Math.max(left, currentRect.left); right = Math.min(right, currentRect.right); }
          if (currentStyle.overflowY !== "visible") { top = Math.max(top, currentRect.top); bottom = Math.min(bottom, currentRect.bottom); }
          if (left >= right || top >= bottom) { visible = false; break; }
          if (current === stageEl) break;
          current = current.parentElement;
        }
        var style = getComputedStyle(parent), color = colorInfo(style.color);
        if (color.alpha <= 0.05) visible = false;
        var inner = parent.closest("[id]");
        var innerId = inner && inner.id !== sceneId + "--" + figureId && /^[a-z][a-z0-9-]*$/.test(inner.id) ? inner.id : null;
        var target = innerId ? figureId + "/" + innerId : figureId;
        regions.push({
          sel: "#" + sceneId + "--" + figureId + "/" + (innerId || "text") + "::text[" + index + "]",
          scene: sceneId, visible: visible, overMedia: true, color: color.hex,
          fontSizePx: parseFloat(style.fontSize), x: left - stage.left, y: top - stage.top, w: Math.max(0, right - left), h: Math.max(0, bottom - top),
          origin: "figure", figureId: figureId, target: target, text: text
        });
      }
    });
    return regions;
  },
};
</script>
${hasScene3d ? `<script type="module">
${threeSource()}
(function(){
  window.__three3d = [];
  var SPECS3D = ${JSON.stringify(scene3dSpecs)};
  try {
    // Shared procedural environment per env tint (crimson/gold/neutral studio).
    SPECS3D.forEach(function (s) {
      var canvas = document.querySelector('canvas[data-3d="' + s.key + '"]');
      if (!canvas) return;
      var renderer = new WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
      renderer.setSize(s.w, s.h, false);
      renderer.toneMapping = ACESFilmicToneMapping;
      renderer.toneMappingExposure = s.exposure;
      var scene = new Scene();
      var cam = new PerspectiveCamera(30, s.w / s.h, 0.1, 100);
      cam.position.set(0, 0, 7.5);
      // PMREM environment from a vertical gradient tinted by envTint.
      var pmrem = new PMREMGenerator(renderer);
      var envS = new Scene();
      var cv = document.createElement("canvas"); cv.width = 8; cv.height = 256;
      var ctx = cv.getContext("2d");
      var g = ctx.createLinearGradient(0, 0, 0, 256);
      // Studio softbox: bright top highlight (so clearcoat catches a sheen),
      // env tint mid, dark floor. A dark tint alone leaves metal near-black.
      g.addColorStop(0, "#eef0f4"); g.addColorStop(0.28, s.env); g.addColorStop(0.62, "#1a1012"); g.addColorStop(1, "#040203");
      ctx.fillStyle = g; ctx.fillRect(0, 0, 8, 256);
      var envMat = new MeshBasicMaterial({ map: new CanvasTexture(cv), side: BackSide });
      envS.add(new Mesh(new SphereGeometry(50, 32, 32), envMat));
      scene.environment = pmrem.fromScene(envS).texture;
      var key = new DirectionalLight(0xfff2ee, 4.2); key.position.set(5, 6, 4); scene.add(key);
      var fill = new DirectionalLight(0xff5566, 1.6); fill.position.set(-6, -1, 3); scene.add(fill);
      scene.add(new AmbientLight(0x553033, 0.7));
      var geo;
      if (s.primitive === "coin") geo = new CylinderGeometry(1.7, 1.7, 0.18, 64);
      else if (s.primitive === "slab") geo = new BoxGeometry(2.2, 3.2, 0.14);
      else geo = new BoxGeometry(3.4, 2.14, 0.12); // card
      var mat = new MeshPhysicalMaterial({ color: parseInt(s.base.slice(1), 16), metalness: s.metalness, roughness: s.roughness, clearcoat: 1.0, clearcoatRoughness: 0.25, emissive: 0x0a0506, emissiveIntensity: 0.35 });
      var mesh = new Mesh(geo, mat);
      if (s.primitive === "coin") mesh.rotation.x = Math.PI / 2;
      scene.add(mesh);
      var tilt = s.tiltDeg * Math.PI / 180, spin = s.spinDeg * Math.PI / 180;
      var baseX = mesh.rotation.x;
      window.__three3d.push(function (ms) {
        var local = Math.max(0, ms - s.sceneStartMs);
        mesh.rotation.y = -0.5 + Math.sin(local / 1400) * spin;
        mesh.rotation.x = baseX + tilt * 0.4 + Math.cos(local / 1800) * 0.04;
        renderer.render(scene, cam);
      });
      window.__three3d[window.__three3d.length - 1](0);
    });
    window.__three3dReady = true;
  } catch (e) { window.__three3dError = String(e && e.message || e); window.__three3dReady = true; }
})();
</script>` : ""}
</body></html>`;

  return { html, durationMs, fps, width, height, sceneBoundsMs };
}
