import { sendJson, withApi } from "../lib/http.js";

async function handler(req, res) {
  return sendJson(req, res, 403, {
    error: "Téléchargement protégé. Connectez-vous et utilisez le bouton Télécharger depuis votre compte.",
  });
}

export default withApi(handler);
