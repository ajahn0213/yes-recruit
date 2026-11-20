import { getAds, hasStore } from '@/lib/store';
import { publicAd } from '@/lib/ads';
import { todayLA } from '@/lib/auth';
import { Header, Footer } from '@/components/Chrome';
import Board from '@/components/Board';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const today = todayLA();
  let ads = [];
  let broken = !hasStore;
  if (hasStore) {
    try { ads = (await getAds()).filter((a) => a.visible).map((a) => publicAd(a, today)); } catch { broken = true; }
  }
  // 열린 모집 먼저, 마감된 것은 아래로
  ads.sort((a, b) => Number(b.open) - Number(a.open));
  const open = ads.filter((a) => a.open).length;

  return (
    <>
      <Header />
      <main>
        <section className="hero wrap">
          <p className="eyebrow">Southern California Sarang Church</p>
          <h1>함께 섬길 <em>자리</em>가<br />기다리고 있어요</h1>
          <p>주보에 나온 모집 광고를 한곳에 모았습니다. 마음에 닿는 자리가 있다면 여기서 바로 신청해 주세요. {open > 0 && <b>지금 {open}개 모집 중</b>}</p>
        </section>
        {broken ? (
          <div className="wrap"><p className="note warn">아직 준비 중입니다. 잠시 뒤 다시 열어 주세요.</p></div>
        ) : (
          <Board ads={ads} today={today} />
        )}
      </main>
      <Footer />
    </>
  );
}
