// PC에서 쓰는 작은 글쓰기 창 두 가지 (딱 세 줄)
// - 미니 창: 다른 창 위에 늘 떠 있음. 크롬·엣지 데스크톱의 Document Picture-in-Picture 기능 (사파리·파이어폭스·폰에서는 버튼이 안 보임)
// - 닌자 창: 보통 작은 창이라 다른 창(인터넷·엑셀·메신저 등)을 누르면 그 뒤로 가려짐. 제목도 '제목 없음'. PC 브라우저면 어디서나
//   처음엔 화면 오른쪽 아래에 열리고, 그다음부터는 마지막으로 둔 자리·크기에. 파티노트 창에서 Alt+N(맥은 option+N)으로도 열림
// 두 창 모두 Esc(비상 키)를 누르면 창을 바로 닫음 — 쓴 글은 원래 쓰기 칸에 그대로라 다시 열면 이어서 씀. Ctrl+S(⌘S)는 저장 버튼과 같음(저장하면 창도 닫힘)
// (웹페이지는 창을 최소화할 수 없어서 닫는 쪽으로)
// 저장하지 않고 나가려면 작은 창을 그냥 닫으면 됨 (쓴 글은 원래 쓰기 칸에 그대로)
// 쓴 글은 바로 원래 편집 칸으로 들어감 (임시 저장·글자 수·저장은 원래 화면이 그대로 맡음)
const MINI_SIZE = { width: 380, height: 116 }
const NINJA_RECT_KEY = 'ptnt_ninja_rect' // 닌자 창의 마지막 자리·크기 { left, top, width, height }

