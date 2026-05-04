"use client";

import Link from "next/link";
import { useState } from "react";
import { FilterSubmitButton } from "./FilterSubmitButton";
import { Select } from "./Select";

type Props = {
  defaults: {
    q?: string;
    provinsi?: string;
    kabupaten?: string;
    kecamatan?: string;
    status?: string;
    hasEmail?: string;
  };
  filters: {
    provinsi: string[];
    kabByProv: Record<string, string[]>;
    kecByKab: Record<string, string[]>;
  };
};

export function SekolahFilterForm({ defaults, filters }: Props) {
  const [provinsi, setProvinsi] = useState(defaults.provinsi ?? "");
  const [kabupaten, setKabupaten] = useState(defaults.kabupaten ?? "");
  const [kecamatan, setKecamatan] = useState(defaults.kecamatan ?? "");
  const [status, setStatus] = useState(defaults.status ?? "");

  const kabupatenOptions = provinsi ? filters.kabByProv[provinsi] ?? [] : [];
  const kecamatanOptions = kabupaten ? filters.kecByKab[kabupaten] ?? [] : [];

  return (
    <form className="rounded-2xl bg-white border border-slate-200 p-4 lg:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
      <div className="lg:col-span-2">
        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
          Cari nama / NPSN
        </label>
        <input
          name="q"
          defaultValue={defaults.q ?? ""}
          placeholder="Ketik untuk mencari..."
          className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
          Provinsi
        </label>
        <Select
          name="provinsi"
          value={provinsi}
          onChange={(v) => {
            setProvinsi(v);
            setKabupaten("");
            setKecamatan("");
          }}
          searchable={filters.provinsi.length > 8}
          placeholder="Semua"
          options={[
            { value: "", label: "Semua" },
            ...filters.provinsi.map((p) => ({ value: p, label: p })),
          ]}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
          Kabupaten
        </label>
        <Select
          name="kabupaten"
          value={kabupaten}
          onChange={(v) => {
            setKabupaten(v);
            setKecamatan("");
          }}
          disabled={!provinsi}
          searchable={kabupatenOptions.length > 8}
          placeholder={provinsi ? "Semua" : "Pilih provinsi"}
          options={[
            { value: "", label: "Semua" },
            ...kabupatenOptions.map((k) => ({ value: k, label: k })),
          ]}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
          Kecamatan
        </label>
        <Select
          name="kecamatan"
          value={kecamatan}
          onChange={setKecamatan}
          disabled={!kabupaten}
          searchable={kecamatanOptions.length > 8}
          placeholder={kabupaten ? "Semua" : "Pilih kabupaten"}
          options={[
            { value: "", label: "Semua" },
            ...kecamatanOptions.map((k) => ({ value: k, label: k })),
          ]}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
          Status
        </label>
        <Select
          name="status"
          value={status}
          onChange={setStatus}
          options={[
            { value: "", label: "Semua" },
            { value: "negeri", label: "Negeri" },
            { value: "swasta", label: "Swasta" },
          ]}
        />
      </div>

      <div className="sm:col-span-2 lg:col-span-6 flex items-center justify-between gap-3 flex-wrap">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 px-4 py-2 rounded-lg bg-purple-50 border border-purple-200 cursor-pointer hover:bg-purple-100">
          <input
            type="checkbox"
            name="hasEmail"
            value="1"
            defaultChecked={defaults.hasEmail === "1"}
            className="accent-purple-600"
          />
          Hanya yang ada email
        </label>
        <div className="flex gap-2">
          <Link
            href="/sekolah"
            className="text-sm text-slate-600 hover:text-purple-700 px-3 py-2"
          >
            Reset
          </Link>
          <FilterSubmitButton />
        </div>
      </div>
    </form>
  );
}
