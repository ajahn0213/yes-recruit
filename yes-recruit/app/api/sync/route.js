// Google 문서(Apps Script)가 주보 광고 글을 보내는 곳
import crypto from 'crypto';
import { after } from 'next/server';
import { json, fail, todayLA, clientIp } from '@/lib/auth';
import { getSyncState, rateLimit, hasStore } from '@/lib/store';
import { runSync, textHash } from '@/lib/sync';
import { aiReady } from '@/lib/importer';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function authorized(req) {
  const secret = process.env.SYNC_SECRET || '';
  const got = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (secret.length < 16 || !got) return false;
  const a = crypto.createHash('sha256').update(got).digest(), b = crypto.createHash('sha256').update(secret).digest();
  return crypto.timingSafeEqual(a, b);
}

export async function POST(req) {
  if (!hasStore) return fail('저장소가 연결되지 않았습니다.', 503);
  if (!process.env.SYNC_SECRET) return fail('앱에 SYNC_SECRET이 설정되지 않았습니다.', 503);
  if (!(await rateLimit('sync', clientIp(req), 30, 3600))) return fail('잠시 뒤 다시 해 주세요.', 429);
  if (!authorized(req)) return fail('연동 비밀 값이 맞지 않습니다.', 401);
  if (!aiReady()) return fail('앱에 ANTHROPIC_API_KEY가 없어 주보를 읽을 수 없습니다.', 503);

  const { text, force } = await req.json().catch(() => ({}));
  if (!text || String(text).trim().length < 20) return fail('주보 글이 비어 있습니다.');
  const st = await getSyncState();
  if (!force && st.hash === textHash(text)) return json({ status: 'unchanged', message: '지난번과 같은 내용이라 그대로 둡니다.' });

  // 주보 읽기는 30초쯤 걸려서, 먼저 '받았다'고 답하고 뒤에서 처리
  after(() => runSync(String(text), todayLA(), { force: !!force }).catch((e) => console.error('[sync]', e)));
  return json({ status: 'queued', message: '받았습니다. 1분 안에 앱에 반영됩니다.' }, 202);
}
