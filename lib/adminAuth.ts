export function isAdminPasswordConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD);
}

export function validateAdminPassword(password: unknown) {
  return typeof password === "string" && Boolean(process.env.ADMIN_PASSWORD) && password === process.env.ADMIN_PASSWORD;
}
