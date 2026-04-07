(function() {
    // インジケーター（「コメントは非表示です」という文字）のID
    const INDICATOR_ID = 'yt-comment-blocker-indicator';

    // --- 通常動画: インジケーター（案内）の挿入/削除 ---
    const insertIndicator = () => {
        // すでに画面にある場合は重複して作らない
        if (document.getElementById(INDICATOR_ID)) return;

        // YouTubeのコメントエリアの要素を探す（YouTubeは仕様変更が多いので、複数の候補を探す）
        const commentsSection = document.querySelector('ytd-comments#comments')
            || document.querySelector('#comments')
            || document.querySelector('ytd-comments');

        if (commentsSection) {
            // 新しいdiv要素を作成して、案内メッセージを入れる
            const indicator = document.createElement('div');
            indicator.id = INDICATOR_ID;
            indicator.className = 'yt-comment-blocker-indicator';
            // chrome.i18n.getMessage: messages.jsonから現在の言語のテキストを取得する
            indicator.textContent = chrome.i18n.getMessage("hiddenIndicator");
            // コメントセクションの一番上に追加する
            commentsSection.prepend(indicator);
        }
    };

    // インジケーターを画面から消す
    const removeIndicator = () => {
        const indicator = document.getElementById(INDICATOR_ID);
        if (indicator) indicator.remove();
    };

    // --- Shorts: コメントボタンの数値を「非表示」に書き換える ---
    const replaceShortsCommentLabel = () => {
        // Shortsのコメントボタンが含まれるラベル要素をすべて取得
        const labels = document.querySelectorAll(
            '#shorts-container label.yt-spec-button-shape-with-label'
        );
        labels.forEach(label => {
            // ボタンのaria-labelに「コメント」が含まれているものを探す
            const btn = label.querySelector('button[aria-label*="コメント"]');
            if (btn) {
                // ボタンの下にあるテキスト部分を取得
                const textEl = label.querySelector('.yt-spec-button-shape-with-label__label span');
                const hiddenText = chrome.i18n.getMessage("hiddenLabel");
                // すでに書き換え済みでなければ、テキストを「非表示」にする
                if (textEl && textEl.textContent.trim() !== hiddenText) {
                    textEl.textContent = hiddenText;
                }
            }
        });
    };

    // --- Shorts: コメントボタンが押された時にトースト通知を出す ---
    let toastTimer = null;

    const showToast = (message) => {
        let toast = document.querySelector('.yt-comment-blocker-toast');
        if (!toast) {
            // トースト用の要素がなければ新しく作る
            toast = document.createElement('div');
            toast.className = 'yt-comment-blocker-toast';
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        // ブラウザの次の描画タイミングでクラスを追加してフェードインさせる
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });
        // 2.5秒後に自動で消す。新しく押されたらタイマーをリセットする。
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            toast.classList.remove('show');
        }, 2500);
    };

    // 画面上のクリックを監視（キャプチャフェーズ）
    document.addEventListener('click', (e) => {
        // ショート動画の非表示機能がONでなければ何もしない
        if (!currentShorts) return;

        // クリックされた場所がShortsের コメントボタン系かどうかを判定
        const commentBtn = e.target.closest(
            '#shorts-container button[aria-label*="コメント"], ' +
            '#shorts-container label.yt-spec-button-shape-with-label:has(button[aria-label*="コメント"])'
        );
        if (commentBtn) {
            // 本来のクリック動作（コメント欄を開く）を止める
            e.preventDefault();
            e.stopPropagation();
            // 代わりにトースト通知を出す
            showToast(chrome.i18n.getMessage("hiddenIndicator"));
        }
    }, true); // true を指定することで、YouTube側の処理が動く前にこの処理を割り込ませる

    // --- 状態の適用（CSSのクラスを付け外しする） ---
    const applyState = (regular, shorts) => {
        // 通常動画
        if (regular) {
            // HTMLのルート要素(<html>)にクラスを付けて、content.cssで非表示にする
            document.documentElement.classList.add('hide-yt-comments-regular');
            insertIndicator();
        } else {
            document.documentElement.classList.remove('hide-yt-comments-regular');
            removeIndicator();
        }

        // Shorts動画
        if (shorts) {
            document.documentElement.classList.add('dim-yt-comments-shorts');
            replaceShortsCommentLabel();
        } else {
            document.documentElement.classList.remove('dim-yt-comments-shorts');
        }
    };

    // --- 画面の変化を監視（MutationObserver） ---
    // YouTubeはページを移動しても画面全体を読み直さず、中身だけを書き換えるため
    // 常に画面（DOM）の変化を監視して、新しいコメント欄が出てきたら即座に対応する。
    let currentRegular = true;
    let currentShorts = true;

    const observer = new MutationObserver(() => {
        if (currentRegular) {
            insertIndicator();
        }
        if (currentShorts) {
            replaceShortsCommentLabel();
        }
    });

    // 監視の開始
    observer.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true
    });

    // --- 起動時の処理 ---
    // ブラウザに保存されているON/OFF設定を読み込み、適用する
    chrome.storage.local.get(['regularEnabled', 'shortsEnabled'], (result) => {
        currentRegular = result.regularEnabled !== false;
        currentShorts = result.shortsEnabled !== false;
        applyState(currentRegular, currentShorts);
    });

    // --- ポップアップからのリアルタイム命令を受け取る ---
    chrome.runtime.onMessage.addListener((message) => {
        if (message.action === "toggle") {
            currentRegular = message.regular;
            currentShorts = message.shorts;
            applyState(currentRegular, currentShorts);
        }
    });
})();
