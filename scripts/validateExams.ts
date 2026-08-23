import { runExamIntegrityAudit } from '../src/utils/validateExams';

console.log('=== Running FlipEnglish Exam Integrity Audit ===');
const report = runExamIntegrityAudit();

console.log(`Total Level/Mode Test Suites: ${report.totalTests}`);
console.log(`Passed Suites: ${report.passedTests}`);

if (!report.passed) {
  console.error('\n❌ Exam Integrity Audit Failed with the following errors:');
  report.errors.forEach((err) => console.error(`  - ${err}`));
  process.exit(1);
} else {
  console.log('\n✅ All exam generation configurations and question quotas passed integrity audit.');
  process.exit(0);
}