const mini_writer = {
    win: null,

    supported() {
        return 'documentPictureInPicture' in window && matchMedia('(pointer: fine)').matches
    },

    ninjaSupported() {
        return matchMedia('(pointer: fine)').matches
    },

    async open() {
        if (!$('.memo-content-input') || this.win) return
        let win
        try {
            win = await documentPictureInPicture.requestWindow(MINI_SIZE)
        } catch (e) {
            return ui.toast('미니 창을 열지 못했어요')
        }
        this.setup(win, '파티노트')
    },

    // 닌자 창을 열 자리: 마지막으로 둔 자리, 없으면 화면 오른쪽 아래 구석
    ninjaRect() {
        try {
            const r = JSON.parse(localStorage.getItem(NINJA_RECT_KEY) || 'null')
            if (r && [r.left, r.top, r.width, r.height].every(Number.isFinite)) return r
        } catch (e) { }
        const width = MINI_SIZE.width, height = MINI_SIZE.height + 40
        const s = window.screen
        const left = (s.availLeft || 0) + s.availWidth - width - 24
        const top = (s.availTop || 0) + s.availHeight - height - 90 // 창 제목줄·주소줄 몫까지 띄움
        return { left: Math.max(0, left), top: Math.max(0, top), width, height }
    },

    // 닌자 창: 이름 붙은 팝업이라 이미 열려 있으면 그 창을 앞으로
    openNinja() {
        if (!$('.memo-content-input')) return
        if (this.win && !this.win.closed) return this.win.focus()
        const r = this.ninjaRect()
        const win = window.open('', 'partynote-ninja', `popup=yes,left=${Math.round(r.left)},top=${Math.round(r.top)},width=${Math.round(r.width)},height=${Math.round(r.height)}`)
        if (!win) return ui.toast('창을 열지 못했어요. 브라우저의 팝업 차단을 풀어 주세요')
        this.setup(win, '제목 없음')
        // 열려 있는 동안 자리·크기를 기억 (닫힐 때는 창 정보를 못 읽는 브라우저가 있어서 1초마다)
        const remember = setInterval(() => {
            if (win.closed) return clearInterval(remember)
            try {
                localStorage.setItem(NINJA_RECT_KEY, JSON.stringify({ left: win.screenX, top: win.screenY, width: win.innerWidth, height: win.innerHeight }))
            } catch (e) { }
        }, 1000)
        // 앱 화면을 닫거나 새로고침하면 닌자 창도 닫음
        window.addEventListener('pagehide', () => win.close(), { once: true })
    },

    setup(win, title) {
        const main = $('.memo-content-input')
        this.win = win
        const doc = win.document
        // 앱과 같은 글꼴·테마: 이미 읽어 둔 note.css(+ 고른 경우 notosans.css) 규칙을 그대로 옮겨 붙임 (새로 받지 않아서 바로 보임)
        const sheets = [...document.styleSheets].filter(s => /\/css\/(note|notosans)\.css$/.test(s.href || ''))
        const style = doc.createElement('style')
        style.textContent = sheets.flatMap(s => [...s.cssRules].map(r => r.cssText)).join('\n')
        doc.head.appendChild(style)
        doc.documentElement.lang = 'ko'
        doc.documentElement.setAttribute('style', document.documentElement.getAttribute('style') || '') // 테마 색 (applyTheme)
        doc.documentElement.dataset.theme = document.documentElement.dataset.theme || ''
        doc.documentElement.dataset.font = document.documentElement.dataset.font || '' // 글꼴
        doc.title = title
        doc.body.className = 'mini-body'
        doc.body.innerHTML = `<div class="mini-box"><textarea class="mini-input" rows="3" placeholder="이어서 써 보세요"></textarea></div>`

        const input = doc.querySelector('.mini-input')
        // 채팅 입력칸처럼 늘 맨 끝(지금 쓰는 줄)이 보이게. 앞 글을 고치는 중이면 그 자리를 그대로 둠
        const toEnd = () => { if (input.selectionEnd === input.value.length) input.scrollTop = input.scrollHeight }
        input.value = main.value
        input.addEventListener('input', () => {
            if (!main.isConnected) return this.close()
            main.value = input.value
            main.dispatchEvent(new Event('input', { bubbles: true })) // 원래 칸의 높이·글자 수
            toEnd()
        })
        doc.addEventListener('keydown', async (e) => {
            // Ctrl+S(⌘S): 원래 화면의 저장과 같음 → 저장되면 쓰기 화면이 닫히므로 작은 창도 바로 닫음
            if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') {
                e.preventDefault()
                if (!main.isConnected) return this.close()
                await party_note.saveMemo()
                if (!main.isConnected) this.close()
                return
            }
            // 비상 키: Esc로 창을 바로 닫음. 이때는 파티노트 원래 창으로 커서를 옮기지 않음 (원래 창이 앞으로 튀어나오지 않게)
            if (e.key !== 'Escape' || e.isComposing) return
            e.preventDefault()
            quiet = true
            this.close()
        })
        // 원래 화면에서 고쳐도 작은 창에 반영
        const onMain = () => { if (input.value !== main.value) { input.value = main.value; toEnd() } }
        main.addEventListener('input', onMain)
        // 작은 창이 닫히면 정리 (창을 닫을 때 pagehide가 안 오는 브라우저도 있어서 1초마다도 확인)
        let done = false
        let quiet = false
        const cleanup = () => {
            if (done) return
            done = true
            clearInterval(watch)
            main.removeEventListener('input', onMain)
            if (this.win === win) this.win = null
            if (main.isConnected && !quiet) {
                main.focus()
                main.setSelectionRange(main.value.length, main.value.length)
            }
        }
        // 저장·취소로 편집 화면이 닫히면 작은 창도 닫음
        const watch = setInterval(() => {
            if (win.closed) return cleanup()
            if (!main.isConnected) this.close()
        }, 1000)
        win.addEventListener('pagehide', cleanup)
        input.focus()
        input.setSelectionRange(input.value.length, input.value.length)
        input.scrollTop = input.scrollHeight
    },

    close() {
        if (this.win && !this.win.closed) this.win.close()
        this.win = null
    },
}
