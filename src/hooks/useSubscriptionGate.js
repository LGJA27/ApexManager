import { PLANS } from '../config/plans';

export function useSubscriptionGate(subscription) {
  const tier = subscription?.tier || 'free';
  const isTrial = tier === 'trial';
  const isFree = tier === 'free';
  const isPaid = !isTrial && !isFree;
  const plan = PLANS[tier] || PLANS.free;

  // Date range access: trial + all paid tiers get full range,
  // only the bare "free" tier (post-trial, non-subscribed) is locked to 7 days
  const canUseRange = (rangeKey) => {
    if (isFree) return rangeKey === '7days';
    return true;
  };

  // Free tier (post-trial) has zero scans and no manual override —
  // trial and all paid tiers can scan up to their scanLimit
  const canScan = () => {
    if (isFree) return false;
    const used = subscription?.scans_used_this_month ?? 0;
    const limit = subscription?.scan_limit ?? plan.scanLimit ?? 0;
    return used < limit;
  };

  const scansRemaining = () => {
    if (isFree) return 0;
    const used = subscription?.scans_used_this_month ?? 0;
    const limit = subscription?.scan_limit ?? plan.scanLimit ?? 0;
    return Math.max(limit - used, 0);
  };

  // Exports and audits: locked only on the bare free tier
  const canExport = () => !isFree;
  const canAudit = () => !isFree;

  // Multi-image batch scanning: trial, growth, and pro only
  // (starter and free do not get this capability)
  const canMultiScan = () => plan.multiScan === true;

  // Trial countdown helper, for showing "X days left" banners
  const trialDaysLeft = () => {
    if (!isTrial || !subscription?.trial_ends_at) return null;
    const end = new Date(subscription.trial_ends_at);
    const diffMs = end - new Date();
    return Math.max(Math.ceil(diffMs / 86400000), 0);
  };

  return {
    tier, isTrial, isFree, isPaid, plan,
    canUseRange, canScan, scansRemaining,
    canExport, canAudit, canMultiScan, trialDaysLeft,
  };
}
