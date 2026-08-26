import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

export interface LcpElementInfo {
  tag?: string;
  selector?: string;
  snippet?: string;
  url?: string;
  nodeLabel?: string;
  type?: 'TEXT' | 'IMAGE' | 'OTHER';
}

export interface LcpBreakdown {
  ttfb?: number;
  loadDelay?: number;
  loadDuration?: number;
  renderDelay?: number;
  lcpValue?: number;
  sourceAudit?: string;
}

export interface NetworkThrottlingMetadata {
  rttMs?: number;
  throughputKbps?: number;
  requestLatencyMs?: number;
  downloadThroughputKbps?: number;
  uploadThroughputKbps?: number;
}

export interface LighthouseSummary {
  file: string;
  formFactor?: string;
  throttlingMethod?: string;
  cpuSlowdownMultiplier?: number;
  network?: NetworkThrottlingMetadata;
  metricCategory: 'Modeled (Simulated / Lantern)' | 'Observed (DevTools Applied)' | 'Observed (Provided / No Lighthouse Throttling)';
  userAgent?: string;
  lighthouseVersion?: string;
  benchmarkIndex?: number | null;
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  fcp: string | undefined;
  lcp: string | undefined;
  tbt: string | undefined;
  cls: string | undefined;
  speedIndex: string | undefined;
  lcpNumeric?: number;
  fcpNumeric?: number;
  tbtNumeric?: number;
  clsNumeric?: number;
  speedIndexNumeric?: number;
  lcpElement?: LcpElementInfo;
  lcpBreakdown?: LcpBreakdown;
  availableLcpAudits: string[];
}

export interface GroupBenchmarkSummary {
  runs: number;
  performanceMedian: number;
  fcpMedianMs: number;
  lcpMedianMs: number;
  tbtMedianMs: number;
  clsMedian: number;
  speedIndexMedianMs: number;
  benchmarkIndexMedian: number | null;
  files: string[];
}

export interface AggregateBenchmarkReport {
  schemaVersion: 2;
  benchmarkSource: {
    commit: string;
    commitSource: string;
    artifactSet: string;
  };
  summaryGenerator: {
    commit: string;
    nodeVersion: string;
  };
  environment: {
    chromeVersions: string[];
    lighthouseVersions: string[];
  };
  groups: {
    simulatedMobile: GroupBenchmarkSummary;
    devtoolsMobile: GroupBenchmarkSummary;
    simulatedDesktop: GroupBenchmarkSummary;
    devtoolsDesktop: GroupBenchmarkSummary;
    providedMobile: GroupBenchmarkSummary;
  };
}

