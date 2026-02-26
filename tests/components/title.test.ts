import { describe, expect, test } from "bun:test";
import * as cheerio from "cheerio";
import { render } from "@maizzle/framework";

async function compile(html: string) {
  const { html: out } = await render(html);
  return cheerio.load(out);
}

describe("atoms/title", () => {
  test("renders a <h1> with the slot text", async () => {
    const $ = await compile(`<x-atoms.title tag="h1">My title</x-atoms.title>`);
    expect($("[data-testid='title']").text().trim()).toBe("My title");
  });

  test("set the tag element to h2 when prop tag is set to h2", async () => {
    const $ = await compile(`<x-atoms.title tag="h2">My title</x-atoms.title>`);
    const el = $("[data-testid='title']");
    expect(el.length).toBe(1);
    expect(el.prop("tagName")?.toLowerCase()).toBe("h2");
    expect($("h1").length).toBe(0);
    expect(el.text().trim()).toBe("My title");
  });

  test("applies the text-3xl class", async () => {
    const $ = await compile(`<x-atoms.title>My title</x-atoms.title>`);
    expect($("[data-testid='title']").hasClass("text-3xl")).toBe(true);
  });
});
