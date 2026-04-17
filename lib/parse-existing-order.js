/**
 * Parse hidden `existingOrder` from admin page-update save (permutation of media indices).
 * Invalid or missing values fall back to identity order0..len-1.
 */

function parsePageUpdateExistingOrder(str, len) {
  if (!len) return [];
  if (!str || !String(str).trim()) return Array.from({ length: len }, (_, i) => i);
  const parts = String(str)
    .split(',')
    .map((s) => parseInt(String(s).trim(), 10));
  if (parts.length !== len) return Array.from({ length: len }, (_, i) => i);
  const ok =
    new Set(parts).size === len &&
    parts.every((n) => Number.isInteger(n) && n >= 0 && n < len);
  if (!ok) return Array.from({ length: len }, (_, i) => i);
  return parts;
}

module.exports = { parsePageUpdateExistingOrder };
