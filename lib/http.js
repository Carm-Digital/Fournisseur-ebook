export function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  const requestOrigin = req.headers["x-forwarded-host"]
    ? `${req.headers["x-forwarded-proto"] || "https"}://${req.headers["x-forwarded-host"]}`
    : origin;

  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else if (requestOrigin) {
    res.setHeader("Access-Control-Allow-Origin", requestOrigin);
  }

  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "86400");
}

export function handlePreflight(req, res) {
  setCorsHeaders(req, res);
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }
  return false;
}

export function sendJson(req, res, status, data) {
  setCorsHeaders(req, res);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.status(status).json(data);
}

export function methodNotAllowed(req, res) {
  sendJson(req, res, 405, { error: "Method not allowed" });
}

export function withApi(handler) {
  return async (req, res) => {
    if (handlePreflight(req, res)) return;
    return handler(req, res);
  };
}
