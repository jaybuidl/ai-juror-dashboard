import { describe, expect, it } from "vitest";

/**
 * The contrast measurements ticket 18 took, re-derived from the token files on every run.
 *
 * Nothing in the Kleros ×AI system had ever been measured — its own readme says the values were
 * matched by eye from screenshots, and `tokens/themes.css` carries a claim about 4.5:1 that this
 * file disproves for the light theme. So these are not assertions that someone once checked a
 * colour. They read the hexes out of the CSS, composite the translucent surfaces the same way a
 * browser does, and compute the WCAG 2.1 ratio, which means a token edited in `colors.css` or in
 * `contrast.css` fails here rather than quietly darkening a figure on a public page.
 *
 * The prose record, including the light theme and the sites each pair stands for, is
 * `docs/contrast.md`.
 */

/**
 * Every `--token: value` declared on `:root`, across the vendored system and our override.
 *
 * Both the vendored files and our override, because a ratio is only worth asserting against what
 * the page actually ships. Vitest stubs stylesheets to the empty string unless `vite.config.ts`
 * names them in `test.css.include`, and it does so silently — an override that comes back empty
 * leaves the vendored value standing, so this file would have measured the palette the ticket
 * exists to replace and passed while doing it. Hence the guard at the end of this block.
 */
const declarations = (() => {
  const files = import.meta.glob("/src/styles/**/*.css", {
    query: "?raw",
    import: "default",
    eager: true,
  }) as Record<string, string>;

  // The vendored tokens first, then our override — the order app.css @imports them in, which is
  // the order the cascade resolves them at equal specificity.
  const ordered = Object.keys(files).sort(
    (a, b) => Number(a.includes("contrast.css")) - Number(b.includes("contrast.css")),
  );

  const found = new Map<string, string>();
  for (const path of ordered) {
    for (const [, block] of (files[path] ?? "").matchAll(/:root\s*\{([\s\S]*?)\n\}/g)) {
      for (const [, name, value] of (block as string).matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
        found.set(name as string, (value as string).trim());
      }
    }
  }

  // The guard for the failure this file's own import path used to have: an override that comes
  // back empty leaves the vendored value standing, and a measurement of the wrong palette passes.
  if (found.get("--text-4") === "#5b5675") {
    throw new Error("contrast.css was not read: the vendored --text-4 is still standing");
  }
  if (!found.has("--text-4")) throw new Error("no tokens were read");
  return found;
})();

/** `var(--a)` chains resolved to whatever they finally name. */
function resolve(value: string): string {
  let current = value;
  for (let hop = 0; hop < 10; hop += 1) {
    const match = /^var\((--[\w-]+)\)$/.exec(current.trim());
    if (match === null) return current.trim();
    const next = declarations.get(match[1] as string);
    if (next === undefined) throw new Error(`${current} names no declared token`);
    current = next;
  }
  throw new Error(`${value} does not resolve`);
}

type Rgb = readonly [number, number, number];

function parse(colour: string): { rgb: Rgb; alpha: number } {
  const resolved = resolve(colour);

  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(resolved);
  if (hex !== null) {
    const digits =
      (hex[1] as string).length === 3
        ? [...(hex[1] as string)].map((d) => d + d).join("")
        : (hex[1] as string);
    return {
      rgb: [
        Number.parseInt(digits.slice(0, 2), 16),
        Number.parseInt(digits.slice(2, 4), 16),
        Number.parseInt(digits.slice(4, 6), 16),
      ],
      alpha: 1,
    };
  }

  const rgba = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,/\s]+([\d.]+))?\s*\)$/i.exec(
    resolved,
  );
  if (rgba !== null) {
    return {
      rgb: [Number(rgba[1]), Number(rgba[2]), Number(rgba[3])],
      alpha: rgba[4] === undefined ? 1 : Number(rgba[4]),
    };
  }

  throw new Error(`cannot read the colour ${resolved}`);
}

/** Source-over compositing, which is what a translucent wash on a solid ground actually is. */
function over(source: { rgb: Rgb; alpha: number }, ground: Rgb): Rgb {
  return [0, 1, 2].map((i) => {
    const src = source.rgb[i] as number;
    const dst = ground[i] as number;
    return src * source.alpha + dst * (1 - source.alpha);
  }) as unknown as Rgb;
}

