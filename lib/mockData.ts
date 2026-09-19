export interface SmsServiceItem {
  id: string
  name: string
  code: string
  category: string
  price: number // XAF
  popular?: boolean
  iconName: string
}

export interface CountryItem {
  code: string
  name: string
  flag: string
  prefix: string
}

export interface SmmServiceItem {
  id: number
  name: string
  category: string
  rate: number // price per 1000 XAF
  usdRate?: number // exact USD price
  min: number
  max: number
  avgTime: string
  startTime?: string
  speed?: string
  guaranteed?: string
  description: string
  watermarkIcons?: string
}

export interface AccountProductItem {
  id: string
  title: string
  category: 'Social Media Accounts' | 'Streaming Subscriptions' | 'VPN Services' | 'Monetization & Recovery'
  price: number // XAF
  originalPrice?: number
  badge?: string
  description: string
  deliveryType: 'Manual delivery' | 'Instant delivery'
  rating: number
  soldCount: number
  image: string
}

export const PLATFORM_INFO = {
  name: 'Premium Verify',
  domain: 'premiumverific.com',
  phone: '237680209047',
  email: 'hello@premiumverific.com',
  whatsappUrl: 'https://wa.me/237680209047',
  currency: 'XAF',
}

export const SMS_SERVICES: SmsServiceItem[] = [
  { id: 'fb', name: 'Facebook / Meta Viewpoints', code: 'fb', category: 'Social', price: 642, popular: true, iconName: 'Facebook' },
  { id: 'wa', name: 'Whatsapp', code: 'wa', category: 'Messaging', price: 105, popular: true, iconName: 'MessageSquare' },
  { id: 'tg', name: 'Telegram', code: 'tg', category: 'Messaging', price: 900, popular: true, iconName: 'Send' },
  { id: 'tt', name: 'TikTok/Douyin', code: 'tt', category: 'Social', price: 1048, popular: true, iconName: 'Video' },
  { id: 'ig', name: 'Instagram', code: 'ig', category: 'Social', price: 450, popular: false, iconName: 'Camera' },
  { id: 'go', name: 'Google / Gmail / YouTube', code: 'go', category: 'Search', price: 520, popular: false, iconName: 'Mail' },
  { id: 'oa', name: 'OpenAI / ChatGPT', code: 'oa', category: 'AI', price: 750, popular: false, iconName: 'Bot' },
  { id: 'nf', name: 'Netflix', code: 'nf', category: 'Streaming', price: 380, popular: false, iconName: 'Tv' },
  { id: 'pp', name: 'PayPal', code: 'pp', category: 'Finance', price: 890, popular: false, iconName: 'CreditCard' },
  { id: 'ds', name: 'Discord', code: 'ds', category: 'Messaging', price: 410, popular: false, iconName: 'MessageCircle' },
  { id: 'tw', name: 'Twitter / X', code: 'tw', category: 'Social', price: 710, popular: false, iconName: 'Twitter' },
  { id: 'td', name: 'Tinder', code: 'td', category: 'Dating', price: 650, popular: false, iconName: 'Heart' },
]

