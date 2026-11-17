// Google 문서에 붙일 Apps Script (관리 화면에서 주소를 채워서 보여 줌)
export const DOC_ID = '1wxO2HiaZLXKCKmVz2uvibjfICmIlWic1S-1XCOPBaqE';
export const TAB_ID = 't.nyrsyfn0upxm';

export function appsScript(appUrl) {
  return `/**
 * YES 모집 앱 — 주보 광고 자동 반영
 * 이 문서의 주보 광고 탭을 1시간마다 확인해서, 바뀌었으면 모집 앱에 보냅니다.
 * 처음 한 번: 저장 → 문서 새로고침 → 문서 위 메뉴 'YES 모집 앱 → 연동 설정하기' → 권한 허용 → 연동 비밀 값 붙여 넣기
 */
const APP_URL = '${appUrl}';
const DOC_ID = '${DOC_ID}';
// 주보 광고가 있는 탭. 문서 주소의 ?tab= 뒤 값입니다.
// 매주 새 탭을 만들어 쓰신다면 'LATEST'로 바꾸면 맨 마지막 탭을 읽습니다.
const TAB_ID = '${TAB_ID}';

function onOpen() {
  DocumentApp.getUi().createMenu('YES 모집 앱')
    .addItem('지금 앱에 반영하기', 'syncNow')
    .addItem('연동 설정하기', 'setupSync')
    .addToUi();
}

function setupSync() {
  const ui = DocumentApp.getUi();
  const r = ui.prompt('YES 모집 앱 연동', 'Vercel에 넣은 SYNC_SECRET 값을 붙여 넣어 주세요.', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK || !r.getResponseText().trim()) return;
  PropertiesService.getUserProperties().setProperty('SYNC_SECRET', r.getResponseText().trim());
  ScriptApp.getProjectTriggers().filter((t) => t.getHandlerFunction() === 'autoSync').forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('autoSync').timeBased().everyHours(1).create();
  ui.alert('설정했습니다. 이제 1시간마다 주보 광고를 확인해서 앱에 반영합니다.\\n지금 바로 보내려면 메뉴의 "지금 앱에 반영하기"를 누르세요.');
}

function syncNow() {
  const res = sendAds_(true);
  DocumentApp.getUi().alert(res);
}

function autoSync() { sendAds_(false); }

function readAds_() {
  const doc = DocumentApp.openById(DOC_ID);
  let tab = null;
  if (TAB_ID === 'LATEST') {
    const all = [];
    const walk = (tabs) => tabs.forEach((t) => { all.push(t); walk(t.getChildTabs()); });
    walk(doc.getTabs());
    tab = all[all.length - 1];
  } else {
    tab = doc.getTab(TAB_ID);
  }
  if (!tab) throw new Error('주보 광고 탭을 찾지 못했습니다. TAB_ID를 확인해 주세요.');
  return tab.asDocumentTab().getBody().getText();
}

function sendAds_(force) {
  const secret = PropertiesService.getUserProperties().getProperty('SYNC_SECRET');
  if (!secret) return '먼저 메뉴에서 "연동 설정하기"를 해 주세요.';
  const text = readAds_();
  const r = UrlFetchApp.fetch(APP_URL + '/api/sync', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + secret },
    payload: JSON.stringify({ text: text, force: !!force }),
  });
  let msg = '';
  try { msg = JSON.parse(r.getContentText()).message || JSON.parse(r.getContentText()).error; } catch (e) { msg = r.getContentText().slice(0, 200); }
  return msg || ('응답 ' + r.getResponseCode());
}
`;
}
