import fs from 'fs';
import path from 'path';

/**
 * Validates docs/PERFORMANCE_QA_REPORT.md for:
 * 1. Absence of misleading "hydration" terminology (outside of literal vocabulary words like "hydrate")
 * 2. Proper distinction between Lantern modeled, DevTools applied, and Provided throttling
 * 3. Absence of exaggerated "physical DevTools" / "physical LCP" wording
 * 4. Accurate CSR client-side initial mount descriptions (createRoot into empty div#root)
 * 5. Pre-FCP trace timing forensics (JS network download vs CPU script eval vs layout)
 * 6. Truthful release status ("CONDITIONALLY READY" overall, "NOT YET MEETING LAB TARGET" for mobile lab LCP)
 * 7. Cross-check against machine-readable benchmark summary (.qa/performance-summary.json)
 */

function validatePerformanceReport(): void {
  const reportPath = path.resolve('docs/PERFORMANCE_QA_REPORT.md');
  let content: string;
  try {
    content = fs.readFileSync(reportPath, 'utf8');
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      console.error(`❌ Performance QA Report missing at: ${reportPath}`);
      process.exit(1);
    }
    throw error;
  }

  // Check 1: Stateless hydration regex check (no /g flag to avoid stateful lastIndex issues)
  const hydrationRegex = /\bhydrat(ion|ing|ed)?\b/i;
  const hydrationMatches: string[] = [];
  const lines = content.split('\n');
  lines.forEach((line, lineIndex) => {
    if (hydrationRegex.test(line) && !line.includes('hydrate (vocab)')) {
      hydrationMatches.push(`Line ${lineIndex + 1}: ${line.trim()}`);
    }
  });

  if (hydrationMatches.length > 0) {
    console.error('❌ Forbidden "hydration" terminology found in PERFORMANCE_QA_REPORT.md:');
    hydrationMatches.forEach((m) => console.error(`   ${m}`));
    console.error('   FlipEnglish uses client-side initial render/mount (createRoot), NOT hydration.');
    process.exit(1);
  }

  // Check 2: Check for forbidden "physical" wording regarding devtools measurements
  const forbiddenPhysicalWords = ['physical devtools', 'physical lcp', 'physical transmission reality'];
  for (const phrase of forbiddenPhysicalWords) {
    if (content.toLowerCase().includes(phrase)) {
      console.error(`❌ Forbidden misleading phrase found: "${phrase}". Use observed DevTools applied throttling wording instead.`);
      process.exit(1);
    }
  }

  // Check 3: Verify presence of required structural sections
  const requiredHeadings = [
    'Executive Summary & Objective',
    'Quantitative Performance & Bundle Accounting',
    'Phase 3.2 Empirical Measurement Matrix',
    'Trace-Based Pre-FCP Timeline & CSR Startup Forensics',
    'Lantern Simulation vs. DevTools Applied Throttling Analysis',
    'Root-Cause Attribution & Render Delay Accounting',
    'Benchmark Reproduction Commands',
    'Verification Suite Results Summary',
    'Release Recommendation & Truthful Verdict',
  ];

  for (const heading of requiredHeadings) {
    if (!content.includes(heading)) {
      console.error(`❌ Missing required section in PERFORMANCE_QA_REPORT.md: "${heading}"`);
      process.exit(1);
    }
  }

  // Check 4: Verify required status terms and CSR architecture
  if (!content.includes('CONDITIONALLY READY')) {
    console.error('❌ Missing "CONDITIONALLY READY" overall release status.');
    process.exit(1);
  }

  if (!content.includes('NOT YET MEETING LAB TARGET')) {
    console.error('❌ Missing "NOT YET MEETING LAB TARGET" performance target status.');
    process.exit(1);
  }

  if (!content.includes('createRoot')) {
    console.error('❌ Missing explicit architectural clarification of createRoot CSR mount.');
    process.exit(1);
  }

  // Check 5: Cross-check report against .qa/performance-summary.json (Strict Fail-Closed)
  const summaryPath = path.resolve('.qa/performance-summary.json');
  let summary: any;
  try {
    const rawSummary = fs.readFileSync(summaryPath, 'utf8');
    summary = JSON.parse(rawSummary);
  } catch (err) {
    if (err instanceof Error && 'code' in err && err.code === 'ENOENT') {
      console.error(`❌ Benchmark summary missing at: ${summaryPath}`);
      console.error('   Generate it by running: npx tsx scripts/summarizeLighthouse.ts');
      process.exit(1);
    }
    console.error(`❌ Failed to parse .qa/performance-summary.json: ${(err as Error).message}`);
    process.exit(1);
  }

  // Validate Summary Schema v2 Structure
  if (summary.schemaVersion !== 2) {
    console.error(`❌ Invalid summary schemaVersion: ${summary.schemaVersion}. Expected schemaVersion: 2.`);
    process.exit(1);
  }

  if (
    !summary.benchmarkSource ||
    typeof summary.benchmarkSource.commit !== 'string' ||
    typeof summary.benchmarkSource.commitSource !== 'string' ||
    typeof summary.benchmarkSource.artifactSet !== 'string'
  ) {
    console.error('❌ Invalid or missing benchmarkSource metadata in .qa/performance-summary.json.');
    process.exit(1);
  }

  if (
    !summary.summaryGenerator ||
    typeof summary.summaryGenerator.commit !== 'string' ||
    typeof summary.summaryGenerator.nodeVersion !== 'string'
  ) {
    console.error('❌ Invalid or missing summaryGenerator metadata in .qa/performance-summary.json.');
    process.exit(1);
  }

  if (
    !summary.environment ||
    !Array.isArray(summary.environment.chromeVersions) ||
    summary.environment.chromeVersions.length === 0 ||
    !Array.isArray(summary.environment.lighthouseVersions) ||
    summary.environment.lighthouseVersions.length === 0
  ) {
    console.error('❌ Invalid or missing environment metadata in .qa/performance-summary.json.');
    process.exit(1);
  }

  const groups = summary.groups || {};
  const requiredGroups = [
    'simulatedMobile',
    'devtoolsMobile',
    'simulatedDesktop',
    'devtoolsDesktop',
    'providedMobile',
  ];
  for (const grp of requiredGroups) {
    if (!groups[grp]) {
      console.error(`❌ Missing required group "${grp}" in .qa/performance-summary.json.`);
      process.exit(1);
    }
  }

  const requirePerfMarker = (key: string): string => {
    const match = content.match(new RegExp(`<!--\\s*PERF:${key}=([^\n>]+)\\s*-->`));
    if (!match || !match[1].trim()) {
      console.error(`❌ Missing required performance metadata marker: <!-- PERF:${key}=... --> in docs/PERFORMANCE_QA_REPORT.md`);
      process.exit(1);
    }
    return match[1].trim();
  };

  const simMobLcp = requirePerfMarker('SIMULATED_MOBILE_LCP_MS');
  const devMobLcp = requirePerfMarker('DEVTOOLS_MOBILE_LCP_MS');
  const devDeskLcp = requirePerfMarker('DEVTOOLS_DESKTOP_LCP_MS');
  const simDeskLcp = requirePerfMarker('SIMULATED_DESKTOP_LCP_MS');
  const simMobScore = requirePerfMarker('SIMULATED_MOBILE_PERF_SCORE');
  const devMobScore = requirePerfMarker('DEVTOOLS_MOBILE_PERF_SCORE');
  const clsVal = requirePerfMarker('CLS');
  const verdict = requirePerfMarker('RELEASE_VERDICT');

  if (Number(simMobLcp) !== groups.simulatedMobile.lcpMedianMs) {
    console.error(`❌ Mismatch in SIMULATED_MOBILE_LCP_MS: report marker is ${simMobLcp}ms but summary is ${groups.simulatedMobile.lcpMedianMs}ms`);
    process.exit(1);
  }

  if (Number(devMobLcp) !== groups.devtoolsMobile.lcpMedianMs) {
    console.error(`❌ Mismatch in DEVTOOLS_MOBILE_LCP_MS: report marker is ${devMobLcp}ms but summary is ${groups.devtoolsMobile.lcpMedianMs}ms`);
    process.exit(1);
  }

  if (Number(devDeskLcp) !== groups.devtoolsDesktop.lcpMedianMs) {
    console.error(`❌ Mismatch in DEVTOOLS_DESKTOP_LCP_MS: report marker is ${devDeskLcp}ms but summary is ${groups.devtoolsDesktop.lcpMedianMs}ms`);
    process.exit(1);
  }

  if (Number(simDeskLcp) !== groups.simulatedDesktop.lcpMedianMs) {
    console.error(`❌ Mismatch in SIMULATED_DESKTOP_LCP_MS: report marker is ${simDeskLcp}ms but summary is ${groups.simulatedDesktop.lcpMedianMs}ms`);
    process.exit(1);
  }

  if (Number(simMobScore) !== groups.simulatedMobile.performanceMedian) {
    console.error(`❌ Mismatch in SIMULATED_MOBILE_PERF_SCORE: report marker is ${simMobScore} but summary is ${groups.simulatedMobile.performanceMedian}`);
    process.exit(1);
  }

  if (Number(devMobScore) !== groups.devtoolsMobile.performanceMedian) {
    console.error(`❌ Mismatch in DEVTOOLS_MOBILE_PERF_SCORE: report marker is ${devMobScore} but summary is ${groups.devtoolsMobile.performanceMedian}`);
    process.exit(1);
  }

  if (Number(clsVal) !== groups.devtoolsMobile.clsMedian) {
    console.error(`❌ Mismatch in CLS: report marker is ${clsVal} but summary is ${groups.devtoolsMobile.clsMedian}`);
    process.exit(1);
  }

  if (verdict !== 'CONDITIONALLY READY') {
    console.error(`❌ Invalid release verdict marker: "${verdict}". Expected "CONDITIONALLY READY".`);
    process.exit(1);
  }

  console.log('✅ Cross-check between PERFORMANCE_QA_REPORT.md and .qa/performance-summary.json passed (Schema v2 verified).');

  console.log('✅ PERFORMANCE_QA_REPORT.md validation passed successfully.');
}

validatePerformanceReport();
