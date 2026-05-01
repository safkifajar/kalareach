// Fetch daftar wilayah (kabupaten/kota, kecamatan) dari portal Kemendikdasmen.
//
// URL pattern:
//   /pendidikan/{kategori}/{kodeProvinsi}/1  → list kabupaten
//   /pendidikan/{kategori}/{kodeKabupaten}/2 → list kecamatan
//   /pendidikan/{kategori}/{kodeKecamatan}/3 → list sekolah (NPSN)
//
// kategori: dikdas | dikmen | paud | dikti

import * as cheerio from "cheerio";
import { jenjangToKategori, kemdikbudHttp } from "./http";

export type Wilayah = { kode: string; nama: string };

function parseLevelLinks(html: string, expectedLevel: 1 | 2 | 3): Wilayah[] {
  const $ = cheerio.load(html);
  const rows: Wilayah[] = [];
  const seen = new Set<string>();

  $("a").each((_, a) => {
    const href = $(a).attr("href") ?? "";
    const text = $(a).text().trim();
    const m = href.match(/\/pendidikan\/[a-z]+\/(\d{6})\/(\d)/i);
    if (!m) return;
    const [, kode, level] = m;
    if (Number(level) !== expectedLevel + 1) return;
    if (seen.has(kode)) return;
    if (!text || text.length < 2) return;
    seen.add(kode);
    rows.push({ kode, nama: text });
  });

  return rows.sort((a, b) => a.nama.localeCompare(b.nama));
}

/**
 * Daftar kabupaten/kota di bawah suatu provinsi.
 * Hit halaman provinsi (level 1), parse link ke level 2.
 */
export async function fetchKabupaten(
  kodeProvinsi: string,
  jenjang: string = "dikdas",
): Promise<Wilayah[]> {
  const kategori = jenjangToKategori(jenjang);
  const url = `/pendidikan/${kategori}/${kodeProvinsi}/1`;
  const res = await kemdikbudHttp.get(url);
  if (res.status >= 400) {
    throw new Error(
      `Portal Kemdikdasmen merespons HTTP ${res.status} untuk ${url}.`,
    );
  }
  if (typeof res.data === "string" && res.data.includes("Request Rejected")) {
    throw new Error(
      "Portal Kemdikdasmen me-reject request (anti-bot). Coba tunggu beberapa menit.",
    );
  }
  return parseLevelLinks(res.data, 1);
}

/**
 * Daftar kecamatan di bawah suatu kabupaten.
 */
export async function fetchKecamatan(
  kodeKabupaten: string,
  jenjang: string = "dikdas",
): Promise<Wilayah[]> {
  const kategori = jenjangToKategori(jenjang);
  const url = `/pendidikan/${kategori}/${kodeKabupaten}/2`;
  const res = await kemdikbudHttp.get(url);
  if (res.status >= 400) {
    throw new Error(
      `Portal Kemdikdasmen merespons HTTP ${res.status} untuk ${url}. Mungkin sedang reject request.`,
    );
  }
  if (typeof res.data === "string" && res.data.includes("Request Rejected")) {
    throw new Error(
      "Portal Kemdikdasmen me-reject request (anti-bot). Coba tunggu beberapa menit.",
    );
  }
  return parseLevelLinks(res.data, 2);
}

export type SekolahLite = {
  npsn: string;
  nama: string;
  alamat: string | null;
  status: "NEGERI" | "SWASTA" | null;
};

/**
 * Daftar sekolah (NPSN + nama + status) di bawah suatu kecamatan.
 * Status (NEGERI/SWASTA) sudah ada di kolom terakhir tabel — tidak perlu fetch detail.
 */
export async function fetchSekolahByKecamatan(
  kodeKecamatan: string,
  jenjang: string = "dikdas",
): Promise<SekolahLite[]> {
  const kategori = jenjangToKategori(jenjang);
  const url = `/pendidikan/${kategori}/${kodeKecamatan}/3`;
  const res = await kemdikbudHttp.get(url);
  if (res.status >= 400) {
    throw new Error(`HTTP ${res.status} untuk ${url}`);
  }
  if (typeof res.data === "string" && res.data.includes("Request Rejected")) {
    throw new Error("Portal me-reject request (anti-bot)");
  }
  const $ = cheerio.load(res.data);

  const rows: SekolahLite[] = [];

  $("table tr").each((_, tr) => {
    const tds = $(tr).find("td");
    if (tds.length < 3) return;
    const npsnLink = $(tr).find('a[href*="/pendidikan/npsn/"]');
    if (!npsnLink.length) return;
    const npsn = npsnLink.text().trim();
    if (!/^\d{8}$/.test(npsn)) return;

    const cells = tds.toArray().map((td) => $(td).text().trim());

    // Status biasanya di kolom terakhir
    const lastCell = cells[cells.length - 1]?.toUpperCase() ?? "";
    let status: "NEGERI" | "SWASTA" | null = null;
    if (lastCell === "NEGERI" || lastCell === "SWASTA") {
      status = lastCell as "NEGERI" | "SWASTA";
    }

    const nama = cells.find((c) => c && c !== npsn && !/^\d+$/.test(c) && c.length > 3) ?? "";
    const alamat = cells.slice(cells.indexOf(nama) + 1, -1).find((c) => c.length > 3) ?? null;

    rows.push({ npsn, nama, alamat, status });
  });

  return rows;
}