function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function parseLighthouseJson(filePath: string): LighthouseSummary {
  const fullPath = path.resolve(filePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`File not found: ${fullPath}`);
  }

  const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  const cats = data.categories || {};
  const audits = data.audits || {};
  const configSettings = data.configSettings || {};
  const throttling = configSettings.throttling || {};
  const throttlingMethod = configSettings.throttlingMethod || 'simulate';
  const environment = data.environment || {};

  const metricCategory =
    throttlingMethod === 'simulate'
      ? 'Modeled (Simulated / Lantern)'
      : throttlingMethod === 'devtools'
      ? 'Observed (DevTools Applied)'
      : 'Observed (Provided / No Lighthouse Throttling)';

  // Structured network metadata based on throttling mode
  const network: NetworkThrottlingMetadata = {};
  if (throttlingMethod === 'simulate') {
    if (typeof throttling.rttMs === 'number') network.rttMs = throttling.rttMs;
    if (typeof throttling.throughputKbps === 'number') network.throughputKbps = throttling.throughputKbps;
  } else if (throttlingMethod === 'devtools') {
    if (typeof throttling.requestLatencyMs === 'number') network.requestLatencyMs = throttling.requestLatencyMs;
    if (typeof throttling.downloadThroughputKbps === 'number') network.downloadThroughputKbps = throttling.downloadThroughputKbps;
    if (typeof throttling.uploadThroughputKbps === 'number') network.uploadThroughputKbps = throttling.uploadThroughputKbps;
    if (typeof throttling.rttMs === 'number') network.rttMs = throttling.rttMs;
    if (typeof throttling.throughputKbps === 'number') network.throughputKbps = throttling.throughputKbps;
  } else {
    // Provided / no throttling
    if (typeof throttling.rttMs === 'number') network.rttMs = throttling.rttMs;
    if (typeof throttling.throughputKbps === 'number') network.throughputKbps = throttling.throughputKbps;
    if (typeof throttling.requestLatencyMs === 'number') network.requestLatencyMs = throttling.requestLatencyMs;
    if (typeof throttling.downloadThroughputKbps === 'number') network.downloadThroughputKbps = throttling.downloadThroughputKbps;
    if (typeof throttling.uploadThroughputKbps === 'number') network.uploadThroughputKbps = throttling.uploadThroughputKbps;
  }

  const availableLcpAudits = Object.keys(audits).filter(
    (k) => k.toLowerCase().includes('lcp') || k.toLowerCase().includes('largest-contentful')
  );

  // Extract LCP element details
  let lcpElement: LcpElementInfo | undefined;
  const lcpElemAudit =
    audits['largest-contentful-paint-element'] ||
    audits['lcp-element'] ||
    audits['largest-contentful-paint-element-insight'];

  if (lcpElemAudit && lcpElemAudit.details) {
    let nodeObj: any = undefined;
    let url: string | undefined = undefined;

    if (Array.isArray(lcpElemAudit.details.items)) {
      for (const item of lcpElemAudit.details.items) {
        if (item.node) {
          nodeObj = item.node;
          url = item.url || item.node?.url;
          break;
        }
        if (Array.isArray(item.items)) {
          for (const subItem of item.items) {
            if (subItem.node) {
              nodeObj = subItem.node;
              url = subItem.url || subItem.node?.url;
              break;
            }
          }
        }
        if (nodeObj) break;
      }
    }

    if (nodeObj) {
      const snippet = nodeObj.snippet || '';
      const selector = nodeObj.selector || '';
      const nodeLabel = nodeObj.nodeLabel || '';
      const isImage = Boolean(url) || snippet.toLowerCase().includes('<img') || snippet.toLowerCase().includes('background-image');

      lcpElement = {
        tag: nodeObj.nodeName || (snippet.match(/^<([a-zA-Z0-9]+)/) || [])[1] || 'UNKNOWN',
        selector,
        snippet,
        url,
        nodeLabel,
        type: isImage ? 'IMAGE' : snippet ? 'TEXT' : 'OTHER',
      };
    }
  }

  // Extract LCP Breakdown subparts if exposed
  let lcpBreakdown: LcpBreakdown | undefined;
  const lcpAudit = audits['largest-contentful-paint'] || {};

  if (lcpElemAudit && lcpElemAudit.details && Array.isArray(lcpElemAudit.details.items)) {
    for (const item of lcpElemAudit.details.items) {
      if (item.headings && Array.isArray(item.items)) {
        const phases: Record<string, number> = {};
        for (const phaseItem of item.items) {
          if (phaseItem.phase && typeof phaseItem.timing === 'number') {
            phases[phaseItem.phase.toLowerCase()] = phaseItem.timing;
          }
        }
        if (Object.keys(phases).length > 0) {
          lcpBreakdown = {
            ttfb: phases['ttfb'],
            loadDelay: phases['load delay'] ?? phases['loaddelay'],
            loadDuration: phases['load time'] ?? phases['loadduration'] ?? phases['load duration'],
            renderDelay: phases['render delay'] ?? phases['renderdelay'],
            lcpValue: lcpAudit.numericValue ? Math.round(lcpAudit.numericValue) : undefined,
            sourceAudit: 'largest-contentful-paint-element',
          };
          break;
        }
      }
    }
  }

  const lcpBreakdownAudit =
    audits['lcp-breakdown-insight'] ||
    audits['lcp-breakdown'] ||
    audits['largest-contentful-paint-breakdown'] ||
    audits['lcp-discovery-insight'];

  if (!lcpBreakdown && lcpBreakdownAudit && lcpBreakdownAudit.details) {
    const items = lcpBreakdownAudit.details.items || [];
    if (items.length > 0) {
      const b = items[0];
      lcpBreakdown = {
        ttfb: b.ttfb,
        loadDelay: b.loadDelay,
        loadDuration: b.loadDuration,
        renderDelay: b.renderDelay,
        lcpValue: lcpAudit.numericValue ? Math.round(lcpAudit.numericValue) : undefined,
        sourceAudit: 'lcp-breakdown-insight',
      };
    }
  }

  if (!lcpBreakdown && lcpAudit.numericValue) {
    const srtAudit = audits['server-response-time'] || {};
    const ttfb = srtAudit.numericValue;
    const isTextLcp = lcpElement && lcpElement.type === 'TEXT';
    lcpBreakdown = {
      ttfb: ttfb !== undefined ? Math.round(ttfb) : undefined,
      loadDelay: isTextLcp ? 0 : undefined,
      loadDuration: isTextLcp ? 0 : undefined,
      renderDelay:
        ttfb !== undefined && isTextLcp
          ? Math.round(lcpAudit.numericValue - ttfb)
          : undefined,
      lcpValue: Math.round(lcpAudit.numericValue),
      sourceAudit: 'server-response-time + largest-contentful-paint',
    };
  }

  return {
    file: path.basename(filePath),
    formFactor: configSettings.formFactor,
    throttlingMethod,
    cpuSlowdownMultiplier: throttling.cpuSlowdownMultiplier ?? configSettings.cpuSlowdownMultiplier,
    network,
    metricCategory,
    userAgent: data.userAgent,
    lighthouseVersion: data.lighthouseVersion,
    benchmarkIndex: typeof environment.benchmarkIndex === 'number' ? environment.benchmarkIndex : null,
    performance: Math.round((cats.performance?.score || 0) * 100),
    accessibility: Math.round((cats.accessibility?.score || 0) * 100),
    bestPractices: Math.round((cats['best-practices']?.score || 0) * 100),
    seo: Math.round((cats.seo?.score || 0) * 100),
    fcp: audits['first-contentful-paint']?.displayValue,
    lcp: audits['largest-contentful-paint']?.displayValue,
    tbt: audits['total-blocking-time']?.displayValue,
    cls: audits['cumulative-layout-shift']?.displayValue,
    speedIndex: audits['speed-index']?.displayValue,
    lcpNumeric: typeof lcpAudit.numericValue === 'number' ? Math.round(lcpAudit.numericValue) : undefined,
    fcpNumeric: typeof audits['first-contentful-paint']?.numericValue === 'number'
      ? Math.round(audits['first-contentful-paint'].numericValue)
      : undefined,
    tbtNumeric: typeof audits['total-blocking-time']?.numericValue === 'number'
      ? Math.round(audits['total-blocking-time'].numericValue)
      : undefined,
    clsNumeric: typeof audits['cumulative-layout-shift']?.numericValue === 'number'
      ? Number(audits['cumulative-layout-shift'].numericValue.toFixed(3))
      : undefined,
    speedIndexNumeric: typeof audits['speed-index']?.numericValue === 'number'
      ? Math.round(audits['speed-index'].numericValue)
      : undefined,
    lcpElement,
    lcpBreakdown,
    availableLcpAudits,
  };
}

