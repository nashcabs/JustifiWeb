# CSP Hardening - Actionable Implementation (Copy-Paste Ready)

## Quick Start - 5 Minute Implementation

### Step 1: Generate SRI Hash (2 min)

Run this command:
```bash
node scripts/generate-sri-hashes.js
```

You'll see output like:
```
✅ Integrity Hash:
sha384-1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z...
```

**Save this hash** - you'll need it in Step 2.

---

### Step 2: Update index.html (1 min)

**Find** these lines in `index.html`:
```html
    <link
      rel="preload"
      as="style"
      href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Patrick+Hand&display=swap"
      onLoad="this.onload=null;this.rel='stylesheet'"
    />
    <noscript>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Patrick+Hand&display=swap"
      />
    </noscript>
```

**Replace** with:
```html
    <link
      rel="preload"
      as="style"
      href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Patrick+Hand&display=swap"
      integrity="sha384-1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z..."
      crossorigin="anonymous"
      onLoad="this.onload=null;this.rel='stylesheet'"
    />
    <noscript>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Patrick+Hand&display=swap"
        integrity="sha384-1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z..."
        crossorigin="anonymous"
      />
    </noscript>
```

**Important**: Replace `sha384-1a2b3c4d...` with your actual hash from Step 1.

---

### Step 3: Update firebase.json (1 min)

**Find** this line in `firebase.json`:
```json
          {
            "key": "Content-Security-Policy",
            "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://identitytoolkit.googleapis.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://firebase.googleapis.com https://*.firebaseio.com https://*.firestore.googleapis.com https://identitytoolkit.googleapis.com https://apis.google.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
          }
```

**Replace** with:
```json
          {
            "key": "Content-Security-Policy",
            "value": "default-src 'self'; script-src 'self' https://apis.google.com https://identitytoolkit.googleapis.com; style-src 'self' https://fonts.googleapis.com; img-src 'self' data: https://fonts.gstatic.com https://apis.google.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://firebase.googleapis.com https://*.firebaseio.com https://*.firestore.googleapis.com https://identitytoolkit.googleapis.com https://apis.google.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; upgrade-insecure-requests"
          }
```

**Also add these headers** after the CSP header:
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

---

### Step 4: Test Locally (1 min)

```bash
npm run dev
```

Open DevTools (F12) → Console tab

**You should see:**
- ✅ No errors about "CSP Violation"
- ✅ No errors about "Refused to load"
- ✅ No red error messages
- ✅ Website looks and functions normally

If you see CSP violations, check the error message and add the domain to the appropriate directive.

---

## Exact Code to Copy

### Complete Updated firebase.json Header Section

Copy the entire headers section to replace in `firebase.json`:

```json
{
  "firestore": {
    "rules": "firestore.rules"
  },
  "hosting": {
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "headers": [
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
      },
      {
        "source": "index.html",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "no-cache, no-store, must-revalidate"
          }
        ]
      },
      {
        "source": "assets/optimized/**",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      },
      {
        "source": "assets/**",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=2592000"
          }
        ]
      },
      {
        "source": "**/*.@(js|css|woff2|otf)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      }
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

---

## Verification Commands

### Run Audit
```bash
node scripts/audit-csp-security.js
```

**Output should show:**
```
✓ No 'unsafe-inline' found
✓ No 'unsafe-eval' found
✓ Directive configured: script-src
✓ Directive configured: style-src
✓ No inline <script> tags
✓ No inline styles in HTML
Security Score: 85/100
```

### Verify Deployment
```bash
firebase deploy --only hosting:headers
```

Then visit your site and check console for CSP violations.

---

## Visual Change Summary

### firebase.json CSP Changes

```diff
- script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://identitytoolkit.googleapis.com;
+ script-src 'self' https://apis.google.com https://identitytoolkit.googleapis.com;

- style-src 'self' 'unsafe-inline';
+ style-src 'self' https://fonts.googleapis.com;

- img-src 'self' data: https:;
+ img-src 'self' data: https://fonts.gstatic.com https://apis.google.com;

- font-src 'self' data:;
+ font-src 'self' https://fonts.gstatic.com;

+ object-src 'none';
+ upgrade-insecure-requests
```

### index.html Link Changes

```diff
  <link
    rel="preload"
    as="style"
    href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Patrick+Hand&display=swap"
+   integrity="sha384-YOUR_HASH_HERE"
+   crossorigin="anonymous"
    onLoad="this.onload=null;this.rel='stylesheet'"
  />
```

---

## Rollback Plan (If Needed)

If something breaks, simply revert:

### Quick Revert (< 5 min)
```bash
# Restore from backup
cp firebase.json.backup firebase.json
firebase deploy --only hosting:headers
```

Or manually revert to original CSP value in firebase.json.

**Note**: The original (vulnerable) CSP is still available in git history.

---

## Deployment Checklist

- [ ] SRI hash generated and saved
- [ ] index.html updated with SRI hash
- [ ] firebase.json CSP updated
- [ ] firebase.json new headers added (Referrer-Policy, Permissions-Policy)
- [ ] Local testing passed (npm run dev)
- [ ] No CSP violations in console
- [ ] Audit script passes (node scripts/audit-csp-security.js)
- [ ] firebase.json syntax is valid (JSON formatting)
- [ ] Backed up original firebase.json
- [ ] Ready to deploy

---

## After Deployment

### Day 1: Monitor
- Check Firebase Console logs for errors
- Monitor user reports
- Watch DevTools for CSP violations

### Day 2-3: Verify
- Test on multiple browsers
- Test on mobile devices
- Confirm all features work

### Week 1: Validate
- Review analytics for issues
- Check server logs
- Confirm no regressions

### Ongoing: Maintenance
- Monthly: Review CSP violations
- Quarterly: Audit external resources
- When changing features: Update CSP as needed

---

## Support Resources

**If CSP breaks something:**

1. Check the console error message
2. Identify the blocked URL
3. Add domain to appropriate CSP directive
4. Re-test locally
5. Re-deploy

**Example**: If image from `cdn.example.com` fails to load:
```
Add to img-src: https://cdn.example.com
```

**Files to reference:**
- `SECURITY_REVIEW.md` - Full analysis
- `CSP_IMPLEMENTATION_GUIDE.md` - Detailed steps
- `CSP_CHANGES_DETAILED.md` - Before/after comparison
- `CSP_QUICK_REFERENCE.md` - Quick lookup

---

## Success Criteria

✅ **All checked = Success!**

- [ ] Zero CSP violations in console
- [ ] All resources load correctly
- [ ] CSS styling applies properly
- [ ] Fonts display correctly
- [ ] Firebase APIs work
- [ ] Event handlers function normally
- [ ] Audit script score ≥ 85/100
- [ ] Online CSP validator approves configuration
- [ ] No user reports of broken features
- [ ] Security vulnerability assessment: RESOLVED ✓

---

**You're done!** 🎉 Your application is now CSP hardened and secure.

**Next time**: When adding new external resources:
1. Generate SRI hash
2. Add integrity attribute
3. Add domain to CSP
4. Test locally
5. Deploy

Simple process. High security. Worth it.
