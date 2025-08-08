import { SiteConfig } from "@/types/siteConfig";

export const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://imgenhancer.ai";

const GITHUB_URL = 'https://github.com/wenextdev'
const TWITTER_EN = 'https://x.com/judewei_dev'
const TWITTER_ZH = 'https://x.com/weijunext'
const BSKY_URL = 'https://bsky.app/profile/judewei.bsky.social'
const DISCORD_URL = process.env.NEXT_PUBLIC_DISCORD_INVITE_URL
const EMAIL_URL = 'mailto:hi@imgenhancer.ai'

export const siteConfig: SiteConfig = {
  name: "ImgEnhancer.ai",
  url: BASE_URL,
  authors: [
    {
      name: "ImgEnhancer.ai",
      url: "https://imgenhancer.ai",
    }
  ],
  creator: '@judewei_dev',
  socialLinks: {
    github: GITHUB_URL,
    bluesky: BSKY_URL,
    twitter: TWITTER_EN,
    twitterZh: TWITTER_ZH,
    discord: DISCORD_URL,
    email: EMAIL_URL,
  },
  themeColors: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
  defaultNextTheme: 'light', // next-theme option: system | dark | light
  icons: {
    icon: "/favicon.ico",
    shortcut: "/logo.png",
    apple: "/logo.png", // apple-touch-icon.png
  },
}
