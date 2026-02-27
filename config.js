/*
|-------------------------------------------------------------------------------
| Development config                      https://maizzle.com/docs/environments
|-------------------------------------------------------------------------------
|
| This is the base configuration that Maizzle will use when you run commands
| like `npm run build` or `npm run dev`. Additional config files will
| inherit these settings, and can override them when necessary.
|
*/

import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const locale = process.env.LOCALE || 'fr'
const localePath = join(__dirname, `locales/${locale}.json`)

if (!existsSync(localePath)) {
  throw new Error(`❌ Fichier de traduction introuvable : ${localePath}`)
}

/** @type {import('@maizzle/framework').Config} */
const t = JSON.parse(readFileSync(localePath, 'utf8'))

export default {
  build: {
    content: ['emails/**/*.html'],
    static: {
      source: ['images/**/*.*'],
      destination: 'images',
    },
    output: {
      path: `build_${locale}`,
    }
  },
  language: locale,
  contents: t,
}