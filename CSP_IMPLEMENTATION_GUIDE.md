# CSP Hardening Implementation Guide

This guide provides step-by-step instructions to harden your Content Security Policy (CSP) configuration.

## 📋 Prerequisites

- Access to `firebase.json` file
- Access to `index.html` file
- Node.js installed (for SRI hash generation)
- Understanding of CSP directives

## 🚀 Step 1: Generate SRI Hashes

SRI (Subresource Integrity) hashes ensure external resources haven't been tampered with.

### Option A: Using the Provided Script

```bash
cd scripts
node generate-sri-hashes.js
```

This will output:
```
📦 Google Fonts CSS
✅ Integrity Hash:
sha384-abc123...

📋 HTML Example:
<link
  rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Patrick+Hand&display=swap"
  integrity="sha384-abc123..."
  crossorigin="anonymous"
/>
```

### Option B: Using Online SRI Generator

1. Visit: https://www.srihash.org/
2. Paste URL: `https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Patrick+Hand&display=swap`
3. Copy the generated hash
4. Save for next step

**Keep the hash safe - you'll need it in Step 2.**

---

## 📝 Step 2: Update index.html

### Current (Vulnerable):
```html
<link
  rel="preload"
  as="style"
  href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Patrick+Hand&display=swap"
  onLoad="this.onload=null;this.rel='stylesheet'"
/>
```

### Updated (Secure):
```html
<link
  rel="preload"
  as="style"
  href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Patrick+Hand&display=swap"
  integrity="sha384-[YOUR_HASH_HERE]"
  crossorigin="anonymous"
  onLoad="this.onload=null;this.rel='stylesheet'"
/>

<!-- Also update noscript version -->
<noscript>
  <link
    rel="stylesheet"
    href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Patrick+Hand&display=swap"
    integrity="sha384-[YOUR_HASH_HERE]"
    crossorigin="anonymous"
  />
</noscript>
```

### Changes:
- ✅ Added `integrity="sha384-..."`
- ✅ Added `crossorigin="anonymous"`
- ✅ Updated noscript link with same hash

---

## 🔐 Step 3: Update firebase.json

### Current CSP (Vulnerable):
```json
"Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://identitytoolkit.googleapis.com; style-src 'self' 'unsafe-inline'; ..."
```

### New CSP (Secure):
```json
"Content-Security-Policy": "default-src 'self'; script-src 'self' https://apis.google.com https://identitytoolkit.googleapis.com; style-src 'self' https://fonts.googleapis.com; img-src 'self' data: https://fonts.gstatic.com https://apis.google.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://firebase.googleapis.com https://*.firebaseio.com https://*.firestore.googleapis.com https://identitytoolkit.googleapis.com https://apis.google.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; upgrade-insecure-requests"
```

### Detailed Changes:

| Directive | Old | New | Reason |
|-----------|-----|-----|--------|
| script-src | `'unsafe-inline' 'unsafe-eval'` | ❌ removed | Code is CSP-safe, no inline scripts |
| style-src | `'unsafe-inline'` | ❌ removed | Styles from Tailwind build, no inline |
| style-src | ❌ missing | `https://fonts.googleapis.com` | ✅ Added explicit CDN domain |
| img-src | `https:` | `https://fonts.gstatic.com https://apis.google.com` | ✅ Removed broad scheme |
| font-src | `data:` | `https://fonts.gstatic.com` | ✅ Removed data: URIs |
| All directives | N/A | ✅ Added | New directives for better security |
| (new) | N/A | `object-src 'none'` | ✅ Prevent plugin loading |
| (new) | N/A | `upgrade-insecure-requests` | ✅ Force HTTPS |

### Additional Headers to Add:

```json
{
  "key": "Referrer-Policy",
  "value": "strict-origin-when-cross-origin"
},
{
  "key": "Permissions-Policy",
  "value": "geolocation=(), microphone=(), camera=()"
}
```

**Full header file available**: See `firebase.json.hardened` for complete configuration.

---

## ✅ Step 4: Verify Changes

### Test Locally:

```bash
# Start development server
npm run dev

# Open DevTools Console (F12)
# You should see:
# ✅ No CSP violation errors
# ✅ All resources load normally
# ✅ No "unsafe-inline" or "unsafe-eval" warnings
```

### CSP Validation:

Use the CSP monitoring utilities in your project:

