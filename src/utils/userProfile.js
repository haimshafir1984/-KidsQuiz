export function isProfileComplete(user) {
  return Boolean(user?.firstName?.trim() && user?.lastName?.trim() && user?.city?.trim())
}

export function getUserDisplayName(user) {
  if (isProfileComplete(user)) {
    return `${user.firstName.trim()} ${user.lastName.trim()}`
  }

  return user?.username || ''
}