/** WCAG 2.1 relative luminance. */
function luminance(rgb: Rgb): number {
  const [r, g, b] = rgb.map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as unknown as Rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(ink: Rgb, ground: Rgb): number {
  const [brighter, dimmer] = [luminance(ink), luminance(ground)].sort((a, b) => b - a) as [
    number,
    number,
  ];
  return (brighter + 0.05) / (dimmer + 0.05);
}

/** A token's colour, flattened onto a ground if it is translucent. */
function ground(token: string, base?: Rgb): Rgb {
  const parsed = parse(`var(${token})`);
  if (parsed.alpha === 1) return parsed.rgb;
  if (base === undefined) throw new Error(`${token} is translucent and needs a ground`);
  return over(parsed, base);
}

const page = ground("--page");
const card = ground("--surface-card");

/**
 * The grounds a string in this dashboard is actually drawn on.
 *
 * Not every combination the tokens permit — the ones the components produce. A wash is only ever
 * painted over the page or over a card here, and the glow is the ground for the top 720px of
 * every view because `Shell.tsx` puts it behind `Content`.
 */
const SURFACES: Record<string, Rgb> = {
  page,
  card,
  raised: ground("--surface-raised"),
  "inset over page": ground("--surface-inset", page),
  "inset over card": ground("--surface-inset", card),
  "amber wash over page": ground("--wash-amber", page),
  "rose wash over page": ground("--wash-rose", page),
  "mint wash over page": ground("--wash-mint", page),
  "amber wash over card": ground("--wash-amber", card),
  "rose wash over card": ground("--wash-rose", card),
  "mint wash over card": ground("--wash-mint", card),
  "violet wash over card": ground("--wash-violet", card),
  // The glow's peak, which is the only point on a gradient worth asserting: everywhere else on
  // it is lighter ink over a darker ground and therefore passes if the peak does.
  "glow peak over page": over({ rgb: [96, 62, 214], alpha: glowPeakAlpha() }, page),
};

/** The alpha at the 0% stop of `--glow-violet`, read rather than assumed. */
function glowPeakAlpha(): number {
  const gradient = resolve("var(--glow-violet)");
  const first = /rgba?\([^)]*?([\d.]+)\s*\)\s*0%/.exec(gradient);
  if (first === null) throw new Error("--glow-violet has no readable first stop");
  return Number(first[1]);
}

/**
 * The inks that carry text, and the target each has to clear.
 *
 * 4.5:1 is WCAG AA for body text and is what every one of these is held to, because almost all of
 * them render below 24px — the matrix's figures are 9px to 13px. Two exclusions, both stated
 * rather than skipped: `--text-5`, which is not text (see `theme.textDisabled`), and the lockup's
 * `--brand-x`, which is part of a logotype and exempt under 1.4.3.
 */
const INKS = ["--text-1", "--text-2", "--text-3", "--text-4"] as const;

const TARGET = 4.5;

describe("the dark palette", () => {
  it("clears 4.5:1 for every ink that carries text, on every surface it is drawn on", () => {
    const failures: string[] = [];

    for (const ink of INKS) {
      for (const [name, surface] of Object.entries(SURFACES)) {
        const ratio = contrast(ground(ink), surface);
        if (ratio < TARGET) failures.push(`${ink} on ${name}: ${ratio.toFixed(2)}`);
      }
    }

    expect(failures).toEqual([]);
  });

  it("clears 4.5:1 for every state accent, on the page and on the wash it pairs with", () => {
    // ADR-0006 pairs each state colour with a tint: amber diverged, rose failed to act, mint
    // still acting. The accent is measured on its *own* wash and not only on the page, because a
    // state word sits inside the cell that wash fills — which is not the ground anyone picked
    // these against. All four clear it as vendored; this pins that they go on doing so.
    const pairs: ReadonlyArray<readonly [string, string | null]> = [
      ["--state-pass", null], // the coherent cell has no fill at all
      ["--state-work", "--wash-amber"],
      ["--state-fail", "--wash-rose"],
      ["--state-live", "--wash-mint"],
    ];

    const failures: string[] = [];
    for (const [accent, wash] of pairs) {
      for (const base of [page, card]) {
        const surface = wash === null ? base : ground(wash, base);
        const ratio = contrast(ground(accent), surface);
        if (ratio < TARGET) failures.push(`${accent} on ${wash ?? "no wash"}: ${ratio.toFixed(2)}`);
      }
    }

    expect(failures).toEqual([]);
  });

  it("keeps the text ramp in order, so raising the two dim steps did not flatten it", () => {
    // The reason `--text-3` moved at all. Lifting `--text-4` far enough to clear the worst
    // surface puts it brighter than `--text-3` if `--text-3` stays where it was, which inverts
    // two steps of a ramp the cell depends on: a pending figure would read louder than the
    // caption beside it. Each step must stay meaningfully brighter than the next.
    const ratios = INKS.map((ink) => contrast(ground(ink), page));

    for (let step = 0; step < ratios.length - 1; step += 1) {
      const brighter = ratios[step] as number;
      const dimmer = ratios[step + 1] as number;
      expect(brighter, `${INKS[step]} against ${INKS[step + 1]}`).toBeGreaterThan(dimmer * 1.25);
    }
  });

  it("keeps the not-drawn dot below the text target, because it is not text", () => {
    // The inverse assertion, and it is the point of `--text-5` existing. If someone later
    // "fixes" this token to clear 4.5:1, the emptiest mark in the matrix stops being empty and
    // starts competing with the loudest one — which ADR-0006 exists to prevent.
    expect(contrast(ground("--text-5"), page)).toBeLessThan(3);
  });
});
