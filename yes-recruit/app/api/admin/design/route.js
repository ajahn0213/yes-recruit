// 관리자: 광고 내용으로 신청 질문 만들기 (저장은 하지 않고 편집 화면에 채워 줌)
import { guardAdmin, json, fail } from '@/lib/auth';
import { aiReady } from '@/lib/importer';
import { designForm } from '@/lib/designer';
import { normalizeField, CATEGORIES } from '@/lib/ads';
import { rateLimit } from '@/lib/store';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(req) {
  const g = await guardAdmin(req); if (g.error) return g.error;
  if (!aiReady()) return fail('Vercel 환경 변수에 ANTHROPIC_API_KEY가 있어야 질문을 만들 수 있어요.', 503);
  if (!(await rateLimit('design', 'admin', 60, 3600))) return fail('잠시 뒤 다시 해 주세요.', 429);
  const { ad } = await req.json().catch(() => ({}));
  const text = [ad?.title, ad?.summary, ad?.details].join(' ').trim();
  if (text.length < 8) return fail('제목과 소개(광고 글)를 먼저 적어 주세요.');
  try {
    const out = await designForm({ title: String(ad.title).slice(0, 200), category: ad.category, summary: String(ad.summary || '').slice(0, 2000), details: String(ad.details || '').slice(0, 3000), contact: String(ad.contact || '').slice(0, 300) });
    return json({
      category: CATEGORIES.includes(out.category) ? out.category : '',
      summary: String(out.summary || '').slice(0, 200),
      details: String(out.details || '').slice(0, 2000),
      askCommunity: out.askCommunity !== false,
      fields: out.fields.slice(0, 10).map(normalizeField),
      why: String(out.why || '').slice(0, 400),
    });
  } catch (e) {
    return fail(e.message || '질문을 만들지 못했습니다.', 502);
  }
}
