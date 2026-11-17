import { guardAdmin, json, fail } from '@/lib/auth';
import { getAds, getAllResponses, updateResponses } from '@/lib/store';
import { RESP_STATUS } from '@/lib/ads';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const g = await guardAdmin(req); if (g.error) return g.error;
  const ads = await getAds();
  const all = await getAllResponses(ads.filter((a) => a.mode === 'form').map((a) => a.id));
  return json({ responses: all });
}

export async function POST(req) {
  const g = await guardAdmin(req); if (g.error) return g.error;
  const { action, adId, id, status, note } = await req.json().catch(() => ({}));
  if (!adId || !id) return fail('잘못된 요청입니다.');
  let hit = false;
  if (action === 'update') {
    if (status && !RESP_STATUS[status]) return fail('잘못된 상태입니다.');
    await updateResponses(String(adId), (list) => list.map((r) => {
      if (r.id !== id) return r;
      hit = true;
      return { ...r, ...(status ? { status } : {}), ...(typeof note === 'string' ? { note: note.slice(0, 500) } : {}), updatedAt: new Date().toISOString() };
    }));
  } else if (action === 'delete') {
    await updateResponses(String(adId), (list) => list.filter((r) => (r.id === id ? ((hit = true), false) : true)));
  } else return fail('알 수 없는 요청입니다.');
  if (!hit) return fail('신청을 찾을 수 없습니다.', 404);
  return json({ ok: true });
}
