const SETTINGS_KEY = 'testops_settings';

async function updateContextMenu() {
    const data = await chrome.storage.local.get([SETTINGS_KEY]);
    const settings = data[SETTINGS_KEY] || { 
        jiraRedirect: true, 
        smartLinkerEnabled: true, 
        searchByIdEnabled: true, 
        defaultProjectId: '' 
    };
    
    const menuItems = [
        {
            id: 'redirect-context-menu',
            title: "Открыть в ТестОпс",
            contexts: ["link"],
            targetUrlPatterns: ["*://*.net/iframe/issue-tracker-testcase/*"],
            enabled: settings.jiraRedirect
        },
        {
            id: 'search-by-id',
            title: "Найти кейс по ID",
            contexts: ["selection"],
            documentUrlPatterns: [
                "https://jira.moscow.alfaintra.net/*",
                "https://testops.moscow.alfaintra.net/*"
            ],
            enabled: settings.searchByIdEnabled
        },
        {
            id: 'open-settings',
            title: "Настройки TestOps Improver",
            contexts: ["action"],
            enabled: true
        }
    ];

    for (const item of menuItems) {
        chrome.contextMenus.remove(item.id, () => {
            if (chrome.runtime.lastError) { }
            if (item.enabled) {
                const { enabled, ...createConfig } = item;
                chrome.contextMenus.create(createConfig, () => {
                    if (chrome.runtime.lastError) { }
                });
            }
        });
    }
}

function processLinkDynamic(linkUrl, defaultId) {
    try {
        const url = new URL(linkUrl);
        const pathParts = url.pathname.split('/');
        const projectIndex = pathParts.indexOf('project');
        const projectId = (projectIndex !== -1 && pathParts[projectIndex + 1]) ? pathParts[projectIndex + 1] : (defaultId || '163');
        const targetIndex = pathParts.indexOf('issue-tracker-testcase');
        const targetId = pathParts[targetIndex + 1];
        return `https://testops.moscow.alfaintra.net/project/${projectId}/test-cases/${targetId}`;
    } catch (e) { return null; }
}

chrome.runtime.onInstalled.addListener(async () => {
    const data = await chrome.storage.local.get([SETTINGS_KEY]);
    const defaultSettings = { 
        jiraRedirect: true, fixCopy: true, focusModeEnabled: true, 
        smartLinkerEnabled: true, searchByIdEnabled: true, 
        jiraPrefix: '', defaultProjectId: '' 
    };
    const newSettings = data[SETTINGS_KEY] ? { ...defaultSettings, ...data[SETTINGS_KEY] } : defaultSettings;
    await chrome.storage.local.set({ [SETTINGS_KEY]: newSettings });
    updateContextMenu();
});

chrome.runtime.onStartup.addListener(updateContextMenu);

chrome.storage.onChanged.addListener((changes) => {
    if (changes[SETTINGS_KEY]) {
        updateContextMenu();
    }
});

chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "createTab") chrome.tabs.create({ url: message.url, active: true });
    else if (message.action === "updateTab") chrome.tabs.update({ url: message.url });
    return true;
});

chrome.contextMenus.onClicked.addListener(async (info) => {
    const data = await chrome.storage.local.get([SETTINGS_KEY]);
    const settings = data[SETTINGS_KEY] || { defaultProjectId: '' };
    if (info.menuItemId === 'redirect-context-menu' && info.linkUrl) {
        const url = processLinkDynamic(info.linkUrl, settings.defaultProjectId);
        if (url) chrome.tabs.create({ url, active: true });
    } else if (info.menuItemId === 'search-by-id' && info.selectionText) {
        const match = info.selectionText.trim().match(/^#?(\d{1,10})$/);
        if (match && settings.defaultProjectId) {
            const url = `https://testops.moscow.alfaintra.net/project/${settings.defaultProjectId}/test-cases/${match[1]}`;
            chrome.tabs.create({ url, active: true });
        }
    } else if (info.menuItemId === 'open-settings') {
        chrome.runtime.openOptionsPage();
    }
});

chrome.action.onClicked.addListener(async (tab) => {
    const data = await chrome.storage.local.get([SETTINGS_KEY]);
    const settings = data[SETTINGS_KEY] || { focusModeEnabled: true };
    if (settings.focusModeEnabled && tab.url?.includes('/test-cases/')) {
        chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['focus-mode.js'] });
    }
});