import * as cheerio from "cheerio";
import { kemdikbudHttp as http, KEMDIKBUD_BASE as BASE } from "./http";
import { fetchKabupaten, fetchKecamatan, fetchSekolahByKecamatan } from "./wilayah";

// Adapter scraper untuk referensi.data.kemendikdasmen.go.id (eks kemdikbud).
//
// Strategi scrape:
//   1. Diberi kode wilayah (provinsi, kabupaten, atau kecamatan).
//   2. Provinsi (XX0000) → fetch semua kabupaten → kecamatan → sekolah.
//   3. Kabupaten (XX YYYY) → fetch semua kecamatan → sekolah.
//   4. Kecamatan (XX YYYZZ) → langsung fetch sekolah.
//   5. Per sekolah → fetch detail (email, alamat, website).

export type ScrapedSchool = {
  npsn: string | null;
  nama: string;
  jenjang: string | null;
  status: string | null;
  provinsi: string | null;
  kabupaten: string | null;
  kecamatan: string | null;
  alamat: string | null;
  email: string | null;
  website: string | null;
  source_url: string;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function isProvinsi(kode: string): boolean {
  return /^\d{2}0000$/.test(kode);
}

function isKabupaten(kode: string): boolean {
  // Kabupaten: 6 digit, dua digit terakhir = "00", tapi bukan provinsi (XX YY00 dengan YY != 00)
  return /^\d{4}00$/.test(kode) && !isProvinsi(kode);
}

function isKecamatan(kode: string): boolean {
  return /^\d{6}$/.test(kode) && !isProvinsi(kode) && !isKabupaten(kode);
}

/**
 * Fetch detail sekolah dari halaman /pendidikan/npsn/{NPSN}.
 * Halaman pakai tabel 3-kolom: [Label, ":", Value].
 */
export async function fetchSchoolDetail(npsn: string): Promise<Partial<ScrapedSchool>> {
  const url = `/pendidikan/npsn/${npsn}`;
  const { data: html } = await http.get(url);
  const $ = cheerio.load(html);

  const fields: Record<string, string> = {};
  $("tr").each((_, tr) => {
    const tds = $(tr).find("td").toArray();
    if (tds.length < 3) return;
    // Cari index ":" sebagai separator. Bisa ada td spacer di awal/akhir.
    const sepIdx = tds.findIndex((td) => $(td).text().trim() === ":");
    if (sepIdx < 1 || sepIdx >= tds.length - 1) return;
    const label = $(tds[sepIdx - 1]).text().trim().toLowerCase().replace(/\s+/g, " ");
    const value = $(tds[sepIdx + 1]).text().trim().replace(/\s+/g, " ");
    if (!label || !value) return;
    fields[label] = value;
  });

  const fullText = $.root().text();
  const emailMatch = fullText.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);

  return {
    npsn,
    nama: fields["nama"] ?? undefined,
    jenjang: fields["bentuk pendidikan"] ?? null,
    status: fields["status sekolah"] ?? null,
    alamat: fields["alamat"] ?? null,
    email: fields["email"] || (emailMatch ? emailMatch[0].toLowerCase() : null),
    website: fields["website"] ?? null,
    source_url: `${BASE}${url}`,
  };
}

/**
 * Scrape lengkap untuk wilayah (provinsi, kabupaten, atau kecamatan).
 *
 * Context wilayah (provinsi/kabupaten/kecamatan name) di-pass dari caller agar
 * setiap row sekolah punya info wilayah lengkap di DB.
 */
