import fs from "fs";
import path from "path";
import axios from "axios";
import { fileURLToPath } from "url";

interface TokenCache {
  value: string | null;
  expiresAt: number;
}

interface AssetInfo {
  id: number;
  typeId: number | undefined;
}

interface AssetType {
  name: string;
  id: number;
}

interface AssetPayload {
  name: string;
  assetType: AssetType;
  content: string;
  category?: { id: number };
}

interface SfmcAsset {
  name: string;
  id: number;
  assetType?: { id: number };
}

interface SfmcAssetsResponse {
  items?: SfmcAsset[];
  count?: number;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, "../build_production/emailSections");
const TEMPLATE_DIR = path.resolve(
  __dirname,
  "../build_production/emailTemplates",
);

const AUTH_URL = `https://${process.env.SFMC_SUBDOMAIN}.auth.marketingcloudapis.com/v2/token`;
const REST_URL = `https://${process.env.SFMC_SUBDOMAIN}.rest.marketingcloudapis.com`;

const REQUIRED_ENV_VARS = [
  "SFMC_SUBDOMAIN",
  "SFMC_CLIENT_ID",
  "SFMC_CLIENT_SECRET",
  "SFMC_ACCOUNT_ID",
];
const missingVars = REQUIRED_ENV_VARS.filter((v) => !process.env[v]);
if (missingVars.length > 0) {
  console.error(`❌ missing environment variables: ${missingVars.join(", ")}`);
  console.error(
    "   Check your .env file and ensure all required variables are set.",
  );
  process.exit(1);
}

const TEST_MODE = process.argv.includes("--test-mode");
const MAX_CONCURRENT = 5;
const MAX_RETRIES = 3;
const TOKEN_LIFETIME_MS = 18 * 60 * 1000;

let tokenCache: TokenCache = { value: null, expiresAt: 0 };

async function getAuthToken(): Promise<string> {
  if (tokenCache.value && Date.now() < tokenCache.expiresAt) {
    return tokenCache.value;
  }

  try {
    const response = await axios.post<{ access_token: string }>(AUTH_URL, {
      grant_type: "client_credentials",
      client_id: process.env.SFMC_CLIENT_ID,
      client_secret: process.env.SFMC_CLIENT_SECRET,
      account_id: process.env.SFMC_ACCOUNT_ID,
    });
    tokenCache = {
      value: response.data.access_token,
      expiresAt: Date.now() + TOKEN_LIFETIME_MS,
    };
    return tokenCache.value as string;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(
        "❌ SFMC authentication error:",
        error.response?.data || error.message,
      );
    }
    process.exit(1);
  }
}

async function fetchExistingAssets(
  token: string,
): Promise<Map<string, AssetInfo>> {
  const PAGE_SIZE = 200;
  const params = (page: number) => ({
    $filter: "name like '[Maizzle]%'",
    $page: page,
    $pageSize: PAGE_SIZE,
    $fields: "name,id,assetType",
  });
  const headers = { Authorization: `Bearer ${token}` };
  const url = `${REST_URL}/asset/v1/content/assets`;

  let data: SfmcAssetsResponse;
  try {
    ({ data } = await axios.get<SfmcAssetsResponse>(url, {
      headers,
      params: params(1),
    }));
  } catch (error: unknown) {
    const status = axios.isAxiosError(error) ? error.response?.status : null;
    const message = axios.isAxiosError(error)
      ? (error.response?.data?.message ?? error.message)
      : String(error);
    console.error(
      `❌ Failed to fetch existing assets${status ? ` (HTTP ${status})` : ""}: ${message}`,
    );
    process.exit(1);
  }

  const firstItems = data.items ?? [];
  const totalPages = Math.ceil((data.count ?? firstItems.length) / PAGE_SIZE);

  let remaining: Awaited<ReturnType<typeof axios.get<SfmcAssetsResponse>>>[];
  try {
    remaining = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, i) =>
        axios.get<SfmcAssetsResponse>(url, { headers, params: params(i + 2) }),
      ),
    );
  } catch (error: unknown) {
    const status = axios.isAxiosError(error) ? error.response?.status : null;
    const message = axios.isAxiosError(error)
      ? (error.response?.data?.message ?? error.message)
      : String(error);
    console.error(
      `❌ Failed to fetch asset pages${status ? ` (HTTP ${status})` : ""}: ${message}`,
    );
    process.exit(1);
  }

  const allItems = [
    ...firstItems,
    ...remaining.flatMap((r) => r.data.items ?? []),
  ];

  return new Map(
    allItems.map((item) => [
      item.name,
      { id: item.id, typeId: item.assetType?.id },
    ]),
  );
}

