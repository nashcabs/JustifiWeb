# Cross-Browser CSS Guidelines - Developer Quick Reference

**Keep this guide handy when writing CSS for JustifiWeb**

---

## ✅ Do's

### Layout Properties
```css
/* ✅ DO: Use standard Flexbox */
.container {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
}

/* ✅ DO: Add min-width: 0 to flex children */
.flex-child {
  display: flex;
  flex-direction: column;
  min-width: 0;  /* Prevents overflow in Safari */
  overflow: hidden;
}

/* ✅ DO: Use standard CSS Grid */
.grid-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
```

### Media Elements
```css
/* ✅ DO: Constrain responsive images */
img {
  max-width: 100%;
  height: auto;
  display: block;
}

/* ✅ DO: Constraint canvas elements */
canvas {
  max-width: 100%;
  height: auto;
  max-height: 100vh;
  display: block;
}
```

### Text Truncation
```css
/* ✅ DO: Use standard line-clamp with webkit fallback */
.truncated-text {
  overflow: hidden;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  display: -webkit-box;
  -webkit-box-orient: vertical;
}
```

### Vendor Prefixes
```css
/* ✅ DO: Pair vendor prefixes with standard properties */
.backdrop {
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

/* Standard first, webkit second */
.sticky {
  position: sticky;
  position: -webkit-sticky;
}
```

### Box Model
```css
/* ✅ DO: Universal box-sizing (already set globally) */
* {
  box-sizing: border-box;
}

*::before,
*::after {
  box-sizing: border-box;
}
```

---

## ❌ Don'ts

### Layout Properties
```css
/* ❌ DON'T: Use legacy -webkit-box */
.old-flexbox {
  display: -webkit-box;  /* Outdated! */
}

/* ❌ DON'T: Use vendor-specific display values */
.old-grid {
  display: -ms-grid;  /* Unsupported */
}

/* ❌ DON'T: Forget min-width on flex children */
.flex-child {
  display: flex;
  /* Missing min-width: 0; - will cause overflow in Safari */
}
```

### Media Elements
```css
/* ❌ DON'T: Set only width without height constraint */
img {
  width: 100%;
  /* Might overflow or distort */
}

/* ❌ DON'T: Use display: inline for canvas */
canvas {
  display: inline;  /* Creates spacing issues */
}
```

### Text Truncation
```css
/* ❌ DON'T: Use only -webkit-line-clamp */
.old-clamp {
  -webkit-line-clamp: 2;  /* Missing standard property */
}

/* ❌ DON'T: Use display: box (deprecated) */
.deprecated {
  display: box;  /* Removed from spec */
}
```

### Vendor Prefixes
```css
/* ❌ DON'T: Use vendor prefixes alone */
.bad-prefix {
  -webkit-backdrop-filter: blur(12px);
  /* Missing standard backdrop-filter */
}

/* ❌ DON'T: Add vendor prefixes without checking support */
.unnecessary {
  -moz-appearance: none;  /* Already supported everywhere */
}
```

---

## 🔧 Common Patterns

### Flex Container with Text Overflow
```css
.flex-container {
  display: flex;
  gap: 16px;
  align-items: center;
}

.flex-container .text-content {
  min-width: 0;  /* ← Critical for text truncation */
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

### Responsive Image
```css
.responsive-image {
  max-width: 100%;
  height: auto;
  display: block;
  aspect-ratio: 16 / 9;
}
```

### Truncated Multi-line Text
```css
.truncated-card-title {
  line-clamp: 2;
  -webkit-line-clamp: 2;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
```

### Chart Container
```css
.chart-container {
  width: 100%;
  max-width: 600px;
  height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chart-container canvas {
  width: 100% !important;
  height: 100% !important;
  max-width: 100% !important;
  max-height: 100% !important;
  display: block !important;
}
```

---

## 📱 Mobile Responsive

```css
/* Always test at these breakpoints */

/* Desktop: 1024px and up */
@media (min-width: 1024px) {
  .grid { grid-template-columns: repeat(4, 1fr); }
}

/* Tablet: 768px to 1023px */
@media (min-width: 768px) and (max-width: 1023px) {
  .grid { grid-template-columns: repeat(2, 1fr); }
}

/* Mobile: below 768px */
@media (max-width: 767px) {
  .grid { grid-template-columns: 1fr; }
  
  /* Always apply box-sizing */
  * { box-sizing: border-box; }
  
  /* Prevent horizontal overflow */
  html, body {
    overflow-x: hidden;
    max-width: 100vw;
  }
}
```

---

## 🧪 Testing Checklist

Before committing new CSS:

- [ ] Used `display: flex` or `display: grid` (not vendor prefixes)
- [ ] Added `min-width: 0` to flex children with text
- [ ] Images have `max-width: 100%` and `height: auto`
- [ ] Canvas has explicit `max-width` and `max-height`
- [ ] Vendor prefixes paired with standard properties
- [ ] Tested on Chrome, Firefox, and Safari
- [ ] No horizontal scrolling on mobile
- [ ] Text truncates consistently across browsers

---

## 🚀 Quick Copy-Paste Snippets

### Base Flex Container
```css
.flex-container {
  display: flex;
  flex-direction: row;
  gap: 16px;
  align-items: center;
}

.flex-container > * {
  min-width: 0;
  flex: 1;
}
```

### Responsive Grid
```css
.grid-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}
```

### Responsive Image
```css
.responsive-img {
  max-width: 100%;
  height: auto;
  display: block;
}
```

### Text Ellipsis
```css
.text-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

### Multi-line Truncate
```css
.text-clamp-2 {
  line-clamp: 2;
  -webkit-line-clamp: 2;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
```

---

## 📞 Need Help?

### Reference Docs
- **Full Audit Report**: See `CROSS_BROWSER_AUDIT_REPORT.md`
- **Implementation Summary**: See `CROSS_BROWSER_FIXES_SUMMARY.md`
- **MDN Reference**: https://developer.mozilla.org/
- **CanIUse**: https://caniuse.com/

### Common Issues

**"Text is being stretched horizontally in Safari"**
→ Add `min-width: 0` to the flex child

**"Canvas element overflows the container"**
→ Add `max-width: 100%` and `max-height` to canvas

**"Image looks different on Safari"**
→ Ensure `max-width: 100%` and `height: auto` are set

**"Text truncation not working consistently"**
→ Use the multi-line truncate pattern from above

---

## 🔄 Maintenance

- Review this guide when adding new layouts
- Run CSS through [stylelint](https://stylelint.io/) if available
- Test on actual Safari devices, not just Chrome's mobile emulation
- Update vendor prefixes as browser support changes

**Last Updated**: 2026-08-29
