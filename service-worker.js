const TARGET_BASE = 'https://testops.moscow.alfaintra.net/project/163/test-cases/';
const TARGET_PATTERN = /\/iframe\/issue-tracker-testcase\/\d+/;
// Паттерн для страницы Testops, где скрываем элементы:
const FOCUS_PAGE_PATTERN = /^https:\/\/testops\.moscow\.alfaintra\.net\/project\/163\/test-cases\/\d+/;


// --- 1. ЛОГИКА ПЕРЕНАПРАВЛЕНИЯ (Остается без изменений) ---

chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "createTab") {
        chrome.tabs.create({ url: message.url, active: true });
    } else if (message.action === "updateTab") {
        chrome.tabs.update({ url: message.url });
    }
    return true;
});

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'redirect-context-menu',
        title: "Открыть в ТестОпс",
        contexts: ["link"],
        targetUrlPatterns: ["*://*.net/iframe/issue-tracker-testcase/*"]
    });
});

chrome.contextMenus.onClicked.addListener((info) => {
    if (info.menuItemId === 'redirect-context-menu' && info.linkUrl) {
        const newUrl = processLink(info.linkUrl);
        if (newUrl) {
            chrome.tabs.create({ url: newUrl, active: true });
        }
    }
});

function processLink(linkUrl) {
    try {
        const url = new URL(linkUrl);
        const pathParts = url.pathname.split('/');
        const targetIndex = pathParts.indexOf('issue-tracker-testcase');

        if (targetIndex === -1 || targetIndex >= pathParts.length - 1) return null;

        const targetId = pathParts[targetIndex + 1];
        if (!/^\d+$/.test(targetId)) return null;

        return `${TARGET_BASE}${targetId}`;
    } catch (error) {
        console.error('Link processing error:', error);
        return null;
    }
}


// --- 2. ЛОГИКА ACTION/ФОКУС РЕЖИМА (НОВОЕ) ---

chrome.action.onClicked.addListener((tab) => {
    // Проверка на соответствие URL страницы режиму фокусировки
    if (tab.url && FOCUS_PAGE_PATTERN.test(tab.url)) {
        // Выполняем скрипт, который будет скрывать/восстанавливать элементы
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['focus-mode.js']
        }).catch(error => console.error("Error executing focus-mode.js:", error));
    }
});