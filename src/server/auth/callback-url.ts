export function safeCallbackUrl(url: unknown) {
  return typeof url === "string" && /^\/(?![/\\])/.test(url)
    ? url
    : "/products";
}
