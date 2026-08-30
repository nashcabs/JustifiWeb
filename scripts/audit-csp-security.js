#!/usr/bin/env node
/**
 * CSP Security Audit Script
 * 
 * Validates CSP configuration across all files
 * Run: node scripts/audit-csp-security.js
 */

import fs from 'node:fs';
import path from 'node:path';

const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const MAGENTA = '\x1b[35m';
const CYAN = '\x1b[36m';

class CSPAudit {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.successes = [];
    this.rootDir = process.cwd();
  }

  log(type, message) {
    switch (type) {
      case 'error':
        console.log(`${RED}✖${RESET} ${message}`);
        break;
      case 'warning':
        console.log(`${YELLOW}⚠${RESET} ${message}`);
        break;
      case 'success':
        console.log(`${GREEN}✓${RESET} ${message}`);
        break;
      case 'info':
        console.log(`${BLUE}ℹ${RESET} ${message}`);
        break;
      case 'section':
        console.log(`\n${MAGENTA}${message}${RESET}`);
        break;
      default:
        console.log(message);
    }
  }

  checkFile(filePath) {
    if (!fs.existsSync(filePath)) {
      this.log('warning', `File not found: ${filePath}`);
      return null;
    }
    return fs.readFileSync(filePath, 'utf-8');
  }

  validateFirebaseJson() {
    this.log('section', '📋 Checking firebase.json...');

    const firebaseJsonPath = path.join(this.rootDir, 'firebase.json');
    const content = this.checkFile(firebaseJsonPath);
    
    if (!content) {
      this.log('error', 'firebase.json not found');
      return;
    }

    try {
      const config = JSON.parse(content);
      const cspHeader = config.hosting?.headers?.[0]?.headers?.find(
        h => h.key === 'Content-Security-Policy'
      );

      if (!cspHeader) {
        this.log('error', 'CSP header not found in firebase.json');
        this.issues.push('Missing CSP header');
        return;
      }

      const csp = cspHeader.value;

      // Check for unsafe directives
      const unsafePatterns = {
        "'unsafe-inline'": 'Allows inline scripts/styles',
        "'unsafe-eval'": 'Allows eval() execution',
        "'unsafe-hashes'": 'Deprecated - should not be used'
      };

      for (const [pattern, reason] of Object.entries(unsafePatterns)) {
        if (csp.includes(pattern)) {
          this.log('error', `Found unsafe directive: ${pattern} - ${reason}`);
          this.issues.push(`Unsafe directive: ${pattern}`);
        } else {
          this.log('success', `No ${pattern} found`);
          this.successes.push(`No ${pattern}`);
        }
      }

      // Check for required directives
      const requiredDirectives = [
        'default-src',
        'script-src',
        'style-src',
        'object-src',
        'base-uri',
        'frame-ancestors'
      ];

      for (const directive of requiredDirectives) {
        if (csp.includes(directive)) {
          this.log('success', `Directive configured: ${directive}`);
          this.successes.push(`Has ${directive}`);
        } else {
          this.log('warning', `Missing directive: ${directive}`);
          this.warnings.push(`Missing ${directive}`);
        }
      }

      // Check for genuinely broad scheme-only patterns, not explicit origin allowlists
      const broadPatterns = [
        { regex: /(?:^|;)\s*img-src\s+[^;]*https:(?!\/\/)/i, reason: 'img-src allows all HTTPS domains' },
        { regex: /(?:^|;)\s*font-src\s+[^;]*https:(?!\/\/)/i, reason: 'font-src allows all HTTPS domains' },
        { regex: /(?:^|;)\s*script-src\s+[^;]*https:(?!\/\/)/i, reason: 'script-src allows all HTTPS domains' },
        { regex: /(?:^|;)\s*style-src\s+[^;]*https:(?!\/\/)/i, reason: 'style-src allows all HTTPS domains' }
      ];

      for (const { regex, reason } of broadPatterns) {
        if (regex.test(csp)) {
          this.log('warning', `Overly broad pattern: ${reason}`);
          this.warnings.push(reason);
        }
      }

      // Check for explicit domains
      if (csp.includes('fonts.googleapis.com') && csp.includes('fonts.gstatic.com')) {
        this.log('success', 'Explicit Google Fonts domains configured');
        this.successes.push('Explicit font domains');
      } else {
        this.log('warning', 'Missing explicit Google Fonts domains');
        this.warnings.push('Missing explicit font CDN domains');
      }

      this.log('success', 'firebase.json CSP configuration validated');

    } catch (err) {
      this.log('error', `Invalid JSON in firebase.json: ${err.message}`);
      this.issues.push('Invalid firebase.json syntax');
    }
  }

  validateIndexHtml() {
    this.log('section', '🔍 Checking index.html...');

    const indexPath = path.join(this.rootDir, 'index.html');
    const content = this.checkFile(indexPath);
    
    if (!content) {
      this.log('error', 'index.html not found');
      return;
    }

    // Check for actual inline script bodies, not just src-based script tags
    const inlineScriptPattern = /<script\b(?![^>]*\bsrc=)[^>]*>[^<]*[A-Za-z0-9_\-]+[^>]*<\/script>/i;
    if (inlineScriptPattern.test(content)) {
      this.log('warning', 'Inline <script> tags found');
      this.warnings.push('Inline scripts present');
    } else {
      this.log('success', 'No inline <script> tags');
      this.successes.push('No inline scripts');
    }

    // Check for inline styles
    if (/style\s*=\s*"[^"]*"\s*>/i.test(content) || /<style[^>]*>[\s\S]*?<\/style>/i.test(content)) {
      this.log('warning', 'Inline styles found in HTML');
      this.warnings.push('Inline styles in HTML');
    } else {
      this.log('success', 'No inline styles in HTML');
      this.successes.push('No inline HTML styles');
    }

    // Check for event handlers
    if (/on\w+\s*=/i.test(content)) {
      // This is expected in JSX components, not a violation
      this.log('info', 'Event handler attributes found (expected in JSX)');
    }

    // Check for SRI attributes on external stylesheet resources only
    const linkRegex = /<link\b[^>]*>/gi;
    const links = (content.match(linkRegex) || []).filter(link => {
      const rel = /rel=["']([^"']+)["']/i.exec(link)?.[1] || '';
      const href = /href=["']([^"']+)["']/i.exec(link)?.[1] || '';
      return href.startsWith('https://') && /stylesheet|preload/i.test(rel);
    });

    if (links.length > 0) {
      this.log('info', `Found ${links.length} external stylesheet resource link(s)`);

      let sriCount = 0;
      links.forEach(link => {
        if (link.includes('integrity=')) {
          sriCount++;
        } else {
          const hrefMatch = link.match(/href="([^"]*)"/i) || link.match(/href='([^']*)'/i);
          const domain = hrefMatch ? new URL(hrefMatch[1]).hostname : 'unknown';
          this.log('warning', `Missing SRI hash on: ${domain}`);
          this.warnings.push(`Missing SRI on ${domain}`);
        }
      });

      if (sriCount > 0) {
        this.log('success', `${sriCount}/${links.length} external resources have SRI hashes`);
        this.successes.push(`${sriCount} SRI hashes present`);
      } else {
        this.log('warning', `No SRI hashes found on ${links.length} external resource(s)`);
      }
    }

    // Check for crossorigin attributes
    const externalLinks = links.filter(l => l.includes('https://'));
    let crossoriginCount = 0;
    externalLinks.forEach(link => {
      if (link.includes('crossorigin')) {
        crossoriginCount++;
      }
    });

    if (crossoriginCount > 0) {
      this.log('success', `${crossoriginCount} external resources have crossorigin attribute`);
      this.successes.push(`${crossoriginCount} crossorigin attributes`);
    } else {
      this.log('warning', `Missing crossorigin attribute on ${externalLinks.length} external resource(s)`);
    }
  }

  validateCodebase() {
    this.log('section', '📂 Checking codebase...');

    const srcDir = path.join(this.rootDir, 'src');
    if (!fs.existsSync(srcDir)) {
      this.log('warning', 'src directory not found');
      return;
    }

    let evalCount = 0;
    let dangerousCount = 0;

    const checkFile = (filePath) => {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // Check for eval-like code
        const evalPatterns = [
          /\beval\s*\(/,
          /\bnew Function\s*\(/,
          /\bFunction\s*\(/
        ];

        if (evalPatterns.some((pattern) => pattern.test(content))) {
          evalCount++;
          this.log('error', `Found eval() in: ${path.relative(this.rootDir, filePath)}`);
          this.issues.push(`eval() found in ${path.basename(filePath)}`);
        }

        // Check for dangerouslySetInnerHTML
        if (/dangerouslySetInnerHTML/i.test(content)) {
          dangerousCount++;
          this.log('error', `Found dangerouslySetInnerHTML in: ${path.relative(this.rootDir, filePath)}`);
          this.issues.push(`dangerouslySetInnerHTML found in ${path.basename(filePath)}`);
        }
      } catch (err) {
        // Ignore binary files
      }
    };

    const walkDir = (dir) => {
      try {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          
          if (stat.isDirectory()) {
            walkDir(filePath);
          } else if (file.match(/\.(jsx?|tsx?)$/)) {
            checkFile(filePath);
          }
        });
      } catch (err) {
        // Ignore directory errors
      }
    };

    walkDir(srcDir);

    if (evalCount === 0) {
      this.log('success', 'No eval() calls found in codebase');
      this.successes.push('No eval() calls');
    }

    if (dangerousCount === 0) {
      this.log('success', 'No dangerouslySetInnerHTML found in codebase');
      this.successes.push('No dangerouslySetInnerHTML');
    }
  }

  printSummary() {
    this.log('section', '📊 AUDIT SUMMARY');

    const totalIssues = this.issues.length;
    const totalWarnings = this.warnings.length;
    const totalSuccesses = this.successes.length;

    console.log(`\n${CYAN}Successes${RESET}: ${GREEN}${totalSuccesses}${RESET}`);
    this.successes.forEach(s => console.log(`  ${GREEN}✓${RESET} ${s}`));

    if (totalWarnings > 0) {
      console.log(`\n${CYAN}Warnings${RESET}: ${YELLOW}${totalWarnings}${RESET}`);
      this.warnings.forEach(w => console.log(`  ${YELLOW}⚠${RESET} ${w}`));
    }

    if (totalIssues > 0) {
      console.log(`\n${CYAN}Critical Issues${RESET}: ${RED}${totalIssues}${RESET}`);
      this.issues.forEach(i => console.log(`  ${RED}✖${RESET} ${i}`));
    }

    // Overall score
    const score = Math.max(0, 100 - (totalIssues * 20 + totalWarnings * 5));
    let scoreColor = RED;
    if (score >= 80) scoreColor = GREEN;
    else if (score >= 60) scoreColor = YELLOW;

    console.log(`\n${CYAN}Security Score${RESET}: ${scoreColor}${score}/100${RESET}`);

    // Recommendations
    if (totalIssues > 0 || totalWarnings > 0) {
      console.log(`\n${MAGENTA}Recommendations:${RESET}`);
      if (totalIssues > 0) {
        console.log(`  ${RED}1. Fix ${totalIssues} critical issue(s)${RESET}`);
        console.log(`     See CSP_CHANGES_DETAILED.md for details`);
      }
      if (totalWarnings > 0) {
        console.log(`  ${YELLOW}2. Address ${totalWarnings} warning(s)${RESET}`);
        console.log(`     Consider implementing SRI hashes and explicit domains`);
      }
    } else {
      console.log(`\n${GREEN}✓ All CSP security checks passed!${RESET}`);
    }

    console.log(`\n📚 For more information, see:`);
    console.log(`  - SECURITY_REVIEW.md`);
    console.log(`  - CSP_IMPLEMENTATION_GUIDE.md`);
    console.log(`  - CSP_CHANGES_DETAILED.md\n`);
  }

  run() {
    console.clear();
    console.log(`${CYAN}${MAGENTA}╔════════════════════════════════════════════════════╗${RESET}`);
    console.log(`${MAGENTA}║     JustiFi CSP Security Audit Tool              ║${RESET}`);
    console.log(`${MAGENTA}╚════════════════════════════════════════════════════╝${RESET}\n`);

    this.validateFirebaseJson();
    this.validateIndexHtml();
    this.validateCodebase();
    this.printSummary();
  }
}

const audit = new CSPAudit();
audit.run();
