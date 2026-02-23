import fs from 'fs';
import path from 'path';
import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

// --- Validation des variables d'environnement ---
const REQUIRED_ENV_VARS = ['SFMC_SUBDOMAIN', 'SFMC_CLIENT_ID', 'SFMC_CLIENT_SECRET', 'SFMC_ACCOUNT_ID'];
const missingVars = REQUIRED_ENV_VARS.filter(v => !process.env[v]);
if (missingVars.length > 0) {
    console.error(`❌ Variables d'environnement manquantes : ${missingVars.join(', ')}`);
    console.error('   Vérifiez votre fichier .env');
    process.exit(1);
}

// --- Configuration des chemins ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, '../build_production/emailSections');
const TEMPLATE_DIR = path.resolve(__dirname, '../build_production/emailTemplates');

// --- Configuration API SFMC ---
const AUTH_URL = `https://${process.env.SFMC_SUBDOMAIN}.auth.marketingcloudapis.com/v2/token`;
const REST_URL = `https://${process.env.SFMC_SUBDOMAIN}.rest.marketingcloudapis.com`;

// --- Options de déploiement ---
const DRY_RUN = process.argv.includes('--dry-run');
const MAX_CONCURRENT = 5;
const MAX_RETRIES = 3;
const TOKEN_LIFETIME_MS = 18 * 60 * 1000;

let tokenCache = { value: null, expiresAt: 0 };

async function getAuthToken() {
    if (tokenCache.value && Date.now() < tokenCache.expiresAt) {
        return tokenCache.value;
    }

    try {
        const response = await axios.post(AUTH_URL, {
            grant_type: 'client_credentials',
            client_id: process.env.SFMC_CLIENT_ID,
            client_secret: process.env.SFMC_CLIENT_SECRET,
            account_id: process.env.SFMC_ACCOUNT_ID
        });
        tokenCache = {
            value: response.data.access_token,
            expiresAt: Date.now() + TOKEN_LIFETIME_MS
        };
        return tokenCache.value;
    } catch (error) {
        console.error("❌ Erreur d'authentification SFMC :", error.response?.data || error.message);
        process.exit(1);
    }
}

// Récupère tous les assets [Maizzle] existants et retourne un Map name -> id
async function fetchExistingAssets(token) {
    const PAGE_SIZE = 200;
    const params = (page) => ({
        '$filter': "name like '[Maizzle]%'",
        '$page': page,
        '$pageSize': PAGE_SIZE,
        '$fields': 'name,id,assetType'
    });
    const headers = { Authorization: `Bearer ${token}` };
    const url = `${REST_URL}/asset/v1/content/assets`;

    // 1ère requête pour connaître le total
    const { data } = await axios.get(url, { headers, params: params(1) });
    const firstItems = data.items ?? [];
    const totalPages = Math.ceil((data.count ?? firstItems.length) / PAGE_SIZE);

    // Pages restantes en parallèle
    const remaining = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, i) =>
            axios.get(url, { headers, params: params(i + 2) })
        )
    );

    const allItems = [...firstItems, ...remaining.flatMap(r => r.data.items ?? [])];

    return new Map(allItems.map(item => [
        item.name,
        { id: item.id, typeId: item.assetType?.id }
    ]));
}

