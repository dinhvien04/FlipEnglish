import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distClientDir = path.join(projectRoot, 'dist', 'client');
const assetsDir = path.join(distClientDir, 'assets');
const indexHtmlPath = path.join(distClientDir, 'index.html');
const swJsPath = path.join(distClientDir, 'sw.js');

interface AssetInfo {
  name: string;
  relativePath: string;
  rawBytes: number;
  gzipBytes: number;
  type: 'js' | 'css' | 'html' | 'image' | 'manifest' | 'other';
}

function formatBytes(bytes: number): string {
  return `${(bytes / 1024).toFixed(2)} kB`;
}

function getAssetStats(): AssetInfo[] {
  if (!fs.existsSync(assetsDir)) {
    throw new Error(`Assets directory not found at ${assetsDir}. Run npm run build first.`);
  }

  const files = fs.readdirSync(assetsDir);
  const results: AssetInfo[] = [];

  for (const file of files) {
    const fullPath = path.join(assetsDir, file);
    const stat = fs.statSync(fullPath);
    if (!stat.isFile()) continue;

    const content = fs.readFileSync(fullPath);
    const gzip = zlib.gzipSync(content);

    const ext = path.extname(file).toLowerCase();
    const type: AssetInfo['type'] =
      ext === '.js' ? 'js' : ext === '.css' ? 'css' : ext === '.html' ? 'html' : 'other';

    results.push({
      name: file,
      relativePath: `assets/${file}`,
      rawBytes: stat.size,
      gzipBytes: gzip.length,
      type,
    });
  }

  return results;
}

