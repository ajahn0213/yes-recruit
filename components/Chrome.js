// 공용 머리·꼬리 (서버 컴포넌트)
export function Header() {
  return (
    <>
      <div className="stripe" aria-hidden="true"><i /><i /><i /><i /></div>
      <header className="site-head">
        <a className="home" href="/">
          <img src="/brand/yes-mark-ink.png" alt="YES" />
          <span className="name">모집·신청<span>RECRUIT</span></span>
        </a>
        <span className="grow" />
        <img className="church" src="/brand/srcc-main.png" alt="남가주 사랑의교회" />
      </header>
    </>
  );
}

export function Footer() {
  return (
    <footer className="site-foot">
      <div className="in">
        <img src="/brand/srcc-main.png" alt="남가주 사랑의교회" />
        <p className="care">신청하신 정보는 <b>해당 모집 담당자</b>만 보고, 연락을 드리는 데에만 씁니다.</p>
        <p>궁금한 점은 각 광고의 문의처로 연락해 주세요.</p>
      </div>
    </footer>
  );
}
