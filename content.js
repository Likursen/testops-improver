const JIRA_URL_BASE = 'https://jira.moscow.alfaintra.net/browse/';
const SETTINGS_KEY = 'testops_settings';

let activeSettings = {
    fixCopy: true,
    jiraRedirect: true,
    smartLinkerEnabled: true,
    highlightMatchesEnabled: true,
    jiraPrefix: '',
    defaultProjectId: ''
};

const style = document.createElement('style');
document.documentElement.appendChild(style);

function updateSettings() {
    if (!chrome.runtime?.id) return;
    chrome.storage.local.get([SETTINGS_KEY], (data) => {
        if (data[SETTINGS_KEY]) {
            activeSettings = data[SETTINGS_KEY];
            toggleHighlightStyle();
        }
    });
}

function toggleHighlightStyle() {
    if (activeSettings.highlightMatchesEnabled) {
        style.textContent = `._5ba4Lq_active ._5ba4Lq_row { background-color: #e82c2c26 !important; }`;
    } else {
        style.textContent = '';
    }
}

updateSettings();

chrome.storage.onChanged.addListener((changes) => {
    if (changes[SETTINGS_KEY]) {
        activeSettings = changes[SETTINGS_KEY].newValue;
        toggleHighlightStyle();
    }
});

function applyHighlighting() {
    if (!activeSettings.highlightMatchesEnabled) {
        document.querySelectorAll("[data-testid='text__tree-node-name']").forEach(node => {
            if (node.style.color === 'red') {
                node.style.color = '';
                node.style.fontWeight = '';
            }
        });
        return;
    }

    const sourceValues = new Set();
    const sourceResult = document.evaluate("//*[data-testid='element__cf-value']/span", document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    for (let i = 0; i < sourceResult.snapshotLength; i++) {
        const text = sourceResult.snapshotItem(i).textContent;
        if (text) sourceValues.add(text.trim());
    }

    const targetResult = document.evaluate("//*[contains(@data-tree-node-row-id, 'group')]//*[@data-testid='text__tree-node-name']", document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

    requestAnimationFrame(() => {
        for (let i = 0; i < targetResult.snapshotLength; i++) {
            const node = targetResult.snapshotItem(i);
            const content = node.textContent ? node.textContent.trim() : "";
            if (sourceValues.size > 0 && sourceValues.has(content)) {
                if (node.style.color !== 'red') {
                    node.style.setProperty('color', 'red', 'important');
                    node.style.setProperty('font-weight', 'bold', 'important');
                }
            } else if (node.style.color === 'red') {
                node.style.color = '';
                node.style.fontWeight = '';
            }
        }
    });
}

setInterval(applyHighlighting, 100);

function processLink(linkElement) {
    try {
        const url = new URL(linkElement.href);
        const pathParts = url.pathname.split('/');
        const projectIndex = pathParts.indexOf('project');
        const projectId = (projectIndex !== -1 && pathParts[projectIndex + 1]) ? pathParts[projectIndex + 1] : (activeSettings.defaultProjectId || '163');
        const targetIndex = pathParts.indexOf('issue-tracker-testcase');
        if (targetIndex === -1 || targetIndex >= pathParts.length - 1) return null;
        return `https://testops.moscow.alfaintra.net/project/${projectId}/test-cases/${pathParts[targetIndex + 1]}`;
    } catch (e) { return null; }
}

function handleClick(e) {
    if (!activeSettings.jiraRedirect || (e.button !== 0 && e.button !== 1)) return;
    const link = e.target.closest('a[href*="/iframe/issue-tracker-testcase/"]');
    if (!link) return;
    const newUrl = processLink(link);
    if (!newUrl) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    chrome.runtime.sendMessage({ action: "createTab", url: newUrl });
}

function smartLinker(root = document.body) {
    if (!activeSettings.smartLinkerEnabled || !activeSettings.jiraPrefix) return;
    const prefix = activeSettings.jiraPrefix.trim();
    const regex = new RegExp(`${prefix}-\\d+`, 'gi');
    
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => (node.parentElement?.closest('a, script, style, textarea, input')) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
    });

    const nodes = [];
    let node;
    while (node = walker.nextNode()) if (node.nodeValue?.match(regex)) nodes.push(node);

    nodes.forEach(n => {
        const parent = n.parentNode;
        if (!parent) return;
        const text = n.nodeValue;
        const frag = document.createDocumentFragment();
        let lastIdx = 0, match;
        regex.lastIndex = 0;
        while ((match = regex.exec(text)) !== null) {
            frag.appendChild(document.createTextNode(text.substring(lastIdx, match.index)));
            const a = document.createElement('a');
            a.href = `${JIRA_URL_BASE}${match[0].toUpperCase()}`;
            a.target = '_blank';
            a.style.cssText = 'color:#0071e3;text-decoration:underline;';
            a.textContent = match[0];
            frag.appendChild(a);
            lastIdx = regex.lastIndex;
        }
        frag.appendChild(document.createTextNode(text.substring(lastIdx)));
        parent.replaceChild(frag, n);
    });
}

const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
            if (node.nodeType === 1) smartLinker(node);
        }
    }
});

function handleKeydown(e) {
    if (!activeSettings.fixCopy) return;
    const modifier = (navigator.platform.toUpperCase().includes('MAC')) ? e.metaKey : e.ctrlKey;
    if (modifier && e.key.toLowerCase() === 'c' && window.getSelection().toString()) {
        e.stopImmediatePropagation();
        navigator.clipboard.writeText(window.getSelection().toString());
    }
}

document.addEventListener('click', handleClick, true);
document.addEventListener('auxclick', handleClick, true);
document.addEventListener('keydown', handleKeydown, true);

window.addEventListener('load', () => {
    smartLinker();
    observer.observe(document.body, { childList: true, subtree: true });
});