export async function scrapeWilayah(
  params: {
    kodeWilayah: string;
    jenjang?: string;
    status?: "n" | "s" | "all";
    maxKabupaten?: number;
    maxKecamatan?: number;
    maxSekolah?: number;
    delayMs?: number;
    namaProvinsi?: string;
    namaKabupaten?: string;
    namaKecamatan?: string;
    skipNpsn?: Set<string>;
  },
  onProgress?: (s: ScrapedSchool, index: number, total: number) => void,
): Promise<ScrapedSchool[]> {
  const {
    kodeWilayah,
    jenjang = "dikdas",
    status = "all",
    maxKabupaten = 5,
    maxKecamatan = 3,
    maxSekolah = 50,
    delayMs = 800,
    namaProvinsi,
    namaKabupaten,
    namaKecamatan,
    skipNpsn,
  } = params;

  type SekolahRow = {
    npsn: string;
    nama: string;
    alamat: string | null;
    listStatus: "NEGERI" | "SWASTA" | null;
    provinsi: string | null;
    kabupaten: string | null;
    kecamatan: string | null;
  };

  // Filter awal: status & skip NPSN yang sudah ada (semua dilakukan SEBELUM fetch detail)
  function shouldSkip(s: { npsn: string; status: "NEGERI" | "SWASTA" | null }): boolean {
    if (skipNpsn?.has(s.npsn)) return true;
    if (status !== "all" && s.status) {
      const wantNegeri = status === "n";
      const isNegeri = s.status === "NEGERI";
      if (wantNegeri !== isNegeri) return true;
    }
    return false;
  }

  function pushSekolah(
    s: { npsn: string; nama: string; alamat: string | null; status: "NEGERI" | "SWASTA" | null },
    ctx: { provinsi: string | null; kabupaten: string | null; kecamatan: string | null },
  ): boolean {
    if (shouldSkip(s)) return false;
    allSekolah.push({
      npsn: s.npsn,
      nama: s.nama,
      alamat: s.alamat,
      listStatus: s.status,
      ...ctx,
    });
    return true;
  }

  const allSekolah: SekolahRow[] = [];

  // === KECAMATAN-only mode ===
  if (isKecamatan(kodeWilayah)) {
    const sekolah = await fetchSekolahByKecamatan(kodeWilayah, jenjang);
    for (const s of sekolah) {
      pushSekolah(s, {
        provinsi: namaProvinsi ?? null,
        kabupaten: namaKabupaten ?? null,
        kecamatan: namaKecamatan ?? null,
      });
      if (allSekolah.length >= maxSekolah) break;
    }
  }
  // === KABUPATEN mode: explore semua kecamatan ===
  else if (isKabupaten(kodeWilayah)) {
    const kecamatanList = (await fetchKecamatan(kodeWilayah, jenjang)).slice(0, maxKecamatan);
    await sleep(delayMs);
    for (const kec of kecamatanList) {
      try {
        const sekolah = await fetchSekolahByKecamatan(kec.kode, jenjang);
        for (const s of sekolah) {
          pushSekolah(s, {
            provinsi: namaProvinsi ?? null,
            kabupaten: namaKabupaten ?? null,
            kecamatan: kec.nama,
          });
          if (allSekolah.length >= maxSekolah) break;
        }
      } catch {
        // skip
      }
      await sleep(delayMs);
      if (allSekolah.length >= maxSekolah) break;
    }
  }
  // === PROVINSI mode: explore kabupaten -> kecamatan ===
  else if (isProvinsi(kodeWilayah)) {
    const kabList = (await fetchKabupaten(kodeWilayah, jenjang)).slice(0, maxKabupaten);
    await sleep(delayMs);
    for (const kab of kabList) {
      let kecList: { kode: string; nama: string }[] = [];
      try {
        kecList = (await fetchKecamatan(kab.kode, jenjang)).slice(0, maxKecamatan);
      } catch {
        continue;
      }
      await sleep(delayMs);

      for (const kec of kecList) {
        try {
          const sekolah = await fetchSekolahByKecamatan(kec.kode, jenjang);
          for (const s of sekolah) {
            pushSekolah(s, {
              provinsi: namaProvinsi ?? null,
              kabupaten: kab.nama,
              kecamatan: kec.nama,
            });
            if (allSekolah.length >= maxSekolah) break;
          }
        } catch {
          // skip
        }
        await sleep(delayMs);
        if (allSekolah.length >= maxSekolah) break;
      }
      if (allSekolah.length >= maxSekolah) break;
    }
  } else {
    throw new Error(`Format kode wilayah tidak valid: ${kodeWilayah}`);
  }

  // === Fetch detail per sekolah ===
  const results: ScrapedSchool[] = [];
  for (let i = 0; i < allSekolah.length; i++) {
    const s = allSekolah[i];
    let detail: Partial<ScrapedSchool> = {};
    try {
      detail = await fetchSchoolDetail(s.npsn);
    } catch {
      // tetap simpan data dasar
    }

    const merged: ScrapedSchool = {
      npsn: s.npsn,
      nama: detail.nama ?? s.nama,
      jenjang: detail.jenjang ?? null,
      status: detail.status ?? s.listStatus,
      provinsi: s.provinsi,
      kabupaten: s.kabupaten,
      kecamatan: s.kecamatan,
      alamat: detail.alamat ?? s.alamat,
      email: detail.email ?? null,
      website: detail.website ?? null,
      source_url: detail.source_url ?? `${BASE}/pendidikan/npsn/${s.npsn}`,
    };

    results.push(merged);
    onProgress?.(merged, i + 1, allSekolah.length);
    await sleep(delayMs);
  }

  return results;
}
