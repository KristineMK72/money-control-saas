"use client";

type PaperScrollScannerProps = {
  title: string;
  description: string;
  file: File | null;
  busy: boolean;
  disabled?: boolean;
  accept?: string;
  actionLabel?: string;
  busyLabel?: string;
  onFileChange: (file: File | null) => void;
  onScan: () => void;
};

export default function PaperScrollScanner({
  title,
  description,
  file,
  busy,
  disabled = false,
  accept = "image/*",
  actionLabel = "Scan with Ben",
  busyLabel = "Ben is reading...",
  onFileChange,
  onScan,
}: PaperScrollScannerProps) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-amber-200/70 bg-[#f6e8c8] p-5 text-zinc-950 shadow-2xl md:p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-45"
        style={{
          background:
            "linear-gradient(90deg, rgba(120,53,15,0.16), transparent 18%, transparent 82%, rgba(120,53,15,0.16)), radial-gradient(circle at 22% 18%, rgba(255,255,255,0.7), transparent 13rem)",
        }}
      />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-800">
              Ben&apos;s paper scanner
            </p>
            <h2 className="mt-2 text-2xl font-black text-zinc-950">{title}</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-zinc-700">
              {description}
            </p>
          </div>
          <div className="hidden rounded-full border border-amber-300 bg-amber-100 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-amber-900 md:block">
            Scroll mode
          </div>
        </div>

        <label className="mt-5 block cursor-pointer rounded-[1.5rem] border-2 border-dashed border-amber-700/45 bg-amber-50/75 p-6 text-center shadow-inner transition hover:bg-amber-50">
          <input
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => onFileChange(e.target.files?.[0] || null)}
          />
          <span className="block text-sm font-black uppercase tracking-[0.18em] text-amber-900">
            {file ? file.name : "Choose a statement, receipt, or screenshot"}
          </span>
          <span className="mt-2 block text-sm font-semibold text-zinc-600">
            Ben will draft the numbers; thou still approves the ledger.
          </span>
        </label>

        <button
          type="button"
          onClick={onScan}
          disabled={!file || busy || disabled}
          className="mt-5 w-full rounded-2xl bg-zinc-950 px-5 py-3 font-black text-amber-50 shadow-lg transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-55"
        >
          {busy ? busyLabel : actionLabel}
        </button>
      </div>
    </section>
  );
}
