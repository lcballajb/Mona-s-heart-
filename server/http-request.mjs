function badRequest(message) {
  return Object.assign(new Error(message), { statusCode: 400 });
}

export function parseCookies(header = "") {
  const cookies = {};
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 1) continue;
    try {
      const name = decodeURIComponent(part.slice(0, separator).trim());
      const value = decodeURIComponent(part.slice(separator + 1).trim());
      if (name) cookies[name] = value;
    } catch {
      throw badRequest("Malformed cookie header");
    }
  }
  return cookies;
}

export async function readJsonBody(request, maximumBytes = 32_768) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buffer.length;
    if (bytes > maximumBytes)
      throw Object.assign(new Error("Payload too large"), { statusCode: 413 });
    chunks.push(buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    throw badRequest("Malformed JSON request body");
  }
}
