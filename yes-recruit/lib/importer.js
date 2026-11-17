// 주보 글에서 모집 광고 뽑기 (Claude) — 서버 전용, ANTHROPIC_API_KEY가 있을 때만
import { CATEGORIES } from './ads';

export const aiReady = () => Boolean(process.env.ANTHROPIC_API_KEY);
const MODELS = () => [process.env.ANTHROPIC_MODEL, 'claude-sonnet-5', 'claude-sonnet-4-5'].filter(Boolean);

const TOOL = {
  name: 'submit_ads',
  description: '주보에서 찾은 모집·신청 광고 목록',
  input_schema: {
    type: 'object',
    properties: {
      ads: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            match_id: { type: 'string', description: '<current> 목록에 같은 모집(제목이 조금 달라도 같은 사역·같은 모집)이 있으면 그 id, 없으면 빈 문자열' },
            title: { type: 'string', description: '짧은 제목 (예: "사랑부(장애우) 봉사자 모집")' },
            category: { type: 'string', enum: CATEGORIES },
            summary: { type: 'string', description: '한두 문장 소개' },
            details: { type: 'string', description: '일시·장소·대상 등을 줄바꿈으로. 주보에 있는 사실만' },
            contact: { type: 'string', description: '문의처 (이름과 전화번호 그대로)' },
            link: { type: 'string', description: '주보에 신청 링크가 있으면 그 주소, 없으면 빈 문자열' },
            deadline: { type: 'string', description: '마감일이나 행사일이 분명하면 YYYY-MM-DD, 아니면 빈 문자열' },
            fields: {
              type: 'array', description: '링크가 없을 때 신청서에 넣으면 좋을 추가 질문 (이름·연락처·이메일은 이미 있음). 최대 3개',
              items: { type: 'object', properties: { label: { type: 'string' }, kind: { type: 'string', enum: ['text', 'long', 'choice', 'multi'] }, options: { type: 'array', items: { type: 'string' } }, required: { type: 'boolean' } }, required: ['label', 'kind'] },
            },
          },
          required: ['title', 'category', 'summary', 'details', 'contact', 'link', 'deadline'],
        },
      },
    },
    required: ['ads'],
  },
};

export async function parseBulletin(text, today, current = []) {
  if (!aiReady()) throw new Error('ANTHROPIC_API_KEY가 없어 자동으로 읽을 수 없습니다.');
  const base = (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/$/, '');
  const body = {
    max_tokens: 6000,
    system: `당신은 교회 주보에서 "사람을 모집하거나 신청을 받는 광고"만 골라내는 도우미입니다. 오늘은 ${today} (로스앤젤레스)입니다.
- 모집·신청·봉사자·단원·교사·참가자를 구하는 광고만 고릅니다. 단순 공지, 헌금, 부고, 예배 안내는 빼세요.
- 주보에 적힌 사실만 옮기고, 없는 날짜·장소·연락처를 지어내지 마세요.
- 신청 링크(http, www, tinyurl 등)가 있으면 link에 넣고 fields는 비웁니다.
- 연도가 없는 날짜는 오늘 이후 가장 가까운 날짜로 YYYY-MM-DD를 정합니다.
- 같은 모집을 두 번 넣지 마세요. 한 광고 안에 여러 모집(예: 찬양대와 오케스트라)이 있으면 따로 나눕니다.
- <current>는 앱에 이미 있는 광고입니다. 같은 모집이면 match_id에 그 id를 넣고, 제목·내용은 주보 글 기준으로 적습니다.
- 반드시 submit_ads 도구로 답하세요.`,
    messages: [{ role: 'user', content: `다음 주보 글에서 모집 광고를 뽑아 주세요.\n\n<current>\n${current.map((a) => `${a.id}\t${a.title}`).join('\n') || '(없음)'}\n</current>\n\n<bulletin>\n${String(text).slice(0, 30000)}\n</bulletin>` }],
    tools: [TOOL], tool_choice: { type: 'tool', name: 'submit_ads' },
  };
  let last;
  for (const model of [...new Set(MODELS())]) {
    const r = await fetch(base + '/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ ...body, model }),
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok) {
      const use = (j.content || []).find((c) => c.type === 'tool_use');
      return Array.isArray(use?.input?.ads) ? use.input.ads : [];
    }
    last = j?.error?.message || `HTTP ${r.status}`;
    if (r.status === 401 || r.status === 403) throw new Error('Anthropic API 키를 확인해 주세요.');
    if (!(r.status === 404 || /model/i.test(last))) break;
  }
  throw new Error('주보를 읽지 못했습니다: ' + last);
}
