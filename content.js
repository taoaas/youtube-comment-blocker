(function() {
    const INDICATOR_ID = 'yt-comment-blocker-indicator';

    // --- 通常動画: インジケーターの挿入/削除 ---
    const insertIndicator = () => {
        // 既に挿入済みなら何もしない
        if (document.getElementById(INDICATOR_ID)) return;

        // コメントセクションを探す（複数のセレクタで試行）
        const commentsSection = document.querySelector('ytd-comments#comments')
            || document.querySelector('#comments')
            || document.querySelector('ytd-comments');

        if (commentsSection) {
            const indicator = document.createElement('div');
            indicator.id = INDICATOR_ID;
            indicator.className = 'yt-comment-blocker-indicator';
            indicator.textContent = 'YouTube Comment Blocker によりコメントは非表示になっています';
            commentsSection.prepend(indicator);
        }
    };

    const removeIndicator = () => {
        const indicator = document.getElementById(INDICATOR_ID);
        if (indicator) indicator.remove();
    };

    // --- Shorts: コメント数テキストを「非表示」に書き換え ---
    const replaceShortsCommentLabel = () => {
        const labels = document.querySelectorAll(
            '#shorts-container label.yt-spec-button-shape-with-label'
        );
        labels.forEach(label => {
            const btn = label.querySelector('button[aria-label*="コメント"]');
            if (btn) {
                const textEl = label.querySelector('.yt-spec-button-shape-with-label__label span');
                if (textEl && textEl.textContent.trim() !== '非表示') {
                    textEl.textContent = '非表示';
                }
            }
        });
    };

    // --- Shorts: コメントボタンのクリックを検知してトースト通知を表示 ---
    let toastTimer = null;

    const showToast = (message) => {
        let toast = document.querySelector('.yt-comment-blocker-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'yt-comment-blocker-toast';
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        // アニメーション: フェードイン
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });
        // 前のタイマーをクリアして2.5秒後にフェードアウト
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            toast.classList.remove('show');
        }, 2500);
    };

    // Shortsコメントボタンのクリックを横取りするリスナー
    document.addEventListener('click', (e) => {
        if (!currentShorts) return; // 機能がOFFならスルー

        // クリックされた要素がShortsのコメントボタンか確認
        const commentBtn = e.target.closest(
            '#shorts-container button[aria-label*="コメント"], ' +
            '#shorts-container label.yt-spec-button-shape-with-label:has(button[aria-label*="コメント"])'
        );
        if (commentBtn) {
            e.preventDefault();
            e.stopPropagation();
            showToast('YouTube Comment Blocker によりコメントは非表示になっています');
        }
    }, true); // true = キャプチャフェーズで先に捕まえる

    // --- 状態適用 ---
    const applyState = (regular, shorts) => {
        // 通常動画の制御
        if (regular) {
            document.documentElement.classList.add('hide-yt-comments-regular');
            insertIndicator();
        } else {
            document.documentElement.classList.remove('hide-yt-comments-regular');
            removeIndicator();
        }

        // Shorts動画の制御 (グレーアウト)
        if (shorts) {
            document.documentElement.classList.add('dim-yt-comments-shorts');
            replaceShortsCommentLabel();
        } else {
            document.documentElement.classList.remove('dim-yt-comments-shorts');
        }
    };

    // --- MutationObserver: YouTubeは動的にDOMを書き換えるので、変更を監視 ---
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

    observer.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true
    });

    // --- 初期状態の適用 ---
    chrome.storage.local.get(['regularEnabled', 'shortsEnabled'], (result) => {
        currentRegular = result.regularEnabled !== false;
        currentShorts = result.shortsEnabled !== false;
        applyState(currentRegular, currentShorts);
    });

    // --- ポップアップからのメッセージを待機 ---
    chrome.runtime.onMessage.addListener((message) => {
        if (message.action === "toggle") {
            currentRegular = message.regular;
            currentShorts = message.shorts;
            applyState(currentRegular, currentShorts);
        }
    });
})();
