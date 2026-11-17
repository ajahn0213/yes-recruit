import { adForManager } from '@/lib/manager';
import { hasStore } from '@/lib/store';
import ManagerView from '@/components/ManagerView';

export const dynamic = 'force-dynamic';
export const metadata = { title: '신청 현황 · 담당자', robots: { index: false, follow: false }, referrer: 'no-referrer' };

export default async function Manager({ params, searchParams }) {
  const { id } = await params;
  const { k } = await searchParams;
  const ad = hasStore ? await adForManager(id, k) : null;
  if (!ad) {
    return <div className="narrow" style={{ paddingTop: 80 }}><p className="note bad">링크가 맞지 않거나 더 이상 쓸 수 없는 링크입니다. 담당 교역자께 새 링크를 요청해 주세요.</p></div>;
  }
  const { managerKeyHash, managerKeyEnc, ...safe } = ad;
  return <ManagerView ad={safe} k={k} />;
}
