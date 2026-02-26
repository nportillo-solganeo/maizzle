import { beforeAll, describe, expect, test } from "bun:test";
import * as cheerio from "cheerio";
import { render } from "@maizzle/framework";
import fs from "fs";
import path from "path";

async function compile(html: string) {
  const { html: out } = await render(html);
  return cheerio.load(out);
}

let $newsletter: ReturnType<typeof cheerio.load>;

beforeAll(async () => {
  const source = fs.readFileSync(
    path.resolve("emails/newsletter-template.html"),
    "utf8",
  );
  $newsletter = await compile(source);
});

describe("newsletter-template.html (runtime)", () => {
  describe("Structure", () => {
    test("the lang attribute is defined on <html>", () => {
      expect($newsletter("html").attr("lang")).toBeTruthy();
    });

    test("contains <head> and <body>", () => {
      expect($newsletter("head").length).toBe(1);
      expect($newsletter("body").length).toBe(1);
    });

    test("the preheader is present and hidden", () => {
      expect(
        $newsletter("div.hidden, div[class*='hidden']").length,
      ).toBeGreaterThan(0);
    });
  });

  describe("Accessibility", () => {
    test("all images have an alt attribute", () => {
      $newsletter("img").each((_, el) => {
        expect($newsletter(el).attr("alt")).toBeDefined();
      });
    });

    test("all tables have a role of presentation or none", () => {
      $newsletter("table").each((_, el) => {
        const role = $newsletter(el).attr("role") ?? "";
        expect(["presentation", "none"]).toContain(role);
      });
    });
  });

  describe("Links", () => {
    test("all <a> links have a non-empty href", () => {
      $newsletter("a").each((_, el) => {
        expect($newsletter(el).attr("href")).toBeTruthy();
      });
    });
  });
});
