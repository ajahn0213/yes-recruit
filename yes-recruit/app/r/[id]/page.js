import { notFound } from 'next/navigation';
import { getAd, hasStore } from '@/lib/store';
import { publicAd } from '@/lib/ads';
import { todayLA } from '@/lib/auth';
import { dday } from '@/lib/dday';
import { Header, Footer } from '@/components/Chrome';
import ApplyForm from '@/components/ApplyForm';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { id } = await params;
  if (!hasStore) return {};
  const ad = await getAd(id).catch(() => null);
  return ad?.visible ? { title: `${ad.title} · 남가주 사랑의교회`, description: ad.summary } : {};
}

export default async function AdPage({ params }) {
  const { id } = await params;
  if (!hasStore) notFound();
  const raw = await getAd(id);
  if (!raw || !raw.visible) notFound();
  const today = todayLA();
  const ad = publicAd(raw, today);
  const d = dday(ad.deadline, today);

  return (
    <>
      <Header />
      <main className="narrow">
        <a className="back" href="/">← 모든 모집 보기</a>
        <article className="detail cat" data-c={ad.category}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="tag">{ad.category}</span>
            {d && <span className={'dday ' + d.cls}>{d.text}</span>}
          </div>
          <h1>{ad.title}</h1>
          {ad.summary && <p className="sum">{ad.summary}</p>}
          {(ad.details || ad.contact) && (
            <dl className="facts">
              {ad.details && <div><dt>안내</dt><dd>{ad.details}</dd></div>}
              {ad.contact && <div><dt>문의</dt><dd>{ad.contact}</dd></div>}
            </dl>
          )}
        </article>

        {!ad.open ? (
          <div className="linkbox"><b>이 모집은 마감되었습니다.</b><p className="muted">관심을 가져 주셔서 감사합니다. 궁금한 점은 문의처로 연락해 주세요.</p></div>
        ) : ad.mode === 'link' ? (
          <div className="linkbox">
            <b>이 모집은 담당 부서의 신청 페이지에서 받고 있어요.</b>
            <a className="btn primary block" href={`/go/${ad.id}`} target="_blank" rel="noopener">신청 페이지로 이동 ↗</a>
          </div>
        ) : (
          <ApplyForm ad={ad} />
        )}
      </main>
      <Footer />
    </>
  );
}
