(function() {
    const applyState = (regular, shorts) => {
        // 通常動画の制御
        if (regular) {
            document.documentElement.classList.add('hide-yt-comments-regular');
        } else {
            document.documentElement.classList.remove('hide-yt-comments-regular');
        }

        // Shorts動画の制御 (グレーアウト)
        if (shorts) {
            document.documentElement.classList.add('dim-yt-comments-shorts');
        } else {
            document.documentElement.classList.remove('dim-yt-comments-shorts');
        }
    };

    // 初期状態の適用
    chrome.storage.local.get(['regularEnabled', 'shortsEnabled'], (result) => {
        const regular = result.regularEnabled !== false;
        const shorts = result.shortsEnabled !== false;
        applyState(regular, shorts);
    });

    // ポップアップからのメッセージを待機
    chrome.runtime.onMessage.addListener((message) => {
        if (message.action === "toggle") {
            applyState(message.regular, message.shorts);
        }
    });
})();
