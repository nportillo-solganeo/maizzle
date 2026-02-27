import { $ } from 'bun'

const [command, locale] = process.argv.slice(2)
const supported = (process.env.SUPPORTED_LOCALES ?? '').split(',').map(l => l.trim()).filter(Boolean)

if (command === 'build' && !locale) {
  console.error('Locale manquante. Usage : bun run build <locale>')
  console.error(`Locales disponibles : ${supported.join(', ')}`)
  process.exit(1)
}

const resolvedLocale = locale || supported[0] || 'fr'

if (supported.length > 0 && !supported.includes(resolvedLocale)) {
  console.error(`Locale "${resolvedLocale}" non déclarée dans .env (SUPPORTED_LOCALES)`)
  console.error(`Locales disponibles : ${supported.join(', ')}`)
  process.exit(1)
}

process.env.LOCALE = resolvedLocale

if (command === 'build') {
  console.log(`✅ Build pour la locale : ${resolvedLocale}`)
  await $`maizzle build production`
  await $`bun ./scripts/sectionExtractor.ts`
} else if (command === 'dev') {
  console.log(`🚀 Dev server — locale : ${resolvedLocale}`)
  await $`maizzle serve`
} else {
  console.error(`Commande inconnue "${command}". Utilisation : build <locale> | dev [locale]`)
  process.exit(1)
}