async function uploadAsset(filePath, existingMap, categoryId = null, retryCount = 0, assetType = { name: 'htmlblock', id: 197 }) {
    const fileName = path.basename(filePath, '.html');
    const assetName = `[Maizzle] ${fileName}`;

    if (DRY_RUN) {
        const action = existingMap.has(assetName) ? 'Mettrait à jour' : 'Créerait';
        console.log(`🔍 [Dry-run] ${action} [${assetType.name}] : ${assetName}`);
        return;
    }

    const token = await getAuthToken();
    const content = fs.readFileSync(filePath, 'utf8');

    const assetPayload = {
        name: assetName,
        assetType,
        content,
        ...(categoryId && { category: { id: categoryId } })
    };

    try {
    const existingAsset = existingMap.get(assetName); // Récupère l'objet {id, typeId}
    
    // LOGIQUE DE DÉTECTION DE CONFLIT DE TYPE
    // Si l'asset existe mais que son type est différent de ce qu'on veut envoyer
    // (Ex: C'est un ID 197 dans SFMC, mais on veut envoyer un ID 207)
    if (existingAsset && existingAsset.typeId !== assetType.id) {
        console.warn(`⚠️ Conflit de type pour ${assetName} (Actuel: ${existingAsset.typeId} vs Nouveau: ${assetType.id})`);
        console.warn(`🗑️ Suppression de l'ancien asset pour recréation propre...`);
        
        await axios.delete(
            `${REST_URL}/asset/v1/content/assets/${existingAsset.id}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        
        // On le retire de la map pour forcer le passage dans le bloc else
        existingMap.delete(assetName);
    }

    // Ré-évaluation après suppression potentielle
    // existingMap.get(assetName) renverra undefined si on vient de supprimer
    const currentAsset = existingMap.get(assetName); 

    if (currentAsset) {
        // --- MISE À JOUR (PATCH) ---
        // Le type est bon, on met à jour le contenu
        await axios.patch(
            `${REST_URL}/asset/v1/content/assets/${currentAsset.id}`,
            assetPayload,
            { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
        );
        console.log(`🔄 Mis à jour : ${assetName} (ID: ${currentAsset.id})`);
    
    } else {
        // --- CRÉATION (POST) ---
        const response = await axios.post(
            `${REST_URL}/asset/v1/content/assets`,
            assetPayload,
            { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
        );
        console.log(`✅ Créé : ${assetName} (ID: ${response.data.id}) [Type: ${assetType.name}]`);
    }

} catch (error) {
        // Si SFMC refuse le changement de type, supprimer et recréer
        const validationErrors = error.response?.data?.validationErrors ?? [];
        const isTypeMismatch = validationErrors.some(e => e.errorcode === 118085);

        if (isTypeMismatch && retryCount === 0) {
            const existingId = existingMap.get(assetName)?.id;
            console.warn(`⚠️  Type incompatible pour ${assetName} (ID: ${existingId}) — suppression et recréation...`);
            await axios.delete(
                `${REST_URL}/asset/v1/content/assets/${existingId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            existingMap.delete(assetName);
            return uploadAsset(filePath, existingMap, categoryId, 0, assetType);
        }

        if (retryCount < MAX_RETRIES) {
            const delayMs = (retryCount + 1) * 2000;
            console.warn(`⚠️  Échec ${assetName} — tentative ${retryCount + 1}/${MAX_RETRIES} dans ${delayMs / 1000}s...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
            return uploadAsset(filePath, existingMap, categoryId, retryCount + 1, assetType);
        }
        console.error(`❌ Échec définitif ${assetName} :`, JSON.stringify(error.response?.data ?? error.message, null, 2));
        throw error;
    }
}

function chunkArray(arr, size) {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
}

async function deploy() {
    if (DRY_RUN) console.log('🔍 Mode dry-run activé — aucune modification ne sera effectuée.\n');

    console.log('🚀 Démarrage du déploiement vers Salesforce Marketing Cloud...');

    if (!fs.existsSync(DIST_DIR)) {
        console.error(`❌ Dossier ${DIST_DIR} introuvable. Lancez le découpage d'abord.`);
        return;
    }

    const files = fs.readdirSync(DIST_DIR).filter(file => file.endsWith('.html'));

    if (files.length === 0) {
        console.warn('⚠️  Aucun fichier HTML trouvé dans', DIST_DIR);
        return;
    }

    let existingMap = new Map();

    if (!DRY_RUN) {
        const token = await getAuthToken();
        console.log('🔑 Authentification réussie.');
        console.log('🔎 Chargement des assets existants...');
        existingMap = await fetchExistingAssets(token);
        console.log(`   ${existingMap.size} asset(s) [Maizzle] trouvé(s) dans SFMC.\n`);
    }

    console.log(`📦 ${files.length} fichier(s) à traiter en batches de ${MAX_CONCURRENT}...\n`);

    const filePaths = files.map(file => path.join(DIST_DIR, file));
    const batches = chunkArray(filePaths, MAX_CONCURRENT);

    let succeeded = 0;
    let failed = 0;

    const sectionCategoryId = process.env.SFMC_COMPONENTS_CATEGORY_ID ? Number(process.env.SFMC_COMPONENTS_CATEGORY_ID) : null;
    const templateCategoryId = process.env.SFMC_TEMPLATE_CATEGORY_ID ? Number(process.env.SFMC_TEMPLATE_CATEGORY_ID) : null;

    for (const batch of batches) {
        const results = await Promise.allSettled(batch.map(fp => uploadAsset(fp, existingMap, sectionCategoryId)));
        succeeded += results.filter(r => r.status === 'fulfilled').length;
        failed += results.filter(r => r.status === 'rejected').length;
    }

    console.log(`\n📦 Sections : ✅ ${succeeded} réussi(s)  ❌ ${failed} échoué(s)`);

    // --- Déploiement des templates ---
    if (fs.existsSync(TEMPLATE_DIR)) {
        const templateFiles = fs.readdirSync(TEMPLATE_DIR).filter(f => f.endsWith('.html'));

        if (templateFiles.length > 0) {
            console.log(`\n📋 ${templateFiles.length} template(s) à déployer (catégorie ${templateCategoryId})...\n`);

            const templatePaths = templateFiles.map(f => path.join(TEMPLATE_DIR, f));
            const templateBatches = chunkArray(templatePaths, MAX_CONCURRENT);

            let tSucceeded = 0;
            let tFailed = 0;

            const templateAssetType = { name: 'template', id: 207 }; // ID d'asset pour les templates (différent des blocks)
            for (const batch of templateBatches) {
                const results = await Promise.allSettled(batch.map(fp => uploadAsset(fp, existingMap, templateCategoryId, 0, templateAssetType)));
                tSucceeded += results.filter(r => r.status === 'fulfilled').length;
                tFailed += results.filter(r => r.status === 'rejected').length;
            }

            console.log(`\n📋 Templates : ✅ ${tSucceeded} réussi(s)  ❌ ${tFailed} échoué(s)`);
            succeeded += tSucceeded;
            failed += tFailed;
        } else {
            console.log('\n⚠️  Aucun fichier HTML trouvé dans le dossier template.');
        }
    } else {
        console.log(`\n⚠️  Dossier template introuvable : ${TEMPLATE_DIR}`);
    }

    console.log(`\n🎉 Déploiement terminé ! ✅ ${succeeded} réussi(s)  ❌ ${failed} échoué(s)`);
}

deploy();
