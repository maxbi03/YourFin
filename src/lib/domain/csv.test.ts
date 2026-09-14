import { describe, expect, it } from "vitest";
import { analyzeCSV, buildImportRows, detectDelimiter, importHash, parseAmountCell, parseDateCell } from "./csv";

describe("cellules", () => {
  it("lit les dates suisses et ISO", () => {
    expect(parseDateCell("14.09.2026")).toBe("2026-09-14");
    expect(parseDateCell("14/09/2026")).toBe("2026-09-14");
    expect(parseDateCell("2026-09-14")).toBe("2026-09-14");
    expect(parseDateCell("2026-09-14 10:32:00")).toBe("2026-09-14");
    expect(parseDateCell("1.2.26")).toBe("2026-02-01");
    expect(parseDateCell("Migros")).toBeNull();
    expect(parseDateCell("32.01.2026")).toBeNull();
  });

  it("lit les montants dans tous les formats bancaires", () => {
    expect(parseAmountCell("1'234.50")).toBe(123450);
    expect(parseAmountCell("-12,30")).toBe(-1230);
    expect(parseAmountCell("CHF 45.00")).toBe(4500);
    expect(parseAmountCell("12.30-")).toBe(-1230);
    expect(parseAmountCell("(80.00)")).toBe(-8000);
    expect(parseAmountCell("1 234,56")).toBe(123456);
    expect(parseAmountCell("1,234.56")).toBe(123456);
    expect(parseAmountCell("")).toBeNull();
    expect(parseAmountCell("n/a")).toBeNull();
  });
});

describe("analyse de fichier", () => {
  it("détecte le séparateur", () => {
    expect(detectDelimiter("a;b;c\n1;2;3")).toBe(";");
    expect(detectDelimiter("a,b,c\n1,2,3")).toBe(",");
    expect(detectDelimiter("a\tb\tc\n1\t2\t3")).toBe("\t");
  });

  it("saute le préambule et reconnaît les colonnes (style PostFinance)", () => {
    const text = [
      "Date du:;01.09.2026",
      "Date au:;14.09.2026",
      "",
      "Date;Type de transaction;Notification text;Crédit en CHF;Débit en CHF;Solde en CHF",
      "12.09.2026;Achat;\"Migros Lausanne, carte 1234\";;-45.70;3200.10",
      "10.09.2026;Virement;Remboursement CSS;120.00;;3245.80",
    ].join("\n");
    const a = analyzeCSV(text);
    expect(a.delimiter).toBe(";");
    expect(a.headerIndex).toBe(2);
    expect(a.mapping.date).toBe(0);
    expect(a.mapping.credit).toBe(3);
    expect(a.mapping.debit).toBe(4);
    expect(a.mapping.description).toBe(2);
    const { rows, invalid } = buildImportRows(a.rows, a.mapping);
    expect(invalid).toBe(0);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ date: "2026-09-12", amount: -4570, payee: "Migros Lausanne, carte 1234" });
    expect(rows[1]).toMatchObject({ date: "2026-09-10", amount: 12000 });
  });

  it("gère un export avec montant signé (style Revolut)", () => {
    const text = [
      "Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance",
      "CARD_PAYMENT,Current,2026-09-11 08:12:04,2026-09-12 01:00:00,Coop Pronto,-8.50,0.00,CHF,COMPLETED,412.30",
      "TOPUP,Current,2026-09-01 12:00:00,2026-09-01 12:00:01,Top-Up by *1234,200.00,0.00,CHF,COMPLETED,420.80",
    ].join("\n");
    const a = analyzeCSV(text);
    expect(a.mapping.date).toBe(2);
    expect(a.mapping.amount).toBe(5);
    expect(a.mapping.description).toBe(4);
    const { rows } = buildImportRows(a.rows, a.mapping);
    expect(rows[0]).toMatchObject({ date: "2026-09-11", amount: -850, payee: "Coop Pronto" });
    expect(rows[1].amount).toBe(20000);
  });

  it("produit une empreinte stable pour dédoublonner", () => {
    const h1 = importHash("2026-09-12", -4570, "Migros Lausanne");
    const h2 = importHash("2026-09-12", -4570, "  MIGROS   Lausanne ");
    const h3 = importHash("2026-09-12", -4571, "Migros Lausanne");
    expect(h1).toBe(h2);
    expect(h1).not.toBe(h3);
    expect(h1).toMatch(/^[0-9a-f]{16}$/);
  });
});
