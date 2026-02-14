import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> },
) {
  await params;
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title') || 'Brussels Governance Monitor';
  const type = searchParams.get('type') || 'default';
  const status = searchParams.get('status');
  const feasibility = searchParams.get('feasibility');
  const subtitle = searchParams.get('subtitle');

  const badgeText =
    type === 'domain' && status
      ? status.charAt(0).toUpperCase() + status.slice(1)
      : type === 'solution' && feasibility
        ? feasibility.charAt(0).toUpperCase() + feasibility.slice(1)
        : null;

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
          fontFamily: 'system-ui, sans-serif',
        }}
      >
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
          </div>

          <h1
            style={{
              fontSize: '52px',
              fontWeight: 800,
              color: 'white',
              lineHeight: 1.2,
              maxWidth: '900px',
            }}
          >
            {title}
          </h1>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
          }}
        >
          <span
            style={{
              fontSize: '24px',
              fontWeight: 600,
              color: 'rgba(255, 255, 255, 0.5)',
              letterSpacing: '0.02em',
            }}
          >
            governance.brussels
          </span>
          {subtitle && (
            <span
              style={{
                fontSize: '20px',
                fontWeight: 500,
                color: 'rgba(255, 255, 255, 0.4)',
              }}
            >
              {subtitle}
            </span>
          )}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
