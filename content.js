const REDIRECT_PATH = '/iframe/issue-tracker-testcase/';
const SETTINGS_KEY = 'testops_settings';

let activeSettings = {
    fixCopy: true,
    jiraRedirect: true
};

function updateSettings() {
    chrome.storage.local.get([SETTINGS_KEY], (data) => {
        if (data[SETTINGS_KEY]) {
            activeSettings = data[SETTINGS_KEY];
        }
    });
}

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[SETTINGS_KEY]) {
        activeSettings = changes[SETTINGS_KEY].newValue;
    }
});

updateSettings();

function processLink(linkElement) {
    try {
        const url = new URL(linkElement.href);
        const pathParts = url.pathname.split('/');
        
        const projectIndex = pathParts.indexOf('project');
        const projectId = (projectIndex !== -1 && pathParts[projectIndex + 1]) ? pathParts[projectIndex + 1] : '163';
        
        const targetIndex = pathParts.indexOf('issue-tracker-testcase');
        if (targetIndex === -1 || targetIndex >= pathParts.length - 1) return null;
        
        const targetId = pathParts[targetIndex + 1];
        if (!/^\d+$/.test(targetId)) return null;

        return `https://testops.moscow.alfaintra.net/project/${projectId}/test-cases/${targetId}`;
    } catch (error) {
        return null;
    }
}

function handleClick(e) {
    if (!activeSettings.jiraRedirect) return;
    if (e.button !== 0 && e.button !== 1) return;
    const link = e.target.closest('a[href*="/iframe/issue-tracker-testcase/"]');
    if (!link) return;
    const newUrl = processLink(link);
    if (!newUrl) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const isNewTab = e.button === 1 || e.metaKey || e.ctrlKey;
    chrome.runtime.sendMessage({
        action: isNewTab ? "createTab" : "updateTab",
        url: newUrl
    });
}

function handleKeydown(e) {
    if (!activeSettings.fixCopy) return;
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') !== -1;
    const modifier = isMac ? e.metaKey : e.ctrlKey;
    if (modifier && e.key.toLowerCase() === 'c') {
        const selectedText = window.getSelection().toString();
        if (selectedText) {
            e.stopImmediatePropagation();
            navigator.clipboard.writeText(selectedText).catch(() => {});
        }
    }
}

document.addEventListener('click', handleClick, true);
document.addEventListener('auxclick', handleClick, true);
document.addEventListener('keydown', handleKeydown, true);