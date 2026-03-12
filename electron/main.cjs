const { app, BrowserWindow, dialog, ipcMain } = require('electron')
const path = require('node:path')
const fs = require('node:fs')
const crypto = require('node:crypto')
const { pathToFileURL } = require('node:url')

const LICENSE_SECRET = process.env.KQ_LICENSE_SECRET || 'kidsquiz-offline-license-secret'
const DEFAULT_DURATION_DAYS = 180
const CLOCK_SKEW_TOLERANCE_MS = 10 * 60 * 1000

function getLicensePath() {
  return path.join(app.getPath('userData'), 'license.json')
}

function readJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return null
  }
}

function writeJsonFile(filePath, value) {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8')
    return true
  } catch {
    return false
  }
}

function normalizeSignedPayload(license) {
  if (license.licenseId || license.durationDays || license.issuedAt) {
    return {
      customerName: license.customerName || '',
      customerId: license.customerId || '',
      licenseId: license.licenseId || '',
      issuedAt: license.issuedAt || '',
      durationDays: Number(license.durationDays || DEFAULT_DURATION_DAYS),
      notes: license.notes || '',
    }
  }

  return {
    customerName: license.customerName || '',
    customerId: license.customerId || '',
    startDate: license.startDate || '',
    endDate: license.endDate || '',
    seats: license.seats || 1,
    notes: license.notes || '',
  }
}

function createLicenseSignature(payload) {
  return crypto.createHmac('sha256', LICENSE_SECRET).update(JSON.stringify(payload)).digest('hex')
}

function isActivationLicense(license) {
  return Boolean(license.licenseId || license.durationDays || license.issuedAt)
}

function addDays(date, days) {
  const value = new Date(date)
  value.setDate(value.getDate() + days)
  return value
}

function formatDate(date) {
  return new Date(date).toISOString()
}

function calculateDaysLeft(endDate) {
  const diffMs = new Date(endDate).getTime() - Date.now()
  return Math.max(0, Math.ceil(diffMs / 86400000))
}

function persistLicenseCopies(license, persistPaths = []) {
  persistPaths.forEach(filePath => {
    if (filePath) writeJsonFile(filePath, license)
  })
}

function validateLicense(license, options = {}) {
  const { persistPaths = [] } = options

  if (!license) {
    return { valid: false, reason: 'missing', message: 'לא נמצא קובץ רישיון מקומי.' }
  }

  const payload = normalizeSignedPayload(license)
  const expectedSignature = createLicenseSignature(payload)
  if (license.signature !== expectedSignature) {
    return { valid: false, reason: 'invalid_signature', message: 'חתימת הרישיון אינה תקינה.' }
  }

  if (isActivationLicense(license)) {
    const durationDays = Number(payload.durationDays || DEFAULT_DURATION_DAYS)
    const nextLicense = {
      ...license,
      activation: {
        ...(license.activation || {}),
      },
    }

    let mutated = false
    if (!nextLicense.activation.firstActivatedAt) {
      const nowIso = formatDate(new Date())
      nextLicense.activation.firstActivatedAt = nowIso
      nextLicense.activation.expiresAt = formatDate(addDays(nowIso, durationDays))
      nextLicense.activation.lastSeenAt = nowIso
      nextLicense.activation.activatedOn = app.getPath('userData')
      mutated = true
    }

    const activatedAt = new Date(nextLicense.activation.firstActivatedAt)
    const expiresAt = new Date(nextLicense.activation.expiresAt)
    const lastSeenAt = nextLicense.activation.lastSeenAt ? new Date(nextLicense.activation.lastSeenAt) : null
    const now = new Date()

    if (Number.isNaN(activatedAt.getTime()) || Number.isNaN(expiresAt.getTime())) {
      return { valid: false, reason: 'invalid_activation', message: 'נתוני ההפעלה של הרישיון אינם תקינים.' }
    }

    if (lastSeenAt && !Number.isNaN(lastSeenAt.getTime()) && now.getTime() + CLOCK_SKEW_TOLERANCE_MS < lastSeenAt.getTime()) {
      return { valid: false, reason: 'clock_rollback', message: 'זוהתה חריגה בשעון המערכת ולכן הרישיון ננעל.' }
    }

    if (now > expiresAt) {
      return {
        valid: false,
        reason: 'expired',
        message: 'תקופת האופליין הסתיימה. יש לחדש רישיון.',
        license: nextLicense,
      }
    }

    nextLicense.activation.lastSeenAt = formatDate(now)
    mutated = true

    if (mutated) {
      persistLicenseCopies(nextLicense, persistPaths)
    }

    const daysLeft = calculateDaysLeft(nextLicense.activation.expiresAt)
    return {
      valid: true,
      reason: 'ok',
      message: `הרישיון תקין. נותרו ${daysLeft} ימים לשימוש אופליין.`,
      license: {
        ...nextLicense,
        signedPayload: payload,
      },
    }
  }

  const start = new Date(payload.startDate)
  const end = new Date(payload.endDate)
  const now = new Date()

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { valid: false, reason: 'invalid_dates', message: 'תאריכי הרישיון אינם תקינים.' }
  }

  if (now < start) {
    return { valid: false, reason: 'not_started', message: 'הרישיון עדיין לא נכנס לתוקף.' }
  }

  if (now > end) {
    return { valid: false, reason: 'expired', message: 'תוקף הרישיון הסתיים.' }
  }

  return {
    valid: true,
    reason: 'ok',
    message: 'הרישיון תקין.',
    license: {
      ...license,
      signedPayload: payload,
    },
  }
}

