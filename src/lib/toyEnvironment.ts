export function isBilibiliToyEnvironment() {
  const host = window.location.hostname.toLowerCase()
  return (host === 'bilibili.com' || host.endsWith('.bilibili.com')) && window.location.pathname.startsWith('/toy/')
}
