import { describe, expect, test } from "bun:test";

function plural(translation: string, countOrBool: number | boolean): string {
  const [singular, pluralForm] = translation.split("|");
  const isPlural = typeof countOrBool === "boolean" ? countOrBool : countOrBool !== 1;
  const form = isPlural ? (pluralForm ?? singular) : singular;
  return typeof countOrBool === "number" ? form.replace("{count}", String(countOrBool)) : form;
}

describe("plural()", () => {
  describe("sans placeholder {count}", () => {
    test("retourne le singulier pour count = 1", () => {
      expect(plural("produit|produits", 1)).toBe("produit");
    });

    test("retourne le pluriel pour count = 0", () => {
      expect(plural("produit|produits", 0)).toBe("produits");
    });

    test("retourne le pluriel pour count > 1", () => {
      expect(plural("produit|produits", 6)).toBe("produits");
    });

    test("retourne le singulier si pas de forme plurielle", () => {
      expect(plural("produit", 5)).toBe("produit");
    });
  });

  describe("avec placeholder {count}", () => {
    test("remplace {count} au singulier", () => {
      expect(plural("{count} produit|{count} produits", 1)).toBe("1 produit");
    });

    test("remplace {count} au pluriel", () => {
      expect(plural("{count} produit|{count} produits", 6)).toBe("6 produits");
    });

    test("remplace {count} = 0", () => {
      expect(plural("{count} produit|{count} produits", 0)).toBe("0 produits");
    });
  });

  describe("avec booléen", () => {
    test("true retourne le pluriel", () => {
      expect(plural("produit|produits", true)).toBe("produits");
    });

    test("false retourne le singulier", () => {
      expect(plural("produit|produits", false)).toBe("produit");
    });

    test("true sans forme plurielle retourne le singulier", () => {
      expect(plural("produit", true)).toBe("produit");
    });

    test("pas de remplacement {count} avec un booléen", () => {
      expect(plural("{count} produit|{count} produits", true)).toBe("{count} produits");
    });
  });

  describe("anglais", () => {
    test("singulier", () => {
      expect(plural("{count} product|{count} products", 1)).toBe("1 product");
    });

    test("pluriel", () => {
      expect(plural("{count} product|{count} products", 3)).toBe("3 products");
    });
  });
});
