export type School = {
  id: string;
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
  source_url: string | null;
  scraped_at: string;
  created_at: string;
};

export type EmailTemplate = {
  id: string;
  nama: string;
  subject: string;
  body_html: string;
  body_text: string | null;
  attachment_path: string | null;
  attachment_name: string | null;
  created_at: string;
  updated_at: string;
};

export type EmailBlast = {
  id: string;
  template_id: string | null;
  nama_batch: string;
  total_target: number;
  total_terkirim: number;
  total_gagal: number;
  status: "draft" | "running" | "done" | "failed";
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
};
