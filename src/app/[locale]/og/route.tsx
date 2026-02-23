import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const runtime = 'nodejs';

// Module-level font cache — loaded once per cold start
let interSemiBoldData: ArrayBuffer | null = null;
let interBoldData: ArrayBuffer | null = null;

async function loadFonts() {
  if (!interSemiBoldData) {
    const buf = await readFile(join(process.cwd(), 'src/assets/fonts/Inter-SemiBold.ttf'));
    interSemiBoldData = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }
  if (!interBoldData) {
    const buf = await readFile(join(process.cwd(), 'src/assets/fonts/Inter-Bold.ttf'));
    interBoldData = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }
  return { interSemiBoldData, interBoldData };
}

const confidenceColors: Record<string, { bg: string; text: string }> = {
  official: { bg: 'rgba(59, 130, 246, 0.25)', text: '#93c5fd' },
  estimated: { bg: 'rgba(245, 158, 11, 0.25)', text: '#fcd34d' },
  unconfirmed: { bg: 'rgba(148, 163, 184, 0.25)', text: '#94a3b8' },
};

const confidenceLabels: Record<string, string> = {
  official: 'Official',
  estimated: 'Estimated',
  unconfirmed: 'Unconfirmed',
};

function formatOgDate(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    return d.toLocaleDateString('fr-BE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return isoDate;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> },
) {
  await params;
  const { searchParams } = new URL(request.url);

  // Existing params (backward compatible)
  const title = searchParams.get('title') || 'Brussels Governance Monitor';
  const type = searchParams.get('type') || 'default';
  const status = searchParams.get('status');
  const feasibility = searchParams.get('feasibility');
  const subtitle = searchParams.get('subtitle');

  // New enrichment params
  const statsRaw = searchParams.get('stats');
  const dateParam = searchParams.get('date');
  const confidence = searchParams.get('confidence');

  const badgeText =
    type === 'domain' && status
      ? status.charAt(0).toUpperCase() + status.slice(1)
      : type === 'solution' && feasibility
        ? feasibility.charAt(0).toUpperCase() + feasibility.slice(1)
        : null;

  // Parse stats JSON: [{label, value}]
  let stats: { label: string; value: string }[] = [];
  if (statsRaw) {
    try {
      const parsed = JSON.parse(statsRaw);
      if (Array.isArray(parsed)) {
        stats = parsed.slice(0, 3);
      }
    } catch {
      // Ignore invalid JSON
    }
  }

  const fonts = await loadFonts();
  const dateDisplay = dateParam ? formatOgDate(dateParam) : null;
  const conf = confidence && confidenceColors[confidence] ? confidence : null;

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#1a1f35',
          padding: '60px',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        {/* Top: site name + badges */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <span
              style={{
                fontSize: '20px',
                fontWeight: 600,
                color: 'rgba(255, 255, 255, 0.5)',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              Brussels Governance Monitor
            </span>
            {badgeText && (
              <span
                style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: 'white',
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  padding: '4px 12px',
                  borderRadius: '999px',
                }}
              >
                {badgeText}
              </span>
            )}
            {conf && (
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: confidenceColors[conf].text,
                  backgroundColor: confidenceColors[conf].bg,
                  padding: '4px 12px',
                  borderRadius: '999px',
                }}
              >
                {confidenceLabels[conf]}
              </span>
            )}
          </div>

          {/* Title */}
          <h1
            style={{
              fontSize: title.length > 60 ? '42px' : '52px',
              fontWeight: 700,
              color: 'white',
              lineHeight: 1.2,
              maxWidth: '1000px',
            }}
          >
            {title}
          </h1>

          {/* Subtitle if provided */}
          {subtitle && (
            <span
              style={{
                fontSize: '24px',
                fontWeight: 600,
                color: 'rgba(255, 255, 255, 0.6)',
              }}
            >
              {subtitle}
            </span>
          )}
        </div>

        {/* Middle: stats blocks */}
        {stats.length > 0 && (
          <div style={{ display: 'flex', gap: '20px' }}>
            {stats.map((stat, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '16px 24px',
                  minWidth: '160px',
                }}
              >
                <span
                  style={{
                    fontSize: '32px',
                    fontWeight: 700,
                    color: 'white',
                    lineHeight: 1.2,
                  }}
                >
                  {stat.value}
                </span>
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'rgba(255, 255, 255, 0.5)',
                    marginTop: '4px',
                  }}
                >
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Bottom: domain + date + accent bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span
              style={{
                fontSize: '20px',
                fontWeight: 600,
                color: 'rgba(255, 255, 255, 0.5)',
                letterSpacing: '0.02em',
              }}
            >
              governance.brussels
              {dateDisplay ? ` — ${dateDisplay}` : ''}
            </span>
          </div>

          {/* Accent bar */}
          <div
            style={{
              display: 'flex',
              width: '100%',
              height: '4px',
              backgroundColor: 'rgba(59, 130, 246, 0.6)',
              borderRadius: '2px',
            }}
          />
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Inter',
          data: fonts.interSemiBoldData!,
          weight: 600,
          style: 'normal',
        },
        {
          name: 'Inter',
          data: fonts.interBoldData!,
          weight: 700,
          style: 'normal',
        },
      ],
    },
  );
}
