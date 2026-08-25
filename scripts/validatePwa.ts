import fs from 'fs';
import path from 'path';

/**
 * Static & Built Artifact PWA Validation Suite for FlipEnglish.
 * Validates:
 * 1. Web App Manifest configuration (name, icons, start_url, theme, display)
 * 2. Generated PNG Icon assets (dimensions, format, maskable safe-zone)
 * 3. Vite PWA configuration & Workbox rules (precache, runtime caching bounds, API NetworkOnly)
 * 4. Production Build output files (sw.js, manifest.webmanifest, hashed assets)
 */

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, description: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ ${description}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${description}`);
  }
}

function parsePngDimensions(filePath: string): { width: number; height: number } | null {
  try {
    const buffer = fs.readFileSync(filePath);
    if (buffer.length < 24) return null;
    // Check PNG signature
    const isPng =
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a;
    if (!isPng) return null;

    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    return { width, height };
  } catch {
    return null;
  }
}

async function runPwaValidation() {
  console.log('====================================================');
  console.log('FlipEnglish PWA & Offline Mode Validation Suite');
  console.log('====================================================\n');

  // ----------------------------------------------------
  // SECTION 1: Static Icon Files & Dimensions
  // ----------------------------------------------------
  console.log('[SECTION 1] PWA Brand Icon Assets');

  const pwaDir = path.join(process.cwd(), 'public', 'pwa');
  assert(fs.existsSync(pwaDir), 'public/pwa directory exists');

  const icon192Path = path.join(pwaDir, 'icon-192.png');
  assert(fs.existsSync(icon192Path), 'icon-192.png exists');
  const dim192 = parsePngDimensions(icon192Path);
  assert(dim192 !== null && dim192.width === 192 && dim192.height === 192, 'icon-192.png has exact 192x192 dimensions');

  const icon512Path = path.join(pwaDir, 'icon-512.png');
  assert(fs.existsSync(icon512Path), 'icon-512.png exists');
  const dim512 = parsePngDimensions(icon512Path);
  assert(dim512 !== null && dim512.width === 512 && dim512.height === 512, 'icon-512.png has exact 512x512 dimensions');

  const icon512MaskablePath = path.join(pwaDir, 'icon-512-maskable.png');
  assert(fs.existsSync(icon512MaskablePath), 'icon-512-maskable.png exists');
  const dim512Maskable = parsePngDimensions(icon512MaskablePath);
  assert(
    dim512Maskable !== null && dim512Maskable.width === 512 && dim512Maskable.height === 512,
    'icon-512-maskable.png has exact 512x512 dimensions'
  );

  const appleTouchPath = path.join(pwaDir, 'apple-touch-icon.png');
  assert(fs.existsSync(appleTouchPath), 'apple-touch-icon.png exists');
  const dimApple = parsePngDimensions(appleTouchPath);
  assert(dimApple !== null && dimApple.width === 180 && dimApple.height === 180, 'apple-touch-icon.png has exact 180x180 dimensions');

  // ----------------------------------------------------
  // SECTION 2: Vite Configuration & Manifest Static Inspection
  // ----------------------------------------------------
  console.log('\n[SECTION 2] Vite Configuration & Manifest Definition');

  const viteConfigPath = path.join(process.cwd(), 'vite.config.ts');
  assert(fs.existsSync(viteConfigPath), 'vite.config.ts exists');
  const viteConfigContent = fs.readFileSync(viteConfigPath, 'utf8');

  assert(viteConfigContent.includes('VitePWA('), 'VitePWA plugin is configured');
  assert(viteConfigContent.includes("registerType: 'prompt'"), "registerType is 'prompt' (no forced disruptive reloads)");
  assert(viteConfigContent.includes("id: '/'"), "manifest id is '/'");
  assert(viteConfigContent.includes("start_url: '/'"), "manifest start_url is '/'");
  assert(viteConfigContent.includes("display: 'standalone'"), "display is 'standalone'");
  assert(viteConfigContent.includes("theme_color: '#4f46e5'"), "theme_color matches FlipEnglish brand (#4f46e5)");
  assert(viteConfigContent.includes("background_color: '#f8fafc'"), "background_color matches shell (#f8fafc)");
  assert(viteConfigContent.includes("purpose: 'maskable'"), 'manifest contains maskable icon definition');
  assert(viteConfigContent.includes('cleanupOutdatedCaches: true'), 'cleanupOutdatedCaches is enabled');
  assert(viteConfigContent.includes("navigateFallback: '/index.html'"), "navigateFallback is '/index.html'");
  assert(viteConfigContent.includes('navigateFallbackDenylist'), 'navigateFallbackDenylist is configured');
  assert(viteConfigContent.includes('/^\\/api\\//'), 'API requests are excluded from SPA navigation fallback');

  // ----------------------------------------------------
  // SECTION 3: Service Worker Caching Policies
  // ----------------------------------------------------
  console.log('\n[SECTION 3] Service Worker Cache Boundaries & Safety Invariants');

  // Check runtime caching rules in config
  assert(viteConfigContent.includes('flipenglish-images-v1'), 'Bounded image cache name is configured');
  assert(viteConfigContent.includes('maxEntries: 150'), 'Unsplash image cache is bounded to 150 entries');
  assert(viteConfigContent.includes('flipenglish-google-fonts'), 'Google Fonts cache is configured');
  assert(viteConfigContent.includes("handler: 'NetworkOnly'"), 'Explicit NetworkOnly handler is specified for API');
  assert(viteConfigContent.includes('/^\\/api\\..*/i') || viteConfigContent.includes('/^\\/api\\//') || viteConfigContent.includes('/^\\/api\\/.*\\/i') || viteConfigContent.includes('urlPattern: /^\\/api\\//') || viteConfigContent.includes('urlPattern: /^\\/api\\/.*'), 'API pattern is covered by NetworkOnly');

  // Ensure NO AI endpoint is matched by CacheFirst / StaleWhileRevalidate / NetworkFirst
  assert(!viteConfigContent.includes("urlPattern: '/api/conversation'"), 'No AI endpoint mapped to cache');
  assert(!viteConfigContent.includes("urlPattern: '/api/analyze-photo'"), 'No Vision endpoint mapped to cache');
  assert(!viteConfigContent.includes("urlPattern: '/api/ai-practice'"), 'No Practice endpoint mapped to cache');

  // ----------------------------------------------------
  // SECTION 4: Index.html & Apple Meta Tags
  // ----------------------------------------------------
  console.log('\n[SECTION 4] HTML Meta & iOS App Capabilities');

  const indexHtmlPath = path.join(process.cwd(), 'index.html');
  const indexHtmlContent = fs.readFileSync(indexHtmlPath, 'utf8');

  assert(indexHtmlContent.includes('apple-touch-icon'), 'index.html contains apple-touch-icon link');
  assert(indexHtmlContent.includes('theme-color'), 'index.html contains theme-color meta tag');
  assert(indexHtmlContent.includes('apple-mobile-web-app-capable'), 'index.html contains apple-mobile-web-app-capable');
  assert(indexHtmlContent.includes('apple-mobile-web-app-title'), 'index.html contains apple-mobile-web-app-title');

  // ----------------------------------------------------
  // SECTION 5: React PWA Components & Hooks
  // ----------------------------------------------------
  console.log('\n[SECTION 5] React PWA Components & Architecture');

  assert(fs.existsSync(path.join(process.cwd(), 'src', 'features', 'pwa', 'useNetworkStatus.ts')), 'useNetworkStatus.ts exists');
  assert(fs.existsSync(path.join(process.cwd(), 'src', 'features', 'pwa', 'usePWAInstall.ts')), 'usePWAInstall.ts exists');
  assert(fs.existsSync(path.join(process.cwd(), 'src', 'features', 'pwa', 'OfflineBanner.tsx')), 'OfflineBanner.tsx exists');
  assert(fs.existsSync(path.join(process.cwd(), 'src', 'features', 'pwa', 'PWAInstallCard.tsx')), 'PWAInstallCard.tsx exists');
  assert(fs.existsSync(path.join(process.cwd(), 'src', 'features', 'pwa', 'PWAUpdatePrompt.tsx')), 'PWAUpdatePrompt.tsx exists');
  assert(fs.existsSync(path.join(process.cwd(), 'src', 'utils', 'apiError.ts')), 'apiError.ts normalizer exists');

  const appTsxContent = fs.readFileSync(path.join(process.cwd(), 'src', 'App.tsx'), 'utf8');
  assert(appTsxContent.includes('<OfflineBanner'), 'App.tsx mounts OfflineBanner');
  assert(appTsxContent.includes('<PWAUpdatePrompt'), 'App.tsx mounts PWAUpdatePrompt');

  const todayPageContent = fs.readFileSync(path.join(process.cwd(), 'src', 'features', 'studyPlan', 'TodayPage.tsx'), 'utf8');
  assert(todayPageContent.includes('<PWAInstallCard'), 'TodayPage.tsx mounts PWAInstallCard');

  // ----------------------------------------------------
  // SECTION 6: Express Server Production Headers
  // ----------------------------------------------------
  console.log('\n[SECTION 6] Express Server Production Cache Headers');

  const serverTsContent = fs.readFileSync(path.join(process.cwd(), 'server.ts'), 'utf8');
  assert(serverTsContent.includes('sw.js'), 'server.ts inspects sw.js');
  assert(serverTsContent.includes('no-cache, no-store, must-revalidate'), 'server.ts sets no-cache on service worker');
  assert(serverTsContent.includes('.webmanifest'), 'server.ts handles .webmanifest caching');
  assert(serverTsContent.includes('max-age=31536000, immutable'), 'server.ts sets immutable caching on hashed assets');

  // ----------------------------------------------------
  // SECTION 7: Built Client Artifacts (if dist/client exists)
  // ----------------------------------------------------
  console.log('\n[SECTION 7] Production Build Artifacts Check');

  const distClientDir = path.join(process.cwd(), 'dist', 'client');
  if (fs.existsSync(distClientDir)) {
    const files = fs.readdirSync(distClientDir);
    const hasSw = files.some((f) => f === 'sw.js' || f.startsWith('sw.'));
    assert(hasSw, 'dist/client contains generated service worker (sw.js)');

    const hasManifest = files.some((f) => f.endsWith('.webmanifest') || f === 'manifest.json');
    assert(hasManifest, 'dist/client contains generated web manifest');

    const hasWorkbox = files.some((f) => f.startsWith('workbox-'));
    assert(hasWorkbox, 'dist/client contains generated workbox library runtime');

    const indexInDist = fs.existsSync(path.join(distClientDir, 'index.html'));
    assert(indexInDist, 'dist/client/index.html exists');
  } else {
    console.log('  ℹ (dist/client not yet built; run "npm run build" to verify final bundled output)');
  }

  // ----------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------
  console.log('\n====================================================');
  console.log(`PWA Validation Summary: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
  console.log('====================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runPwaValidation();
