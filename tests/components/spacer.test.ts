import { describe, expect, test } from "bun:test";
import * as cheerio from "cheerio";
import { render } from "@maizzle/framework";

async function compile(html: string) {
  const { html: out } = await render(html);
  return cheerio.load(out);
}

describe("spacer", () => {
  test("renders a spacer with height", async () => {
    const $ = await compile(`<x-spacer height="24px" />`);
    const el = $("[data-testid='spacer']");
    expect(el.length).toBe(1);
    expect(el.attr("style")).toContain("line-height: 24px");
  });

  test("renders a spacer without style when height is absent", async () => {
    const $ = await compile(`<x-spacer />`);
    const el = $("[data-testid='spacer']");
    expect(el.length).toBe(1);
    expect(el.attr("style") ?? "").toBe("");
  });
});
