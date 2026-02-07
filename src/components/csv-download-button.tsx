'use client';

interface MetricRow {
  domain: string;
  domainTitle: string;
  label: string;
  value: string;
  unit: string;
  source: string;
  sourceUrl: string;
  date: string;
  confidence: string;
}

interface CsvDownloadButtonProps {
  rows: MetricRow[];
  label: string;
}

export function CsvDownloadButton({ rows, label }: CsvDownloadButtonProps) {
  function handleDownload() {
    const headers = ['Domain', 'Indicator', 'Value', 'Unit', 'Source', 'Source URL', 'Date', 'Confidence'];
    const csvRows = rows.map((r) =>
      [r.domain, r.label, r.value, r.unit, r.source, r.sourceUrl, r.date, r.confidence]
        .map((v) => `"${v.replace(/"/g, '""')}"`)
        .join(','),
    );

    const csv = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `bgm-data-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      className="inline-flex shrink-0 items-center gap-2 rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
        />
      </svg>
      {label}
    </button>
  );
}
