// 광고 내용을 읽고 그 모집에 맞는 신청 질문 만들기 (Claude) — 서버 전용
import { callTool } from './importer';
import { CATEGORIES } from './ads';

const TOOL = {
  name: 'submit_form',
  description: '이 모집에 맞는 신청서 질문과 다듬은 광고 문구',
  input_schema: {
    type: 'object',
    properties: {
      category: { type: 'string', enum: CATEGORIES },
      summary: { type: 'string', description: '게시판 카드에 보일 한두 문장 소개. 광고의 따뜻한 말투 그대로' },
      details: { type: 'string', description: '대상·지역·시간·장소 등 광고에 있는 사실만 줄바꿈으로 정리 ("시간: …" 꼴)' },
      askCommunity: { type: 'boolean', description: '소속(공동체·순) 질문이 필요한지' },
      fields: {
        type: 'array',
        description: '추가 질문 3~7개. 이름·연락처·이메일·소속·남길 말은 이미 있으니 넣지 말 것',
        items: {
          type: 'object',
          properties: {
            label: { type: 'string', description: '짧고 친절한 질문 (예: "다니는 회사 (선택)"이 아니라 "다니는 회사")' },
            kind: { type: 'string', enum: ['text', 'long', 'choice', 'multi'] },
            options: { type: 'array', items: { type: 'string' }, description: 'choice·multi일 때 보기 (마지막에 "기타"나 "잘 모르겠어요"가 필요하면 넣기)' },
            required: { type: 'boolean' },
            help: { type: 'string', description: '왜 묻는지 한 줄 (선택). 개인적인 정보일수록 이유를 적기' },
          },
          required: ['label', 'kind', 'required'],
        },
      },
      why: { type: 'string', description: '이 질문들을 고른 이유를 담당 교역자에게 한두 문장으로' },
    },
    required: ['category', 'summary', 'details', 'askCommunity', 'fields', 'why'],
  },
};

export async function designForm(ad) {
  const body = {
    max_tokens: 3000,
    system: `당신은 남가주 사랑의교회(한인 이민 교회) 청년부 담당 교역자를 돕는 사역 행정 도우미입니다.
모집 광고를 읽고, 담당자가 신청자를 받아 실제로 모임을 꾸리거나 사람을 배치하는 데 꼭 필요한 정보만 묻는 신청서를 만듭니다.

원칙
- 이 모집이 실제로 굴러가려면 무엇을 알아야 하는지부터 생각하세요. (예: 지역 모임이면 일하는 곳과 가능한 요일, 찬양팀이면 파트와 경험, 봉사면 가능한 날짜와 이동 방법)
- 이름·연락처·이메일·소속·남길 말은 기본으로 이미 있습니다. 다시 묻지 마세요.
- 3~7개. 짧게 끝나는 신청서가 더 많이 들어옵니다. 고를 수 있는 것은 choice/multi로 만들고, 꼭 필요한 것만 required.
- 개인적인 정보(회사 이름, 직장 주소 등)는 꼭 필요할 때만 묻고 required=false, help에 이유를 적으세요. 정확한 주소·생년월일·급여·건강 정보는 묻지 마세요.
- 광고에 있는 시간·지역·요일을 보기로 그대로 활용하세요. 광고에 없는 일정이나 장소를 지어내지 마세요.
- 한국어로, 청년부 성도에게 친근하고 정중하게.
- 반드시 submit_form 도구로 답하세요.`,
    messages: [{ role: 'user', content: `<ad>\n제목: ${ad.title || ''}\n부서: ${ad.category || ''}\n소개: ${ad.summary || ''}\n안내: ${ad.details || ''}\n문의: ${ad.contact || ''}\n</ad>` }],
    tools: [TOOL], tool_choice: { type: 'tool', name: 'submit_form' },
  };
  const out = await callTool(body);
  if (!out || !Array.isArray(out.fields)) throw new Error('질문을 만들지 못했습니다. 다시 눌러 주세요.');
  return out;
}
