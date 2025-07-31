import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function handleLogin(
  router: { push: (path: string) => void },
  showLoginDialog?: () => void
) {
  const loginMode = process.env.NEXT_PUBLIC_LOGIN_MODE || 'page';

  if (loginMode === 'page') {
    router.push('/login');
  } else if (showLoginDialog) {
    showLoginDialog();
  }
}

export const getDomain = (url: string) => {
  try {
    const urlWithProtocol = url.startsWith('http') ? url : `https://${url}`;
    const domain = new URL(urlWithProtocol).hostname;
    return domain.replace(/^www\./, '');
  } catch (error) {
    return url;
  }
};

export const formatCurrency = (
  amount: number | null | undefined,
  currency: string | null | undefined
): string => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return "-";
  }
  const effectiveCurrency = currency || process.env.NEXT_PUBLIC_DEFAULT_CURRENCY || "usd";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: effectiveCurrency.toUpperCase(),
    }).format(amount);
  } catch (e) {
    console.error("Error formatting currency:", e);
    return `${amount.toFixed(2)} ${effectiveCurrency.toUpperCase()}`;
  }
};


export const getURL = (path: string = '') => {
  let url =
    process.env.NEXT_PUBLIC_SITE_URL ??
    'http://localhost:3000';
  url = url.includes('http') ? url : `https://${url}`;
  url = url.charAt(url.length - 1) === '/' ? url : `${url}/`;
  url = `${url}${path}`;
  return url;
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (!+bytes) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}