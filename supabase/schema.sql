-- Skema database untuk Kalareach
-- Jalankan di Supabase SQL Editor saat pertama kali setup project.
-- Idempotent: boleh dijalankan berkali-kali (CREATE IF NOT EXISTS + ALTER ADD IF NOT EXISTS).

create extension if not exists "uuid-ossp";

-- ====== SCHOOLS ======
create table if not exists schools (
  id uuid primary key default uuid_generate_v4(),
  npsn text unique,
  nama text not null,
  jenjang text,
  status text,
  provinsi text,
  kabupaten text,
  kecamatan text,
  alamat text,
  email text,
  website text,
  source_url text,
  scraped_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Migrasi: hapus kolom telepon kalau ada (tidak dipakai lagi)
alter table schools drop column if exists telepon;

create index if not exists schools_email_idx on schools (email) where email is not null;
create index if not exists schools_provinsi_idx on schools (provinsi);
create index if not exists schools_kabupaten_idx on schools (kabupaten);

-- ====== EMAIL TEMPLATES ======
create table if not exists email_templates (
  id uuid primary key default uuid_generate_v4(),
  nama text not null,
  subject text not null,
  body_html text not null,
  body_text text,
  attachment_path text,
  attachment_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Migrasi: tambah kolom attachment kalau belum ada
alter table email_templates add column if not exists attachment_path text;
alter table email_templates add column if not exists attachment_name text;

-- ====== EMAIL BLASTS ======
create table if not exists email_blasts (
  id uuid primary key default uuid_generate_v4(),
  template_id uuid references email_templates(id) on delete set null,
  nama_batch text not null,
  total_target int not null default 0,
  total_terkirim int not null default 0,
  total_gagal int not null default 0,
  status text not null default 'draft',
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

-- ====== BLAST LOGS ======
create table if not exists email_blast_logs (
  id uuid primary key default uuid_generate_v4(),
  blast_id uuid not null references email_blasts(id) on delete cascade,
  school_id uuid references schools(id) on delete set null,
  email text not null,
  status text not null,
  error_message text,
  sent_at timestamptz not null default now()
);

create index if not exists blast_logs_blast_idx on email_blast_logs (blast_id);

-- ====== STORAGE BUCKET (untuk attachment PDF) ======
-- Buat bucket "attachments" via Supabase Dashboard → Storage → New bucket → public
-- Atau jalankan ini:
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict (id) do nothing;

-- ====== SEED: 2 TEMPLATE EMAIL KALA DIGITAL ======
insert into email_templates (nama, subject, body_html, body_text)
values (
  'Kala Digital — Profesional',
  'Penawaran Pembuatan Website Sekolah untuk {{nama_sekolah}}',
  '<p>Yth. Bapak/Ibu Pimpinan <strong>{{nama_sekolah}}</strong>,</p>
<p>Selamat pagi. Perkenalkan, saya <strong>Safki Fajar Fatmawan</strong> dari <strong>Kala Digital</strong> &mdash; pengembang website yang berfokus pada institusi pendidikan di Indonesia.</p>
<p>Bersama email ini, kami melampirkan proposal pembuatan website sekolah sebagai bentuk dukungan kami dalam membantu <strong>{{nama_sekolah}}</strong>:</p>
<ul>
  <li>Mengelola informasi &amp; publikasi kegiatan sekolah</li>
  <li>Mempermudah komunikasi dengan wali murid</li>
  <li>Meningkatkan citra profesional di era digital</li>
</ul>
<p><strong>Pilihan paket:</strong></p>
<ul>
  <li><strong>Paket Landingpage</strong> &mdash; Rp 2.000.000 (sudah termasuk domain &amp; hosting)</li>
  <li><strong>Paket Premium</strong> &mdash; Rp 3.200.000 (sudah termasuk domain &amp; hosting)</li>
  <li><strong>Paket Custom</strong> &mdash; sesuai kebutuhan (PPDB Online, E-Learning, dll)</li>
</ul>
<p>Detail lengkap dapat dilihat pada proposal terlampir. Kami sangat terbuka untuk berdiskusi lebih lanjut menyesuaikan kebutuhan <strong>{{nama_sekolah}}</strong>.</p>
<p>Terima kasih atas perhatian dan waktunya. 🙏</p>
<p>Salam hormat,<br/>
<strong>Safki Fajar Fatmawan</strong><br/>
Founder &mdash; Kala Digital<br/>
WhatsApp: <a href="https://wa.me/6285173150927">0851-7315-0927</a><br/>
Email: cskaladigital@gmail.com<br/>
Lokasi: Purwokerto, Jawa Tengah</p>',
  'Yth. Bapak/Ibu Pimpinan {{nama_sekolah}},

Selamat pagi. Perkenalkan, saya Safki Fajar Fatmawan dari Kala Digital — pengembang website yang berfokus pada institusi pendidikan di Indonesia.

Bersama email ini, kami melampirkan proposal pembuatan website sekolah sebagai bentuk dukungan kami dalam membantu {{nama_sekolah}}:
  • Mengelola informasi & publikasi kegiatan sekolah
  • Mempermudah komunikasi dengan wali murid
  • Meningkatkan citra profesional di era digital

Pilihan paket:
  • Paket Landingpage  — Rp 2.000.000  (sudah termasuk domain & hosting)
  • Paket Premium      — Rp 3.200.000  (sudah termasuk domain & hosting)
  • Paket Custom       — sesuai kebutuhan (PPDB Online, E-Learning, dll)

Detail lengkap dapat dilihat pada proposal terlampir. Kami sangat terbuka untuk berdiskusi lebih lanjut menyesuaikan kebutuhan {{nama_sekolah}}.

Terima kasih atas perhatian dan waktunya. 🙏

Salam hormat,
Safki Fajar Fatmawan
Founder — Kala Digital
WhatsApp : 0851-7315-0927
Email    : cskaladigital@gmail.com
Lokasi   : Purwokerto, Jawa Tengah'
)
on conflict do nothing;

insert into email_templates (nama, subject, body_html, body_text)
values (
  'Kala Digital — Hangat',
  'Bantu {{nama_sekolah}} Punya Website Sekolah Profesional',
  '<p>Yth. Bapak/Ibu Pimpinan <strong>{{nama_sekolah}}</strong>,</p>
<p>Selamat pagi 🙏</p>
<p>Perkenalkan, saya <strong>Safki dari Kala Digital</strong>. Kami fokus membantu sekolah-sekolah di Indonesia membangun kehadiran online yang profesional &mdash; mulai dari profil sekolah, publikasi kegiatan, hingga sistem PPDB online.</p>
<p>Kami sudah menyiapkan proposal khusus untuk <strong>{{nama_sekolah}}</strong> yang terlampir pada email ini, dengan beberapa pilihan paket mulai dari <strong>Rp 2 juta</strong> (sudah termasuk domain &amp; hosting setahun).</p>
<p>Apabila Bapak/Ibu berkenan, kami sangat senang bisa berdiskusi lebih lanjut &mdash; bisa via balasan email ini atau WhatsApp di <a href="https://wa.me/6285173150927"><strong>0851-7315-0927</strong></a>.</p>
<p>Terima kasih atas waktu dan perhatiannya.</p>
<p>Salam hangat,<br/>
<strong>Safki Fajar Fatmawan</strong><br/>
Kala Digital &mdash; Purwokerto<br/>
cskaladigital@gmail.com</p>',
  'Yth. Bapak/Ibu Pimpinan {{nama_sekolah}},

Selamat pagi 🙏

Perkenalkan, saya Safki dari Kala Digital. Kami fokus membantu sekolah-sekolah di Indonesia membangun kehadiran online yang profesional — mulai dari profil sekolah, publikasi kegiatan, hingga sistem PPDB online.

Kami sudah menyiapkan proposal khusus untuk {{nama_sekolah}} yang terlampir pada email ini, dengan beberapa pilihan paket mulai dari Rp 2 juta (sudah termasuk domain & hosting setahun).

Apabila Bapak/Ibu berkenan, kami sangat senang bisa berdiskusi lebih lanjut — bisa via balasan email ini atau WhatsApp di 0851-7315-0927.

Terima kasih atas waktu dan perhatiannya.

Salam hangat,
Safki Fajar Fatmawan
Kala Digital — Purwokerto
cskaladigital@gmail.com'
)
on conflict do nothing;
