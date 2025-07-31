// Allowed redirect domain name white list
// 允许的重定向域名白名单
// 許可されたリダイレクトドメイン名のホワイトリスト
const ALLOWED_REDIRECT_HOSTS = (
  process.env.NODE_ENV === 'development'
    ? (process.env.ALLOWED_REDIRECT_HOSTS?.split(',') || [])
    : []
).concat(process.env.NEXT_PUBLIC_SITE_URL!).filter(Boolean) as string[]

export function isValidRedirectUrl(url: string): boolean {
  try {
    if (url.startsWith('/api/')) {
      return false;
    }

    if (url.startsWith('/')) {
      return true;
    }

    const parsedUrl = new URL(url)

    return ALLOWED_REDIRECT_HOSTS.includes(parsedUrl.host)
  } catch {
    return false
  }
}