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
  if (!fs.existsSync(reportPath)) {
    console.error(`❌ Performance QA Report missing at: ${reportPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(reportPath, 'utf8');

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

  // Check 5: Cross-check report against .qa/performance-summary.json
  const summaryPath = path.resolve('.qa/performance-summary.json');
  if (fs.existsSync(summaryPath)) {
    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    const groups = summary.groups || {};

    const extractPerfMarker = (key: string): string | null => {
      const match = content.match(new RegExp(`<!--\\s*PERF:${key}=([^\n>]+)\\s*-->`));
      return match ? match[1].trim() : null;
    };

    const simMobLcp = extractPerfMarker('SIMULATED_MOBILE_LCP_MS');
    const devMobLcp = extractPerfMarker('DEVTOOLS_MOBILE_LCP_MS');
    const devDeskLcp = extractPerfMarker('DEVTOOLS_DESKTOP_LCP_MS');
    const simMobScore = extractPerfMarker('SIMULATED_MOBILE_PERF_SCORE');
    const devMobScore = extractPerfMarker('DEVTOOLS_MOBILE_PERF_SCORE');
    const clsVal = extractPerfMarker('CLS');
    const verdict = extractPerfMarker('RELEASE_VERDICT');

    if (simMobLcp && Number(simMobLcp) !== groups.simulatedMobile?.lcpMedianMs) {
      console.error(`❌ Mismatch in SIMULATED_MOBILE_LCP_MS: report marker is ${simMobLcp}ms but summary is ${groups.simulatedMobile?.lcpMedianMs}ms`);
      process.exit(1);
    }

    if (devMobLcp && Number(devMobLcp) !== groups.devtoolsMobile?.lcpMedianMs) {
      console.error(`❌ Mismatch in DEVTOOLS_MOBILE_LCP_MS: report marker is ${devMobLcp}ms but summary is ${groups.devtoolsMobile?.lcpMedianMs}ms`);
      process.exit(1);
    }

    if (devDeskLcp && Number(devDeskLcp) !== groups.devtoolsDesktop?.lcpMedianMs) {
      console.error(`❌ Mismatch in DEVTOOLS_DESKTOP_LCP_MS: report marker is ${devDeskLcp}ms but summary is ${groups.devtoolsDesktop?.lcpMedianMs}ms`);
      process.exit(1);
    }

    if (simMobScore && Number(simMobScore) !== groups.simulatedMobile?.performanceMedian) {
      console.error(`❌ Mismatch in SIMULATED_MOBILE_PERF_SCORE: report marker is ${simMobScore} but summary is ${groups.simulatedMobile?.performanceMedian}`);
      process.exit(1);
    }

    if (devMobScore && Number(devMobScore) !== groups.devtoolsMobile?.performanceMedian) {
      console.error(`❌ Mismatch in DEVTOOLS_MOBILE_PERF_SCORE: report marker is ${devMobScore} but summary is ${groups.devtoolsMobile?.performanceMedian}`);
      process.exit(1);
    }

    if (clsVal && Number(clsVal) !== groups.devtoolsMobile?.clsMedian) {
      console.error(`❌ Mismatch in CLS: report marker is ${clsVal} but summary is ${groups.devtoolsMobile?.clsMedian}`);
      process.exit(1);
    }

    if (verdict !== 'CONDITIONALLY READY') {
      console.error(`❌ Invalid release verdict marker: "${verdict}". Expected "CONDITIONALLY READY".`);
      process.exit(1);
    }

    console.log('✅ Cross-check between PERFORMANCE_QA_REPORT.md and .qa/performance-summary.json passed.');
  }

  console.log('✅ PERFORMANCE_QA_REPORT.md validation passed successfully.');
}

validatePerformanceReport();
