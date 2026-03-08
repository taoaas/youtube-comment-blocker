document.addEventListener('DOMContentLoaded', () => {
    const masterSwitch = document.getElementById('master');
    const regularSwitch = document.getElementById('regular');
    const shortsSwitch = document.getElementById('shorts');

    // 保存された状態を読み込む（デフォルトはON）
    chrome.storage.local.get(['regularEnabled', 'shortsEnabled'], (result) => {
        const regularValue = result.regularEnabled !== false;
        const shortsValue = result.shortsEnabled !== false;

        regularSwitch.checked = regularValue;
        shortsSwitch.checked = shortsValue;
        
        // 両方ONならマスターもON
        masterSwitch.checked = regularValue && shortsValue;
    });

    // 共通の保存・通知関数
    const saveAndNotify = () => {
        const regular = regularSwitch.checked;
        const shorts = shortsSwitch.checked;
        
        chrome.storage.local.set({ 
            regularEnabled: regular, 
            shortsEnabled: shorts 
        }, () => {
            chrome.tabs.query({ url: "*://*.youtube.com/*" }, (tabs) => {
                tabs.forEach(tab => {
                    chrome.tabs.sendMessage(tab.id, { 
                        action: "toggle", 
                        regular: regular,
                        shorts: shorts
                    }).catch(() => {});
                });
            });
        });

        // マスタースイッチの状態を同期
        masterSwitch.checked = regular && shorts;
    };

    // 各個別スイッチのイベント
    regularSwitch.addEventListener('change', saveAndNotify);
    shortsSwitch.addEventListener('change', saveAndNotify);

    // 一括設定スイッチのイベント
    masterSwitch.addEventListener('change', () => {
        const isChecked = masterSwitch.checked;
        regularSwitch.checked = isChecked;
        shortsSwitch.checked = isChecked;
        saveAndNotify();
    });
});
