import { describe, expect, it } from "vitest";
import { addMonths, dayGroupLabel, daysInMonth, daysLeftInMonth, diffDays, lastMonths, monthLabel, monthlyEquivalent, nextOccurrence } from "./dates";

describe("mois", () => {
  it("ajoute et retranche des mois en passant l'année", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-09", -6)).toBe("2026-03");
  });

  it("connaît la longueur des mois (année bissextile comprise)", () => {
    expect(daysInMonth("2026-02")).toBe(28);
    expect(daysInMonth("2028-02")).toBe(29);
    expect(daysInMonth("2026-09")).toBe(30);
  });

  it("compte les jours restants", () => {
    expect(daysLeftInMonth("2026-09", "2026-09-14")).toBe(17);
    expect(daysLeftInMonth("2026-08", "2026-09-14")).toBe(0);
    expect(daysLeftInMonth("2026-10", "2026-09-14")).toBe(31);
  });

  it("liste les derniers mois dans l'ordre chronologique", () => {
    expect(lastMonths(3, "2026-01")).toEqual(["2025-11", "2025-12", "2026-01"]);
  });

  it("libelle en français", () => {
    expect(monthLabel("2026-09")).toBe("Septembre 2026");
    expect(dayGroupLabel("2026-09-14", "2026-09-14")).toBe("Aujourd'hui");
    expect(dayGroupLabel("2026-09-13", "2026-09-14")).toBe("Hier");
    expect(dayGroupLabel("2026-09-07", "2026-09-14")).toBe("Lundi 7 sept.");
  });
});

describe("récurrences", () => {
  it("conserve le jour du mois et borne à la fin du mois", () => {
    expect(nextOccurrence("2026-01-31", "monthly")).toBe("2026-02-28");
    expect(nextOccurrence("2026-02-28", "monthly", 31)).toBe("2026-03-31");
    expect(nextOccurrence("2026-09-14", "weekly")).toBe("2026-09-21");
    expect(nextOccurrence("2026-11-15", "quarterly")).toBe("2027-02-15");
    expect(nextOccurrence("2024-02-29", "yearly")).toBe("2025-02-28");
  });

  it("annualise et mensualise", () => {
    expect(monthlyEquivalent(1200_00, "yearly")).toBe(100_00);
    expect(monthlyEquivalent(10_00, "weekly")).toBe(Math.round((10_00 * 52) / 12));
    expect(diffDays("2026-09-14", "2026-12-31")).toBe(108);
  });
});
