# JustiFi Web Application - Security Review & CSP Hardening Guide

## Executive Summary

Your web application has identified three critical security vulnerabilities in its Content Security Policy (CSP) configuration:

1. **Overly Permissive CSP Directives** - Broad wildcards reduce the effectiveness of CSP
2. **Unsafe Script & Style Directives** - `unsafe-inline` and `unsafe-eval` defeat CSP protection
3. **Missing Subresource Integrity (SRI)** - External resources lack cryptographic verification

---

## Current Security Issues

### 1. CSP Configuration Issues (firebase.json)

**Current CSP Header:**
```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://identitytoolkit.googleapis.com;
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
font-src 'self' data:;
connect-src 'self' https://firebase.googleapis.com https://*.firebaseio.com https://*.firestore.googleapis.com https://identitytoolkit.googleapis.com https://apis.google.com;
frame-ancestors 'none';
base-uri 'self';
form-action 'self'
```

**Problems Identified:**

| Issue | Location | Risk | Impact |
|-------|----------|------|--------|
| `'unsafe-inline'` in script-src | CSP Header | **CRITICAL** | Allows inline <script> tags and event handlers (onClick, etc.) - defeats CSP |
| `'unsafe-eval'` in script-src | CSP Header | **CRITICAL** | Allows eval() and Function() constructor - defeats CSP |
| `'unsafe-inline'` in style-src | CSP Header | **HIGH** | Allows inline <style> tags and style attributes - defeats CSS CSP protection |
| `https:` in img-src | CSP Header | **HIGH** | Allows images from ANY HTTPS domain - too permissive |
| `data:` in font-src | CSP Header | **MEDIUM** | Allows data: URIs for fonts - can be abused for data exfiltration |
| No SRI attributes | HTML head | **HIGH** | External resources (Google Fonts) can be intercepted/modified |
| No nonce or hash | CSP Header | **HIGH** | No way to safely include inline scripts if needed |

---

## Codebase Analysis

### ✅ Good News - No Problematic Patterns Found

**Positive Findings:**
- ✓ No `eval()` or `Function()` constructor usage in codebase
- ✓ No `dangerouslySetInnerHTML` React usage
- ✓ No inline `<script>` tags in HTML
- ✓ No inline `<style>` tags detected
- ✓ React event handlers (onClick, onChange) are CSP-safe
- ✓ All styles generated from Tailwind CSS (build-time, not runtime)
- ✓ CSS preprocessing via PostCSS is secure

**This means you CAN safely remove `unsafe-inline` and `unsafe-eval`!**

---

## Implementation Plan

### Phase 1: Update CSP Headers (firebase.json)

Remove unsafe directives and add explicit domain restrictions:

```json
{
  "key": "Content-Security-Policy",
  "value": "default-src 'self'; script-src 'self' https://apis.google.com https://identitytoolkit.googleapis.com; style-src 'self' https://fonts.googleapis.com; img-src 'self' data: https://fonts.gstatic.com https://apis.google.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://firebase.googleapis.com https://*.firebaseio.com https://*.firestore.googleapis.com https://identitytoolkit.googleapis.com https://apis.google.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; upgrade-insecure-requests"
}
```

**Changes Made:**
- ❌ Removed `'unsafe-inline'` from script-src
- ❌ Removed `'unsafe-eval'` from script-src
- ❌ Removed `'unsafe-inline'` from style-src
- ✅ Added `https://fonts.googleapis.com` to style-src (Google Fonts CSS)
- ✅ Added `https://fonts.gstatic.com` to img-src and font-src (Google Fonts assets)
- ✅ Removed overly permissive `https:` from img-src
- ✅ Added `object-src 'none'` (prevents plugin loading)
- ✅ Added `upgrade-insecure-requests` (forces HTTPS)

### Phase 2: Add Subresource Integrity (SRI) to index.html

Generate SRI hashes for external resources and add integrity attributes:

```html
<!-- Google Fonts with SRI -->
<link 
  rel="preload"
  as="style"
  href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Patrick+Hand&display=swap"
  integrity="sha384-[HASH_HERE]"
  crossorigin="anonymous"
  onLoad="this.onload=null;this.rel='stylesheet'"
/>
<noscript>
  <link
    rel="stylesheet"
    href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Patrick+Hand&display=swap"
    integrity="sha384-[HASH_HERE]"
    crossorigin="anonymous"
  />
</noscript>

<!-- Preconnect tags (already present - good!) -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
```

### Phase 3: Security Headers Summary

Your current headers (good) + recommended additions:

