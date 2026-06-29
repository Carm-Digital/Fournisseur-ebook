import { readFileSync } from "fs";
import { join } from "path";

let catalog = null;
let ebookFiles = null;

export const FREE_EBOOK_IDS = new Set(["livres", "papeteries", "plantes"]);

export function getCatalog() {
  if (!catalog) {
    const list = JSON.parse(readFileSync(join(process.cwd(), "data/ebooks.json"), "utf8"));
    catalog = Object.fromEntries(list.map((e) => [e.id, e]));
  }
  return catalog;
}

export function getEbookFiles() {
  if (!ebookFiles) {
    ebookFiles = JSON.parse(readFileSync(join(process.cwd(), "data/ebook-files.json"), "utf8"));
  }
  return ebookFiles;
}

export function buildLineItems(ebookIds) {
  const CATALOG = getCatalog();
  const lineItems = [];
  const validIds = [];

  for (const eid of ebookIds) {
    const ebook = CATALOG[eid];
    if (!ebook || ebook.price <= 0) continue;
    validIds.push(eid);
    lineItems.push({
      price_data: {
        currency: "eur",
        unit_amount: Math.round(ebook.price * 100),
        product_data: {
          name: ebook.title,
          description: `${(ebook.suppliers || 0).toLocaleString("fr-FR")} fournisseurs`,
        },
      },
      quantity: 1,
    });
  }

  return { lineItems, validIds };
}
