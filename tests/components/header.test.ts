import { describe, expect, test } from "bun:test";
import * as cheerio from "cheerio";
import { render } from "@maizzle/framework";

async function compile(html: string) {
  const { html: out } = await render(html);
  return cheerio.load(out);
}

describe("header", () => {
  test("renders table with data-testid=header", async () => {
    const $ = await compile(`<x-header />`);
    expect($("[data-testid='header']").length).toBe(1);
  });

  test("renders mainTitle as h1", async () => {
    const $ = await compile(`<x-header mainTitle="My Newsletter" />`);
    expect($("[data-testid='title']").text()).toContain("My Newsletter");
  });

  test("defaults mainTitle to 'Header Title'", async () => {
    const $ = await compile(`<x-header />`);
    expect($("[data-testid='title']").text()).toContain("Header Title");
  });

  test("renders logo link when logoLink is provided", async () => {
    const $ = await compile(`<x-header logoLink="https://google.com" />`);
    expect($("[data-testid='logo']").attr("href")).toBe("https://google.com");
  });
});
