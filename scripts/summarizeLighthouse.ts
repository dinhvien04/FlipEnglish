import fs from 'fs';
import path from 'path';

interface LcpElementInfo {
  tag?: string;
  selector?: string;
  snippet?: string;
  url?: string;
  nodeLabel?: string;
  type?: 'TEXT' | 'IMAGE' | 'OTHER';
}

interface LcpBreakdown {
  ttfb?: number;
  loadDelay?: number;
  loadDuration?: number;
  renderDelay?: number;
  lcpValue?: number;
}

export interface LighthouseSummary {
  file: string;
  formFactor?: string;
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
  lcpElement?: LcpElementInfo;
  lcpBreakdown?: LcpBreakdown;
  availableLcpAudits: string[];
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
      };
    }
  }

  // Fallback: derive from server response time and LCP timing if subparts not direct
  if (!lcpBreakdown && lcpAudit.numericValue) {
    const srtAudit = audits['server-response-time'] || {};
    const ttfb = srtAudit.numericValue;
    lcpBreakdown = {
      ttfb: ttfb ? Math.round(ttfb) : undefined,
      lcpValue: Math.round(lcpAudit.numericValue),
    };
  }

  return {
    file: path.basename(filePath),
    formFactor: configSettings.formFactor,
    performance: Math.round((cats.performance?.score || 0) * 100),
    accessibility: Math.round((cats.accessibility?.score || 0) * 100),
    bestPractices: Math.round((cats['best-practices']?.score || 0) * 100),
    seo: Math.round((cats.seo?.score || 0) * 100),
    fcp: audits['first-contentful-paint']?.displayValue,
    lcp: audits['largest-contentful-paint']?.displayValue,
    tbt: audits['total-blocking-time']?.displayValue,
    cls: audits['cumulative-layout-shift']?.displayValue,
    speedIndex: audits['speed-index']?.displayValue,
    lcpNumeric: lcpAudit.numericValue ? Math.round(lcpAudit.numericValue) : undefined,
    fcpNumeric: audits['first-contentful-paint']?.numericValue
      ? Math.round(audits['first-contentful-paint'].numericValue)
      : undefined,
    tbtNumeric: audits['total-blocking-time']?.numericValue
      ? Math.round(audits['total-blocking-time'].numericValue)
      : undefined,
    clsNumeric: audits['cumulative-layout-shift']?.numericValue !== undefined
      ? Number(audits['cumulative-layout-shift'].numericValue.toFixed(3))
      : undefined,
    lcpElement,
    lcpBreakdown,
    availableLcpAudits,
  };
}

if (process.argv.length > 2) {
  const files = process.argv.slice(2);
  const results = files.map(parseLighthouseJson);
  console.log(JSON.stringify(results, null, 2));
}
