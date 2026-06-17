export function useSubscriptionGate(subscription) {
  const isFree = !subscription || subscription.tier === "free";

  const canUseRange = (rangeKey) => {
    if (!isFree) return true;
    return rangeKey === "7days";
  };

  const canExport = () => !isFree;
  const canAudit = () => !isFree;

  return { isFree, canUseRange, canExport, canAudit };
}
