function invalid(message = "Invalid request") {
  return Object.assign(new Error(message), { statusCode: 400 });
}

export function objectInput(value, allowed) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw invalid();
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unknown.length) throw invalid("Request contains unsupported fields");
  return value;
}

export function normalizedEmail(value) {
  if (typeof value !== "string") throw invalid("Invalid email address");
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw invalid("Invalid email address");
  return email;
}

export function requiredString(value, name, maximum = 500) {
  if (typeof value !== "string" || !value || value.length > maximum)
    throw invalid(`${name} is required`);
  return value;
}
