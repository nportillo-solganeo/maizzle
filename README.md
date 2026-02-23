<div align="center">
  <p>
    <a href="https://maizzle.com" target="_blank">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="https://github.com/maizzle/maizzle/raw/master/.github/logo-dark.svg">
        <img alt="Maizzle Starter" src="https://github.com/maizzle/maizzle/raw/master/.github/logo-light.svg" width="300" height="225" style="max-width: 100%;">
      </picture>
    </a>
  </p>
  <p>Build production-ready HTML emails with Tailwind CSS</p>
</div>

## Overview

A Maizzle starter project for building HTML emails with:

- **Tailwind CSS** with email-safe utility preset
- **Component-based architecture** with reusable layouts and atoms
- **Outlook/MSO compatibility** via VML and conditional comments
- **Dark mode** support across all templates
- **Responsive design** with Gmail-compatible column stacking
- **Automated deployment** to Salesforce Marketing Cloud (SFMC)

## Getting Started

```bash
npm install
npm run dev
```

Opens a dev server at `http://localhost:3000` with live reload.

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Development server with live reload |
| `npm run build` | Production build + section extraction |
| `npm run deploy` | Deploy extracted sections to SFMC |
| `node scripts/deploy-sfmc.js --dry-run` | Simulate SFMC deployment |

## Directory Structure

```
emails/          - Email templates (newsletter-template, transactional)
layouts/         - Master HTML wrappers
components/      - Reusable components
  atoms/         - Atomic UI elements (button, btn, card, image, title, wrapper)
css/             - Global email styles (custom.css)
scripts/         - Build automation and deployment
images/          - Static assets
build_production/ - Production build output (gitignored)
  emailSections/ - Extracted component HTML blocks
  template/      - Full templates with empty slots (for SFMC)
```

## Email Templates

### Newsletter (`emails/newsletter-template.html`)
Multi-product promotional newsletter featuring:
- Header with logo (light/dark mode)
- Featured product in 2-column layout
- Product grid using `<each>` loop
- Footer with copyright

### Transactional (`emails/transactional.html`)
Account verification email featuring:
- Logo with build-time image path replacement
- CTA button with Outlook VML support
- Fallback URL for manual verification
- Dynamic copyright year

## Component Library

### Layout Components

| Component | Tag | Description |
|---|---|---|
| Header | `<x-header>` | Logo + title with dark mode support |
| Footer | `<x-footer>` | Centered table-based footer |
| Logo | `<x-logo>` | Standalone logo with light/dark variants |
| Spacer | `<x-spacer>` | Vertical spacing with MSO override |
| Divider | `<x-divider>` | Horizontal rule with custom height/color |
| Two Columns (table) | `<x-twocols>` | Table-based 2-column layout |
| Two Columns (div) | `<x-twocols-div>` | Div-based 2-column layout with Outlook VML fallback |
| VML Fill | `<x-v-fill>` | Outlook background image support via VML |

### Atom Components

| Component | Tag | Description |
|---|---|---|
| Button | `<x-atoms.button>` | Primary CTA with Outlook VML |
| Btn | `<x-atoms.btn>` | Legacy button with `v:roundrect` |
| Card | `<x-atoms.card>` | Content card with image/title/description/CTA slots |
| Image | `<x-atoms.image>` | Image element with alt and dimension props |
| Title | `<x-atoms.title>` | Heading (h1–h6) with preset Tailwind styles |
| Wrapper | `<x-atoms.wrapper>` | Table wrapper for flexible content |

### Component Usage

```html
<!-- Button with custom color -->
<x-atoms.button href="https://example.com" bg-color="#4338ca">
  Click me
</x-atoms.button>

<!-- Two-column layout with named slots -->
<x-twocols-div widthLeft="w-1/2" widthRight="w-1/2">
  <fill:leftColumn>Left content</fill:leftColumn>
  <fill:rightColumn>Right content</fill:rightColumn>
</x-twocols-div>

<!-- Card with all slots -->
<x-atoms.card>
  <fill:image><x-atoms.image imgSrc="image.jpg" alt="Product" /></fill:image>
  <fill:title>Product Name</fill:title>
  <fill:description>Short description</fill:description>
  <fill:cta><x-atoms.btn link="https://example.com">Shop</x-atoms.btn></fill:cta>
</x-atoms.card>
```

### Email Template Anatomy

```html
---
bodyClass: bg-slate-50
preheader: Preview text shown in email clients
title: My Email
---

<x-main>
  <x-header logoSrc="images/logo.png" mainTitle="Newsletter" />
  <x-spacer height="24px" />

  <!-- Content here -->

  <x-footer />
</x-main>
```

### Component Props System

Components declare props and computed values via `<script props>`:

```html
<script props>
  module.exports = {
    href: props.href,
    bg: props['bg-color'] || '#4338ca',
    styles: `display:inline-block; background:${bg};`,
  };
</script>

<a href="{{{ href }}}" style="{{ styles }}">
  <yield />
</a>
```

- `{{{ }}}` — unescaped output (for URLs, HTML)
- `{{ }}` — escaped output (for text)
- `<yield />` — renders component children
- `<slot:name>` / `<fill:name>` — named content slots

## Build Workflow

```
npm run build
  ├─ maizzle build production
  │   ├─ Compiles all emails/ with layouts and components
  │   ├─ Inlines all CSS into style="" attributes
  │   ├─ Maps CSS properties to HTML attributes (width, bgcolor, align…)
  │   ├─ Converts longhand CSS to shorthand
  │   └─ Outputs: build_production/newsletter-template.html, transactional.html
  │
  └─ node scripts/sectionExtractor.js
      ├─ Scans all HTML files in build_production/
      ├─ Finds all [data-component] elements (one unique instance per name)
      ├─ Outputs blocks → build_production/emailSections/{component}.html
      └─ Empties [data-type="slot"] areas and outputs full template
          → build_production/template/{filename}.html
```

Mark components for extraction by adding `data-component`:

```html
<td data-component="header" data-type="slot" data-key="header-unlocked">
  <!-- header content -->
</td>
```

- `data-component` — names the extracted block file (only the first occurrence per name is extracted)
- `data-type="slot"` — marks areas to be emptied in the template output
- `data-key` — optional identifier for the slot (e.g. for SFMC content block keys)

## SFMC Deployment

Deploys extracted `emailSections/` as HTML blocks and `template/` as templates to Salesforce Marketing Cloud.

### Setup

Create a `.env` file:

```env
SFMC_SUBDOMAIN=your-subdomain
SFMC_CLIENT_ID=your-client-id
SFMC_CLIENT_SECRET=your-client-secret
SFMC_ACCOUNT_ID=your-account-id
SFMC_COMPONENTS_CATEGORY_ID=optional-folder-id-for-sections
SFMC_TEMPLATE_CATEGORY_ID=optional-folder-id-for-templates
```

### Deploy

```bash
# Deploy all sections and templates
npm run deploy

# Preview without uploading
node scripts/deploy-sfmc.js --dry-run
```

**Features:**
- OAuth 2.0 with automatic token refresh (18-min cache)
- Upsert logic: creates new assets or updates existing ones by name
- Asset type conflict detection: deletes and recreates on type mismatch
- Concurrent batches of 5 uploads for speed
- Retry logic: up to 3 attempts with exponential backoff
- Sections deployed as `htmlblock` (type 197), templates as `template` (type 207)
- Assets prefixed with `[Maizzle]` for easy identification in SFMC

## Configuration

### `config.js` — Development

```js
export default {
  build: {
    content: ['emails/**/*.html'],
    static: {
      source: ['images/**/*.*'],
      destination: 'images',
    },
  },
}
```

### `config.production.js` — Production

```js
export default {
  build: { output: { path: 'build_production' } },
  css: {
    inline: {
      styleToAttribute: {
        width: 'width',
        height: 'height',
        'background-color': 'bgcolor',
        'text-align': 'align',
        'vertical-align': 'valign',
      },
    },
    shorthand: true,
  },
  minify: {
    html: { lineLengthLimit: 500, removeIndentations: true, breakToTheLeftOf: [] },
  },
  prettify: true,
}
```

### `tailwind.config.js`

```js
module.exports = {
  presets: [require('tailwindcss-preset-email')],
  content: ['./components/**/*.html', './emails/**/*.html', './layouts/**/*.html'],
  theme: {
    extend: {
      fontFamily: {
        base: ['Verdana', 'Helvetica', 'sans-serif'],
      },
    },
  },
}
```

## Email Client Compatibility

| Feature | Implementation |
|---|---|
| Outlook layout | `<outlook>` / `<not-outlook>` conditional tags |
| Outlook backgrounds | VML `<v:rect>` / `<v:fill>` via `<x-v-fill>` |
| Outlook buttons | VML `v:roundrect` with `mso-text-raise` |
| Gmail responsive | `u + .body .gmailResponsiveCol` CSS selector |
| Dark mode | `dark:` Tailwind variants + `color-scheme: light dark` |
| Mobile responsive | `sm:` breakpoint prefix (mobile-first) |
| Image paths | `src-production=""` attribute for build-time replacement |
| Font fallback | Verdana → Helvetica → sans-serif stack |

## Documentation

- [Maizzle Documentation](https://maizzle.com)
- [Tailwind CSS Email Preset](https://github.com/maizzle/tailwindcss-preset-email)

## License

MIT