async function uploadAsset(
  filePath: string,
  existingMap: Map<string, AssetInfo>,
  categoryId: number | null = null,
  retryCount = 0,
  assetType: AssetType = { name: "htmlblock", id: 197 },
): Promise<void> {
  const fileName = path.basename(filePath, ".html");
  const assetName = `[Maizzle] ${fileName}`;

  if (TEST_MODE) {
    const action = existingMap.has(assetName) ? "Would update" : "Would create";
    console.log(`🔍 [Test-mode] ${action} [${assetType.name}] : ${assetName}`);
    return;
  }

  const token = await getAuthToken();
  const content = fs.readFileSync(filePath, "utf8");

  const assetPayload: AssetPayload = {
    name: assetName,
    assetType,
    content,
    ...(categoryId && { category: { id: categoryId } }),
  };

  try {
    const existingAsset = existingMap.get(assetName);

    if (existingAsset && existingAsset.typeId !== assetType.id) {
      console.warn(
        `⚠️ Type conflict for ${assetName} (Current: ${existingAsset.typeId} vs New: ${assetType.id})`,
      );
      console.warn(`🗑️ Deleting old asset for clean recreation...`);

      await axios.delete(
        `${REST_URL}/asset/v1/content/assets/${existingAsset.id}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      existingMap.delete(assetName);
    }

    const currentAsset = existingMap.get(assetName);

    if (currentAsset) {
      await axios.patch(
        `${REST_URL}/asset/v1/content/assets/${currentAsset.id}`,
        assetPayload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );
      console.log(`🔄 Mis à jour : ${assetName} (ID: ${currentAsset.id})`);
    } else {
      const response = await axios.post<{ id: number }>(
        `${REST_URL}/asset/v1/content/assets`,
        assetPayload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );
      console.log(
        `✅ Créé : ${assetName} (ID: ${response.data.id}) [Type: ${assetType.name}]`,
      );
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const validationErrors: Array<{ errorcode: number }> =
        error.response?.data?.validationErrors ?? [];
      const isTypeMismatch = validationErrors.some(
        (e) => e.errorcode === 118085,
      );

      if (isTypeMismatch && retryCount === 0) {
        const existingId = existingMap.get(assetName)?.id;
        console.warn(
          `⚠️  Type mismatch for ${assetName} (ID: ${existingId}) — deleting and recreating...`,
        );
        await axios.delete(
          `${REST_URL}/asset/v1/content/assets/${existingId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        existingMap.delete(assetName);
        return uploadAsset(
          filePath,
          existingMap,
          categoryId,
          retryCount + 1,
          assetType,
        );
      }
    }

    if (retryCount < MAX_RETRIES) {
      const delayMs = (retryCount + 1) * 2000;
      console.warn(
        `⚠️  Failure ${assetName} — attempt ${retryCount + 1}/${MAX_RETRIES} in ${delayMs / 1000}s...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return uploadAsset(
        filePath,
        existingMap,
        categoryId,
        retryCount + 1,
        assetType,
      );
    }

    const errorData = axios.isAxiosError(error)
      ? (error.response?.data ?? error.message)
      : error;
    console.error(
      `❌ Final failure ${assetName} :`,
      JSON.stringify(errorData, null, 2),
    );
    throw error;
  }
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

async function deploy(): Promise<void> {
  if (TEST_MODE)
    console.log("🔍 Test mode enabled — no changes will be made.\n");

  console.log("🚀 Starting deployment to Salesforce Marketing Cloud...");

  if (!fs.existsSync(DIST_DIR)) {
    console.error(
      `❌ Directory ${DIST_DIR} not found. Run the extraction first.`,
    );
    return;
  }

  const files = fs
    .readdirSync(DIST_DIR)
    .filter((file) => file.endsWith(".html"));

  if (files.length === 0) {
    console.warn("⚠️  No HTML files found in", DIST_DIR);
    return;
  }

  let existingMap = new Map<string, AssetInfo>();

  if (!TEST_MODE) {
    const token = await getAuthToken();
    console.log("🔑 Authentication successful.");
    console.log("🔎 Loading existing assets...");
    existingMap = await fetchExistingAssets(token);
    console.log(`   ${existingMap.size} asset(s) [Maizzle] found in SFMC.\n`);
  }

  console.log(
    `📦 ${files.length} file(s) to process in batches of ${MAX_CONCURRENT}...\n`,
  );

  const filePaths = files.map((file) => path.join(DIST_DIR, file));
  const batches = chunkArray(filePaths, MAX_CONCURRENT);

  let succeeded = 0;
  let failed = 0;

  const parseCategoryId = (
    val: string | undefined,
    name: string,
  ): number | null => {
    if (!val) return null;
    const n = Number(val);
    if (!Number.isInteger(n) || n <= 0) {
      console.error(
        `❌ Invalid ${name}: "${val}" is not a valid positive integer.`,
      );
      process.exit(1);
    }
    return n;
  };

  const sectionCategoryId = parseCategoryId(
    process.env.SFMC_COMPONENTS_CATEGORY_ID,
    "SFMC_COMPONENTS_CATEGORY_ID",
  );
  const templateCategoryId = parseCategoryId(
    process.env.SFMC_TEMPLATE_CATEGORY_ID,
    "SFMC_TEMPLATE_CATEGORY_ID",
  );

  for (const batch of batches) {
    const results = await Promise.allSettled(
      batch.map((fp) => uploadAsset(fp, existingMap, sectionCategoryId)),
    );
    succeeded += results.filter((r) => r.status === "fulfilled").length;
    failed += results.filter((r) => r.status === "rejected").length;
  }

  console.log(`\n📦 Sections : ✅ ${succeeded} succeeded  ❌ ${failed} failed`);

  if (fs.existsSync(TEMPLATE_DIR)) {
    const templateFiles = fs
      .readdirSync(TEMPLATE_DIR)
      .filter((f) => f.endsWith(".html"));

    if (templateFiles.length > 0) {
      console.log(
        `\n📋 ${templateFiles.length} template(s) to deploy (category ${templateCategoryId})...\n`,
      );

      const templatePaths = templateFiles.map((f) =>
        path.join(TEMPLATE_DIR, f),
      );
      const templateBatches = chunkArray(templatePaths, MAX_CONCURRENT);

      let tSucceeded = 0;
      let tFailed = 0;

      const templateAssetType: AssetType = { name: "template", id: 4 };
      for (const batch of templateBatches) {
        const results = await Promise.allSettled(
          batch.map((fp) =>
            uploadAsset(
              fp,
              existingMap,
              templateCategoryId,
              0,
              templateAssetType,
            ),
          ),
        );
        tSucceeded += results.filter((r) => r.status === "fulfilled").length;
        tFailed += results.filter((r) => r.status === "rejected").length;
      }

      console.log(
        `\n📋 Templates : ✅ ${tSucceeded} succeeded  ❌ ${tFailed} failed`,
      );
      succeeded += tSucceeded;
      failed += tFailed;
    } else {
      console.log("\n⚠️  No HTML files found in the template folder.");
    }
  } else {
    console.log(`\n⚠️  Template folder not found: ${TEMPLATE_DIR}`);
  }

  console.log(
    `\n🎉 Deployment completed! ✅ ${succeeded} succeeded  ❌ ${failed} failed`,
  );
}

deploy();