```javascript
// In src/main.jsx, add:
import { initCSPMonitoring, validateCSP } from './utils/cspMonitoring';

if (import.meta.env.DEV) {
  initCSPMonitoring({ verbose: true });
  validateCSP();
}
```

### Online CSP Validator:

1. Deploy to staging
2. Visit: https://csp-evaluator.withgoogle.com/
3. Enter your domain
4. Review recommendations

---

## 🔄 Step 5: Deploy Strategy

### Option A: Quick Deploy (Low Risk)
**For urgent security patches**

1. Back up `firebase.json`
2. Replace with hardened version
3. Run `firebase deploy --only hosting:headers`
4. Monitor logs for 1 hour
5. If no issues, you're done!

### Option B: Staged Rollout (Recommended)

**Week 1: Report-Only Mode**
```json
{
  "key": "Content-Security-Policy-Report-Only",
  "value": "[new strict CSP];report-uri=https://your-monitoring-endpoint.com/csp-reports"
}
```
- Deploy this version
- Monitor CSP violation reports
- Document any violations
- Fix any app issues

**Week 2: Enforcement**
- Replace `Content-Security-Policy-Report-Only` with `Content-Security-Policy`
- Monitor error logs
- No more violations = success!

---

## 🐛 Troubleshooting

### "CSP Violation: Refused to load script..."

**Problem**: A script is being blocked by CSP

**Solution**:
1. Check the blocked URL in browser console
2. Add domain to appropriate `script-src` directive in firebase.json
3. Verify with CSP validator
4. Re-deploy

### "CSP Violation: Refused to apply style..."

**Problem**: A stylesheet is being blocked

**Solution**:
1. Identify the CSS source in console
2. Add domain to `style-src` in CSP
3. If from CDN, add SRI hash to the `<link>` tag
4. Re-deploy

### Resources load but SRI fails

**Problem**: Browser rejects resource due to SRI mismatch

**Solutions**:
1. **Stale hash**: Resource changed on CDN, regenerate hash
   ```bash
   node scripts/generate-sri-hashes.js
   ```
2. **Gzipped content**: Some CDNs gzip content differently
   - Remove SRI and use `crossorigin="anonymous"` only
   - CSP alone will still protect the resource
3. **Query parameter changes**: Google Fonts URL changed
   - Get new hash for new URL

### Tests pass locally but fail in production

**Problem**: CSP too strict in production

**Solutions**:
1. Check production domain in CSP
2. Use `CSP-Report-Only` to find violations:
   ```json
   "Content-Security-Policy-Report-Only": "[your CSP];report-uri=https://your-endpoint.com/reports"
   ```
3. Add missing domains based on reports
4. Deploy updated CSP

---

## 📊 Verification Checklist

- [ ] SRI hashes generated for all external resources
- [ ] index.html updated with integrity attributes
- [ ] firebase.json updated with hardened CSP
- [ ] `unsafe-inline` removed from script-src
- [ ] `unsafe-eval` removed from script-src
- [ ] `unsafe-inline` removed from style-src
- [ ] Explicit domains specified for all external resources
- [ ] Tested locally with no CSP violations
- [ ] CSP validation tool passes (https://csp-evaluator.withgoogle.com/)
- [ ] Deployed to staging without errors
- [ ] Monitored for 48 hours - no issues
- [ ] Production deployment completed
- [ ] Production logs monitored - no CSP violations

---

## 🔗 Additional Resources

- **MDN CSP Docs**: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy
- **Google CSP Guide**: https://developers.google.com/web/fundamentals/security/csp
- **CSP Evaluator**: https://csp-evaluator.withgoogle.com/
- **SRI Generator**: https://www.srihash.org/
- **OWASP CSP Cheat Sheet**: https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html

---

## 💡 Maintenance Going Forward

### Monthly:
- [ ] Review CSP violation logs
- [ ] Check for security advisories

### Quarterly:
- [ ] Audit all external resources
- [ ] Regenerate SRI hashes if URLs change
- [ ] Update CSP directives if needed

### When Adding New Resources:
1. Generate SRI hash
2. Add to HTML with integrity attribute
3. Add domain to appropriate CSP directive
4. Test locally
5. Deploy

---

## Support

If you encounter issues or have questions:

1. Check the **Troubleshooting** section above
2. Review browser DevTools console for error messages
3. Use CSP validator tools for guidance
4. Check OWASP CSP Cheat Sheet

Good luck! Your application is now CSP-hardened and more secure. 🔒
