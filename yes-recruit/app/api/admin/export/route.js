import { guardAdmin, todayLA } from '@/lib/auth';
import { getAds, getAllResponses } from '@/lib/store';
import { toCsv, csvResponse } from '@/lib/csv';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const g = await guardAdmin(req); if (g.error) return g.error;
  const only = new URL(req.url).searchParams.get('ad');
  const ads = (await getAds()).filter((a) => a.mode === 'form' && (!only || a.id === only));
  const all = await getAllResponses(ads.map((a) => a.id));
  const name = (ads.length === 1 && only ? ads[0].title : 'YES 모집 신청 전체') + ' ' + todayLA();
  return csvResponse(toCsv(ads, all), name);
}
