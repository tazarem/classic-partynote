// 주소 이사: 파티노트가 coding-coconut.com/partynote → party-note.com 으로 옮김
// 브라우저 저장소(IndexedDB·localStorage)는 주소별이라 옛 주소의 글이 새 주소로 저절로 따라오지 않음.
// 그래서 새 주소의 '옛 주소에서 글 가져오기'를 누르면 옛 주소(블로그 쪽)의 이사 도우미 창을 열고,
// 도우미가 옛 주소의 글·책·설정을 이 창으로만 보내 줌 → 파일 가져오기와 같은 방식으로 합침(여러 번 해도 겹치지 않음)
// 도우미 페이지 원본: _blog/source/partynote-move/index.html
const MOVE = {
    old_origin: 'https://coding-coconut.com',
    helper: 'https://coding-coconut.com/partynote-move/',
}

const mover = {
    // 새 주소에서만 (옛 주소에서 열면 자기 자신이라 의미 없음)
    available() {
        return false // 비교용 옛 버전: 이사 안내를 보이지 않음
    },

    start() {
        const win = window.open(MOVE.helper, 'partynote-move', 'popup=yes,width=440,height=560')
        if (!win) return ui.toast('창을 열지 못했어요. 브라우저의 팝업 차단을 풀어 주세요')
        const onMessage = async (e) => {
            // 옛 주소의 도우미 창이 보낸 것만 받음
            if (e.origin !== MOVE.old_origin || e.source !== win || e.data?.type !== 'partynote-move') return
            window.removeEventListener('message', onMessage)
            win.postMessage({ type: 'partynote-move-received' }, MOVE.old_origin)
            if (e.data.empty) return ui.toast('옛 주소에 저장된 글이 없어요')
            this.applyConfig(e.data.config)
            await party_note.importBackup(new File([JSON.stringify(e.data.payload)], 'partynote-move.json', { type: 'application/json' }))
        }
        window.addEventListener('message', onMessage)
    },

    // 옛 주소의 이사 안내(coding-coconut.com/partynote)에서 '새 주소에서 글 가져오기'로 왔을 때 (?move=1): 바로 물어봄
    // 확인을 누른 순간에 이사 도우미 창을 열어야 팝업이 막히지 않음
    async askIfCameFromOld() {
        const params = new URLSearchParams(location.search)
        if (!params.has('move') || !this.available()) return
        params.delete('move')
        history.replaceState(history.state, '', location.pathname + (params.toString() ? `?${params}` : '') + location.hash)
        if (await ui.confirm('옛 주소(coding-coconut.com)에서 쓰던 글을 가져올까요?\n새 창이 잠깐 열렸다가 닫혀요.', { ok: '가져오기', cancel: '나중에' })) this.start()
    },

    // 옛 주소에서 쓰던 테마·글꼴·저자명·쪽 정렬·비공개 칸 설정도 같이
    applyConfig(config) {
        if (!config || typeof config !== 'object') return
        for (const key of ['app_theme', 'app_font', 'epub_author', 'page_sort', 'show_private']) {
            if (typeof config[key] === 'string') note_config.set(key, config[key].slice(0, 100))
        }
        party_note.applyTheme(note_config.get('app_theme'))
        party_note.applyFont(note_config.get('app_font'))
    },
}
