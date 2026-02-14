const JIRA_URL_BASE = 'https://jira.moscow.alfaintra.net/browse/';
const SETTINGS_KEY = 'testops_settings';

let activeSettings = {
    fixCopy: true,
    jiraRedirect: true,
    smartLinkerEnabled: true,
    jiraPrefix: 'ONECOLLECT'
};

function updateSettings() {
    chrome.storage.local.get([SETTINGS_KEY], (data) => {
        if (data[SETTINGS_KEY]) {
            activeSettings = data[SETTINGS_KEY];
        }
    });
}

updateSettings();

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[SETTINGS_KEY]) {
        activeSettings = changes[SETTINGS_KEY].newValue;
    }
});

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

function smartLinker() {
    if (!activeSettings || !activeSettings.smartLinkerEnabled || !activeSettings.jiraPrefix) return;
    const prefix = activeSettings.jiraPrefix.trim();
    if (prefix === '') return;
    const regex = new RegExp(`\\b${prefix}-\\d+\\b`, 'gi');
    const walker = document.createTreeWalker(
        document.body, 
        NodeFilter.SHOW_TEXT, 
        {
            acceptNode: function(node) {
                const parent = node.parentElement;
                if (!parent) return NodeFilter.FILTER_REJECT;
                const isForbidden = parent.closest('a, script, style, textarea, input');
                return isForbidden ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
            }
        }, 
        false
    );
    const nodesToReplace = [];
    let node;
    while (node = walker.nextNode()) {
        if (node.nodeValue && node.nodeValue.match(regex)) {
            nodesToReplace.push(node);
        }
    }
    nodesToReplace.forEach(node => {
        const parent = node.parentNode;
        if (!parent) return;
        const parts = node.nodeValue.split(regex);
        const matches = node.nodeValue.match(regex);
        const fragment = document.createDocumentFragment();
        parts.forEach((part, i) => {
            fragment.appendChild(document.createTextNode(part));
            if (matches && matches[i]) {
                const link = document.createElement('a');
                link.href = `${JIRA_URL_BASE}${matches[i].toUpperCase()}`;
                link.target = '_blank';
                link.style.color = '#0071e3';
                link.style.textDecoration = 'underline';
                link.className = 'smart-link';
                link.textContent = matches[i];
                fragment.appendChild(link);
            }
        });
        parent.replaceChild(fragment, node);
    });
}

function handleKeydown(e) {
    if (!activeSettings || !activeSettings.fixCopy) return;
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

window.addEventListener('load', () => {
    setTimeout(smartLinker, 3000);
});