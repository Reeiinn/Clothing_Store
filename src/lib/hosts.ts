const ADMIN_PREFIX = "admin.";

export function requestHost(headers: Headers) {
  return headers.get("x-forwarded-host") ?? headers.get("host") ?? "";
}

export function isAdminHost(host: string) {
  return host.startsWith(ADMIN_PREFIX);
}

export function adminHost(host: string) {
  return isAdminHost(host) ? host : ADMIN_PREFIX + host;
}

export function storeHost(host: string) {
  return isAdminHost(host) ? host.slice(ADMIN_PREFIX.length) : host;
}
