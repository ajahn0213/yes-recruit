// 신청서 검사 — 서버 전용
const s = (v, max) => String(v ?? '').replace(/\u0000/g, '').trim().slice(0, max);

export function checkApplication(ad, body) {
  const errors = {};
  const name = s(body?.name, 40);
  const phone = s(body?.phone, 30);
  const email = s(body?.email, 120).toLowerCase();
  const community = s(body?.community, 60);
  const message = s(body?.message, 1000);
  if (name.length < 2) errors.name = '이름을 적어 주세요.';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) errors.phone = '연락 가능한 전화번호를 적어 주세요.';
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.email = '이메일 형식을 확인해 주세요.';
  if (!body?.consent) errors.consent = '담당자 연락에 동의해 주세요.';

  const answers = {};
  for (const f of ad.fields || []) {
    const raw = body?.answers?.[f.id];
    let v;
    if (f.kind === 'multi') {
      v = (Array.isArray(raw) ? raw : []).map((x) => s(x, 60)).filter((x) => f.options.includes(x));
      if (f.required && !v.length) errors['f_' + f.id] = '하나 이상 골라 주세요.';
    } else if (f.kind === 'choice') {
      v = s(raw, 60);
      if (v && !f.options.includes(v)) v = '';
      if (f.required && !v) errors['f_' + f.id] = '하나를 골라 주세요.';
    } else {
      v = s(raw, f.kind === 'long' ? 1500 : 200);
      if (f.required && !v) errors['f_' + f.id] = '적어 주세요.';
    }
    answers[f.id] = v;
  }
  return { errors, value: { name, phone, email, community: ad.askCommunity ? community : '', message, answers } };
}

// 보기 좋게 한 줄로
export const answerText = (v) => (Array.isArray(v) ? v.join(', ') : String(v ?? ''));
