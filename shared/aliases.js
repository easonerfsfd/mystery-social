import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const aliases = require('./aliases.json')

export function randomAlias() {
  return aliases[Math.floor(Math.random() * aliases.length)]
}
