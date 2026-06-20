export const PLANS = {
  trial: {
    name: 'Free Trial',
    price: 0,
    venueLimit: 1,
    scanLimit: 999999,
    multiScan: true,
    durationDays: 7,
    features: [
      '1 venue',
      'Unlimited AI invoice scans',
      'Full sales history & date ranges',
      'Full analytics & audit reports',
      'Multi-invoice batch scanning',
      '7-day trial — no card required'
    ]
  },
  free: {
    name: 'Free',
    price: 0,
    venueLimit: 1,
    scanLimit: 0,
    multiScan: false,
    features: [
      '1 venue',
      'No AI scans (manual entry only)',
      'Last 7 days of dashboard data',
      'No analytics reports or audits'
    ]
  },
  starter: {
    name: 'Starter',
    monthlyPrice: 19,
    annualPrice: 190,
    venueLimit: 1,
    scanLimit: 30,
    multiScan: false,
    stripePriceMonthly: import.meta.env.VITE_STRIPE_PRICE_STARTER_MONTHLY,
    stripePriceAnnual: import.meta.env.VITE_STRIPE_PRICE_STARTER_ANNUAL,
    features: [
      '1 venue',
      '30 AI invoice scans/month',
      'Full sales history',
      'CSV export',
      'Full analytics & audit reports'
    ]
  },
  growth: {
    name: 'Growth',
    monthlyPrice: 49,
    annualPrice: 490,
    venueLimit: 3,
    scanLimit: 300,
    multiScan: true,
    stripePriceMonthly: import.meta.env.VITE_STRIPE_PRICE_GROWTH_MONTHLY,
    stripePriceAnnual: import.meta.env.VITE_STRIPE_PRICE_GROWTH_ANNUAL,
    popular: true,
    features: [
      'Up to 3 venues',
      '300 AI invoice scans/month',
      'Multi-invoice batch scanning',
      'Full sales history',
      'CSV export',
      'Full analytics & audit reports'
    ]
  },
  pro: {
    name: 'Pro',
    monthlyPrice: 99,
    annualPrice: 990,
    venueLimit: 10,
    scanLimit: 1000,
    multiScan: true,
    stripePriceMonthly: import.meta.env.VITE_STRIPE_PRICE_PRO_MONTHLY,
    stripePriceAnnual: import.meta.env.VITE_STRIPE_PRICE_PRO_ANNUAL,
    features: [
      'Up to 10 venues',
      '1000 AI invoice scans/month',
      'Multi-invoice batch scanning',
      'Full sales history',
      'CSV export',
      'Full analytics & audit reports',
      'Priority support'
    ]
  }
}
