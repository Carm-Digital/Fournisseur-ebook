export function sendJson(res, status, data) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.status(status).json(data);
}

export function methodNotAllowed(res) {
  sendJson(res, 405, { error: "Method not allowed" });
}
