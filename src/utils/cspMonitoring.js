/**
 * CSP Violation Monitor for Development
 * 
 * Add this to your application to monitor and log CSP violations
 * during development and testing.
 * 
 * Usage: Import in src/main.jsx or create a development effect hook
 */

/**
 * Initialize CSP violation monitoring
 * Logs violations to console and optionally to a remote endpoint
 */
export function initCSPMonitoring(options = {}) {
  const {
    enabled = import.meta.env.DEV,
    verbose = true,
    reportEndpoint = null,
    customHandler = null
  } = options;

  if (!enabled) return;

  // Listen for CSP violations
  document.addEventListener('securitypolicyviolation', (event) => {
    const violation = {
      blockedURI: event.blockedURI || 'none',
      violatedDirective: event.violatedDirective || 'unknown',
      originalPolicy: event.originalPolicy || 'unknown',
      sourceFile: event.sourceFile || 'unknown',
      lineNumber: event.lineNumber || 0,
      columnNumber: event.columnNumber || 0,
      statusCode: event.statusCode || 0,
      timestamp: new Date().toISOString(),
      referrer: document.referrer,
      url: window.location.href
    };

    // Log to console
    if (verbose) {
      console.group('🚨 CSP Violation Detected');
      console.warn('Blocked URI:', violation.blockedURI);
      console.warn('Violated Directive:', violation.violatedDirective);
      console.warn('Source:', `${violation.sourceFile}:${violation.lineNumber}`);
      console.warn('Full Details:', violation);
      console.groupEnd();
    }

    // Custom handler
    if (customHandler && typeof customHandler === 'function') {
      customHandler(violation);
    }

    // Send to remote endpoint
    if (reportEndpoint) {
      fetch(reportEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(violation),
        keepalive: true
      }).catch(err => {
        console.error('Failed to report CSP violation:', err);
      });
    }
  });

  console.log('✅ CSP Violation Monitor Initialized');
}

/**
 * Test CSP Configuration
 * Returns array of potential CSP issues
 */
export function testCSPConfiguration() {
  const issues = [];
  const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  
  if (!meta) {
    console.info('ℹ️  CSP is configured via HTTP headers (recommended)');
  } else {
    const csp = meta.getAttribute('content');
    
    // Check for unsafe directives
    if (csp.includes('unsafe-inline')) {
      issues.push({
        severity: 'HIGH',
        directive: 'unsafe-inline',
        message: 'unsafe-inline allows all inline scripts and styles',
        recommendation: 'Remove unsafe-inline and use nonces or hashes'
      });
    }

    if (csp.includes('unsafe-eval')) {
      issues.push({
        severity: 'CRITICAL',
        directive: 'unsafe-eval',
        message: 'unsafe-eval allows dynamic code execution in browsers',
        recommendation: 'Remove unsafe-eval - it defeats CSP protection'
      });
    }

    // Check for overly permissive directives while avoiding false positives for explicit host allowlists
    ['script-src', 'style-src', 'img-src', 'font-src'].forEach(dir => {
      const pattern = new RegExp(`${dir}[^;]*\\*`);
      if (pattern.test(csp)) {
        issues.push({
          severity: 'HIGH',
          directive: dir,
          message: `${dir} contains overly permissive wildcard patterns`,
          recommendation: 'Specify explicit domains instead of wildcards'
        });
      }
    });
  }

  return issues;
}

/**
 * CSP Configuration Validator
 * Checks common CSP misconfigurations
 */
export function validateCSP() {
  const config = {
    hasDefaultSrc: true, // Should have default-src
    hasFrameAncestors: true, // Should restrict frame-ancestors
    hasObjectSrc: true, // Should restrict object-src
    noUnsafeDirectives: true, // Should not have unsafe-inline or unsafe-eval
    explicitDomains: true // Should specify explicit domains
  };

  const issues = testCSPConfiguration();
  
  if (issues.length > 0) {
    console.group('⚠️  CSP Configuration Issues Found');
    issues.forEach(issue => {
      console.warn(`[${issue.severity}] ${issue.directive}`);
      console.warn(`  Issue: ${issue.message}`);
      console.warn(`  Fix: ${issue.recommendation}`);
    });
    console.groupEnd();
    return false;
  }

  console.log('✅ CSP Configuration appears secure');
  return true;
}

/**
 * Debug Helper: Check loaded resources against CSP
 */
export function auditLoadedResources() {
  console.group('📊 Loaded Resources Audit');

  const resources = {
    scripts: Array.from(document.scripts).map(s => ({
      src: s.src,
      type: s.type,
      async: s.async,
      defer: s.defer,
      inline: !s.src
    })),
    stylesheets: Array.from(document.styleSheets)
      .filter(s => {
        try {
          return s.href; // Check if external
        } catch {
          return false;
        }
      })
      .map(s => ({
        href: s.href,
        media: s.media.mediaText,
        disabled: s.disabled
      })),
    links: Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(l => ({
      href: l.href,
      integrity: l.integrity || 'none',
      crossorigin: l.crossOrigin || 'none'
    }))
  };

  console.log('Scripts:', resources.scripts);
  console.log('Stylesheets:', resources.stylesheets);
  console.log('Link Elements:', resources.links);

  // Check for SRI usage
  const hasIntegrity = resources.links.some(l => l.integrity !== 'none');
  if (!hasIntegrity) {
    console.warn('⚠️  No SRI hashes found on external stylesheets');
  } else {
    console.log('✅ SRI hashes detected on external resources');
  }

  console.groupEnd();
}

export default {
  initCSPMonitoring,
  testCSPConfiguration,
  validateCSP,
  auditLoadedResources
};
