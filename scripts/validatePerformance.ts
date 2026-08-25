import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distClientDir = path.join(projectRoot, 'dist', 'client');
const assetsDir = path.join(distClientDir, 'assets');

interface AssetInfo {
  name: string;
  rawBytes: number;
  gzipBytes: number;
  type: 'js' | 'css' | 'html' | 'other';
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
    const type: AssetInfo['type'] = ext === '.js' ? 'js' : ext === '.css' ? 'css' : ext === '.html' ? 'html' : 'other';

    results.push({
      name: file,
      rawBytes: stat.size,
      gzipBytes: gzip.length,
      type,
    });
  }

  return results;
}

function formatBytes(bytes: number): string {
  return `${(bytes / 1024).toFixed(2)} kB`;
}

function validatePerformance() {
  console.log('--- 1. Validating Client Bundle Budget & Code Splitting ---');
  const assets = getAssetStats();

  const mainJs = assets.find((a) => a.type === 'js' && a.name.startsWith('index-'));
  const mainCss = assets.find((a) => a.type === 'css' && a.name.startsWith('index-'));
  const dynamicChunks = assets.filter((a) => a.type === 'js' && !a.name.startsWith('index-') && !a.name.startsWith('workbox-'));

  if (!mainJs) {
    console.error('❌ Main JavaScript entry chunk (index-*.js) not found!');
    process.exit(1);
  }

  if (!mainCss) {
    console.error('❌ Main CSS stylesheet (index-*.css) not found!');
    process.exit(1);
  }

  console.log(`Main Bundle JS:  ${formatBytes(mainJs.rawBytes)} raw │ ${formatBytes(mainJs.gzipBytes)} gzip`);
  console.log(`Main Styles CSS: ${formatBytes(mainCss.rawBytes)} raw │ ${formatBytes(mainCss.gzipBytes)} gzip`);
  console.log(`Dynamic Chunks Count: ${dynamicChunks.length}`);

  // Thresholds
  // Main JS gzip budget: < 320 kB (down from baseline 350.89 kB)
  const MAX_MAIN_JS_GZIP = 320 * 1024;
  if (mainJs.gzipBytes > MAX_MAIN_JS_GZIP) {
    console.error(`❌ Main JS gzip size (${formatBytes(mainJs.gzipBytes)}) exceeds budget of 320 kB!`);
    process.exit(1);
  }

  // Ensure heavy secondary features were split out into independent chunks
  const expectedChunkPrefixes = [
    'Conversation',
    'Exam',
    'Placement',
    'FlipLens',
    'ReviewDashboard',
    'DictionaryPage',
    'HelpPage',
  ];

  for (const prefix of expectedChunkPrefixes) {
    const hasChunk = dynamicChunks.some((c) => c.name.startsWith(prefix));
    if (!hasChunk) {
      console.error(`❌ Expected dynamic chunk for "${prefix}" was not found!`);
      process.exit(1);
    }
  }
  console.log('✅ All heavy secondary features successfully isolated into dynamic Rollup chunks.');

  console.log('\n--- 2. Validating Suspense & Lazy Loading Accessibility ---');
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

  console.log('\n--- 3. Validating Critical Eager Learning Paths ---');
  // Home, LessonIntro, Learn, Exercise, Result, TodayPage, OnboardingPage must be eager
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

  console.log('\n--- 4. Validating LCP Image Optimization & SafeImage Contracts ---');
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

  console.log('\n--- 5. Validating Double-Submission Guards on Network Actions ---');
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

  console.log('\n--- 6. Validating Mobile & Tablet Viewport Invariants ---');
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

  console.log('\n🎉 ALL PERFORMANCE, CODE SPLITTING, AND MOBILE UX CHECKS PASSED WITH ZERO ERRORS.');
}

validatePerformance();