```json
{
  "source": "**",
  "headers": [
    {
      "key": "X-Content-Type-Options",
      "value": "nosniff"
    },
    {
      "key": "X-Frame-Options",
      "value": "DENY"
    },
    {
      "key": "Referrer-Policy",
      "value": "strict-origin-when-cross-origin"
    },
    {
      "key": "Permissions-Policy",
      "value": "geolocation=(), microphone=(), camera=()"
    },
    {
      "key": "Content-Security-Policy",
      "value": "default-src 'self'; script-src 'self' https://apis.google.com https://identitytoolkit.googleapis.com; style-src 'self' https://fonts.googleapis.com; img-src 'self' data: https://fonts.gstatic.com https://apis.google.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://firebase.googleapis.com https://*.firebaseio.com https://*.firestore.googleapis.com https://identitytoolkit.googleapis.com https://apis.google.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; upgrade-insecure-requests"
    }
  ]
}
```

---

## SRI Hash Generation

To generate SRI hashes for Google Fonts URL, use this approach:

### Option A: Online SRI Generator
1. Visit: https://www.srihash.org/
2. Enter: `https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Patrick+Hand&display=swap`
3. Copy the generated integrity hash
4. Add to your HTML link tags

### Option B: Manual Generation (Node.js)
```javascript
// Run in terminal: node
const crypto = require('crypto');
const https = require('https');

https.get(
  'https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Patrick+Hand&display=swap',
  (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      const hash = crypto
        .createHash('sha384')
        .update(data)
        .digest('base64');
      console.log(`sha384-${hash}`);
    });
  }
);
```

---

## Testing & Validation

### 1. CSP Violation Detection
After implementing changes, monitor CSP violations:

```javascript
// Add to src/main.jsx for development
if (import.meta.env.DEV) {
  document.addEventListener('securitypolicyviolation', (e) => {
    console.warn('CSP Violation:', {
      blockedURI: e.blockedURI,
      violatedDirective: e.violatedDirective,
      sourceFile: e.sourceFile,
      lineNumber: e.lineNumber
    });
  });
}
```

### 2. Automated Testing
Add CSP validation to your build process:

```bash
# Check for unsafe directives
grep -i "unsafe" firebase.json
grep -i "unsafe" index.html
```

### 3. Browser Testing
1. Open DevTools → Console
2. Deploy with strict CSP
3. No CSP violations should appear
4. All resources should load correctly

### 4. CSP Validator Tools
- https://csp-evaluator.withgoogle.com/ - Validates and scores your CSP
- Browser DevTools - Built-in CSP violation reporting

---

## Security Best Practices Going Forward

### 1. Regular CSP Audits
- [ ] Review CSP quarterly
- [ ] Monitor CSP violation reports
- [ ] Update domains as needed

### 2. Dependency Management
- [ ] Keep Firebase SDK updated
- [ ] Review security advisories from npm
- [ ] Use `npm audit` regularly

### 3. Build-Time Security
- [ ] Enable SRI for ALL external resources
- [ ] Generate SRI hashes in build pipeline
- [ ] Validate SRI hashes before deployment

### 4. Runtime Protection
- [ ] Monitor CSP violations in production
- [ ] Use security headers on ALL endpoints
- [ ] Consider adding Report-Only CSP during rollout:
  ```
  Content-Security-Policy-Report-Only: [your CSP];
  report-uri=https://your-endpoint.com/csp-report
  ```

---

## Implementation Checklist

- [ ] Update firebase.json with hardened CSP (Phase 1)
- [ ] Generate SRI hash for Google Fonts
- [ ] Update index.html with integrity attributes (Phase 2)
- [ ] Add security event listener for development
- [ ] Test on all browsers (Chrome, Firefox, Safari, Edge)
- [ ] Verify no CSP violations in console
- [ ] Deploy to staging environment
- [ ] Monitor CSP violation logs for 1 week
- [ ] Deploy to production
- [ ] Update security documentation

---

## Migration Path (Low-Risk Rollout)

### Week 1: Report-Only Mode
Deploy with `Content-Security-Policy-Report-Only` header to detect any issues:

```json
{
  "key": "Content-Security-Policy-Report-Only",
  "value": "[your new strict CSP];report-uri=https://your-monitoring-endpoint.com/csp-reports"
}
```

### Week 2: Enforcement
After confirming no violations, switch to enforcing CSP:

```json
{
  "key": "Content-Security-Policy",
  "value": "[your new strict CSP]"
}
```

---

## Resources

- [MDN: Content-Security-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy)
- [Google: CSP Guide](https://developers.google.com/web/fundamentals/security/csp)
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/)
- [SRI Hash Generator](https://www.srihash.org/)
- [OWASP: Content Security Policy](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)

---

## Questions & Support

If you have questions about specific directives or need help with implementation, refer to the detailed implementation files in this directory.
