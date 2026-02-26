import { describe, expect, test } from "bun:test";
import * as cheerio from "cheerio";
import { render } from "@maizzle/framework";

async function compile(html: string) {
  const { html: out } = await render(html);
  return cheerio.load(out);
}

describe("atoms/twocols", () => {
  test("uses 300px by default (w-1/2) for both columns", async () => {
    const $ = await compile(`<x-atoms.twocols />`);
    expect($("[class*='max-w-300px']").length).toBe(2);
  });

  test("applies the w-1/3 / w-2/3 widths", async () => {
    const $ = await compile(
      `<x-atoms.twocols widthLeft="w-1/3" widthRight="w-2/3" />`,
    );
    expect($("[class*='max-w-200px']").length).toBe(1);
    expect($("[class*='max-w-400px']").length).toBe(1);
  });

  test("an invalid width falls back to w-1/2 (300px)", async () => {
    const $ = await compile(
      `<x-atoms.twocols widthLeft="w-invalid" widthRight="w-1/2" />`,
    );
    expect($("[class*='max-w-300px']").length).toBe(2);
  });

  test("isResponsive=false renders a <table> instead of a <div>", async () => {
    const $ = await compile(`<x-atoms.twocols isResponsive="false" />`);
    expect($("table[data-testid='twocols']").length).toBe(1);
    expect($("div[data-testid='twocols']").length).toBe(0);
  });
});
