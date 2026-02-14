const SETTINGS_KEY = 'testops_settings';

async function updateContextMenu() {
    const data = await chrome.storage.local.get([SETTINGS_KEY]);
    const settings = data[SETTINGS_KEY] || { jiraRedirect: true, fixCopy: true, focusModeEnabled: true, smartLinkerEnabled: false, jiraPrefix: '' };
    
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

function processLinkDynamic(linkUrl) {
    try {
        const url = new URL(linkUrl);
        const pathParts = url.pathname.split('/');
        const projectIndex = pathParts.indexOf('project');
        const projectId = (projectIndex !== -1 && pathParts[projectIndex + 1]) ? pathParts[projectIndex + 1] : '163';
        const targetIndex = pathParts.indexOf('issue-tracker-testcase');
        const targetId = pathParts[targetIndex + 1];
        return `https://testops.moscow.alfaintra.net/project/${projectId}/test-cases/${targetId}`;
    } catch (error) {
        return null;
    }
}

chrome.runtime.onInstalled.addListener(async () => {
    const data = await chrome.storage.local.get([SETTINGS_KEY]);
    const defaultSettings = { 
        jiraRedirect: true, 
        fixCopy: true, 
        focusModeEnabled: true, 
        smartLinkerEnabled: false, 
        jiraPrefix: '' 
    };

    if (!data[SETTINGS_KEY]) {
        await chrome.storage.local.set({ [SETTINGS_KEY]: defaultSettings });
    } else {
        const newSettings = { ...defaultSettings, ...data[SETTINGS_KEY] };
        await chrome.storage.local.set({ [SETTINGS_KEY]: newSettings });
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
        const newUrl = processLinkDynamic(info.linkUrl);
        if (newUrl) chrome.tabs.create({ url: newUrl, active: true });
    } else if (info.menuItemId === 'open-settings') {
        chrome.runtime.openOptionsPage();
    }
});

chrome.action.onClicked.addListener(async (tab) => {
    const data = await chrome.storage.local.get([SETTINGS_KEY]);
    const settings = data[SETTINGS_KEY] || { focusModeEnabled: true };
    if (!settings.focusModeEnabled) return;
    if (tab.url && tab.url.includes('/test-cases/')) {
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['focus-mode.js']
        });
    }
});