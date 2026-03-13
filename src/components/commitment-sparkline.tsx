// SPDX-License-Identifier: LicenseRef-SOURCE-AVAILABLE
// Copyright (c) 2024-2026 Advice That SRL. All rights reserved.

interface DataPoint {
  date: string;
  value: number;
  unit: string;
  source: string;
}

export function CommitmentSparkline({ dataPoints }: { dataPoints: DataPoint[] }) {
  if (dataPoints.length < 2) return null;

  const sorted = [...dataPoints].sort((a, b) => a.date.localeCompare(b.date));
  const values = sorted.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const width = 64;
  const height = 28;
  const padding = 2;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;

  const points = sorted.map((d, i) => {
    const x = padding + (i / (sorted.length - 1)) * innerW;
    const y = padding + innerH - ((d.value - min) / range) * innerH;
    return `${x},${y}`;
  });

  const lastPoint = sorted[sorted.length - 1];
  const lastX = padding + innerW;
  const lastY = padding + innerH - ((lastPoint.value - min) / range) * innerH;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="shrink-0"
      aria-hidden="true"
    >
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-brand-700"
      />
      <circle
        cx={lastX}
        cy={lastY}
        r={2.5}
        className="fill-brand-700"
      />
    </svg>
  );
}
