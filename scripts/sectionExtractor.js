import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// On reconstruit __dirname qui n'existe pas en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chemins relatifs à ce script
const INPUT_FILE = path.resolve(__dirname, '../build_production/newsletter.html');
const OUTPUT_DIR = path.resolve(__dirname, '../build_production/emailSections');


async function extractBlocks() {

  //  check l'existence du fichier source
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`Erreur : fichier introuvable à : ${INPUT_FILE}`);
    process.exit(1);
  }

  // dossier de sortie
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  try {
    // Lecture et chargement du HTML
    const htmlContent = fs.readFileSync(INPUT_FILE, 'utf8');
    const $ = cheerio.load(htmlContent);

    //  Sélection des blocs marqués pour l'extraction (1er de chaque type uniquement)
    const allBlocks = $('[data-component]');

    if (allBlocks.length === 0) {
      console.warn("Aucun élément avec l'attribut 'data-component' trouvé.");
      return;
    }

    const seen = new Set();
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

      console.log(`${blockName}.html généré`);
    });

    console.log(`Terminé ! ${uniqueBlocks.length} fichiers prêts dans ${OUTPUT_DIR}`);

  } catch (error) {
    console.error("Une erreur s'est produite :", error);
    process.exit(1);
  }
}


 extractBlocks();