function requireNumericMetric(
  items: LighthouseSummary[],
  getter: (item: LighthouseSummary) => number | undefined,
  metricName: string
): number[] {
  return items.map((item) => {
    const value = getter(item);
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error(`Missing or invalid ${metricName} in Lighthouse artifact: ${item.file}`);
    }
    return value;
  });
}

function assertGroupRunCount(groupName: string, items: LighthouseSummary[], expectedRuns: number): void {
  if (items.length !== expectedRuns) {
    throw new Error(
      `Exact run count mismatch for group "${groupName}": expected exactly ${expectedRuns} runs, but found ${items.length} files.`
    );
  }
}

export function buildGroupSummary(items: LighthouseSummary[]): GroupBenchmarkSummary {
  const perfScores = requireNumericMetric(items, (i) => i.performance, 'performance');
  const fcpScores = requireNumericMetric(items, (i) => i.fcpNumeric, 'fcpNumeric');
  const lcpScores = requireNumericMetric(items, (i) => i.lcpNumeric, 'lcpNumeric');
  const tbtScores = requireNumericMetric(items, (i) => i.tbtNumeric, 'tbtNumeric');
  const clsScores = requireNumericMetric(items, (i) => i.clsNumeric, 'clsNumeric');
  const speedIndexScores = requireNumericMetric(items, (i) => i.speedIndexNumeric, 'speedIndexNumeric');

  const benchmarkIndices = items
    .map((i) => i.benchmarkIndex)
    .filter((b): b is number => typeof b === 'number');

  return {
    runs: items.length,
    performanceMedian: Math.round(computeMedian(perfScores)),
    fcpMedianMs: Math.round(computeMedian(fcpScores)),
    lcpMedianMs: Math.round(computeMedian(lcpScores)),
    tbtMedianMs: Math.round(computeMedian(tbtScores)),
    clsMedian: Number(computeMedian(clsScores).toFixed(3)),
    speedIndexMedianMs: Math.round(computeMedian(speedIndexScores)),
    benchmarkIndexMedian: benchmarkIndices.length > 0 ? Number(computeMedian(benchmarkIndices).toFixed(1)) : null,
    files: items.map((i) => i.file),
  };
}

