import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// On reconstruit __dirname qui n'existe pas en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chemins relatifs à ce script
const BUILD_DIR = path.resolve(__dirname, '../build_production');
const OUTPUT_DIR = path.resolve(__dirname, '../build_production/emailSections');
const OUTPUT_TEMPLATE_DIR = path.resolve(__dirname, '../build_production/emailTemplates');

async function extractBlocksFromFile(inputFile) {
  const fileName = path.basename(inputFile);

  try {
    // Lecture et chargement du HTML
    const htmlContent = fs.readFileSync(inputFile, 'utf8');
    const $ = cheerio.load(htmlContent);

    //  Sélection des blocs marqués pour l'extraction (1er de chaque type uniquement)
    const allBlocks = $('[data-component]');

    if (allBlocks.length === 0) {
      console.warn(`[${fileName}] Aucun élément avec l'attribut 'data-component' trouvé.`);
      return;
    }

    const seen = new Set(); //collection sans doublons
    const uniqueBlocks = [];
    allBlocks.each((i, el) => {
      const name = $(el).attr('data-component');
      if (!seen.has(name)) {
        seen.add(name);
        uniqueBlocks.push(el);
      }
    });

    //  Extraction et écriture des fichiers
    uniqueBlocks.forEach((el) => {
      const blockName = $(el).attr('data-component');

      $(el).removeAttr('data-component');

      // $.html(el) récupère  outerHTML et son content pour conserver les styles inlinés sur la balise conteneur
      const extractedHtml = $.html(el);

      const filePath = path.join(OUTPUT_DIR, `${blockName}.html`);
      fs.writeFileSync(filePath, extractedHtml);

      console.log(`[${fileName}] ${blockName}.html généré`);
    });

    console.log(`[${fileName}] Terminé ! ${uniqueBlocks.length} fichiers prêts dans ${OUTPUT_DIR}`);

    // Génération du template : vider le contenu de chaque slot
    $('[data-type="slot"]').empty();

    const templatePath = path.join(OUTPUT_TEMPLATE_DIR, fileName);
    fs.writeFileSync(templatePath, $.html());
    console.log(`[${fileName}] Template généré dans ${OUTPUT_TEMPLATE_DIR}`);

  } catch (error) {
    console.error(`[${fileName}] Une erreur s'est produite :`, error);
  }
}


async function extractBlocks() {
  // Vérification de l'existence du dossier source
  if (!fs.existsSync(BUILD_DIR)) {
    console.error(`Erreur : dossier introuvable à : ${BUILD_DIR}`);
    process.exit(1);
  }

  // Création des dossiers de sortie
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  if (!fs.existsSync(OUTPUT_TEMPLATE_DIR)) {
    fs.mkdirSync(OUTPUT_TEMPLATE_DIR, { recursive: true });
  }

  // Scan des fichiers HTML directement dans build_production/ (hors sous-dossiers exclus)
  const entries = fs.readdirSync(BUILD_DIR, { withFileTypes: true });
  const htmlFiles = entries
    .filter(entry => entry.isFile() && entry.name.endsWith('.html'))
    .map(entry => path.join(BUILD_DIR, entry.name));

  if (htmlFiles.length === 0) {
    console.warn(`Aucun fichier HTML trouvé dans ${BUILD_DIR}`);
    process.exit(0);
  }

  console.log(`${htmlFiles.length} fichier(s) trouvé(s) dans ${BUILD_DIR}\n`);

  for (const file of htmlFiles) {
    await extractBlocksFromFile(file);
    console.log('');
  }
}


extractBlocks();
