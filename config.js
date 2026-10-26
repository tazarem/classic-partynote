const APP_CONFIG = {
    app_version: `1.53`,
    app_name: `PartyNote`,
    app_alias: `partynote`,
    // 파티노트 서버(로그인·클라우드 백업). 로컬에서 열면 로컬 서버, 그 밖에는 운영 서버
    // 로그인 쿠키는 같은 사이트끼리만 오가서, 옛 주소(coding-coconut.com)는 옛 서버 주소를, 새 주소(party-note.com)는 새 서버 주소를 씀
    // 비교용 옛 버전(classic.party-note.com): 서버를 쓰지 않음 → 로그인·클라우드 백업·공지 칸이 숨겨짐
    api_base: '',
}
