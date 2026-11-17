// 부서 담당자 링크: 자기 모집의 신청만 보고, 상태·메모를 바꾸고, CSV로 받기
import { json, fail, writeOk, clientIp, todayLA } from '@/lib/auth';
import { adForManager } from '@/lib/manager';
import { getResponses, updateResponses, rateLimit } from '@/lib/store';
import { RESP_STATUS } from '@/lib/ads';
import { toCsv, csvResponse } from '@/lib/csv';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const u = new URL(req.url).searchParams;
  if (!(await rateLimit('mgr', clientIp(req), 120, 600))) return fail('잠시 뒤 다시 해 주세요.', 429);
  const ad = await adForManager(u.get('ad'), u.get('k'));
  if (!ad) return fail('링크가 맞지 않거나 만료되었습니다.', 404);
  const list = await getResponses(ad.id);
  if (u.get('csv')) return csvResponse(toCsv([ad], { [ad.id]: list }), `${ad.title} ${todayLA()}`);
  return json({ responses: list });
}

export async function POST(req) {
  if (!writeOk(req)) return fail('잘못된 요청입니다.', 403);
  const { ad: adId, k, id, status, note } = await req.json().catch(() => ({}));
  const ad = await adForManager(adId, k);
  if (!ad) return fail('링크가 맞지 않거나 만료되었습니다.', 404);
  if (status && !RESP_STATUS[status]) return fail('잘못된 상태입니다.');
  let hit = false;
  await updateResponses(ad.id, (list) => list.map((r) => (r.id === id ? ((hit = true), { ...r, ...(status ? { status } : {}), ...(typeof note === 'string' ? { note: note.slice(0, 500) } : {}), updatedAt: new Date().toISOString() }) : r)));
  if (!hit) return fail('신청을 찾을 수 없습니다.', 404);
  return json({ ok: true });
}
