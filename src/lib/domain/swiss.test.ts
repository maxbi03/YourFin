import { describe, expect, it } from "vitest";
import { project, SCENARIOS } from "./invest";
import { max3aContribution, project3a, yearsToRetirement } from "./pillar3a";
import { estimateTaxSaving, marginalRate } from "./tax";

describe("pilier 3a", () => {
  it("applique le plafond selon l'affiliation LPP", () => {
    expect(max3aContribution(true)).toBe(725800);
    expect(max3aContribution(false, 10_000_000)).toBe(2_000_000);
    expect(max3aContribution(false, 30_000_000)).toBe(3_628_800);
    expect(max3aContribution(false)).toBe(3_628_800);
  });

  it("calcule les années jusqu'à la retraite", () => {
    expect(yearsToRetirement(1994, 2026)).toBe(33);
    expect(yearsToRetirement(1950, 2026)).toBe(1);
    expect(yearsToRetirement(undefined)).toBe(30);
  });

  it("projette banque vs titres", () => {
    const pts = project3a(700000, 10, 0.005, 0.04);
    expect(pts).toHaveLength(11);
    expect(pts[10].contributed).toBe(7_000_000);
    expect(pts[10].securities).toBeGreaterThan(pts[10].bank);
    expect(pts[10].bank).toBeGreaterThan(pts[10].contributed);
  });
});

describe("impôts", () => {
  it("estime un taux marginal cohérent entre cantons", () => {
    const zg = marginalRate("ZG", 8_000_000);
    const ge = marginalRate("GE", 8_000_000);
    expect(zg).toBeLessThan(ge);
    expect(marginalRate("VD", 8_000_000)).toBeCloseTo(0.3, 1);
    expect(marginalRate("VD", 8_000_000, "married")).toBeLessThan(marginalRate("VD", 8_000_000, "single"));
    expect(marginalRate("VD", 30_000_000)).toBe(marginalRate("VD", 20_000_000));
    expect(marginalRate("??", 8_000_000)).toBe(marginalRate("ZH", 8_000_000));
  });

  it("calcule l'économie d'impôt", () => {
    expect(estimateTaxSaving(725800, 0.3)).toBe(217740);
  });
});

describe("simulateur d'investissement", () => {
  it("capitalise les versements mensuels", () => {
    const savings = SCENARIOS.find((s) => s.id === "savings")!;
    const pts = project(savings, 0, 10000, 10);
    expect(pts[10].contributed).toBe(1_200_000);
    expect(pts[10].expected).toBeGreaterThan(1_200_000);
    expect(pts[10].expected).toBeLessThan(1_240_000);
    // Sans volatilité, pas de fourchette.
    expect(pts[10].low).toBe(pts[10].expected);
  });

  it("encadre le scénario actions d'une fourchette qui s'élargit", () => {
    const stocks = SCENARIOS.find((s) => s.id === "stocks")!;
    const pts = project(stocks, 100000, 0, 20);
    expect(pts[20].low).toBeLessThan(pts[20].expected);
    expect(pts[20].high).toBeGreaterThan(pts[20].expected);
    expect(pts[20].high - pts[20].low).toBeGreaterThan(pts[5].high - pts[5].low);
  });
});
