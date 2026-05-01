<div align="center">

<img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js" />
<img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" alt="TypeScript" />
<img src="https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss" alt="Tailwind" />
<img src="https://img.shields.io/badge/Supabase-Postgres-3ECF8E?logo=supabase" alt="Supabase" />
<img src="https://img.shields.io/badge/Brevo-Email-0B996E" alt="Brevo" />

# Kalareach

**Email outreach tool untuk institusi pendidikan Indonesia.**
Scrape data sekolah dari portal Kemendikdasmen, kelola template email dengan attachment, lalu blast outreach yang dipersonalisasi.

</div>

---

## Latar Belakang

Dibangun untuk usaha jasa pembuatan website sekolah — mengotomatisasi proses yang sebelumnya manual:

1. **Sebelum**: cari email sekolah satu-satu di portal Kemendikdasmen → copy ke Excel → kirim email satu-satu
2. **Sekarang**: pilih wilayah → klik scrape → klik blast → ratusan sekolah ter-outreach dengan proposal PDF terlampir

---

## Fitur Utama

### Scraper Kemendikdasmen

- **Cascading wilayah**: Provinsi → Kabupaten → Kecamatan dengan dropdown searchable
- **Multi-jenjang**: SD/SMP, SMA/SMK, PAUD/TK, Perguruan Tinggi
- **Statistik wilayah**: total sekolah, breakdown Negeri/Swasta, berapa yang sudah pernah di-scrape
- **Skip yang sudah ada**: tidak fetch ulang sekolah yang sudah masuk database
- **Progress real-time**: live activity feed dengan SSE, anti-block navigation
- **Throttling sopan**: delay 800ms antar request

### Manajemen Data Sekolah

- Filter multi-dimensi: provinsi, kabupaten, kecamatan, jenjang, status
- Search nama / NPSN
- Badge visual: Negeri (biru), Swasta (kuning), jenjang (ungu)
- Bulk delete via filter
- Export CSV
- Website sekolah clickable

### Template Email

- 2 template Kala Digital pre-seeded (Profesional & Hangat)
- Editor toggle Text ↔ HTML mode
- Variabel dinamis: `{{nama_sekolah}}`, `{{npsn}}`, `{{kabupaten}}`
- Modal preview dengan render data contoh
- **Attachment PDF**: upload sekali, otomatis terlampir di blast (max 5MB)
  - Preview, download, ganti, hapus

### Email Blast

- Filter penerima 5-dimensi (provinsi/kabupaten/kecamatan/jenjang/status)
- **Test send** ke email sendiri sebelum blast massal
- **Dry run** preview rendering variabel
- Progress overlay real-time dengan live feed sukses/gagal
- Throttling configurable (default 1.5s antar email)
- **Halaman detail blast**: stats, timeline, template info, log per-recipient dengan pagination & filter

---

## Stack

| Layer | Tool | Free Tier |
|---|---|---|
| Frontend | Next.js 16 (App Router) + Tailwind v4 | — |
| Hosting | Vercel | 100GB bandwidth/bulan |
| Database | Supabase PostgreSQL | 500MB DB, 50k row |
| File Storage | Supabase Storage | 1GB |
| Email | Brevo Transactional API | 300 email/hari |
| Scraper | Cheerio + Axios | Self-hosted |

**Total biaya operasional: Rp 0/bulan** sampai >300 email/hari atau >500MB data.

---

## Setup

### Prasyarat

- Node.js 20+
- Akun: GitHub, Supabase, Brevo

### 1. Setup Supabase

```bash
# 1. Buat project baru di https://app.supabase.com
# 2. SQL Editor → run isi supabase/schema.sql
# 3. Project Settings → API → catat 3 nilai:
#    - Project URL
#    - anon public key
#    - service_role key (rahasia)
```

### 2. Setup Brevo

```bash
# 1. Daftar di https://app.brevo.com
# 2. Senders → tambah email pengirim → verifikasi via inbox
# 3. SMTP & API → API Keys → generate → catat
```

### 3. Jalankan Lokal

