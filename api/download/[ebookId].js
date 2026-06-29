import { readFileSync } from "fs";
import path from "path";
import { authorizeDownload, resolveEbookFile } from "../../lib/download.js";
import { handlePreflight, methodNotAllowed, sendJson, setCorsHeaders } from "../../lib/http.js";

export default async function handler(req, res) {
  if (handlePreflight(req, res)) return;
  if (req.method !== "GET") return methodNotAllowed(req, res);

  const ebookId = String(req.query.ebookId || "").trim();
  if (!ebookId) {
    return sendJson(req, res, 400, { error: "Ebook manquant." });
  }

  const token = String(req.headers.authorization || "")
    .replace(/^Bearer\s+/i, "")
    .trim();

  const auth = await authorizeDownload(token, ebookId);
  if (!auth.allowed) {
    return sendJson(req, res, auth.status || 403, { error: auth.error });
  }

  const absPath = resolveEbookFile(auth.filePath);
  if (!absPath) {
    return sendJson(req, res, 404, { error: "Fichier indisponible sur le serveur." });
  }

  const filename = path.basename(absPath);
  const buffer = readFileSync(absPath);

  setCorsHeaders(req, res);
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Length", String(buffer.length));
  res.status(200).send(buffer);
}
