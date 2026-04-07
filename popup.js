document.addEventListener('DOMContentLoaded', () => {
    // --- 多言語化（i18n）の適用 ---
    // HTML内の [data-i18n] 属性を持つ要素をすべて探し、
    // messages.json に定義された翻訳テキストに書き換えます。
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n'); // 例: "extName"
        const message = chrome.i18n.getMessage(key);   // 翻訳を取得
        if (message) {
            element.textContent = message;             // 要素の文字を書き換え
        }
    });

    // 各スイッチの要素をHTMLから取得
    const masterSwitch = document.getElementById('master');
    const regularSwitch = document.getElementById('regular');
    const shortsSwitch = document.getElementById('shorts');

    // --- 保存された設定の読み込み ---
    // chrome.storage.local.get: ブラウザに保存されている設定を読み込みます。
    // 第1引数に読み込みたいキー（名前）のリストを渡します。
    chrome.storage.local.get(['regularEnabled', 'shortsEnabled'], (result) => {
        // 設定がまだない場合は true（ON）をデフォルトにします
        const regularValue = result.regularEnabled !== false;
        const shortsValue = result.shortsEnabled !== false;

        // 読み込んだ値をスイッチ（チェックボックス）に反映
        regularSwitch.checked = regularValue;
        shortsSwitch.checked = shortsValue;
        
        // 通常動画とShortsの両方がONなら、マスタースイッチもONにする
        masterSwitch.checked = regularValue && shortsValue;
    });

    // --- 設定の保存と、開いているYouTubeタブへの通知 ---
    const saveAndNotify = () => {
        const regular = regularSwitch.checked;
        const shorts = shortsSwitch.checked;
        
        // chrome.storage.local.set: 設定をブラウザに保存します。
        chrome.storage.local.set({ 
            regularEnabled: regular, 
            shortsEnabled: shorts 
        }, () => {
            // 保存が終わったら、開いているすべての YouTube タブを探してメッセージを送ります。
            chrome.tabs.query({ url: "*://*.youtube.com/*" }, (tabs) => {
                tabs.forEach(tab => {
                    // chrome.tabs.sendMessage: 他のスクリプト（content.js）に命令を送ります。
                    chrome.tabs.sendMessage(tab.id, { 
                        action: "toggle", 
                        regular: regular,
                        shorts: shorts
                    }).catch(() => {
                        // YouTubeタブが読み込み中の場合などはエラーになることがありますが、無視します。
                    });
                });
            });
        });

        // 2つのスイッチの状態に合わせてマスタースイッチを自動更新
        masterSwitch.checked = regular && shorts;
    };

    // 各スイッチがクリック（変更）されたら、保存・通知関数を実行する
    regularSwitch.addEventListener('change', saveAndNotify);
    shortsSwitch.addEventListener('change', saveAndNotify);

    // 一括設定（マスタースイッチ）が変更された時の動作
    masterSwitch.addEventListener('change', () => {
        const isChecked = masterSwitch.checked;
        // マスタースイッチに合わせて他の2つも同じ状態にする
        regularSwitch.checked = isChecked;
        shortsSwitch.checked = isChecked;
        saveAndNotify(); // 保存して各タブに通知
    });
});
