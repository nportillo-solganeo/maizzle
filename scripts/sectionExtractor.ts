import * as cheerio from "cheerio";
import type { Element } from "domhandler"; // comes from cheerio's dependencies
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const locale = process.env.LOCALE || 'fr'
const BUILD_DIR = path.resolve(__dirname, `../build_production/${locale}`);
const OUTPUT_DIR = path.resolve(__dirname, `../build_production/${locale}/emailSections`);
const OUTPUT_TEMPLATE_DIR = path.resolve(__dirname, `../build_production/${locale}/emailTemplates`);

async function extractBlocksFromFile(inputFile: string): Promise<void> {
  const fileName = path.basename(inputFile);

  try {
    const htmlContent = fs.readFileSync(inputFile, "utf8");
    const $ = cheerio.load(htmlContent);

    const allBlocks = $("[data-component]");

    if (allBlocks.length === 0) {
      console.warn(
        `❌ [${fileName}] no elements with the 'data-component' attribute found.`,
      );
      return;
    }

    const extractedKeys = new Set<string>();
    const uniqueBlocks: Element[] = [];
    allBlocks.each((i, el) => {
      const componentName = $(el).attr("data-component");
      const componentVariant = $(el).attr("data-component-variant") || "";
      const key = componentVariant
        ? `${componentName}--${componentVariant}`
        : componentName;
      if (componentName && key && !extractedKeys.has(key)) {
        extractedKeys.add(key);
        uniqueBlocks.push(el);
      }
    });

    uniqueBlocks.forEach((el) => {
      const blockName = $(el).attr("data-component") as string;
      const variant: string | undefined = $(el).attr("data-component-variant");
      const sanitizedVariant = variant ? variant.replace(/\//g, "-") : null;
      const outputName = sanitizedVariant
        ? `${blockName}--${sanitizedVariant}`
        : blockName;

      // Validate outputName to prevent invalid file names
      if (!/^[\w-]+$/.test(outputName)) {
        console.warn(`❌ [${fileName}] Invalid block name: ${outputName}`);
        return;
      }

      $(el).removeAttr("data-component");
      $(el).removeAttr("data-component-variant");

      const extractedHtml = $.html(el);

      const filePath = path.join(OUTPUT_DIR, `${outputName}.html`);
      fs.writeFileSync(filePath, extractedHtml);

      console.log(`✅ [${fileName}] ${outputName}.html generated`);
    });

    console.log(
      `✅ [${fileName}] Done! ${uniqueBlocks.length} files ready in ${OUTPUT_DIR}`,
    );

    $('[data-type="slot"]').empty();

    const templatePath = path.join(OUTPUT_TEMPLATE_DIR, fileName);
    fs.writeFileSync(templatePath, $.html());
    console.log(
      `✅ [${fileName}] Template generated in ${OUTPUT_TEMPLATE_DIR}`,
    );
  } catch (error) {
    console.error(`❌ [${fileName}] An error occurred:`, error);
  }
}

async function extractBlocks(): Promise<void> {
  if (!fs.existsSync(BUILD_DIR)) {
    console.error(`❌ Error: directory not found at: ${BUILD_DIR}`);
    process.exit(1);
  }

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  if (!fs.existsSync(OUTPUT_TEMPLATE_DIR)) {
    fs.mkdirSync(OUTPUT_TEMPLATE_DIR, { recursive: true });
  }

  const entries = fs.readdirSync(BUILD_DIR, { withFileTypes: true });
  const htmlFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".html"))
    .map((entry) => path.join(BUILD_DIR, entry.name));

  if (htmlFiles.length === 0) {
    console.warn(`⚠️ No HTML files found in ${BUILD_DIR}`);
    process.exit(0);
  }

  console.log(`${htmlFiles.length} file(s) found in ${BUILD_DIR}\n`);

  for (const file of htmlFiles) {
    await extractBlocksFromFile(file);
    console.log("");
  }
}

extractBlocks();
