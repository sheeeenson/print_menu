const roundCurrency = (value) => Math.round(value * 100) / 100;

const hasPositiveNumber = (value) => typeof value === 'number' && Number.isFinite(value) && value > 0;
const hasDiscount = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value < 100;

export function recalculatePricing(dish, changedField) {
  const next = { ...dish };

  if (changedField === 'oldPrice') {
    if (hasPositiveNumber(next.oldPrice) && hasPositiveNumber(next.newPrice)) {
      next.discountPercent = Math.round(((next.oldPrice - next.newPrice) / next.oldPrice) * 100);
    } else if (hasPositiveNumber(next.oldPrice) && hasDiscount(next.discountPercent)) {
      next.newPrice = roundCurrency(next.oldPrice * (1 - next.discountPercent / 100));
    }
  }

  if (changedField === 'newPrice') {
    if (hasPositiveNumber(next.oldPrice) && hasPositiveNumber(next.newPrice)) {
      next.discountPercent = Math.round(((next.oldPrice - next.newPrice) / next.oldPrice) * 100);
    } else if (hasPositiveNumber(next.newPrice) && hasDiscount(next.discountPercent)) {
      next.oldPrice = roundCurrency(next.newPrice / (1 - next.discountPercent / 100));
    }
  }

  if (changedField === 'discountPercent') {
    // Manual discount edits are treated as a display/badge override.
    // They should not change oldPrice or newPrice. Old/new price edits still recalculate this value automatically.
    return next;
  }

  return next;
}

export function parseOptionalNumber(value) {
  if (String(value).trim() === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatOptionalNumber(value) {
  return value === null || value === undefined ? '' : String(value);
}
