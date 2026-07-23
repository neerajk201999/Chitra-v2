import { createHash } from "node:crypto";
import { realpathSync, readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { hashFile, lockedProjectFile, verifyFingerprint } from "../assets/fingerprint.js";

export const BRAND_SYSTEM_VERSION = "0.1.0";
export const BUNDLED_FONT_FAMILIES = ["Inter", "Space Grotesk", "Instrument Serif", "JetBrains Mono"] as const;
export const BUNDLED_FONT_WEIGHTS: Record<(typeof BUNDLED_FONT_FAMILIES)[number], readonly number[]> = {
  Inter: [400, 500, 600],
  "Space Grotesk": [400, 500, 700],
  "Instrument Serif": [400],
  "JetBrains Mono": [400, 500],
};

const id = z.string().regex(/^[a-z][a-z0-9-]*$/, "ids are kebab-case, start with a letter");
const sha256 = z.string().regex(/^[0-9a-f]{64}$/, "sha256 is 64 lowercase hex characters");
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "6-digit hex color");
const projectPath = z.string().min(1).refine((value) => {
  const parts = value.split("/");
  return !value.startsWith("/") && !value.includes("\\") && !/^[a-z][a-z0-9+.-]*:/i.test(value) &&
    parts.every((part) => part.length > 0 && part !== "." && part !== "..");
}, "path must be a normalized project-relative POSIX path without traversal");
export const FontFamily = z.string().min(1).max(64).regex(/^[A-Za-z0-9][A-Za-z0-9 ._-]*$/, "font family contains unsafe characters");
export const FontWeight = z.number().int().min(100).max(900).refine((value) => value % 100 === 0, "font weight must use a 100-step value");

const FontFace = z.object({
  family: FontFamily,
  src: projectPath.refine((value) => value.toLowerCase().endsWith(".woff2"), "brand font must be a local .woff2 file"),
  weight: FontWeight,
  sourceId: id,
  sha256: sha256.optional(),
  bytes: z.number().int().positive().optional(),
});

const BrandRule = z.object({
  id,
  statement: z.string().min(8),
  priority: z.enum(["must", "should", "could"]),
  domain: z.enum(["motion", "voice", "composition", "typography", "color", "logo", "imagery", "sound", "avoid"]),
  sourceIds: z.array(id).min(1),
});

const TypographyRole = z.object({ family: FontFamily, weight: FontWeight });

export const BrandSystem = z.object({
  brandVersion: z.literal(BRAND_SYSTEM_VERSION),
  tier: z.literal("brand-system"),
  brandId: id,
  name: z.string().min(1),
  styleName: id,
  digest: sha256.optional(),
  sourceIds: z.array(id).min(1),
  palette: z.object({
    bg: hex, surface: hex, primary: hex, accent: hex, text: hex, textDim: hex, onMedia: hex,
  }),
  typography: z.object({
    display: TypographyRole,
    text: TypographyRole,
    mono: TypographyRole.default({ family: "JetBrains Mono", weight: 400 }),
    trackingDisplay: z.number().min(-0.05).max(0.02).default(-0.02),
  }),
  fontAssets: z.array(FontFace).max(18).default([]),
  rules: z.array(BrandRule).min(1).max(40),
}).superRefine((value, ctx) => {
  const sourceIds = new Set(value.sourceIds);
  if (sourceIds.size !== value.sourceIds.length)
    ctx.addIssue({ code: "custom", path: ["sourceIds"], message: "brand source IDs must be unique" });
  const rules = new Set<string>();
  value.rules.forEach((rule, index) => {
    if (rules.has(rule.id)) ctx.addIssue({ code: "custom", path: ["rules", index, "id"], message: `duplicate brand rule ${rule.id}` });
    rules.add(rule.id);
    rule.sourceIds.forEach((sourceId, sourceIndex) => {
      if (!sourceIds.has(sourceId)) ctx.addIssue({ code: "custom", path: ["rules", index, "sourceIds", sourceIndex], message: `unknown brand source ${sourceId}` });
    });
  });
  const faces = new Set<string>();
  const usedFamilies = new Set([value.typography.display.family, value.typography.text.family, value.typography.mono.family]);
  value.fontAssets.forEach((face, index) => {
    const key = `${face.family}:${face.weight}`;
    if (faces.has(key)) ctx.addIssue({ code: "custom", path: ["fontAssets", index], message: `duplicate font face ${key}` });
    faces.add(key);
    if (!sourceIds.has(face.sourceId)) ctx.addIssue({ code: "custom", path: ["fontAssets", index, "sourceId"], message: `unknown brand source ${face.sourceId}` });
    if ((BUNDLED_FONT_FAMILIES as readonly string[]).includes(face.family))
      ctx.addIssue({ code: "custom", path: ["fontAssets", index, "family"], message: `bundled family ${face.family} cannot be overridden` });
    if (!usedFamilies.has(face.family))
      ctx.addIssue({ code: "custom", path: ["fontAssets", index, "family"], message: `font family ${face.family} is not assigned to a typography role` });
  });
  for (const [role, spec] of Object.entries(value.typography)) {
    if (role === "trackingDisplay") continue;
    const font = spec as { family: string; weight: number };
    if ((BUNDLED_FONT_FAMILIES as readonly string[]).includes(font.family)) {
      if (!BUNDLED_FONT_WEIGHTS[font.family as keyof typeof BUNDLED_FONT_WEIGHTS].includes(font.weight))
        ctx.addIssue({ code: "custom", path: ["typography", role], message: `bundled ${role} face ${font.family}:${font.weight} is not available` });
    } else if (!faces.has(`${font.family}:${font.weight}`))
      ctx.addIssue({ code: "custom", path: ["typography", role], message: `custom ${role} face ${font.family}:${font.weight} is not declared` });
  }
});

export type BrandSystemT = z.infer<typeof BrandSystem>;
export type BrandValidationIssue = { path: string; message: string };

export function validateBrandSystem(data: unknown): { ok: true; brand: BrandSystemT } | { ok: false; issues: BrandValidationIssue[] } {
  const result = BrandSystem.safeParse(data);
  if (result.success) return { ok: true, brand: result.data };
  return { ok: false, issues: result.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })) };
}

export const brandSystemDigest = (brand: BrandSystemT): string => {
  const { digest: _digest, ...basis } = brand;
  return createHash("sha256").update(JSON.stringify(basis)).digest("hex");
};

/** Validate and fingerprint local brand fonts without acquiring or inferring anything. */
export async function materializeBrandSystem(data: unknown, projectDir: string): Promise<BrandSystemT> {
  const brand = BrandSystem.parse(data);
  const root = realpathSync(path.resolve(projectDir));
  const fontAssets = await Promise.all(brand.fontAssets.map(async (face) => {
    const file = lockedProjectFile(root, face.src, "Brand font");
    if (readFileSync(file).subarray(0, 4).toString("ascii") !== "wOF2") throw new Error(`Brand font is not WOFF2 data: ${face.src}`);
    const actual = await hashFile(file);
    verifyFingerprint(`brand font ${face.family}:${face.weight}`, face, actual);
    return { ...face, ...actual };
  }));
  const locked = BrandSystem.parse({ ...brand, digest: undefined, fontAssets });
  const digest = brandSystemDigest(locked);
  if (brand.digest && brand.digest !== digest) throw new Error(`Brand System digest mismatch: claimed ${brand.digest}, actual ${digest}`);
  return BrandSystem.parse({ ...locked, digest });
}