export const COUNTRIES: CountryItem[] = [
  { code: 'US', name: 'United States', flag: '🇺🇸', prefix: '+1' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', prefix: '+44' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', prefix: '+1' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', prefix: '+61' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', prefix: '+55' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽', prefix: '+52' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', prefix: '+34' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭', prefix: '+66' },
  { code: 'CM', name: 'Cameroon', flag: '🇨🇲', prefix: '+237' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', prefix: '+234' },
  { code: 'FR', name: 'France', flag: '🇫🇷', prefix: '+33' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', prefix: '+49' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', prefix: '+27' },
]

export const SMM_CATEGORIES = [
  'CoinMarketCap',
  'Instagram us AI Growth Package',
  'Google Maps Citations',
  'Telegram Members',
  'Instagram Followers & Likes',
  'YouTube Views & Monetization',
  'TikTok Followers & Views',
  'Facebook Page & Video Boost',
  'Twitter / X Followers & Engagement',
  'Discord Members & Server Boosts',
  'Google Business Reviews',
  'Spotify & Twitch Engagement',
]

export const SMM_SERVICES: SmmServiceItem[] = [
  // CoinMarketCap Services (Screenshot 4)
  {
    id: 10110,
    name: 'CoinMarketCap Followers [Max: 1M] [Start Time: 0 - 24 Hours] [Refill: 30D] [Speed: Up to 50K/D]',
    category: 'CoinMarketCap',
    rate: 742,
    usdRate: 1.2375,
    min: 10,
    max: 1000000,
    avgTime: '9 minutes',
    startTime: '0 - 24 Hours',
    speed: 'Up to 50K/D',
    guaranteed: '30 Days Refill',
    description: 'High quality CoinMarketCap account followers to boost coin listing authority and popularity rankings.'
  },
  {
    id: 10111,
    name: 'CoinMarketCap Likes [Max: 1M] [Start Time: 0 - 24 Hours] [Refill: 30D] [Speed: Up to 50K/D]',
    category: 'CoinMarketCap',
    rate: 637,
    usdRate: 1.0625,
    min: 10,
    max: 1000000,
    avgTime: '3 minutes',
    startTime: '0 - 24 Hours',
    speed: 'Up to 50K/D',
    guaranteed: '30 Days Refill',
    description: 'Instant CoinMarketCap post likes from real active profiles.'
  },

  // Instagram us AI Growth Package (Screenshot 1)
  {
    id: 8751,
    name: 'Instagram us AI Growth Package [MONTHLY PACKAGE] [STANDARD] [~1K Followers/Month] - $41.25',
    category: 'Instagram us AI Growth Package',
    rate: 24750,
    usdRate: 41.25,
    min: 1,
    max: 1,
    avgTime: '90 hours 31 minutes',
    startTime: 'N/A',
    speed: 'N/A',
    guaranteed: 'N/A',
    description: `• US Targeted Engagement\n• AI Growth Tool\n• Our Artificial Intelligence Software will boost your account!\n• 100% natural, no bots, no tricks. We find your audience and make them your organic followers.\n• Our system works to find target followers for you 24 hours a day, exposing your content to them and driving real audience conversion.`
  },
  {
    id: 8752,
    name: 'Instagram us AI Growth Package [MONTHLY PACKAGE] [PRO] [~3K Followers/Month] - $88.75',
    category: 'Instagram us AI Growth Package',
    rate: 53250,
    usdRate: 88.75,
    min: 1,
    max: 1,
    avgTime: '90 hours 31 minutes',
    startTime: 'N/A',
    speed: 'N/A',
    guaranteed: 'N/A',
    description: `• US High Authority AI Growth Engagement\n• 3,000 Real Target US Followers per Month\n• 100% Natural Organic Growth using Artificial Intelligence target matching.`
  },
  {
    id: 8753,
    name: 'Instagram us AI Growth Package [MONTHLY PACKAGE] [PREMIUM] [~5K Followers/Month] - $137.50',
    category: 'Instagram us AI Growth Package',
    rate: 82500,
    usdRate: 137.50,
    min: 1,
    max: 1,
    avgTime: '90 hours 31 minutes',
    startTime: 'N/A',
    speed: 'N/A',
    guaranteed: 'N/A',
    description: `• VIP US AI Growth Package\n• ~5,000 Real Target US Followers per Month\n• Dedicated AI Account Manager matching audience niches.`
  },

  // Google Maps Citations (Screenshot 2)
  {
    id: 6256,
    name: 'Google Maps Citations [Package] [Read Description] [Refill: No] [Min/Max: 100] [Start Time: 0-24 Hours] [Speed: 100/Day]',
    category: 'Google Maps Citations',
    rate: 9000000,
    usdRate: 15000.00,
    min: 100,
    max: 100,
    avgTime: 'N/A',
    startTime: '0-24 Hours',
    speed: '100/Day',
    guaranteed: 'Refill: No',
    description: `2. 3-5 Keywords in Ticket with ORDER ID. Separate each keyword with Comma.\nExample - Keyword 1, Keyword 2, Keyword 3, Keyword 4, Keyword 5`
  },
  {
    id: 6257,
    name: 'Google Maps Citations [Package] [Read Description] [Refill: No] [Min/Max: 300] [Start Time: 0-24 Hours] [Speed: 100/Day]',
    category: 'Google Maps Citations',
    rate: 15000000,
    usdRate: 25000.00,
    min: 300,
    max: 300,
    avgTime: 'N/A',
    startTime: '0-24 Hours',
    speed: '100/Day',
    guaranteed: 'Refill: No',
    description: `Google Maps Citations Boost (300 Locations)\nProvide 3-5 keywords separated by commas in ticket.`
  },

  // Telegram Members (Screenshot 3)
  {
    id: 7102,
    name: 'Telegram Members [Refill: 7D] [Start Time: 0 - 1 Hr] [Max: 30K] [Speed: 20K/D] 💧 ⛔',
    category: 'Telegram Members',
    rate: 88,
    usdRate: 0.1475,
    min: 20,
    max: 100000,
    avgTime: '1 hour 53 minutes',
    startTime: '0 - 1 Hr',
    speed: '20K/D',
    guaranteed: '7 Days Refill',
    watermarkIcons: '💧 ⛔',
    description: 'High speed real Telegram channel subscribers with 7-day refill guarantee.'
  },
  {
    id: 7158,
    name: 'Telegram Members [Refill: 7D] [Start Time: 0 - 1 Hr] [Max: 30K] [Speed: 20K/D] ⛔',
    category: 'Telegram Members',
    rate: 86,
    usdRate: 0.1438,
    min: 20,
    max: 100000,
    avgTime: '1 hour 40 minutes',
    startTime: '0 - 1 Hr',
    speed: '20K/D',
    guaranteed: '7 Days Refill',
    watermarkIcons: '⛔',
    description: 'Fast active Telegram members for public and private channels.'
  },
  {
    id: 7330,
    name: 'Telegram Members [MIX] [Refill: 3 Days] [Max: 150K] [Start Time: 0-1 Hour] [Speed: 100K/Day]',
    category: 'Telegram Members',
    rate: 95,
    usdRate: 0.1594,
    min: 100,
    max: 150000,
    avgTime: '45 minutes',
    startTime: '0-1 Hour',
    speed: '100K/Day',
    guaranteed: '3 Days Refill',
    description: 'Ultra high speed bulk Telegram members delivery up to 100k per day.'
  },
  {
    id: 8523,
    name: 'Telegram Members [Refill: 30D] [Start Time: 0 - 1 Hr] [Max: 30K] [Speed: 20K/D] 💧 ⛔',
    category: 'Telegram Members',
    rate: 153,
    usdRate: 0.2554,
    min: 100,
    max: 30000,
    avgTime: '1 hour 15 minutes',
    startTime: '0 - 1 Hr',
    speed: '20K/D',
    guaranteed: '30 Days Refill',
    watermarkIcons: '💧 ⛔',
    description: 'Non-Drop 30 days guaranteed Telegram channel members.'
  },
  {
    id: 1165,
    name: 'Telegram PREMIUM BOT START [Start Time: 0 - 1 Hr] [Refill: 90D] [Max: 30K] [Speed: 30K/Day] 💧',
    category: 'Telegram Members',
    rate: 2625,
    usdRate: 4.375,
    min: 100,
    max: 30000,
    avgTime: '2 hours',
    startTime: '0 - 1 Hr',
    speed: '30K/Day',
    guaranteed: '90 Days Refill',
    watermarkIcons: '💧',
    description: 'Telegram Premium Star Bot activation for channel monetization eligibility.'
  },

  // Instagram Standard Services
  { id: 101, name: 'Instagram Followers [Real & Active Profiles - Non Drop]', category: 'Instagram Followers & Likes', rate: 1200, usdRate: 2.00, min: 50, max: 100000, avgTime: '15 mins', startTime: '0-1 Hr', speed: '10K/Day', guaranteed: '30 Days', description: 'Real active Instagram followers with profile photos and posts. Auto refill guaranteed.' },
  { id: 102, name: 'Instagram Post Likes [Instant Speed]', category: 'Instagram Followers & Likes', rate: 450, usdRate: 0.75, min: 10, max: 100000, avgTime: '5 mins', startTime: 'Instant', speed: '50K/Day', guaranteed: 'Non-Drop', description: 'Super fast instant likes delivered within minutes of posting.' },
  { id: 103, name: 'Instagram Reels Views + Reach Algorithm Boost', category: 'Instagram Followers & Likes', rate: 250, usdRate: 0.41, min: 100, max: 1000000, avgTime: '10 mins', startTime: 'Instant', speed: '500K/Day', guaranteed: 'No Drop', description: 'Pushes your Reel to the explore page with organic engagement signals.' },

  // YouTube Services
  { id: 201, name: 'YouTube High Retention Video Views (5-10 Mins Watch)', category: 'YouTube Views & Monetization', rate: 1800, usdRate: 3.00, min: 100, max: 500000, avgTime: '1 hour', startTime: '0-2 Hrs', speed: '20K/Day', guaranteed: 'Lifetime', description: 'High watch time retention views suitable for video ranking and YouTube SEO.' },
  { id: 202, name: 'YouTube Real Subscribers [Non-Drop Guarantee]', category: 'YouTube Views & Monetization', rate: 8500, usdRate: 14.16, min: 50, max: 10000, avgTime: '24 hours', startTime: '1-6 Hrs', speed: '1K/Day', guaranteed: 'Refill 30D', description: 'Real channel subscribers to hit YouTube Partner Program requirements.' },
  { id: 203, name: 'YouTube Monetization Package (4,000 Watch Hours + 1,000 Subs)', category: 'YouTube Views & Monetization', rate: 45000, usdRate: 75.00, min: 1, max: 10, avgTime: '3 days', startTime: '24 Hours', speed: 'Custom', guaranteed: '100% Monetized', description: 'Guaranteed AdSense monetization approval boost package.' },

  // TikTok Services
  { id: 301, name: 'TikTok Video Views [Ultra Fast FYP Speed]', category: 'TikTok Followers & Views', rate: 150, usdRate: 0.25, min: 1000, max: 10000000, avgTime: '2 mins', startTime: 'Instant', speed: '1M/Day', guaranteed: 'No Drop', description: 'Instant TikTok views to trigger FYP algorithm recommendations.' },
  { id: 302, name: 'TikTok Real Followers [Monetization Ready]', category: 'TikTok Followers & Views', rate: 2200, usdRate: 3.66, min: 100, max: 100000, avgTime: '20 mins', startTime: '0-1 Hr', speed: '10K/Day', guaranteed: 'Refill 30D', description: 'Unlocks live streaming and Creator Rewards program on TikTok.' },

  // Facebook Services
  { id: 401, name: 'Facebook Page Likes & Followers Combined', category: 'Facebook Page & Video Boost', rate: 1900, usdRate: 3.16, min: 100, max: 50000, avgTime: '45 mins', startTime: '0-2 Hrs', speed: '5K/Day', guaranteed: 'Refill 30D', description: 'Dual boost for Page Likes and Followers count.' },
  { id: 403, name: 'Facebook Account Rescue / Hacked Recovery Consultation', category: 'Facebook Page & Video Boost', rate: 20000, usdRate: 33.33, min: 1, max: 5, avgTime: '12 hours', startTime: '1 Hour', speed: '1:1 Recovery', guaranteed: '100% Resolved', description: 'Expert technical rescue service for compromised, hacked, or disabled Facebook profiles.' },

  // Twitter / X & Discord
  { id: 601, name: 'Twitter / X Followers [Real Global Profiles]', category: 'Twitter / X Followers & Engagement', rate: 3100, usdRate: 5.16, min: 50, max: 20000, avgTime: '1 hour', startTime: '0-1 Hr', speed: '2K/Day', guaranteed: '30 Days', description: 'High authority X platform followers.' },
  { id: 701, name: 'Discord Server Members [Online + Offline mixed]', category: 'Discord Members & Server Boosts', rate: 2800, usdRate: 4.66, min: 100, max: 10000, avgTime: '30 mins', startTime: 'Instant', speed: '5K/Day', guaranteed: 'Non Drop', description: 'Boost server member count for social proof.' },
  { id: 801, name: 'Google 5-Star Business Map Reviews (Positive Written)', category: 'Google Business Reviews', rate: 4500, usdRate: 7.50, min: 5, max: 100, avgTime: '24 hours', startTime: '6 Hours', speed: '5/Day', guaranteed: 'Permanent', description: 'Positive 5-star Google Map business reviews written by local accounts.' },
  { id: 901, name: 'Spotify Playlist Followers & Track Plays', category: 'Spotify & Twitch Engagement', rate: 1500, usdRate: 2.50, min: 500, max: 50000, avgTime: '2 hours', startTime: '0-2 Hrs', speed: '10K/Day', guaranteed: 'No Drop', description: 'Real listener plays for Spotify artist profiles.' },
]

export const ACCOUNT_PRODUCTS: AccountProductItem[] = [
  {
    id: 'usa-tiktok',
    title: 'USA TikTok Account',
    category: 'Social Media Accounts',
    price: 2000,
    originalPrice: 3000,
    badge: '33% OFF Featured',
    description: 'High authority USA TikTok Account. Creator Rewards Program enabled, ready for monetization.',
    deliveryType: 'Manual delivery',
    rating: 4.9,
    soldCount: 142,
    image: '/images/tiktok-logo.png'
  },
  {
    id: 'uk-tiktok',
    title: 'UK TikTok Account',
    category: 'Social Media Accounts',
    price: 2500,
    originalPrice: 3500,
    badge: 'Popular',
    description: 'Fresh UK TikTok Account created in United Kingdom region. Creator Fund & TikTok Shop ready.',
    deliveryType: 'Instant delivery',
    rating: 4.8,
    soldCount: 98,
    image: '/images/tiktok-uk.png'
  },
  {
    id: 'verified-fb',
    title: 'Verified Facebook Account (2FA Enabled)',
    category: 'Social Media Accounts',
    price: 4500,
    originalPrice: 6000,
    badge: 'High Quality',
    description: 'Aged 2018+ Facebook account with ID verification, active friends, and 2FA authentication code.',
    deliveryType: 'Instant delivery',
    rating: 5.0,
    soldCount: 215,
    image: '/images/facebook-acc.png'
  },
  {
    id: 'fb-rescue',
    title: 'Facebook Hacking & Rescue Recovery Service',
    category: 'Monetization & Recovery',
    price: 20000,
    originalPrice: 30000,
    badge: 'Guaranteed',
    description: 'Expert technical rescue service for compromised, hacked, or disabled Facebook profiles & pages.',
    deliveryType: 'Manual delivery',
    rating: 4.9,
    soldCount: 64,
    image: '/images/rescue.png'
  },
  {
    id: 'yt-monetization',
    title: 'YouTube Monetization Package (4k Hours + 1k Subs)',
    category: 'Monetization & Recovery',
    price: 45000,
    originalPrice: 60000,
    badge: 'Best Value',
    description: 'Complete monetization boost setup to get your YouTube channel approved for AdSense revenue.',
    deliveryType: 'Manual delivery',
    rating: 4.95,
    soldCount: 180,
    image: '/images/youtube-mon.png'
  },
  {
    id: 'netflix-prem',
    title: 'Netflix Premium 4K UHD Account',
    category: 'Streaming Subscriptions',
    price: 4000,
    originalPrice: 6000,
    badge: 'Featured',
    description: 'Stream unlimited Netflix content in stunning 4K Ultra HD at unbeatable price. 1 Month duration.',
    deliveryType: 'Manual delivery',
    rating: 4.85,
    soldCount: 310,
    image: '/images/netflix.png'
  },
  {
    id: 'express-vpn',
    title: 'ExpressVPN Premium 1-Year Access',
    category: 'VPN Services',
    price: 6000,
    originalPrice: 12000,
    badge: '50% OFF',
    description: 'Ultra fast secure VPN with 3,000+ servers worldwide for smooth streaming and unblocking.',
    deliveryType: 'Instant delivery',
    rating: 5.0,
    soldCount: 178,
    image: '/images/expressvpn.png'
  },
]
