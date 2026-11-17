'use client';
import { useRef, useState } from 'react';


export default function ApplyForm({ ad }) {
  const [v, setV] = useState(() => ({ name: '', phone: '', email: '', community: '', message: '', answers: {}, consent: false, website: '' }));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [done, setDone] = useState(null);
  const top = useRef(null);

  const set = (k, x) => setV((p) => ({ ...p, [k]: x }));
  const setA = (id, x) => setV((p) => ({ ...p, answers: { ...p.answers, [id]: x } }));
  const toggleMulti = (id, o) => setV((p) => {
    const cur = Array.isArray(p.answers[id]) ? p.answers[id] : [];
    return { ...p, answers: { ...p.answers, [id]: cur.includes(o) ? cur.filter((x) => x !== o) : [...cur, o] } };
  });

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setMsg(''); setErrors({});
    try {
      const r = await fetch('/api/apply', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...v, adId: ad.id }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErrors(j.errors || {}); setMsg(j.error || '신청하지 못했습니다. 잠시 뒤 다시 해 주세요.');
        const first = Object.keys(j.errors || {})[0];
        if (first) document.getElementById('f-' + first)?.focus();
        return;
      }
      setDone(j.ref);
      setTimeout(() => top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
    } catch { setMsg('인터넷 연결을 확인해 주세요.'); }
    finally { setBusy(false); }
  }

  if (done) {
    return (
      <section className="done" ref={top} aria-live="polite">
        <p className="eyebrow">신청 완료</p>
        <h2>{v.name}님, 신청해 주셔서 감사합니다!</h2>
        <p>담당자가 확인한 뒤 남겨 주신 연락처로 연락드릴게요.</p>
        <p className="muted">신청 번호 <span className="ref">{done}</span></p>
        <a className="btn" href="/">다른 모집도 둘러보기</a>
      </section>
    );
  }

  const E = ({ k }) => (errors[k] ? <span className="err" id={'e-' + k}>{errors[k]}</span> : null);
  const aria = (k) => ({ id: 'f-' + k, 'aria-invalid': !!errors[k] || undefined, 'aria-describedby': errors[k] ? 'e-' + k : undefined });

  return (
    <form className="form" onSubmit={submit} noValidate ref={top}>
      <div>
        <p className="eyebrow">1분 신청서</p>
        <h2>여기서 바로 신청하기</h2>
      </div>
      <input className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" name="website" value={v.website} onChange={(e) => set('website', e.target.value)} />

      <label className="field">이름
        <input {...aria('name')} autoComplete="name" value={v.name} onChange={(e) => set('name', e.target.value)} maxLength={40} />
        <E k="name" />
      </label>
      <label className="field">연락처
        <input {...aria('phone')} type="tel" inputMode="tel" autoComplete="tel" placeholder="(714) 000-0000" value={v.phone} onChange={(e) => set('phone', e.target.value)} maxLength={30} />
        <E k="phone" />
      </label>
      <label className="field">이메일<span className="opt">(선택)</span>
        <input {...aria('email')} type="email" inputMode="email" autoComplete="email" value={v.email} onChange={(e) => set('email', e.target.value)} maxLength={120} />
        <E k="email" />
      </label>
      {ad.askCommunity && (
        <label className="field">소속<span className="opt">(선택)</span>
          <input id="f-community" value={v.community} onChange={(e) => set('community', e.target.value)} maxLength={60} placeholder="예: YES 청년부 · 3부 예배 · 순 이름" />
        </label>
      )}

      {ad.fields.map((f) => {
        const k = 'f_' + f.id;
        const label = <>{f.label}{!f.required && <span className="opt">(선택)</span>}</>;
        if (f.kind === 'choice' || f.kind === 'multi') {
          const multi = f.kind === 'multi';
          const cur = v.answers[f.id];
          return (
            <fieldset className="field" key={f.id} aria-describedby={errors[k] ? 'e-' + k : undefined}>
              <legend>{label}{multi && <span className="opt">여러 개 고를 수 있어요</span>}</legend>
              {f.help && <span className="help muted" style={{ fontSize: 13 }}>{f.help}</span>}
              <div className="opts">
                {f.options.map((o, i) => (
                  <label className="opt-btn" key={o}>
                    <input id={i === 0 ? 'f-' + k : undefined} type={multi ? 'checkbox' : 'radio'} name={f.id} value={o}
                      checked={multi ? Array.isArray(cur) && cur.includes(o) : cur === o}
                      onChange={() => (multi ? toggleMulti(f.id, o) : setA(f.id, o))} />
                    {o}
                  </label>
                ))}
              </div>
              <E k={k} />
            </fieldset>
          );
        }
        return (
          <label className="field" key={f.id}>{label}
            {f.help && <span className="help">{f.help}</span>}
            {f.kind === 'long'
              ? <textarea {...aria(k)} value={v.answers[f.id] || ''} onChange={(e) => setA(f.id, e.target.value)} maxLength={1500} />
              : <input {...aria(k)} value={v.answers[f.id] || ''} onChange={(e) => setA(f.id, e.target.value)} maxLength={200} />}
            <E k={k} />
          </label>
        );
      })}

      <label className="field">담당자에게 남길 말<span className="opt">(선택)</span>
        <textarea id="f-message" value={v.message} onChange={(e) => set('message', e.target.value)} maxLength={1000} placeholder="가능한 시간, 궁금한 점 등" />
      </label>

      <div>
        <label className="check">
          <input id="f-consent" type="checkbox" checked={v.consent} onChange={(e) => set('consent', e.target.checked)} aria-invalid={!!errors.consent || undefined} />
          <span>이 모집 담당자가 제 연락처로 연락하는 것에 동의합니다.</span>
        </label>
        <E k="consent" />
      </div>

      {msg && <p className="note bad" role="alert">{msg}</p>}
      <button className="btn primary block" disabled={busy}>{busy ? '보내는 중…' : '신청하기'}</button>
    </form>
  );
}
