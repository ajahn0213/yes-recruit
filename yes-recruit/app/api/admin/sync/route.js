// 관리자: 주보 연동 기록 보기 · 마지막 주보 글로 다시 반영
import { guardAdmin, json, fail, todayLA } from '@/lib/auth';
import { getSyncState } from '@/lib/store';
import { runSync } from '@/lib/sync';
import { aiReady } from '@/lib/importer';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(req) {
  const g = await guardAdmin(req); if (g.error) return g.error;
  const st = await getSyncState();
  return json({ ready: Boolean(process.env.SYNC_SECRET) && aiReady(), hasSecret: Boolean(process.env.SYNC_SECRET), ai: aiReady(), at: st.at || '', hasText: Boolean(st.text), log: st.log || [] });
}

export async function POST(req) {
  const g = await guardAdmin(req); if (g.error) return g.error;
  if (!aiReady()) return fail('ANTHROPIC_API_KEY가 없습니다.', 503);
  const st = await getSyncState();
  if (!st.text) return fail('아직 Google 문서에서 받은 주보 글이 없습니다.');
  const r = await runSync(st.text, todayLA(), { force: true });
  if (r.status === 'busy') return fail('지금 반영 중입니다. 잠시 뒤 다시 해 주세요.', 409);
  return json(r);
}
