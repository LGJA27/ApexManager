export const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    venueLimit: 1,
    scanLimit: 10,
    features: [
      '1 venue',
      '10 AI invoice scans/month',
      '30 days sales history',
      'Basic dashboard'
    ]
  },
  starter: {
    name: 'Starter',
    monthlyPrice: 19,
    annualPrice: 190,
    venueLimit: 1,
    scanLimit: 999999,
    stripePriceMonthly: import.meta.env.VITE_STRIPE_PRICE_STARTER_MONTHLY,
    stripePriceAnnual: import.meta.env.VITE_STRIPE_PRICE_STARTER_ANNUAL,
    features: [
      '1 venue',
      'Unlimited AI invoice scans',
      'Full sales history',
      'CSV export',
      'Full analytics'
    ]
  },
  growth: {
    name: 'Growth',
    monthlyPrice: 49,
    annualPrice: 490,
    venueLimit: 3,
    scanLimit: 999999,
    stripePriceMonthly: import.meta.env.VITE_STRIPE_PRICE_GROWTH_MONTHLY,
    stripePriceAnnual: import.meta.env.VITE_STRIPE_PRICE_GROWTH_ANNUAL,
    popular: true,
    features: [
      'Up to 3 venues',
      'Unlimited AI invoice scans',
      'Full sales history',
      'CSV export',
      'Full analytics',
      'PDF reports'
    ]
  },
  pro: {
    name: 'Pro',
    monthlyPrice: 99,
    annualPrice: 990,
    venueLimit: 999,
    scanLimit: 999999,
    stripePriceMonthly: import.meta.env.VITE_STRIPE_PRICE_PRO_MONTHLY,
    stripePriceAnnual: import.meta.env.VITE_STRIPE_PRICE_PRO_ANNUAL,
    features: [
      'Unlimited venues',
      'Unlimited AI invoice scans',
      'Full sales history',
      'CSV export',
      'Full analytics',
      'PDF reports',
      'Priority support'
    ]
  }
}
