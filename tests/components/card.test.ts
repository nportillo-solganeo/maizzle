import { describe, expect, test } from "bun:test";
import * as cheerio from "cheerio";
import { render } from "@maizzle/framework";

async function compile(html: string) {
  const { html: out } = await render(html);
  return cheerio.load(out);
}

describe("card", () => {
  test("renders table with data-testid=card", async () => {
    const $ = await compile(`<x-card />`);
    expect($("[data-testid='card']").length).toBe(1);
  });

  test("renders yield content", async () => {
    const $ = await compile(`<x-card>Card content</x-card>`);
    expect($("[data-testid='card']").text()).toContain("Card content");
  });

  test("applies custom class to inner table", async () => {
    const $ = await compile(`<x-card class="custom-class" />`);
    expect($("[data-testid='card-body']").hasClass("custom-class")).toBe(true);
  });
});
