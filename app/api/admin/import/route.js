import { guardAdmin, json, fail, todayLA } from '@/lib/auth';
import { parseBulletin, aiReady } from '@/lib/importer';
import { normalizeAd, safeLink } from '@/lib/ads';
import { rateLimit } from '@/lib/store';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(req) {
  const g = await guardAdmin(req); if (g.error) return g.error;
  if (!aiReady()) return fail('ANTHROPIC_API_KEY가 없어 자동으로 읽을 수 없습니다. 광고 관리에서 직접 추가해 주세요.', 503);
  if (!(await rateLimit('import', 'admin', 20, 3600))) return fail('잠시 뒤 다시 해 주세요.', 429);
  const { text } = await req.json().catch(() => ({}));
  if (!text || String(text).trim().length < 20) return fail('주보 글을 붙여 넣어 주세요.');
  try {
    const found = await parseBulletin(text, todayLA());
    const ads = found.slice(0, 30).map((a, i) => {
      const link = safeLink(a.link);
      return normalizeAd({ ...a, id: undefined, link, mode: link ? 'link' : 'form', fields: link ? [] : a.fields }, i);
    }).map(({ managerKeyHash, managerKeyEnc, ...a }) => a);
    return json({ ads });
  } catch (e) {
    return fail(e.message || '주보를 읽지 못했습니다.', 502);
  }
}
