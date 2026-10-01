#!/usr/bin/env node
/**
 * Jev Error Monitor Audit Script
 * Audits key routes using Jev's System-1 model (jev-1) for fast, structured error classification.
 * Falls back to heuristic checks if TYPESAFE_API_KEY is not set.
 */

import { TypeSafeClient, noul, choice, score } from '@typesafe-ai/sdk';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_KEY = process.env.TYPESAFE_API_KEY;
const MODEL = process.env.TYPESAFE_DEFAULT_MODEL || 'jev-latest';

// Routes to audit
const ROUTES = [
  { path: '/', name: 'Homepage' },
  { path: '/categories', name: 'Categories' },
  { path: '/products', name: 'Products' },
  { path: '/contact', name: 'Contact' },
  { path: '/sitemap.xml', name: 'Sitemap' },
  { path: '/robots.txt', name: 'Robots.txt' },
];

// Heuristic fallback checks
async function heuristicAudit(url) {
  const errors = [];
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    if (!res.ok) {
      errors.push({
        type: 'http_error',
        severity: res.status >= 500 ? 'critical' : 'warning',
        message: `HTTP ${res.status} ${res.statusText}`,
        url,
        is_operational: res.status < 500,
        should_alert: res.status >= 500,
      });
    }
    const contentType = res.headers.get('content-type') || '';
    if (url.endsWith('.xml') && !contentType.includes('xml')) {
      errors.push({
        type: 'content_type_mismatch',
        severity: 'warning',
        message: `Expected XML content-type, got ${contentType}`,
        url,
        is_operational: true,
        should_alert: false,
      });
    }
    if (url.endsWith('.txt') && !contentType.includes('text')) {
      errors.push({
        type: 'content_type_mismatch',
        severity: 'info',
        message: `Expected text content-type, got ${contentType}`,
        url,
        is_operational: true,
        should_alert: false,
      });
    }
  } catch (e) {
    errors.push({
      type: 'network_error',
      severity: 'critical',
      message: `Network error: ${e.message}`,
      url,
      is_operational: false,
      should_alert: true,
    });
  }
  return errors;
}

// Jev-powered audit using SystemOne
async function jevAudit(client, url) {
  try {
    // Fetch the page content first
    const res = await fetch(url, { redirect: 'follow' });
    const html = await res.text();
    
    const result = await client.systemOne({
      model: MODEL,
      state: `Page URL: ${url}\n\nHTML Content:\n${html.slice(0, 50000)}`,
      questions: {
        has_critical_errors: noul('Does this page have any CRITICAL errors that break core functionality (JS errors preventing interaction, 5xx server errors, complete page failure)? Answer YES only for site-breaking issues.'),
        has_security_vulns: noul('Does this page have EXPOSED secrets, API keys, credentials, or ACTIVE security vulnerabilities (not just missing headers)? Answer YES only for confirmed exploits or exposed secrets.'),
        error_categories: choice('What categories of NON-CRITICAL issues are present?', {
          accessibility: 'WCAG violations, missing alt text, contrast issues',
          performance: 'Slow loading, large bundles, unoptimized assets',
          seo: 'Missing meta tags, duplicate content, crawl issues',
          best_practices: 'Modern web standards violations',
          none: 'No significant issues detected',
        }),
      },
    });

    const errors = [];
    const { has_critical_errors, has_security_vulns, error_categories } = result.answers;

    // Only flag if HIGH confidence (>0.8) for critical issues
    if (has_critical_errors.noul > 0.8) {
      errors.push({
        type: 'critical_functionality',
        severity: 'critical',
        message: `Jev detected critical functionality error (confidence: ${(has_critical_errors.noul * 100).toFixed(0)}%)`,
        url,
        is_operational: false,
        should_alert: true,
        confidence: has_critical_errors.noul,
      });
    }

    if (has_security_vulns.noul > 0.8) {
      errors.push({
        type: 'security_vulnerability',
        severity: 'critical',
        message: `Jev detected security vulnerability (confidence: ${(has_security_vulns.noul * 100).toFixed(0)}%)`,
        url,
        is_operational: false,
        should_alert: true,
        confidence: has_security_vulns.noul,
      });
    }

    // Non-critical categories
    if (error_categories.choice !== 'none' && error_categories.confidence > 0.7) {
      const severityMap = {
        accessibility: 'warning',
        performance: 'warning',
        seo: 'info',
        best_practices: 'info',
      };
      errors.push({
        type: error_categories.choice,
        severity: severityMap[error_categories.choice] || 'info',
        message: `Jev detected ${error_categories.choice} issues (confidence: ${(error_categories.confidence * 100).toFixed(0)}%)`,
        url,
        is_operational: true,
        should_alert: false,
        confidence: error_categories.confidence,
      });
    }

    return errors;
  } catch (e) {
    console.error(`Jev audit failed for ${url}:`, e.message);
    // Fall back to heuristic
    return heuristicAudit(url);
  }
}

async function main() {
  console.log(`🔍 Jev Error Monitor Audit`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Model: ${MODEL}`);
  console.log(`API Key: ${API_KEY ? 'SET' : 'NOT SET (using heuristic fallback)'}`);
  console.log('');

  const client = API_KEY ? new TypeSafeClient({ apiKey: API_KEY }) : null;
  let totalErrors = 0;
  let criticalErrors = 0;
  const allResults = [];

  for (const route of ROUTES) {
    const url = `${BASE_URL}${route.path}`;
    console.log(`\n📋 Auditing: ${route.name} (${url})`);

    let errors = [];
    if (client) {
      errors = await jevAudit(client, url);
    } else {
      errors = await heuristicAudit(url);
    }

    if (errors.length === 0) {
      console.log(`  ✅ PASS - No errors detected`);
    } else {
      for (const err of errors) {
        const icon = err.severity === 'critical' ? '🔴' : err.severity === 'warning' ? '🟡' : '🔵';
        console.log(`  ${icon} [${err.severity.toUpperCase()}] ${err.type}: ${err.message}`);
        if (err.severity === 'critical') criticalErrors++;
        totalErrors++;
      }
    }

    allResults.push({ route: route.name, url, errors });
  }

  console.log('\n' + '='.repeat(60));
  console.log(`SUMMARY: ${totalErrors} total errors (${criticalErrors} critical)`);
  console.log('='.repeat(60));

  // Exit with error code if critical errors found
  process.exit(criticalErrors > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});