import { describe, expect, test } from "bun:test";
import * as cheerio from "cheerio";
import { render } from "@maizzle/framework";

async function compile(html: string) {
  const { html: out } = await render(html);
  return cheerio.load(out);
}

describe("logo", () => {
  test("renders anchor with data-testid=logo", async () => {
    const $ = await compile(
      `<x-logo logoLink="https://google.com" logoSrc="logo.png" logoSrcDark="logo-dark.png" />`,
    );
    expect($("[data-testid='logo']").length).toBe(1);
  });

  test("renders anchor with correct href", async () => {
    const $ = await compile(
      `<x-logo logoLink="https://google.com" logoSrc="logo.png" logoSrcDark="logo-dark.png" />`,
    );
    expect($("[data-testid='logo']").attr("href")).toBe("https://google.com");
  });

  test("renders two img elements (light and dark mode)", async () => {
    const $ = await compile(
      `<x-logo logoLink="#" logoSrc="logo.png" logoSrcDark="logo-dark.png" />`,
    );
    expect($("[data-testid='image']").length).toBe(2);
  });

  test("renders light logo src", async () => {
    const $ = await compile(
      `<x-logo logoLink="#" logoSrc="logo-light.png" logoSrcDark="logo-dark.png" />`,
    );
    expect($("[data-testid='image'][src='logo-light.png']").length).toBe(1);
  });

  test("renders dark logo src", async () => {
    const $ = await compile(
      `<x-logo logoLink="#" logoSrc="logo-light.png" logoSrcDark="logo-dark.png" />`,
    );
    expect($("[data-testid='image'][src='logo-dark.png']").length).toBe(1);
  });
});
