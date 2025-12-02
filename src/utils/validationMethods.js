export const isValidEmail = (email) => {
  if (!email || typeof email !== "string") return false;

  // Basic RFC 5322–safe email regex (light but reliable)
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  return regex.test(email.trim());
};
