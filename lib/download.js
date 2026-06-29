import { existsSync } from "fs";
import { join } from "path";
import { FREE_EBOOK_IDS, getCatalog, getEbookFiles } from "./catalog.js";
import { userHasPurchase, verifyAccessToken } from "./supabase.js";

export async function canDownload(user, ebookId) {
  const CATALOG = getCatalog();
  const EBOOK_FILES = getEbookFiles();
  const ebook = CATALOG[ebookId];

  if (!ebook || !EBOOK_FILES[ebookId]) {
    return { allowed: false, status: 404, error: "Ebook introuvable." };
  }

  if (!user) {
    return { allowed: false, status: 401, error: "Connectez-vous pour télécharger." };
  }

  if (ebook.price === 0 && FREE_EBOOK_IDS.has(ebookId)) {
    return { allowed: true, filePath: EBOOK_FILES[ebookId] };
  }

  const purchased = await userHasPurchase(user.id, ebookId);
  if (purchased) {
    return { allowed: true, filePath: EBOOK_FILES[ebookId] };
  }

  return { allowed: false, status: 403, error: "Achat requis pour télécharger cet annuaire." };
}

export async function authorizeDownload(token, ebookId) {
  const user = await verifyAccessToken(token);
  const result = await canDownload(user, ebookId);
  return { user, ...result };
}

export function resolveEbookFile(absRelPath) {
  const absPath = join(process.cwd(), absRelPath);
  if (!existsSync(absPath)) {
    return null;
  }
  return absPath;
}
