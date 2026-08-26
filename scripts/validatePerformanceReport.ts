import fs from 'fs';
import path from 'path';

/**
 * Validates docs/PERFORMANCE_QA_REPORT.md for:
 * 1. Absence of misleading "hydration" terminology (outside of literal vocabulary words like "hydrate")
 * 2. Proper distinction between Lantern modeled and DevTools applied throttling
 * 3. Accurate CSR client-side initial mount descriptions (createRoot into empty div#root)
 * 4. Pre-FCP trace timing forensics (JS network download vs CPU script eval vs layout)
 * 5. Truthful release status ("CONDITIONALLY READY" overall, "NOT YET MEETING LAB TARGET" for mobile lab LCP)
 */

function validatePerformanceReport(): void {
  const reportPath = path.resolve('docs/PERFORMANCE_QA_REPORT.md');
  if (!fs.existsSync(reportPath)) {
    console.error(`❌ Performance QA Report missing at: ${reportPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(reportPath, 'utf8');

  // Check 1: Forbidden "hydration" mentions in architecture/LCP text
  const hydrationRegex = /\bhydrat(ion|ing|ed)?\b/gi;
  const hydrationMatches: string[] = [];
  const lines = content.split('\n');
  lines.forEach((line, lineIndex) => {
    // Exclude literal vocabulary item mentions if any
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

  // Check 2: Verify presence of required structural sections
  const requiredHeadings = [
    'Executive Summary & Objective',
    'Quantitative Performance & Bundle Accounting',
    'Phase 3.2 Empirical Measurement Matrix',
    'Trace-Based Pre-FCP Timeline & CSR Startup Forensics',
    'Lantern Simulation vs. DevTools Applied Throttling Analysis',
    'Root-Cause Attribution & Render Delay Accounting',
    'Release Recommendation & Truthful Verdict',
  ];

  for (const heading of requiredHeadings) {
    if (!content.includes(heading)) {
      console.error(`❌ Missing required section in PERFORMANCE_QA_REPORT.md: "${heading}"`);
      process.exit(1);
    }
  }

  // Check 3: Verify required status terms
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

  console.log('✅ PERFORMANCE_QA_REPORT.md validation passed successfully.');
}

validatePerformanceReport();
