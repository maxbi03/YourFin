import { describe, expect, it } from "vitest";
import { centsToInput, formatCHF, parseAmountInput } from "./money";

describe("formatCHF", () => {
  it("formate avec le séparateur de milliers suisse", () => {
    expect(formatCHF(123456)).toBe("CHF 1'234.56");
    expect(formatCHF(100)).toBe("CHF 1.00");
    expect(formatCHF(0)).toBe("CHF 0.00");
    expect(formatCHF(1_000_000_00)).toBe("CHF 1'000'000.00");
  });

  it("gère le signe", () => {
    expect(formatCHF(-1250)).toBe("-CHF 12.50");
    expect(formatCHF(1250, { sign: "always" })).toBe("+CHF 12.50");
    expect(formatCHF(0, { sign: "always" })).toBe("CHF 0.00");
  });

  it("arrondit au franc et compacte", () => {
    expect(formatCHF(123456, { decimals: 0 })).toBe("CHF 1'235");
    expect(formatCHF(12_400_00, { compact: true })).toBe("CHF 12.4k");
    expect(formatCHF(1_200_000_00, { compact: true, currency: false })).toBe("1.2M");
  });
});

describe("parseAmountInput", () => {
  it("accepte les formats courants", () => {
    expect(parseAmountInput("12.50")).toBe(1250);
    expect(parseAmountInput("12,50")).toBe(1250);
    expect(parseAmountInput("1'234.5")).toBe(123450);
    expect(parseAmountInput("CHF 20")).toBe(2000);
    expect(parseAmountInput(" 7 ")).toBe(700);
  });

  it("rejette les saisies invalides", () => {
    expect(parseAmountInput("")).toBeNull();
    expect(parseAmountInput("abc")).toBeNull();
    expect(parseAmountInput("1.234")).toBeNull();
    expect(parseAmountInput("-")).toBeNull();
  });

  it("fait l'aller-retour avec centsToInput", () => {
    expect(parseAmountInput(centsToInput(99999))).toBe(99999);
  });
});
