'use client';
import { useCallback, useEffect, useState } from 'react';
import { CATEGORIES, FIELD_KINDS } from '@/lib/ads';
import Responses from './Responses';
import { appsScript } from '@/lib/appsScript';
import { findDuplicatePairs } from '@/lib/similar';

const H = { 'content-type': 'application/json', 'x-yes-recruit': '1' };
async function api(url, body, method = 'POST') {
  const r = await fetch(url, { method, headers: H, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) { location.href = '/admin/login'; throw new Error('로그인이 필요합니다.'); }
  if (!r.ok) throw new Error(j.error || '처리하지 못했습니다.');
  return j;
}

export default function AdminApp({ appUrl: envUrl }) {
  const [tab, setTab] = useState('resp');
  const [ads, setAds] = useState(null);
  const [byAd, setByAd] = useState({});
  const [flags, setFlags] = useState({ ai: false, mail: false });
  const [toast, setToast] = useState('');
  const [appUrl, setAppUrl] = useState(envUrl);
  useEffect(() => { if (!envUrl) setAppUrl(location.origin); }, [envUrl]);

  const say = useCallback((m) => { setToast(m); setTimeout(() => setToast(''), 2400); }, []);
  const load = useCallback(async () => {
    try {
      const [a, r] = await Promise.all([fetch('/api/admin/ads').then((x) => x.json()), fetch('/api/admin/responses').then((x) => x.json())]);
      if (a.error) throw new Error(a.error);
      setAds(a.ads); setFlags({ ai: a.ai, mail: a.mail }); setByAd(r.responses || {});
    } catch (e) { say(e.message); }
  }, [say]);
  useEffect(() => { load(); }, [load]);

  async function patch(adId, id, p) {
    setByAd((m) => ({ ...m, [adId]: (m[adId] || []).map((r) => (r.id === id ? { ...r, ...p } : r)) }));
    try { await api('/api/admin/responses', { action: 'update', adId, id, ...p }); say('저장했습니다'); } catch (e) { say(e.message); load(); }
  }
  async function del(adId, id, name) {
    if (!confirm(`${name}님의 신청을 삭제할까요? 되돌릴 수 없습니다.`)) return;
    try { await api('/api/admin/responses', { action: 'delete', adId, id }); setByAd((m) => ({ ...m, [adId]: m[adId].filter((r) => r.id !== id) })); say('삭제했습니다'); } catch (e) { say(e.message); }
  }
  async function logout() { await fetch('/api/auth', { method: 'DELETE', headers: H }); location.href = '/admin/login'; }

  const formAds = (ads || []).filter((a) => a.mode === 'form');
  const newCount = formAds.reduce((n, a) => n + (byAd[a.id] || []).filter((r) => r.status === 'new').length, 0);

  return (
    <>
      <div className="stripe" aria-hidden="true"><i /><i /><i /><i /></div>
      <header className="adm-head">
        <img src="/brand/yes-mark-ink.png" alt="YES" />
        <b>모집·신청 관리</b>
        <span className="grow" />
        <a className="btn small" href="/" target="_blank">게시판 보기 ↗</a>
        <button className="btn small ghost" onClick={logout}>로그아웃</button>
      </header>
      <main className="wrap" style={{ paddingBottom: 60 }}>
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'resp'} onClick={() => setTab('resp')}>신청 현황{newCount > 0 && <span className="badge">{newCount}</span>}</button>
          <button role="tab" aria-selected={tab === 'ads'} onClick={() => setTab('ads')}>광고 관리</button>
          <button role="tab" aria-selected={tab === 'import'} onClick={() => setTab('import')}>주보 연동</button>
        </div>
        {!ads ? <p className="muted">불러오는 중…</p>
          : tab === 'resp' ? <Responses ads={formAds} byAd={byAd} onPatch={patch} onDelete={del} csvHref={(ad) => '/api/admin/export' + (ad && ad !== 'all' ? '?ad=' + ad : '')} />
          : tab === 'ads' ? <AdsTab ads={ads} reload={load} say={say} appUrl={appUrl} mail={flags.mail} />
          : <><SyncPanel appUrl={appUrl} reload={load} say={say} /><ImportTab ai={flags.ai} existing={ads} reload={load} say={say} goAds={() => setTab('ads')} /></>}
      </main>
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}

/* ================= 광고 관리 */
const blankAd = () => ({ title: '', category: '교회 전체', summary: '', details: '', contact: '', mode: 'form', link: '', fields: [], askCommunity: true, deadline: '', visible: true, notify: '' });

function AdsTab({ ads, reload, say, appUrl, mail }) {
  const [edit, setEdit] = useState(null);
  const [share, setShare] = useState(null);

  async function act(body, ok) { try { await api('/api/admin/ads', body); if (ok) say(ok); await reload(); } catch (e) { say(e.message); } }
  async function remove(a) {
    const n = a.counts?.total || 0;
    if (!confirm(`"${a.title}" 광고를 지울까요?${n ? `\n신청 ${n}건도 함께 지워집니다.` : ''}\n(잠시 내리려면 '숨기기'를 쓰세요)`)) return;
    act({ action: 'delete', id: a.id, withResponses: true }, '지웠습니다');
  }

  return (
    <>
      <div className="editor" style={{ borderWidth: 1.5, borderColor: 'var(--line)', gridTemplateColumns: 'auto 1fr', alignItems: 'center' }}>
        <img className="qr" src="/api/admin/qr" alt="모집 게시판 QR 코드" />
        <div style={{ display: 'grid', gap: 8 }}>
          <b>주보에 넣을 게시판 주소</b>
          <p className="muted" style={{ fontSize: 14 }}>이 주소(또는 QR) 하나만 주보에 넣으면, 성도님들이 모든 모집을 보고 바로 신청하거나 각 부서 링크로 넘어갈 수 있어요.</p>
          <CopyLine value={appUrl + '/'} say={say} />
          <a className="link" style={{ fontSize: 14 }} href="/api/admin/qr?download=1">QR 내려받기 (SVG)</a>
        </div>
      </div>

      <Duplicates ads={ads} reload={reload} say={say} />

      <div className="toolbar">
        <b>광고 {ads.length}개</b><span className="muted" style={{ fontSize: 14 }}>· 공개 {ads.filter((a) => a.visible).length}</span>
        <span className="grow" />
        <button className="btn small primary" onClick={() => setEdit(blankAd())}>+ 새 광고</button>
      </div>
      {edit && <Editor initial={edit} mail={mail} onClose={() => setEdit(null)} onSaved={async () => { setEdit(null); say('저장했습니다'); await reload(); }} />}

      <div className="adlist">
        {ads.map((a, i) => (
          <div key={a.id} className={'adrow cat' + (a.visible ? '' : ' hidden')} data-c={a.category}>
            <div>
              <h3>{a.title}</h3>
              <div className="meta">
                <span className="tag">{a.category}</span>
                <span className={'how m-' + a.mode}>{a.mode === 'link' ? '외부 링크' : '앱 신청서'}</span>
                {a.mode === 'form' ? <span>신청 <b style={{ color: 'var(--ink)' }}>{a.counts?.total || 0}</b>{a.counts?.new ? ` · 새 ${a.counts.new}` : ''}</span> : <span>링크 클릭 <b style={{ color: 'var(--ink)' }}>{a.clicks || 0}</b></span>}
                {a.deadline && <span>마감 {a.deadline.slice(5).replace('-', '/')}</span>}
                {a.mode === 'form' && a.notify && <span title={a.notify}>✉ 책임자 {a.notify.split(/[,;\s]+/).filter(Boolean).length}명</span>}
                {a.source === 'bulletin' && <span className="how" title="주보가 바뀌면 자동으로 고쳐집니다">{a.locked ? '직접 관리' : '주보 연동'}</span>}
                {!a.visible && <span style={{ color: 'var(--red)', fontWeight: 700 }}>{a.autoHidden ? '주보에서 빠져 숨김' : '숨김'}</span>}
              </div>
            </div>
            <div className="acts">
              <button className="btn small" onClick={() => act({ action: 'move', id: a.id, dir: 'up' })} disabled={i === 0} aria-label="위로">↑</button>
              <button className="btn small" onClick={() => act({ action: 'move', id: a.id, dir: 'down' })} disabled={i === ads.length - 1} aria-label="아래로">↓</button>
              <button className="btn small" onClick={() => act({ action: 'toggle', id: a.id }, a.visible ? '숨겼습니다' : '공개했습니다')}>{a.visible ? '숨기기' : '공개'}</button>
              <button className="btn small" onClick={() => setShare(a)}>공유</button>
              <button className="btn small primary" onClick={() => setEdit(a)}>수정</button>
              <button className="btn small danger" onClick={() => remove(a)}>삭제</button>
            </div>
          </div>
        ))}
      </div>
      {share && <ShareModal ad={share} appUrl={appUrl} say={say} onClose={() => setShare(null)} reload={reload} />}
    </>
  );
}

function CopyLine({ value, say }) {
  return (
    <div className="copyline">
      <input readOnly value={value} onFocus={(e) => e.target.select()} aria-label="주소" />
      <button className="btn small" onClick={async () => { try { await navigator.clipboard.writeText(value); say('복사했습니다'); } catch { say('주소를 길게 눌러 복사해 주세요'); } }}>복사</button>
    </div>
  );
}

function ShareModal({ ad, appUrl, say, onClose, reload }) {
  const [key, setKey] = useState(ad.managerKey || '');
  async function make(revoke) {
    if (key && !confirm(revoke ? '담당자 링크를 막을까요?' : '새 링크를 만들면 예전 링크는 더 이상 열리지 않습니다. 계속할까요?')) return;
    try { const j = await api('/api/admin/ads', { action: 'managerKey', id: ad.id, revoke }); setKey(j.managerKey); say(revoke ? '링크를 막았습니다' : '담당자 링크를 만들었습니다'); reload(); } catch (e) { say(e.message); }
  }
  return (
    <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="공유">
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>{ad.title}</h2>
        <div style={{ display: 'grid', gap: 8 }}>
          <b>성도님께 보낼 신청 주소</b>
          <CopyLine value={`${appUrl}/r/${ad.id}`} say={say} />
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <img className="qr" src={`/api/admin/qr?ad=${ad.id}`} alt="이 광고 QR 코드" />
            <a className="link" style={{ fontSize: 14 }} href={`/api/admin/qr?ad=${ad.id}&download=1`}>QR 내려받기</a>
          </div>
        </div>
        {ad.mode === 'form' && (
          <div style={{ display: 'grid', gap: 8, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
            <b>부서 담당자 링크</b>
            <p className="muted" style={{ fontSize: 14 }}>담당자는 로그인 없이 <b>이 모집의 신청만</b> 보고, 연락 상태를 바꾸고, 엑셀로 받을 수 있어요. 다른 모집은 보이지 않습니다.</p>
            {key ? <><CopyLine value={`${appUrl}/m/${ad.id}?k=${key}`} say={say} />
              <div style={{ display: 'flex', gap: 8 }}><button className="btn small" onClick={() => make(false)}>새 링크로 바꾸기</button><button className="btn small danger" onClick={() => make(true)}>링크 막기</button></div></>
              : <button className="btn small primary" onClick={() => make(false)}>담당자 링크 만들기</button>}
          </div>
        )}
        <button className="btn" onClick={onClose}>닫기</button>
      </div>
    </div>
  );
}

function Editor({ initial, onClose, onSaved, mail }) {
  const [a, setA] = useState(() => ({ ...blankAd(), ...initial, fields: (initial.fields || []).map((f) => ({ ...f, options: (f.options || []).join(', ') })) }));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k, v) => setA((p) => ({ ...p, [k]: v }));
  const setF = (i, k, v) => setA((p) => ({ ...p, fields: p.fields.map((f, j) => (j === i ? { ...f, [k]: v } : f)) }));

  async function save() {
    if (!a.title.trim()) return setErr('제목을 적어 주세요.');
    if (a.mode === 'link' && !a.link.trim()) return setErr('신청 링크를 넣어 주세요.');
    setBusy(true); setErr('');
    try {
      const { counts, managerKey, ...ad } = a;
      await api('/api/admin/ads', { action: 'save', ad: { ...ad, fields: a.fields.map((f) => ({ ...f, options: String(f.options || '').split(',') })) } });
      onSaved();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <section className="editor" aria-label="광고 편집">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, flex: 1 }}>{initial.id ? '광고 수정' : '새 광고'}</h2>
        <button className="btn small ghost" onClick={onClose}>닫기</button>
      </div>
      <label className="field">제목<input value={a.title} onChange={(e) => set('title', e.target.value)} maxLength={80} placeholder="예: 사랑부(장애우) 봉사자 모집" /></label>
      <div className="row2">
        <label className="field">부서<select value={a.category} onChange={(e) => set('category', e.target.value)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
        <label className="field">마감일<span className="opt">(지나면 자동 마감)</span><input type="date" value={a.deadline} onChange={(e) => set('deadline', e.target.value)} /></label>
      </div>
      <label className="field">한두 줄 소개<input value={a.summary} onChange={(e) => set('summary', e.target.value)} maxLength={200} /></label>
      <label className="field">안내 (일시·장소·대상)<textarea value={a.details} onChange={(e) => set('details', e.target.value)} maxLength={2000} /></label>
      <label className="field">문의처<input value={a.contact} onChange={(e) => set('contact', e.target.value)} maxLength={300} placeholder="이름 (714) 000-0000" /></label>

      <div style={{ display: 'grid', gap: 10 }}>
        <b style={{ fontSize: 14 }}>신청 받는 방법</b>
        <div className="seg" role="group">
          <button type="button" aria-pressed={a.mode === 'form'} onClick={() => set('mode', 'form')}>앱에서 바로 받기</button>
          <button type="button" aria-pressed={a.mode === 'link'} onClick={() => set('mode', 'link')}>부서 링크로 보내기</button>
        </div>
        {a.mode === 'link' ? (
          <label className="field">신청 링크<input value={a.link} onChange={(e) => set('link', e.target.value)} placeholder="https://…" inputMode="url" /><span className="help">게시판에서 누르면 이 주소로 넘어가고, 몇 번 눌렸는지 세어 둡니다.</span></label>
        ) : (
          <>
            <p className="muted" style={{ fontSize: 14 }}>이름·연락처·이메일(선택)·남길 말은 기본으로 들어갑니다. 더 물어볼 것만 추가하세요.</p>
            <label className="check"><input type="checkbox" checked={a.askCommunity} onChange={(e) => set('askCommunity', e.target.checked)} /><span>소속(부서·순) 물어보기</span></label>
            {a.fields.map((f, i) => (
              <div className="fieldrow" key={i}>
                <input value={f.label} onChange={(e) => setF(i, 'label', e.target.value)} placeholder="질문 (예: 악기)" aria-label="질문" />
                <select value={f.kind} onChange={(e) => setF(i, 'kind', e.target.value)} aria-label="답 형식">{Object.entries(FIELD_KINDS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                <label className="check" style={{ fontSize: 13 }}><input type="checkbox" checked={!!f.required} onChange={(e) => setF(i, 'required', e.target.checked)} />필수</label>
                <button type="button" className="link" style={{ color: 'var(--red)', fontSize: 13 }} onClick={() => set('fields', a.fields.filter((_, j) => j !== i))}>빼기</button>
                {(f.kind === 'choice' || f.kind === 'multi') && <input className="opts-in" value={f.options} onChange={(e) => setF(i, 'options', e.target.value)} placeholder="보기를 쉼표로: 소프라노, 알토, 테너, 베이스" aria-label="보기" />}
              </div>
            ))}
            {a.fields.length < 12 && <button type="button" className="btn small" style={{ justifySelf: 'start' }} onClick={() => set('fields', [...a.fields, { label: '', kind: 'text', options: '', required: false }])}>+ 질문 추가</button>}
            <label className="field">모집 책임자 이메일<span className="opt">(선택, 쉼표로 여러 명)</span>
              <input value={a.notify} onChange={(e) => set('notify', e.target.value)} placeholder="leader@example.com" inputMode="email" />
              <span className="help">새 신청이 들어오면 관리자와 함께 이 분들께도 같은 신청 내용 메일이 갑니다. 책임자 메일에는 이 모집 신청만 보는 담당자 링크가 들어가요(비밀번호 없이 열림).</span>
              {!mail && <span className="help" style={{ color: 'var(--red)' }}>메일 설정(GMAIL_USER·GMAIL_APP_PASSWORD)이 없어서 지금은 알림이 가지 않아요.</span>}
            </label>
          </>
        )}
      </div>
      <label className="check"><input type="checkbox" checked={a.visible} onChange={(e) => set('visible', e.target.checked)} /><span>게시판에 공개</span></label>
      {a.source === 'bulletin' && (
        <label className="check"><input type="checkbox" checked={!!a.locked} onChange={(e) => set('locked', e.target.checked)} />
          <span>직접 관리 <span className="muted" style={{ fontSize: 13 }}>— 체크하면 주보가 바뀌어도 이 광고는 자동으로 고치거나 숨기지 않아요. 여기서 고친 문구를 지키고 싶을 때 쓰세요.</span></span></label>
      )}
      {a.source === 'bulletin' && !a.locked && initial.id && <p className="note" style={{ fontSize: 13 }}>이 광고는 주보와 연동돼 있어요. 제목·소개·안내·문의·링크·마감일은 다음 주보 반영 때 주보 내용으로 바뀝니다. 추가 질문·알림 메일·담당자 링크는 그대로 남아요.</p>}
      {err && <p className="note bad" role="alert">{err}</p>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn primary" onClick={save} disabled={busy}>{busy ? '저장 중…' : '저장'}</button>
        <button className="btn" onClick={onClose}>취소</button>
      </div>
    </section>
  );
}

/* ================= 주보에서 가져오기 */
const norm = (t) => String(t || '').replace(/[\s()·\-—]/g, '').replace(/모집|신청|함께해요/g, '');
function ImportTab({ ai, existing, reload, say, goAds }) {
  const has = (t) => existing.some((e) => norm(e.title) === norm(t) || (norm(t).length > 3 && (norm(e.title).includes(norm(t)) || norm(t).includes(norm(e.title)))));
  const [text, setText] = useState('');
  const [found, setFound] = useState(null);
  const [pick, setPick] = useState({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function read() {
    setBusy(true); setErr(''); setFound(null);
    try {
      const j = await api('/api/admin/import', { text });
      setFound(j.ads); setPick(Object.fromEntries(j.ads.map((a, i) => [i, !has(a.title)])));
      if (!j.ads.length) setErr('모집 광고를 찾지 못했습니다.');
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  async function add() {
    const list = found.filter((_, i) => pick[i]);
    if (!list.length) return;
    setBusy(true);
    try { await api('/api/admin/ads', { action: 'saveMany', ads: list }); say(`${list.length}개를 추가했습니다`); await reload(); goAds(); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  if (!ai) {
    return <p className="note warn">주보 자동 읽기를 쓰려면 Vercel 환경 변수에 <b>ANTHROPIC_API_KEY</b>를 넣어 주세요. 없어도 <b>광고 관리 → + 새 광고</b>로 직접 추가할 수 있어요.</p>;
  }
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <h2 style={{ fontSize: 18, fontWeight: 800 }}>직접 붙여 넣어 가져오기</h2>
      <p className="muted">이번 주 주보 광고 글을 통째로 붙여 넣으면, 모집 광고만 골라 정리해 드립니다. 신청 링크가 있으면 <b>링크로 보내기</b>, 없으면 <b>앱 신청서</b>로 만들어요. 확인하고 고른 것만 추가됩니다.</p>
      <label className="field">주보 광고 글
        <textarea value={text} onChange={(e) => setText(e.target.value)} style={{ minHeight: 220 }} placeholder="광고 글을 여기에 붙여 넣으세요" />
      </label>
      <button className="btn primary" style={{ justifySelf: 'start' }} disabled={busy || text.trim().length < 20} onClick={read}>{busy && !found ? '읽는 중… (30초쯤)' : '모집 광고 찾기'}</button>
      {err && <p className="note bad" role="alert">{err}</p>}
      {found?.length > 0 && (
        <>
          <b>찾은 모집 {found.length}개 — 추가할 것을 고르세요</b>
          {found.map((a, i) => (
            <label key={i} className="import-card cat" data-c={a.category}>
              <input type="checkbox" checked={!!pick[i]} onChange={(e) => setPick((p) => ({ ...p, [i]: e.target.checked }))} />
              <div style={{ display: 'grid', gap: 4 }}>
                <div className="meta" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><span className="tag">{a.category}</span><span className={'how m-' + a.mode}>{a.mode === 'link' ? '외부 링크' : '앱 신청서'}</span>{a.deadline && <span className="muted" style={{ fontSize: 13 }}>마감 {a.deadline}</span>}{has(a.title) && <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--red)' }}>이미 비슷한 광고가 있어요</span>}</div>
                <b>{a.title}</b>
                {a.summary && <span style={{ fontSize: 14 }}>{a.summary}</span>}
                {a.details && <span className="muted" style={{ fontSize: 13, whiteSpace: 'pre-line' }}>{a.details}</span>}
                {a.contact && <span className="muted" style={{ fontSize: 13 }}>문의 · {a.contact}</span>}
                {a.link && <span className="muted" style={{ fontSize: 13, fontFamily: 'var(--latin)' }}>{a.link}</span>}
                {a.fields?.length > 0 && <span className="muted" style={{ fontSize: 13 }}>추가 질문: {a.fields.map((f) => f.label).join(' · ')}</span>}
              </div>
            </label>
          ))}
          <button className="btn primary" style={{ justifySelf: 'start' }} onClick={add} disabled={busy}>선택한 {Object.values(pick).filter(Boolean).length}개 추가</button>
          <p className="muted" style={{ fontSize: 13 }}>같은 광고가 이미 있으면 두 번 추가되지 않도록 확인해 주세요. 추가한 뒤 광고 관리에서 고칠 수 있어요.</p>
        </>
      )}
    </div>
  );
}

/* ================= 주보 자동 연동 */
function SyncPanel({ appUrl, reload, say }) {
  const [st, setSt] = useState(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => fetch('/api/admin/sync').then((r) => r.json()).then(setSt).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);
  const fmt = (iso) => new Intl.DateTimeFormat('ko-KR', { timeZone: 'America/Los_Angeles', month: 'numeric', day: 'numeric', weekday: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
  async function rerun() {
    setBusy(true);
    try { const j = await api('/api/admin/sync', {}); say(j.message || '반영했습니다'); await load(); await reload(); } catch (e) { say(e.message); } finally { setBusy(false); }
  }
  const code = appsScript(appUrl || 'https://yes-recruit.vercel.app');
  if (!st) return null;
  const last = st.log?.[0];
  return (
    <section className="editor" style={{ borderWidth: 1.5, borderColor: 'var(--line)', marginBottom: 28 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, flex: 1 }}>Google 문서 주보 자동 반영</h2>
        {st.at ? <span className="how m-form">연결됨 · 마지막 {fmt(st.at)}</span> : <span className="how">아직 연결 전</span>}
      </div>
      <p className="muted" style={{ fontSize: 14 }}>주보 제작 Google 문서의 광고 탭이 바뀌면 1시간 안에 여기에 자동으로 반영됩니다. 새 모집은 추가, 바뀐 모집은 수정, 주보에서 빠진 모집은 숨김(신청 기록은 그대로). 문서 메뉴 <b>YES 모집 앱 → 지금 앱에 반영하기</b>로 바로 보낼 수도 있어요.</p>
      {!st.hasSecret && <p className="note warn">Vercel 환경 변수에 <b>SYNC_SECRET</b>(아무 긴 문자열)을 넣고 다시 배포해 주세요.</p>}
      {!st.ai && <p className="note warn">주보를 읽으려면 Vercel 환경 변수에 <b>ANTHROPIC_API_KEY</b>가 필요합니다.</p>}
      {last && (
        <div className={'note' + (last.ok ? '' : ' bad')} style={{ display: 'grid', gap: 4 }}>
          <b>{fmt(last.at)} · {last.message}</b>
          {last.added?.length > 0 && <span>추가: {last.added.join(', ')}</span>}
          {(last.updated?.length > 0 || last.shown?.length > 0) && <span>수정: {[...(last.updated || []), ...(last.shown || [])].join(', ')}</span>}
          {last.hidden?.length > 0 && <span>숨김: {last.hidden.join(', ')}</span>}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {st.hasText && <button className="btn small" onClick={rerun} disabled={busy}>{busy ? '반영 중… (30초쯤)' : '마지막 주보로 다시 반영'}</button>}
        <button className="btn small" onClick={() => setOpen((o) => !o)}>{open ? '설치 방법 닫기' : '설치 방법 · 스크립트 보기'}</button>
      </div>
      {open && (
        <div style={{ display: 'grid', gap: 10, fontSize: 14 }}>
          <ol style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 6 }}>
            <li>주보 제작 Google 문서를 열고 메뉴 <b>확장 프로그램 → Apps Script</b>를 누릅니다.</li>
            <li>원래 있던 글을 모두 지우고 아래 스크립트를 붙여 넣은 뒤 <b>저장</b>(💾)합니다.</li>
            <li>Google 문서로 돌아와 <b>새로고침</b>하면 메뉴에 <b>YES 모집 앱</b>이 생깁니다.</li>
            <li><b>YES 모집 앱 → 연동 설정하기</b> → 권한 허용(“확인되지 않은 앱” 화면이 나오면 고급 → 이동) → Vercel에 넣은 <b>SYNC_SECRET</b> 값을 붙여 넣습니다.</li>
            <li><b>YES 모집 앱 → 지금 앱에 반영하기</b>로 첫 반영을 해 봅니다. 1분 뒤 이 화면을 새로고침하세요.</li>
          </ol>
          <textarea readOnly value={code} style={{ minHeight: 220, fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12, padding: 12, border: '1.5px solid var(--line)' }} onFocus={(e) => e.target.select()} />
          <button className="btn small primary" style={{ justifySelf: 'start' }} onClick={async () => { try { await navigator.clipboard.writeText(code); say('스크립트를 복사했습니다'); } catch { say('글 상자를 눌러 전체 선택 후 복사해 주세요'); } }}>스크립트 복사</button>
        </div>
      )}
      {st.log?.length > 1 && (
        <details style={{ fontSize: 13 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 700 }}>지난 기록</summary>
          <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>{st.log.slice(1).map((l, i) => <li key={i} className={l.ok ? '' : 'err'}>{fmt(l.at)} · {l.message}</li>)}</ul>
        </details>
      )}
    </section>
  );
}

/* ================= 중복 광고 합치기 */
function Duplicates({ ads, reload, say }) {
  const [busy, setBusy] = useState(false);
  const [keep, setKeep] = useState('');
  const [drop, setDrop] = useState('');
  const pairs = findDuplicatePairs(ads);
  const count = (a) => (a.mode === 'form' ? `신청 ${a.counts?.total || 0}` : `클릭 ${a.clicks || 0}`);
  const when = (iso) => (iso ? new Date(iso).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }) : '');

  async function merge(k, d, quiet) {
    const r = await api('/api/admin/ads', { action: 'merge', keep: k, drop: d });
    if (!quiet) say(r.moved ? `합쳤습니다 · 신청 ${r.moved}건을 옮겼어요` : '합쳤습니다');
  }
  async function run(list) {
    setBusy(true);
    try { for (const p of list) await merge(p.keep.id, p.drop.id, list.length > 1); if (list.length > 1) say(`${list.length}쌍을 합쳤습니다`); await reload(); }
    catch (e) { say(e.message); await reload(); } finally { setBusy(false); }
  }

  return (
    <>
      {pairs.length > 0 && (
        <section className="note warn" style={{ display: 'grid', gap: 10, marginBottom: 18 }}>
          <b>같은 모집으로 보이는 광고가 {pairs.length}쌍 있어요</b>
          <span style={{ fontSize: 13 }}>합치면 <b>먼저 만든 광고</b>의 주소(주보에 실린 링크)·담당자 링크는 그대로 두고, 최신 문구와 두 광고의 신청을 모두 한곳에 모읍니다.</span>
          {pairs.map((p) => (
            <div key={p.drop.id} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', background: '#fff', padding: '10px 12px' }}>
              <div style={{ flex: 1, minWidth: 220, fontSize: 14, display: 'grid', gap: 2 }}>
                <span><b>남김</b> {p.keep.title} <span className="muted">({when(p.keep.createdAt)} · {count(p.keep)} · /r/{p.keep.id})</span></span>
                <span><b>합침</b> {p.drop.title} <span className="muted">({when(p.drop.createdAt)} · {count(p.drop)})</span></span>
              </div>
              <button className="btn small primary" disabled={busy} onClick={() => run([p])}>합치기</button>
            </div>
          ))}
          {pairs.length > 1 && <button className="btn small" style={{ justifySelf: 'start' }} disabled={busy} onClick={() => run(pairs)}>{busy ? '합치는 중…' : `${pairs.length}쌍 모두 합치기`}</button>}
        </section>
      )}
      <details style={{ marginBottom: 14, fontSize: 14 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 700 }}>두 광고 직접 합치기</summary>
        <div className="toolbar" style={{ marginTop: 10 }}>
          <select value={keep} onChange={(e) => setKeep(e.target.value)} aria-label="남길 광고"><option value="">남길 광고 (주소 유지)</option>{ads.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}</select>
          <span>←</span>
          <select value={drop} onChange={(e) => setDrop(e.target.value)} aria-label="합칠 광고"><option value="">합쳐서 없앨 광고</option>{ads.filter((a) => a.id !== keep).map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}</select>
          <button className="btn small primary" disabled={busy || !keep || !drop} onClick={() => { if (confirm('두 광고를 합칠까요? 되돌릴 수 없습니다.')) run([{ keep: { id: keep }, drop: { id: drop } }]); }}>합치기</button>
        </div>
      </details>
    </>
  );
}
