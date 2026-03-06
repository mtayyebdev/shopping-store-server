import crypto from "crypto";

export const generateUniqueID = (prefix = "", limit = 12) => {
  const safeLimit = Math.min(limit, 32);

  const uniquePart = crypto
    .randomUUID()
    .replace(/-/g, "")
    .slice(0, safeLimit)
    .toUpperCase();

  return prefix ? `${prefix}-${uniquePart}` : uniquePart;
};