export function generateBenchmarkSummaryJson(): AggregateBenchmarkReport {
  const qaDir = path.resolve('.qa/lighthouse');
  if (!fs.existsSync(qaDir)) {
    throw new Error(`Directory not found: ${qaDir}`);
  }

  const allFiles = fs.readdirSync(qaDir).filter((f) => f.startsWith('phase32-') && f.endsWith('.json'));
  if (allFiles.length !== 15) {
    throw new Error(`Expected exactly 15 phase32 Lighthouse artifact files in ${qaDir}, but found ${allFiles.length}.`);
  }

  const parsed = allFiles.map((f) => parseLighthouseJson(path.join(qaDir, f)));

  const simMobile = parsed.filter((p) => p.file.startsWith('phase32-sim-mobile-'));
  const devMobile = parsed.filter((p) => p.file.startsWith('phase32-dev-mobile-'));
  const simDesktop = parsed.filter((p) => p.file.startsWith('phase32-sim-desktop-'));
  const devDesktop = parsed.filter((p) => p.file.startsWith('phase32-dev-desktop-'));
  const provMobile = parsed.filter((p) => p.file.startsWith('phase32-prov-mobile-'));

  assertGroupRunCount('simulatedMobile', simMobile, 3);
  assertGroupRunCount('devtoolsMobile', devMobile, 3);
  assertGroupRunCount('simulatedDesktop', simDesktop, 3);
  assertGroupRunCount('devtoolsDesktop', devDesktop, 3);
  assertGroupRunCount('providedMobile', provMobile, 3);

  // Provenance metadata (Task 7, 8, 9)
  const BENCHMARK_SOURCE_COMMIT = '5ed98958cefc4d24fd9b25e03e6556e91f5152ce';
  const generatorCommit = (() => {
    try {
      return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    } catch {
      return 'UNKNOWN';
    }
  })();

  const chromeVersionsSet = new Set<string>();
  const lighthouseVersionsSet = new Set<string>();

  for (const item of parsed) {
    const cMatch = (item.userAgent || '').match(/Chrome\/([0-9.]+)/);
    if (cMatch && cMatch[1]) {
      chromeVersionsSet.add(cMatch[1]);
    } else {
      throw new Error(`Cannot extract valid Chrome version from userAgent in artifact: ${item.file}`);
    }

    if (item.lighthouseVersion) {
      lighthouseVersionsSet.add(item.lighthouseVersion);
    } else {
      throw new Error(`Missing lighthouseVersion in artifact: ${item.file}`);
    }
  }

  const chromeVersions = Array.from(chromeVersionsSet);
  const lighthouseVersions = Array.from(lighthouseVersionsSet);

  const report: AggregateBenchmarkReport = {
    schemaVersion: 2,
    benchmarkSource: {
      commit: BENCHMARK_SOURCE_COMMIT,
      commitSource: 'retained Phase 3.2 benchmark metadata',
      artifactSet: 'phase32',
    },
    summaryGenerator: {
      commit: generatorCommit,
      nodeVersion: process.version,
    },
    environment: {
      chromeVersions,
      lighthouseVersions,
    },
    groups: {
      simulatedMobile: buildGroupSummary(simMobile),
      devtoolsMobile: buildGroupSummary(devMobile),
      simulatedDesktop: buildGroupSummary(simDesktop),
      devtoolsDesktop: buildGroupSummary(devDesktop),
      providedMobile: buildGroupSummary(provMobile),
    },
  };

  const outputPath = path.resolve('.qa/performance-summary.json');
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`✅ Machine-readable benchmark summary written to: ${outputPath}`);
  return report;
}

if (process.argv.includes('--generate-summary') || process.argv.includes('-s')) {
  generateBenchmarkSummaryJson();
} else if (process.argv.length > 2) {
  const files = process.argv.slice(2);
  const results = files.map(parseLighthouseJson);
  console.log(JSON.stringify(results, null, 2));
} else {
  generateBenchmarkSummaryJson();
}
