import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import crypto from 'node:crypto'

const LICENSE_SECRET = process.env.KQ_LICENSE_SECRET || 'kidsquiz-offline-license-secret'
const DEFAULT_DURATION_DAYS = 180

function getArg(name, fallback = '') {
  const prefix = `--${name}=`
  const match = process.argv.find(argument => argument.startsWith(prefix))
  return match ? match.slice(prefix.length) : fallback
}

function createSignature(payload) {
  return crypto.createHmac('sha256', LICENSE_SECRET).update(JSON.stringify(payload)).digest('hex')
}

function createLicenseId() {
  return `KQ-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
}

const customerName = getArg('customerName')
const customerId = getArg('customerId')
const licenseId = getArg('licenseId', createLicenseId())
const issuedAt = getArg('issuedAt', new Date().toISOString().slice(0, 10))
const durationDays = Number(getArg('durationDays', String(DEFAULT_DURATION_DAYS)))
const notes = getArg('notes')
const outputPath = resolve(getArg('out', 'release/licenses/license.json'))

if (!customerName) {
  console.error('יש לספק customerName.')
  process.exit(1)
}

const payload = {
  customerName,
  customerId,
  licenseId,
  issuedAt,
  durationDays,
  notes,
}

const license = {
  ...payload,
  signature: createSignature(payload),
}

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, JSON.stringify(license, null, 2), 'utf8')

console.log(`נוצר קובץ רישיון: ${outputPath}`)
console.log(`מספר רישיון: ${licenseId}`)
console.log(`משך שימוש: ${durationDays} ימים מהפעלה ראשונה`)
