import { describe, expect, test } from "bun:test";
import * as cheerio from "cheerio";
import { render } from "@maizzle/framework";

async function compile(html: string) {
  const { html: out } = await render(html);
  return cheerio.load(out);
}

describe("atoms/btn", () => {
  test("should render the link passed as prop", async () => {
    const $ = await compile(
      `<x-atoms.btn link="https://google.com">Click</x-atoms.btn>`,
    );
    expect($("[data-testid='btn'] a").attr("href")).toBe("https://google.com");
  });

  test("should render the slot text in the link", async () => {
    const $ = await compile(`<x-atoms.btn link="#">test</x-atoms.btn>`);
    expect($("[data-testid='btn'] a").text()).toContain("test");
  });

  test("should apply btn and text-base classes", async () => {
    const $ = await compile(`<x-atoms.btn link="#">Label</x-atoms.btn>`);
    expect($("[data-testid='btn'] a").hasClass("btn")).toBe(true);
    expect($("[data-testid='btn'] a").hasClass("text-base")).toBe(true);
  });

  test("should apply isPrimary class when isPrimary prop is set", async () => {
    const $ = await compile(
      `<x-atoms.btn link="#" isPrimary="">Label</x-atoms.btn>`,
    );
    expect($("[data-testid='btn'] a").hasClass("isPrimary")).toBe(true);
  });

  test("should apply custom class via class prop", async () => {
    const $ = await compile(
      `<x-atoms.btn link="#" class="my-class">Label</x-atoms.btn>`,
    );
    expect($("[data-testid='btn'] a").hasClass("my-class")).toBe(true);
  });
});