function readLicenseFile() {
  const licensePath = getLicensePath()
  if (!fs.existsSync(licensePath)) return null
  return readJsonFile(licensePath)
}

function getLicenseStatus() {
  const licensePath = getLicensePath()
  return {
    isDesktop: true,
    required: true,
    licensePath,
    ...validateLicense(readLicenseFile(), { persistPaths: [licensePath] }),
  }
}

async function importLicenseFromDialog() {
  const window = BrowserWindow.getFocusedWindow()
  const result = await dialog.showOpenDialog(window, {
    title: 'בחירת קובץ רישיון',
    properties: ['openFile'],
    filters: [
      { name: 'License Files', extensions: ['json', 'kql'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  })

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true, ...getLicenseStatus() }
  }

  const sourcePath = result.filePaths[0]
  const license = readJsonFile(sourcePath)
  const localPath = getLicensePath()

  if (!license) {
    return {
      canceled: false,
      isDesktop: true,
      required: true,
      licensePath: localPath,
      valid: false,
      reason: 'invalid_file',
      message: 'קובץ הרישיון שנבחר אינו תקין.',
    }
  }

  writeJsonFile(localPath, license)
  const validation = validateLicense(readJsonFile(localPath), { persistPaths: [localPath, sourcePath] })

  return {
    canceled: false,
    isDesktop: true,
    required: true,
    licensePath: localPath,
    ...validation,
  }
}

function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1100,
    minHeight: 760,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })

  mainWindow.once('ready-to-show', () => mainWindow.show())

  const devServerUrl = process.env.ELECTRON_START_URL
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl)
    return
  }

  const indexPath = path.join(__dirname, '..', 'dist', 'index.html')
  mainWindow.loadURL(pathToFileURL(indexPath).toString())
}

ipcMain.handle('desktop:get-runtime-info', async () => ({
  isDesktop: true,
  platform: process.platform,
  version: app.getVersion(),
  userDataPath: app.getPath('userData'),
  licensePath: getLicensePath(),
}))
ipcMain.handle('desktop:get-license-status', async () => getLicenseStatus())
ipcMain.handle('desktop:import-license', async () => importLicenseFromDialog())
ipcMain.handle('desktop:get-offline-package-info', async () => ({
  isDesktop: true,
  productName: 'KidsQuiz Offline',
  outputDirectory: path.join(process.cwd(), 'release'),
}))

app.whenReady().then(() => {
  createMainWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
