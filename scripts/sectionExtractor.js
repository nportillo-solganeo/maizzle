import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// --- CONFIGURATION DES CHEMINS (Spécifique ESM) ---
// On reconstruit __dirname qui n'existe pas en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chemins relatifs à ce script
const INPUT_FILE = path.resolve(__dirname, '../build_production/newsletter.html');
const OUTPUT_DIR = path.resolve(__dirname, '../build_production/emailSections');

// --- FONCTION PRINCIPALE ---
async function extractBlocks() {
  console.log('🚀 Démarrage de l\'extraction pour Salesforce...');

  // 1. Vérification de l'existence du fichier source
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌ Erreur : Fichier introuvable à : ${INPUT_FILE}`);
    console.error(`👉 Avez-vous lancé 'maizzle build production' avant ?`);
    process.exit(1);
  }

  // 2. Création du dossier de sortie
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  try {
    // 3. Lecture et chargement du HTML
    const htmlContent = fs.readFileSync(INPUT_FILE, 'utf8');
    const $ = cheerio.load(htmlContent);

    // 4. Sélection des blocs marqués pour l'extraction
    const blocks = $('[data-component]');

    if (blocks.length === 0) {
      console.warn("⚠️  Aucun élément avec l'attribut 'data-component' trouvé.");
      return;
    }

    // 5. Extraction et écriture des fichiers
    blocks.each((i, el) => {
      // On récupère le nom souhaité (ex: "header", "hero")
      const blockName = $(el).attr('data-component');
      
      // On retire l'attribut de marquage pour nettoyer le code final (optionnel mais propre)
      $(el).removeAttr('data-component');

      // $.html(el) récupère l'élément LUI-MÊME (outerHTML) + son contenu
      // C'est vital pour conserver les styles inlinés sur la balise conteneur
      const extractedHtml = $.html(el);

      const filePath = path.join(OUTPUT_DIR, `${blockName}.html`);
      fs.writeFileSync(filePath, extractedHtml);
      
      console.log(`✅ ${blockName}.html généré`);
    });

    console.log(`🎉 Terminé ! ${blocks.length} fichiers prêts dans ${OUTPUT_DIR}`);

  } catch (error) {
    console.error("Une erreur s'est produite :", error);
    process.exit(1);
  }
}

// Exécution
extractBlocks();