# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Maizzle is a framework for building HTML emails with Tailwind CSS. This is a starter project that compiles email templates into production-ready HTML with inlined CSS, optimized for email clients.

## Development Commands

- `npm run dev` - Start development server with live reload at http://localhost:3000
- `npm run build` - Build production emails (outputs to `build_production/`)

## Architecture

### Template Structure

Emails are built using a hierarchical component system:

1. **Emails** (`emails/*.html`) - Individual email templates with YAML frontmatter for configuration
2. **Layouts** (`layouts/*.html`) - Wrapper templates that provide HTML structure and meta tags
3. **Components** (`components/*.html`) - Reusable email components (buttons, spacers, dividers, etc.)

### Email Template Anatomy

```html
---
bodyClass: bg-slate-50
preheader: Email subject line preview text
---

<x-main>
  <!-- Email content using Tailwind classes and custom components -->
  <x-button href="https://example.com">Click me</x-button>
</x-main>
```

- YAML frontmatter defines page variables accessible via `page.*` in layouts
- `<x-{name}>` syntax references layouts and components
- `<yield />` in layouts renders the email content

### Component System

Components can have logic via `<script props>`:

```html
<script props>
  module.exports = {
    href: props.href,
    styles: "display: inline-block;",
  };
</script>

<a href="{{{ href }}}" style="{{ styles }}">
  <yield />
</a>
```

- `props` object contains attributes passed to component
- Export variables to use in template
- Use `{{{ }}}` for unescaped HTML, `{{ }}` for escaped
- `<yield />` renders component content/children

### Configuration Files

- `config.js` - Base configuration for development
  - Defines content sources (`emails/**/*.html`)
  - Static asset handling (images)

- `config.production.js` - Production overrides
  - Enables CSS inlining (`inline: true`)
  - Purges unused CSS (`purge: true`)
  - Converts CSS longhand to shorthand (`shorthand: true`)
  - Prettifies output HTML

- `tailwind.config.js` - Tailwind CSS configuration
  - Uses `tailwindcss-preset-email` for email-safe utilities
  - Scans all HTML files for class names

### Email-Specific Features

**Outlook/MSO Support:**

- Components include `<outlook>` tags for Outlook-specific code
- MSO conditional comments in layouts (`<!--[if mso]>`)
- Use `mso-*` utility classes for Outlook styling

**Preheader:**

- Defined in frontmatter: `preheader: Preview text`
- Automatically hidden and padded with invisible characters
- Appears in email client preview pane

**Image Paths:**

- Development: Use relative paths (e.g., `src="logo.png"`)
- Production: Use `src-production` attribute for build-time path replacement

**Tailwind in Emails:**

- Use email-safe utilities from `tailwindcss-preset-email`
- Classes are processed by `@tailwind` directives in layout `<style>` tag
- Production build inlines all CSS into `style=""` attributes

### Directory Structure

```
emails/          - Email templates (transactional, newsletter, etc.)
layouts/         - Layout wrappers (main.html, newsletter.html)
components/      - Reusable components (button, spacer, divider, etc.)
images/          - Static assets copied to build output
build_production/ - Production build output (gitignored)
```

## Important Notes

- Always test emails in development server before building
- Production builds enable CSS inlining - styles will be converted to inline `style=""` attributes
- Table-based layouts are used for email client compatibility (not div-based)
- Use `sm:` prefix for responsive classes (mobile viewports)
- Avoid modern CSS features not supported in email clients (Grid, Flexbox limited)
- be careful with email compatibility over email clients such as outlook and gmail
- answer in french
