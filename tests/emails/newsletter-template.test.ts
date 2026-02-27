import { beforeAll, describe, expect, test } from "bun:test";
import * as cheerio from "cheerio";
import { render } from "@maizzle/framework";
import fs from "fs";
import path from "path";

const source = fs.readFileSync(
  path.resolve("emails/newsletter-template.html"),
  "utf8",
);

function loadLocale(locale: string) {
  return JSON.parse(
    fs.readFileSync(path.resolve(`locales/${locale}.json`), "utf8"),
  );
}

async function compile(html: string, config: Record<string, unknown> = {}) {
  const { html: out } = await render(html, config);
  return cheerio.load(out);
}

describe("newsletter-template.html", () => {
  let $: ReturnType<typeof cheerio.load>;

  beforeAll(async () => {
    $ = await compile(source, {
      language: "fr",
      contents: loadLocale("fr"),
    });
  });

  describe("should have a html structure", () => {
    test("the lang attribute is 'fr' by default", () => {
      expect($("html").attr("lang")).toBe("fr");
    });

    test("should contain <head> and <body>", () => {
      expect($("head").length).toBe(1);
      expect($("body").length).toBe(1);
    });

    test("the preheader should be present and hidden", () => {
      expect(
        $("[data-testid='preheader'][class*='hidden']").length,
      ).toBeGreaterThan(0);
    });
  });

  describe("accessibility", () => {
    test("all images have an alt attribute", () => {
      $("img").each((_, el) => {
        expect($(el).attr("alt")).toBeDefined();
      });
    });

    test("all tables have a role of presentation or none", () => {
      $("table").each((_, el) => {
        const role = $(el).attr("role") ?? "";
        expect(["presentation", "none"]).toContain(role);
      });
    });
  });

  describe("links should have a non-empty href", () => {
    test("all <a> links have a non-empty href", () => {
      $("a").each((_, el) => {
        expect($(el).attr("href")).toBeTruthy();
      });
    });
  });

  describe("translations", () => {
    describe("locale fr", () => {
      let $fr: ReturnType<typeof cheerio.load>;

      beforeAll(async () => {
        $fr = await compile(source, {
          language: "fr",
          contents: loadLocale("fr"),
        });
      });

      test("lang attribute is 'fr'", () => {
        expect($fr("html").attr("lang")).toBe("fr");
      });

      test("featured section title is in French", () => {
        expect($fr("body").text()).toContain("Produit en vedette");
      });

      test("products section title is in French", () => {
        expect($fr("body").text()).toContain("Derniers produits ajoutés");
      });

      test("featured product CTA is in French", () => {
        expect($fr("body").text()).toContain("En savoir plus");
      });
    });

    describe("locale en", () => {
      let $en: ReturnType<typeof cheerio.load>;

      beforeAll(async () => {
        $en = await compile(source, {
          language: "en",
          contents: loadLocale("en"),
        });
      });

      test("lang attribute is 'en'", () => {
        expect($en("html").attr("lang")).toBe("en");
      });

      test("featured section title is in English", () => {
        expect($en("body").text()).toContain("Featured Product");
      });

      test("products section title is in English", () => {
        expect($en("body").text()).toContain("Latest Products");
      });

      test("featured product CTA is in English", () => {
        expect($en("body").text()).toContain("Learn more");
      });
    });
  });
});
