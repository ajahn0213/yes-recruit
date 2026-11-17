// 주보·포스터에 넣을 QR (SVG) — 관리자만
import QRCode from 'qrcode';
import { guardAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const g = await guardAdmin(req); if (g.error) return g.error;
  const url = new URL(req.url);
  const base = (process.env.APP_URL || url.origin).replace(/\/$/, '');
  const id = url.searchParams.get('ad');
  const target = id && /^[a-z0-9_-]{2,40}$/i.test(id) ? `${base}/r/${id}` : base + '/';
  const svg = await QRCode.toString(target, { type: 'svg', margin: 2, errorCorrectionLevel: 'M', color: { dark: '#112b32', light: '#ffffff' } });
  return new Response(svg, {
    headers: {
      'content-type': 'image/svg+xml', 'cache-control': 'no-store',
      ...(url.searchParams.get('download') ? { 'content-disposition': `attachment; filename="yes-recruit-qr${id ? '-' + id : ''}.svg"` } : {}),
    },
  });
}