```bash
git clone https://github.com/safkifajar/kalareach.git
cd kalareach
npm install
cp .env.local.example .env.local
# Edit .env.local — isi kredensial dari step 1 & 2
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

### 4. Deploy ke Vercel

```bash
# Push repo ke GitHub (sudah otomatis kalau clone dari sini)
# Buka https://vercel.com/new → import repo
# Tambahkan environment variables (copy dari .env.local)
# Deploy
```

---

## Environment Variables

| Variable | Sumber | Catatan |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API settings | Public, OK ke client |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase API settings | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase API settings | **Rahasia** — server only |
| `BREVO_API_KEY` | Brevo API Keys | **Rahasia** — server only |
| `BREVO_SENDER_EMAIL` | Email yang sudah diverifikasi di Brevo | — |
| `BREVO_SENDER_NAME` | Nama pengirim yang muncul di inbox | — |
| `SCRAPER_USER_AGENT` | Opsional, default sudah Chrome UA | — |

---

## Struktur Proyek

```
src/
├── app/
│   ├── page.tsx              # Dashboard
│   ├── icon.tsx              # Favicon dinamis
│   ├── sekolah/              # Daftar sekolah + filter + bulk actions
│   ├── scraper/              # UI scraper dengan cascading wilayah
│   ├── template/             # CRUD template + attachment manager
│   ├── blast/                # Email blast + halaman detail
│   └── api/
│       ├── scrape/           # Sync + streaming endpoints
│       ├── wilayah/          # Provinsi/kabupaten/kecamatan/stats
│       ├── sekolah/          # CRUD + bulk delete + CSV export
│       ├── template/         # CRUD + attachment upload
│       └── blast/            # Sync + streaming + test endpoints
├── components/
│   ├── Sidebar.tsx           # Desktop sidebar + mobile drawer
│   ├── Combobox.tsx          # Dropdown searchable
│   ├── Modal.tsx
│   ├── ScrapeProgressOverlay.tsx
│   ├── BlastProgressOverlay.tsx
│   ├── AttachmentUploader.tsx
│   ├── TemplatePreviewButton.tsx
│   ├── BlastDeleteButton.tsx
│   ├── SekolahTable.tsx
│   └── NavigationProgress.tsx
└── lib/
    ├── supabase/             # Server (service role) + browser clients
    ├── scraper/
    │   ├── http.ts           # Axios instance dengan SSL bypass
    │   ├── wilayah.ts        # Fetch provinsi/kabupaten/kecamatan/sekolah
    │   └── kemdikbud.ts      # Orchestrator scrape
    ├── email/brevo.ts        # Brevo wrapper + template renderer
    ├── wilayah/provinsi.ts   # Hardcoded daftar provinsi Indonesia
    └── types.ts              # TypeScript types

supabase/
└── schema.sql                # Skema DB + storage bucket + seed templates
```

---

## Catatan Teknis

### Scraping

- Sumber: `referensi.data.kemendikdasmen.go.id`
- URL pattern: `/pendidikan/{kategori}/{kode}/level` (kategori: dikdas/dikmen/paud/dikti)
- Selektor di `src/lib/scraper/wilayah.ts` — kalau struktur HTML portal berubah, perlu update
- SSL portal Kemendikdasmen kadang expired → axios pakai `httpsAgent: { rejectUnauthorized: false }`
- Anti-bot detection: HTTP client pakai full Chrome User-Agent + Referer header

### Email Deliverability

Cold email ke sekolah berisiko masuk Spam. Praktik aman:

- **Mulai kecil**: 50-100/hari, naikkan bertahap
- **Identitas jelas** di template + link unsubscribe (mis. "balas STOP jika tidak ingin dihubungi")
- **Domain custom**: `@kaladigital.id` jauh lebih baik dari `@gmail.com`
- **Setup DKIM/SPF** di Brevo saat sudah punya domain
- Monitor bounce rate < 5% supaya domain tidak di-blacklist

### Limit Free Tier

| Layanan | Limit | Tindakan saat habis |
|---|---|---|
| Brevo | 300 email/hari | Upgrade $9/bulan untuk 20.000 email/bulan |
| Supabase | 500MB DB, 2GB bandwidth | Bersihkan data lama atau upgrade $25/bulan |
| Vercel | 100GB bandwidth/bulan | Cukup untuk pemakaian internal |

---

## Roadmap

- [ ] Resume blast yang gagal di tengah jalan
- [ ] Retry logic untuk scraper saat anti-bot reject
- [ ] Email tracking (open & click rate via webhook Brevo)
- [ ] Schedule blast (kirim besok jam 9)
- [ ] Multi-user authentication (kalau ada tim)
- [ ] Bulk action di Detail Pengiriman (resend semua failed)

---

## Lisensi

Internal tool — tidak untuk redistribusi publik.

---

<div align="center">

Dibuat dengan kebutuhan riil oleh [@safkifajar](https://github.com/safkifajar) — [Kala Digital](https://wa.me/6285173150927), Purwokerto

</div>
