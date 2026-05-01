import axios from "axios";
import https from "node:https";

// Portal referensi.data.kemendikdasmen.go.id (sebelumnya kemdikbud.go.id).
// SSL kadang expired di portal pemerintah, jadi skip cert verification untuk domain ini.
const insecureAgent = new https.Agent({ rejectUnauthorized: false });

export const KEMDIKBUD_BASE = "https://referensi.data.kemendikdasmen.go.id";

// Pakai full browser headers — portal Kemdikdasmen kadang reject request
// dengan UA "bot" atau header minimal.
const UA =
  process.env.SCRAPER_USER_AGENT ??
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export const kemdikbudHttp = axios.create({
  baseURL: KEMDIKBUD_BASE,
  timeout: 30000,
  headers: {
    "User-Agent": UA,
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    Referer: KEMDIKBUD_BASE + "/",
  },
  httpsAgent: insecureAgent,
  // Jangan throw untuk 4xx, supaya kita bisa handle pesan error
  validateStatus: (s) => s >= 200 && s < 500,
});

// Mapping jenjang untuk URL portal.
// dikdas = SD + SMP, dikmen = SMA + SMK, paud = TK/RA, dikti = perguruan tinggi
export type JenjangKategori = "paud" | "dikdas" | "dikmen" | "dikti";

export function jenjangToKategori(j: string): JenjangKategori {
  switch (j) {
    case "paud":
    case "tk":
      return "paud";
    case "sd":
    case "smp":
    case "dikdas":
      return "dikdas";
    case "sma":
    case "smk":
    case "dikmen":
      return "dikmen";
    case "dikti":
      return "dikti";
    default:
      return "dikdas";
  }
}
