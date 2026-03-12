export function getDesktopApi() {
  return typeof window !== 'undefined' ? window.desktopAPI ?? null : null
}

export function isDesktopRuntime() {
  return Boolean(getDesktopApi())
}

export async function getRuntimeInfo() {
  const api = getDesktopApi()
  if (!api) {
    return {
      isDesktop: false,
      platform: 'web',
      version: null,
      userDataPath: null,
      licensePath: null,
    }
  }

  return api.getRuntimeInfo()
}

export async function getLicenseStatus() {
  const api = getDesktopApi()
  if (!api) {
    return {
      isDesktop: false,
      required: false,
      valid: true,
      reason: 'web',
      message: 'רישיון מקומי אינו נדרש בגרסת הדפדפן.',
    }
  }

  return api.getLicenseStatus()
}

export async function importLicense() {
  const api = getDesktopApi()
  if (!api) {
    return {
      canceled: true,
      valid: false,
      message: 'ייבוא רישיון זמין רק באפליקציית הדסקטופ.',
    }
  }

  return api.importLicense()
}

export async function getOfflinePackageInfo() {
  const api = getDesktopApi()
  if (!api) {
    return {
      isDesktop: false,
      productName: 'KidsQuiz Offline',
      outputDirectory: 'release',
    }
  }

  return api.getOfflinePackageInfo()
}
