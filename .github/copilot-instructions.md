# Copilot Instructions

This is a [Maizzle](https://maizzle.com) project for building HTML emails with Tailwind CSS.
Use maizzle documentation as reference: https://maizzle.com/docs/

## Commands

```bash
npm run dev          # Development server with live reload at http://localhost:3000
npm run build        # Production build + automatic section extraction to build_production/
npm run deploy       # Deploy extracted sections and templates to SFMC
npm run deploy:test  # Simulate SFMC deployment (no changes made)
```

## Architecture

Emails are assembled from three layers:

1. **`emails/*.html`** — Individual templates with YAML frontmatter
2. **`layouts/main.html`** — HTML shell (doctype, head, body, preheader logic)
3. **`components/**/*.html`** — Reusable blocks (button, spacer, divider, etc.)

Templates reference layouts and components via `<x-{name}>` tags:

```html
---
bodyClass: bg-slate-50
preheader: Preview text shown in inbox
title: My Email
---

<x-main>
  <x-header logoSrc="images/logo.png" mainTitle="Newsletter" />
  <x-spacer height="24px" />
  <x-atoms.button href="https://example.com" bg-color="#4338ca">
    Click me
  </x-atoms.button>
  <x-footer />
</x-main>
```

- YAML frontmatter variables are available as `page.*` in layouts
- Nested components use dot notation: `<x-atoms.button>` → `components/atoms/button.html`
- `<yield />` in layouts/components marks where child content is inserted

## Component Library

### Layout Components

| Component           | Tag               | Description                                         |
| ------------------- | ----------------- | --------------------------------------------------- |
| Header              | `<x-header>`      | Logo + title with dark mode support                 |
| Footer              | `<x-footer>`      | Centered table-based footer                         |
| Logo                | `<x-logo>`        | Standalone logo with light/dark variants            |
| Spacer              | `<x-spacer>`      | Vertical spacing with MSO override                  |
| Divider             | `<x-divider>`     | Horizontal rule with custom height/color            |
| Two Columns (table) | `<x-twocols>`     | Table-based 2-column layout                         |
| Two Columns (div)   | `<x-twocols-div>` | Div-based 2-column layout with Outlook VML fallback |
| VML Fill            | `<x-v-fill>`      | Outlook background image support via VML            |

### Atom Components

| Component | Tag                 | Description                                         |
| --------- | ------------------- | --------------------------------------------------- |
| Button    | `<x-atoms.button>`  | Primary CTA with Outlook VML                        |
| Btn       | `<x-atoms.btn>`     | Legacy button with `v:roundrect`                    |
| Card      | `<x-atoms.card>`    | Content card with image/title/description/CTA slots |
| Image     | `<x-atoms.image>`   | Image element with alt and dimension props          |
| Title     | `<x-atoms.title>`   | Heading (h1–h6) with preset Tailwind styles         |
| Wrapper   | `<x-atoms.wrapper>` | Table wrapper for flexible content                  |

### Named Slots

Components with multiple content areas use named slots:

```html
<!-- Definition in component file -->
<slot:image />
<slot:title />
<slot:cta />

<!-- Usage in template -->
<x-atoms.card>
  <fill:image><x-atoms.image imgSrc="image.jpg" alt="Product" /></fill:image>
  <fill:title>Product Name</fill:title>
  <fill:cta><x-atoms.btn link="https://example.com">Shop</x-atoms.btn></fill:cta>
</x-atoms.card>
```

## Component Logic

Components with dynamic behavior use a `<script props>` block at the top:

```html
<script props>
  module.exports = {
    href: props.href,
    bg: props["bg-color"] || "#4338ca",
    styles: `display:inline-block; background:${bg};`,
  };
</script>

<a href="{{{ href }}}" style="{{ styles }}"><yield /></a>
```

- `props` — object of attributes passed to the component
- `{{{ value }}}` — unescaped output (use for URLs, HTML)
- `{{ value }}` — escaped output (use for text)
- `<yield />` — renders component children
- `attributes` — special attribute that forwards all props as HTML attributes
- `<if condition="expr">` / `<else>` — conditional rendering
- `<each loop="item in array">` — loop rendering (e.g. `<each loop="i in [1,2,3]">`)

## Key Conventions

**Table-based layout** — Use `<table>` structures, not `<div>` layouts. Email clients require this.

**Outlook/MSO support** — Use `<outlook>` and `<not-outlook>` tags for conditional content:

```html
<outlook>
  <!-- Rendered only in Outlook (MSO conditional comments) -->
  <i style="mso-text-raise: 16px;" hidden>&emsp;</i>
</outlook>

<not-outlook>
  <!-- Hidden in Outlook, visible in all other clients -->
</not-outlook>
```

**Responsive classes** — Use `sm:` prefix for mobile styles (inverted from web — `sm:` targets small/mobile viewports in email).

**Dark mode** — Use `dark:` Tailwind variants. The layout includes `color-scheme: light dark`:

```html
<td class="bg-white dark:bg-gray-900 text-slate-800 dark:text-slate-200">
```

**Image paths** — Use `src` for dev and `src-production` for the built path:

```html
<img src="logo.png" src-production="images/logo.png" />
```

**Gmail responsive** — Use `gmailResponsiveCol` class for columns that should stack on Gmail mobile. The `css/custom.css` includes the required `u + .body` selector fix.

**Custom CSS** — `css/custom.css` is imported in the layout and supports `@apply` directives. It is processed before Tailwind utilities. Default font stack: Verdana → Helvetica → sans-serif.

## Build Pipeline

```
npm run build
  ├─ maizzle build production
  │   ├─ Compiles emails/ with layouts and components
  │   ├─ Inlines all CSS into style="" attributes
  │   ├─ Maps CSS to HTML attributes (width, bgcolor, align…)
  │   ├─ Converts longhand CSS to shorthand
  │   └─ Outputs: build_production/*.html
  │
  └─ node scripts/sectionExtractor.js
      ├─ Scans all HTML files in build_production/
      ├─ Extracts [data-component] elements → build_production/emailSections/
      └─ Empties [data-type="slot"] areas → build_production/emailTemplates/
```

| Phase        | Dev                 | Production            |
| ------------ | ------------------- | --------------------- |
| CSS inlining | ❌                  | ✅ (via `css.inline`) |
| CSS purge    | ❌                  | ✅                    |
| Minify HTML  | ❌                  | ✅ (`minify.html`)    |
| Output path  | in-memory / browser | `build_production/`   |

Production config (`config.production.js`) extends `config.js`. Only changed keys need to be present.

## SFMC Extraction

Mark elements for extraction with `data-component`:

```html
<td data-component="header" data-type="slot" data-key="header-unlocked">
  <!-- content -->
</td>
```

- `data-component` — names the extracted block file (only first occurrence per name is extracted)
- `data-type="slot"` — marks areas to be emptied in the template output
- `data-key` — optional SFMC content block key identifier

Output: `build_production/emailSections/{component}.html` and `build_production/emailTemplates/{filename}.html`.

## SFMC Deployment

Create a `.env` file:

```env
SFMC_SUBDOMAIN=your-subdomain
SFMC_CLIENT_ID=your-client-id
SFMC_CLIENT_SECRET=your-client-secret
SFMC_ACCOUNT_ID=your-account-id
SFMC_COMPONENTS_CATEGORY_ID=optional-folder-id-for-sections
SFMC_TEMPLATE_CATEGORY_ID=optional-folder-id-for-templates
```

The deploy script (`scripts/deploy-sfmc.js`):
- Authenticates via OAuth 2.0 with 18-min token cache
- Upserts assets by name (creates or updates)
- Detects and resolves asset type conflicts (delete + recreate)
- Deploys sections as `htmlblock` (type 197), templates as `template` (type 207)
- All assets prefixed with `[Maizzle]` for easy identification in SFMC
- Concurrent batches of 5 with retry logic (up to 3 attempts, exponential backoff)
