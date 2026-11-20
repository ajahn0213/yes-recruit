// 새 신청 알림 메일 (선택 — Gmail 앱 비밀번호가 있을 때만) — 서버 전용
import { answerText } from './validate';

export const mailReady = () => Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let transport;
async function sendMail({ to, subject, html, text }) {
  const nodemailer = (await import('nodemailer')).default;
  const user = process.env.GMAIL_USER.trim();
  const port = Number(process.env.GMAIL_SMTP_PORT || 465);
  transport = transport || nodemailer.createTransport({
    host: process.env.GMAIL_SMTP_HOST || 'smtp.gmail.com', port, secure: port === 465,
    auth: { user, pass: process.env.GMAIL_APP_PASSWORD.replace(/\s+/g, '') },
    tls: process.env.GMAIL_SMTP_HOST ? { rejectUnauthorized: false } : undefined,
  });
  try { await transport.sendMail({ from: { name: process.env.MAIL_FROM_NAME || 'YES 모집', address: user }, to, subject, html, text }); }
  catch (e) { transport = null; throw e; }
}

const emails = (str) => String(str || '').split(/[,;\s]+/).map((x) => x.trim()).filter((x) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x));

// 관리자(NOTIFY_EMAILS)에게는 관리 화면 버튼, 모집 책임자(광고의 알림 이메일)에게는 그 모집만 보는 담당자 링크 버튼
export async function notifyNew(ad, r, appUrl, managerKey = '') {
  if (!mailReady()) return false;
  const leaders = [...new Set(emails(ad.notify).map((x) => x.toLowerCase()))];
  const admins = [...new Set(emails(process.env.NOTIFY_EMAILS).map((x) => x.toLowerCase()))].filter((x) => !leaders.includes(x));
  if (!leaders.length && !admins.length) return false;
  const rows = [
    ['이름', r.name], ['연락처', r.phone], r.email && ['이메일', r.email], r.community && ['소속', r.community],
    ...(ad.fields || []).map((f) => [f.label, answerText(r.answers?.[f.id])]),
    r.message && ['남긴 말', r.message],
  ].filter(Boolean);
  const subject = `[YES 모집] ${ad.title} — ${r.name}님 신청`;
  const build = (button, link, foot) => {
    const html = `<!doctype html><html lang="ko"><body style="margin:0;background:#f4f4f1;font-family:-apple-system,'Apple SD Gothic Neo','Pretendard','Malgun Gothic',sans-serif;color:#112b32;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;">
<tr><td style="height:5px;background:linear-gradient(90deg,#6cb8e6 25%,#f26544 25% 50%,#febc1e 50% 75%,#40b65a 75%);"></td></tr>
<tr><td style="padding:26px 26px 4px;font-size:11px;letter-spacing:.14em;font-weight:700;color:#6d7478;">새 신청 · ${esc(r.ref)}</td></tr>
<tr><td style="padding:4px 26px 10px;font-size:22px;font-weight:800;line-height:1.35;">${esc(ad.title)}</td></tr>
<tr><td style="padding:0 26px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:2px solid #112b32;">
${rows.map(([k, v]) => `<tr><td style="padding:9px 0;border-bottom:1px solid #e2e2de;font-size:13px;color:#6d7478;width:96px;vertical-align:top;">${esc(k)}</td><td style="padding:9px 0;border-bottom:1px solid #e2e2de;font-size:15px;font-weight:600;white-space:pre-wrap;">${esc(v)}</td></tr>`).join('')}
</table></td></tr>
${link ? `<tr><td style="padding:20px 26px 8px;"><a href="${esc(link)}" style="display:inline-block;background:#112b32;color:#fff;text-decoration:none;font-weight:700;padding:13px 20px;">${esc(button)}</a></td></tr>` : ''}
<tr><td style="padding:10px 26px 26px;font-size:12px;color:#6d7478;line-height:1.6;">${esc(foot)}</td></tr>
</table></td></tr></table></body></html>`;
    const text = `[${ad.title}] 새 신청 ${r.ref}\n` + rows.map(([k, v]) => `${k}: ${v}`).join('\n') + (link ? `\n\n${button}: ${link}` : '') + `\n\n${foot}`;
    return { html, text };
  };
  const jobs = [];
  if (admins.length) {
    jobs.push(sendMail({ to: admins.join(','), subject, ...build('신청 현황 열기', `${appUrl}/admin`, 'YES 모집·신청 관리자 알림입니다.') }));
  }
  if (leaders.length) {
    const link = managerKey ? `${appUrl}/m/${ad.id}?k=${encodeURIComponent(managerKey)}` : '';
    jobs.push(sendMail({ to: leaders.join(','), subject, ...build('이 모집 신청 현황 보기', link, '이 모집 책임자로 등록되어 보내 드리는 알림입니다. 신청하신 분께 연락해 주세요. 위 버튼(로그인 필요 없음)에서 연락 상태를 표시하고 엑셀로 받을 수 있습니다. 연락처가 담겨 있으니 메일을 다른 분께 전달하지 말아 주세요.') }));
  }
  const res = await Promise.allSettled(jobs);
  const bad = res.find((x) => x.status === 'rejected');
  if (bad) throw bad.reason;
  return true;
}
