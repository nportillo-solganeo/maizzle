import { describe, expect, test } from "bun:test";
import * as cheerio from "cheerio";
import { render } from "@maizzle/framework";

async function compile(html: string) {
  const { html: out } = await render(html);
  return cheerio.load(out);
}

describe("atoms/image", () => {
  test("renders img with correct src", async () => {
    const $ = await compile(`<x-atoms.image imgSrc="https://example.com/img.png" alt="Test" />`);
    expect($("[data-testid='image']").attr("src")).toBe("https://example.com/img.png");
  });

  test("renders img with correct alt", async () => {
    const $ = await compile(`<x-atoms.image imgSrc="img.png" alt="My image" />`);
    expect($("[data-testid='image']").attr("alt")).toBe("My image");
  });

  test("renders img with correct width", async () => {
    const $ = await compile(`<x-atoms.image imgSrc="img.png" alt="" imgWidth="200" />`);
    expect($("[data-testid='image']").attr("width")).toBe("200");
  });

  test("defaults height to auto", async () => {
    const $ = await compile(`<x-atoms.image imgSrc="img.png" alt="" />`);
    expect($("[data-testid='image']").attr("height")).toBe("auto");
  });

  test("renders img with custom height", async () => {
    const $ = await compile(`<x-atoms.image imgSrc="img.png" alt="" imgHeight="100" />`);
    expect($("[data-testid='image']").attr("height")).toBe("100");
  });
});
