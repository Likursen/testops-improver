const TARGET_BASE = 'https://testops.moscow.alfaintra.net/project/163/test-cases/';
const FOCUS_PAGE_PATTERN = /^https:\/\/testops\.moscow\.alfaintra\.net\/project\/163\/test-cases\/\d+/;
const SETTINGS_KEY = 'testops_settings';

async function updateContextMenu() {
    const data = await chrome.storage.local.get([SETTINGS_KEY]);
    const settings = data[SETTINGS_KEY] || { jiraRedirect: true, fixCopy: true, focusModeEnabled: true };
    
    chrome.contextMenus.removeAll(() => {
        if (settings.jiraRedirect) {
            chrome.contextMenus.create({
                id: 'redirect-context-menu',
                title: "Открыть в ТестОпс",
                contexts: ["link"],
                targetUrlPatterns: ["*://*.net/iframe/issue-tracker-testcase/*"]
            });
        }
        chrome.contextMenus.create({
            id: 'open-settings',
            title: "Настройки TestOps Improver",
            contexts: ["action"]
        });
    });
}

chrome.runtime.onInstalled.addListener(async () => {
    const data = await chrome.storage.local.get([SETTINGS_KEY]);
    if (!data[SETTINGS_KEY]) {
        await chrome.storage.local.set({
            [SETTINGS_KEY]: { jiraRedirect: true, fixCopy: true, focusModeEnabled: true }
        });
    }
    updateContextMenu();
});

chrome.storage.onChanged.addListener((changes) => {
    if (changes[SETTINGS_KEY]) updateContextMenu();
});

chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "createTab") {
        chrome.tabs.create({ url: message.url, active: true });
    } else if (message.action === "updateTab") {
        chrome.tabs.update({ url: message.url });
    }
    return true;
});

chrome.contextMenus.onClicked.addListener((info) => {
    if (info.menuItemId === 'redirect-context-menu' && info.linkUrl) {
        const url = new URL(info.linkUrl);
        const pathParts = url.pathname.split('/');
        const targetIndex = pathParts.indexOf('issue-tracker-testcase');
        const targetId = pathParts[targetIndex + 1];
        chrome.tabs.create({ url: `${TARGET_BASE}${targetId}`, active: true });
    } else if (info.menuItemId === 'open-settings') {
        chrome.runtime.openOptionsPage();
    }
});

chrome.action.onClicked.addListener(async (tab) => {
    const data = await chrome.storage.local.get([SETTINGS_KEY]);
    const settings = data[SETTINGS_KEY] || { focusModeEnabled: true };

    if (!settings.focusModeEnabled) return;

    if (tab.url && FOCUS_PAGE_PATTERN.test(tab.url)) {
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['focus-mode.js']
        });
    }
});