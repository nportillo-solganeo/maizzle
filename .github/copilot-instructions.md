# Copilot Instructions

This is a [Maizzle](https://maizzle.com) project for building HTML emails with Tailwind CSS.
Use maizzle documentation as reference: https://maizzle.com/docs/

## Commands

```bash
npm run dev    # Development server with live reload at http://localhost:3000
npm run build  # Build production emails to build_production/

# Post-build: extract sections for Salesforce Marketing Cloud
node scripts/sectionExtractor.js
```

## Architecture

Emails are assembled from three layers:

1. **`emails/*.html`** — Individual templates with YAML frontmatter
2. **`layouts/main.html`** — HTML shell (doctype, head, body, preheader logic)
3. **`components/**/\*.html`\*\* — Reusable blocks (button, spacer, divider, etc.)

Templates reference layouts and components via `<x-{name}>` tags:

```html
---
bodyClass: bg-slate-50
preheader: Preview text shown in inbox
---

<x-main>
  <x-atoms.button href="https://example.com" class="bg-slate-950">
    Click me
  </x-atoms.button>
</x-main>
```

- YAML frontmatter variables are available as `page.*` in layouts
- Nested components use dot notation: `<x-atoms.button>` → `components/atoms/button.html`
- `<yield />` in layouts/components marks where child content is inserted

## Component Logic

Components with dynamic behavior use a `<script props>` block at the top:

```html
<script props>
  module.exports = {
    href: props.href,
    styles: "display: inline-block; ...",
  };
</script>

<a href="{{{ href }}}" style="{{ styles }}"><yield /></a>
```

- `props` — object of attributes passed to the component
- `{{{ value }}}` — unescaped output (use for URLs, HTML)
- `{{ value }}` — escaped output (use for text)
- `attributes` — special attribute that forwards all props as HTML attributes

## Key Conventions

**Table-based layout** — Use `<table>` structures, not `<div>` layouts. Email clients require this.

**Outlook/MSO support** — Use `<outlook>` tags for VML/conditional content and `mso-*` utility classes:

```html
<outlook>
  <i style="mso-text-raise: 16px;" hidden>&emsp;</i>
</outlook>
```

**Responsive classes** — Use `sm:` prefix for mobile styles (inverted from web — `sm:` targets small/mobile viewports in email).

**Image paths** — Use `src` for dev and `src-production` for the built path:

```html
<img src="logo.png" src-production="images/logo.png" />
```

**Salesforce Marketing Cloud extraction** — Mark sections with `data-sfmc-extract="block-name"` to extract them as standalone files after build. The script outputs to `build_production/emailSections/`.

**Custom CSS** — `css/custom.css` is imported in the layout and supports `@apply` directives. It is processed before Tailwind utilities.

## Build Pipeline

| Phase        | Dev                 | Production            |
| ------------ | ------------------- | --------------------- |
| CSS inlining | ❌                  | ✅ (via `css.inline`) |
| CSS purge    | ❌                  | ✅                    |
| Minify HTML  | ❌                  | ✅ (`minify.html`)    |
| Output path  | in-memory / browser | `build_production/`   |

Production config (`config.production.js`) extends `config.js`. Only changed keys need to be present in the production file.