function parseInitialScriptsFromHtml(): { scripts: string[]; modulepreloads: string[] } {
  if (!fs.existsSync(indexHtmlPath)) {
    throw new Error(`dist/client/index.html not found at ${indexHtmlPath}`);
  }
  const html = fs.readFileSync(indexHtmlPath, 'utf8');

  // Match <script ... src="...">
  const scriptRegex = /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
  const scripts: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = scriptRegex.exec(html)) !== null) {
    scripts.push(match[1].replace(/^\//, ''));
  }

  // Match <link rel="modulepreload" href="...">
  const preloadRegex = /<link\b[^>]*\brel=["']modulepreload["'][^>]*\bhref=["']([^"']+)["'][^>]*>/gi;
  const modulepreloads: string[] = [];
  while ((match = preloadRegex.exec(html)) !== null) {
    modulepreloads.push(match[1].replace(/^\//, ''));
  }

  return { scripts, modulepreloads };
}

function parsePrecacheManifestFromSw(): { url: string; revision: string | null }[] {
  if (!fs.existsSync(swJsPath)) {
    throw new Error(`dist/client/sw.js not found at ${swJsPath}`);
  }
  const swCode = fs.readFileSync(swJsPath, 'utf8');

  // Match precacheAndRoute([ ... ])
  const precacheRegex = /workbox\.precacheAndRoute\(\s*(\[[^\]]+\])\s*,/s;
  const match = precacheRegex.exec(swCode);
  if (!match) {
    return [];
  }

  try {
    const rawJson = match[1];
    const parsed = JSON.parse(rawJson);
    return parsed;
  } catch (err) {
    // If JSON parsing fails due to unquoted keys or formatting, fallback to regex extraction
    const entryRegex = /\{\s*"url":\s*"([^"]+)"(?:\s*,\s*"revision":\s*("[^"]*"|null))?\s*\}/g;
    const entries: { url: string; revision: string | null }[] = [];
    let entryMatch: RegExpExecArray | null;
    while ((entryMatch = entryRegex.exec(swCode)) !== null) {
      entries.push({
        url: entryMatch[1],
        revision: entryMatch[2] === 'null' || !entryMatch[2] ? null : entryMatch[2].replace(/"/g, ''),
      });
    }
    return entries;
  }
}

function validatePerformance() {
  console.log('================================================================');
  console.log('   FlipEnglish Performance Validator V2 (Bundle & PWA Audit)    ');
  console.log('================================================================\n');

  console.log('--- 1. Client Bundle & Initial JS / CSS Accounting ---');
  const assets = getAssetStats();

  const mainJs = assets.find((a) => a.type === 'js' && a.name.startsWith('index-'));
  const mainCss = assets.find((a) => a.type === 'css' && a.name.startsWith('index-'));
  const allJsAssets = assets.filter((a) => a.type === 'js');
  const dynamicChunks = assets.filter(
    (a) => a.type === 'js' && !a.name.startsWith('index-') && !a.name.startsWith('workbox-')
  );

  if (!mainJs) {
    console.error('❌ Main JavaScript entry chunk (index-*.js) not found!');
    process.exit(1);
  }

  if (!mainCss) {
    console.error('❌ Main CSS stylesheet (index-*.css) not found!');
    process.exit(1);
  }

  // Parse HTML for initial entry scripts & modulepreloads
  const { scripts: initialScripts, modulepreloads } = parseInitialScriptsFromHtml();
  console.log(`Initial HTML Script Tags:       ${initialScripts.length} (${initialScripts.join(', ') || 'none'})`);
  console.log(`Initial HTML Modulepreloads:     ${modulepreloads.length} (${modulepreloads.join(', ') || 'none'})`);

  let initialJsRaw = 0;
  let initialJsGzip = 0;
  const initialJsNames = new Set<string>([...initialScripts, ...modulepreloads]);

  for (const jsName of initialJsNames) {
    const asset = assets.find((a) => a.relativePath === jsName || a.name === jsName);
    if (asset) {
      initialJsRaw += asset.rawBytes;
      initialJsGzip += asset.gzipBytes;
    }
  }

  let totalJsRaw = 0;
  let totalJsGzip = 0;
  for (const js of allJsAssets) {
    totalJsRaw += js.rawBytes;
    totalJsGzip += js.gzipBytes;
  }

  console.log(`\n📦 Initial Load JS:             ${formatBytes(initialJsRaw)} raw │ ${formatBytes(initialJsGzip)} gzip`);
  console.log(`📦 Total Application JS (All):  ${formatBytes(totalJsRaw)} raw │ ${formatBytes(totalJsGzip)} gzip`);
  console.log(`🎨 Main Application Styles:     ${formatBytes(mainCss.rawBytes)} raw │ ${formatBytes(mainCss.gzipBytes)} gzip`);
  console.log(`🔀 Dynamic Chunks Count:        ${dynamicChunks.length} chunks`);

  // Print Top 5 largest JS chunks
  const sortedJs = [...allJsAssets].sort((a, b) => b.rawBytes - a.rawBytes);
  console.log('\n--- Top 5 Largest JS Chunks ---');
  sortedJs.slice(0, 5).forEach((chunk, idx) => {
    console.log(`  ${idx + 1}. ${chunk.name.padEnd(42)} ${formatBytes(chunk.rawBytes).padStart(10)} raw │ ${formatBytes(chunk.gzipBytes).padStart(9)} gzip`);
  });

  // Threshold Checks
  // Initial JS Gzip budget: < 300 kB (down from 350.89 kB before Phase 2 splitting)
  const MAX_INITIAL_JS_GZIP = 300 * 1024;
  if (initialJsGzip > MAX_INITIAL_JS_GZIP) {
    console.error(`\n❌ Initial JS gzip size (${formatBytes(initialJsGzip)}) exceeds strict budget of 300 kB!`);
    process.exit(1);
  }
  console.log(`\n✅ Initial JS Gzip (${formatBytes(initialJsGzip)}) satisfies strict budget (< 300 kB).`);

  // Ensure heavy secondary engines & views are isolated in separate Rollup chunks
  const expectedChunkPrefixes = [
    'Conversation',
    'Exam',
    'Placement',
    'FlipLens',
    'ReviewDashboard',
    'DictionaryPage',
    'HelpPage',
    'placementPool',
    'examGenerator',
    'readingPassages',
    'scenarios',
  ];

  for (const prefix of expectedChunkPrefixes) {
    const hasChunk = dynamicChunks.some((c) => c.name.startsWith(prefix));
    if (!hasChunk) {
      console.error(`❌ Expected isolated dynamic chunk for "${prefix}" was not found!`);
      process.exit(1);
    }
  }
  console.log('✅ All heavy secondary features and question banks isolated into dynamic chunks.');

  console.log('\n--- 2. PWA Service Worker Precache Accounting ---');
  const precacheEntries = parsePrecacheManifestFromSw();
  console.log(`Precache Manifest Entries: ${precacheEntries.length}`);

  let totalPrecacheRaw = 0;
  let totalPrecacheGzip = 0;
  const missingPrecacheFiles: string[] = [];

  for (const entry of precacheEntries) {
    const localFilePath = path.join(distClientDir, entry.url);
    if (!fs.existsSync(localFilePath)) {
      missingPrecacheFiles.push(entry.url);
      continue;
    }
    const stat = fs.statSync(localFilePath);
    const content = fs.readFileSync(localFilePath);
    const gzip = zlib.gzipSync(content);
    totalPrecacheRaw += stat.size;
    totalPrecacheGzip += gzip.length;
  }

  if (missingPrecacheFiles.length > 0) {
    console.error(`❌ Precached files missing on disk: ${missingPrecacheFiles.join(', ')}`);
    process.exit(1);
  }

  console.log(`PWA Precache Total Size:   ${formatBytes(totalPrecacheRaw)} raw │ ${formatBytes(totalPrecacheGzip)} gzip`);
  // Total PWA Precache raw budget: < 2.0 MB (currently ~1.52 MB)
  const MAX_PRECACHE_RAW = 2.0 * 1024 * 1024;
  if (totalPrecacheRaw > MAX_PRECACHE_RAW) {
    console.error(`❌ PWA Precache raw size (${formatBytes(totalPrecacheRaw)}) exceeds budget of 2.0 MB!`);
    process.exit(1);
  }
  console.log('✅ PWA precache payload accounting verified within bounds.');

  console.log('\n--- 3. Validating Suspense & Lazy Loading Accessibility ---');
  const appTsxPath = path.join(projectRoot, 'src', 'App.tsx');
  const appTsx = fs.readFileSync(appTsxPath, 'utf8');

  if (!appTsx.includes('Suspense') || !appTsx.includes('LazyViewFallback')) {
    console.error('❌ App.tsx must wrap lazy views in Suspense with LazyViewFallback.');
    process.exit(1);
  }

  if (!appTsx.includes('role="status"') || !appTsx.includes('aria-live="polite"')) {
    console.error('❌ LazyViewFallback must declare role="status" and aria-live="polite" for screen readers.');
    process.exit(1);
  }
  console.log('✅ Lazy boundary provides accessible aria-live fallback.');

  console.log('\n--- 4. Validating Critical Eager Learning Paths ---');
  const eagerViews = [
    "import { Home } from './pages/Home'",
    "import { LessonIntro } from './pages/LessonIntro'",
    "import { Learn } from './pages/Learn'",
    "import { Exercise } from './pages/Exercise'",
    "import { Result } from './pages/Result'",
    "import { TodayPage } from './features/studyPlan/TodayPage'",
    "import { OnboardingPage } from './features/onboarding/OnboardingPage'",
  ];

  for (const eagerImport of eagerViews) {
    if (!appTsx.includes(eagerImport)) {
      console.error(`❌ Core path must remain eagerly loaded: ${eagerImport}`);
      process.exit(1);
    }
  }
  console.log('✅ Core eager study loop (Today, Curriculum, Intro, Flashcards, Quiz, Result, Onboarding) preserved.');

  console.log('\n--- 5. Validating LCP Image Optimization & SafeImage Contracts ---');
  const lessonIntroPath = path.join(projectRoot, 'src', 'pages', 'LessonIntro.tsx');
  const lessonIntro = fs.readFileSync(lessonIntroPath, 'utf8');

  if (!lessonIntro.includes('loading="eager"') || !lessonIntro.includes('fetchPriority="high"')) {
    console.error('❌ LessonIntro hero banner must specify loading="eager" and fetchPriority="high" for optimal LCP.');
    process.exit(1);
  }

  const lessonCardPath = path.join(projectRoot, 'src', 'components', 'LessonCard.tsx');
  const lessonCard = fs.readFileSync(lessonCardPath, 'utf8');
  if (!lessonCard.includes('loading="lazy"')) {
    console.error('❌ LessonCard curriculum thumbnails must specify loading="lazy".');
    process.exit(1);
  }
  console.log('✅ LCP and lazy loading image priorities verified.');

  console.log('\n--- 6. Validating Double-Submission Guards on Network Actions ---');
  const flipLensPath = path.join(projectRoot, 'src', 'pages', 'FlipLens.tsx');
  const flipLens = fs.readFileSync(flipLensPath, 'utf8');
  if (!flipLens.includes("step === 'analyzing'") || !flipLens.includes("disabled={step === 'analyzing'}")) {
    console.error('❌ FlipLens must disable analyze button and guard in-flight requests.');
    process.exit(1);
  }

  const examResultPath = path.join(projectRoot, 'src', 'pages', 'ExamResult.tsx');
  const examResult = fs.readFileSync(examResultPath, 'utf8');
  if (!examResult.includes('if (isAnalyzing) return;') || !examResult.includes('if (explainingQuestionId) return;')) {
    console.error('❌ ExamResult must guard against repeated taps on AI analysis and mistake explanations.');
    process.exit(1);
  }

  const resultPagePath = path.join(projectRoot, 'src', 'pages', 'Result.tsx');
  const resultPage = fs.readFileSync(resultPagePath, 'utf8');
  if (!resultPage.includes('if (mistakeWords.length === 0 || isGeneratingAi) return;')) {
    console.error('❌ Result page must guard against concurrent AI practice requests.');
    process.exit(1);
  }
  console.log('✅ In-flight network action double-tap guards verified.');

  console.log('\n--- 7. Validating Mobile & Tablet Viewport Invariants ---');
  const indexCssPath = path.join(projectRoot, 'src', 'index.css');
  const indexCss = fs.readFileSync(indexCssPath, 'utf8');

  if (indexCss.includes('overflow-x: hidden') && indexCss.includes('body')) {
    console.error('❌ Body must not use global overflow-x: hidden hack.');
    process.exit(1);
  }

  if (!indexCss.includes('env(safe-area-inset-top') || !indexCss.includes('touch-action: manipulation')) {
    console.error('❌ index.css must support safe-area insets and touch-action: manipulation.');
    process.exit(1);
  }
  console.log('✅ Mobile layout rules and safe-area invariants verified.');

  console.log('\n🎉 ALL PERFORMANCE, BUNDLE SPLITTING, PWA PRECACHE, AND MOBILE UX CHECKS PASSED WITH ZERO ERRORS.');
}

validatePerformance();
