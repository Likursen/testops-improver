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

function updateSettings() {
    if (!chrome.runtime?.id) return;
    chrome.storage.local.get([SETTINGS_KEY], (data) => {
        if (data[SETTINGS_KEY]) activeSettings = data[SETTINGS_KEY];
    });
}

updateSettings();

chrome.storage.onChanged.addListener((changes) => {
    if (changes[SETTINGS_KEY]) activeSettings = changes[SETTINGS_KEY].newValue;
});

function applyHighlighting() {
    if (!activeSettings.highlightMatchesEnabled) return;

    const sourceValues = new Set();
    const sourceResult = document.evaluate(
        "//*[@data-testid='element__cf-value']/span",
        document,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
    );
    for (let i = 0; i < sourceResult.snapshotLength; i++) {
        const text = sourceResult.snapshotItem(i).textContent;
        if (text) sourceValues.add(text.trim());
    }

    const targetResult = document.evaluate(
        "//*[contains(@data-tree-node-row-id, 'group')]//*[@data-testid='text__tree-node-name']",
        document,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
    );

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

// Интервал 100мс для мгновенной реакции на скролл
setInterval(applyHighlighting, 100);

function processLink(linkElement) {
    try {
        const url = new URL(linkElement.href);
        const pathParts = url.pathname.split('/');
        const projectIndex = pathParts.indexOf('project');
        const projectId = (projectIndex !== -1 && pathParts[projectIndex + 1]) ? pathParts[projectIndex + 1] : (activeSettings.defaultProjectId || '163');
        const targetIndex = pathParts.indexOf('issue-tracker-testcase');
        if (targetIndex === -1 || targetIndex >= pathParts.length - 1) return null;
        const targetId = pathParts[targetIndex + 1];
        if (!/^\d+$/.test(targetId)) return null;
        return `https://testops.moscow.alfaintra.net/project/${projectId}/test-cases/${targetId}`;
    } catch (e) { return null; }
}

function handleClick(e) {
    if (!activeSettings.jiraRedirect || (e.button !== 0 && e.button !== 1)) return;
    const link = e.target.closest('a[href*="/iframe/issue-tracker-testcase/"]');
    if (!link) return;
    const newUrl = processLink(link);
    if (!newUrl || !chrome.runtime?.id) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const isNewTab = e.button === 1 || e.metaKey || e.ctrlKey;
    chrome.runtime.sendMessage({ action: isNewTab ? "createTab" : "updateTab", url: newUrl });
}

function smartLinker() {
    if (!activeSettings.smartLinkerEnabled || !activeSettings.jiraPrefix) return;
    const prefix = activeSettings.jiraPrefix.trim();
    if (!prefix) return;
    const regex = new RegExp(`\\b${prefix}-\\d+\\b`, 'gi');
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => node.parentElement?.closest('a, script, style, textarea, input') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
    });
    const nodes = [];
    let node;
    while (node = walker.nextNode()) if (node.nodeValue?.match(regex)) nodes.push(node);
    nodes.forEach(n => {
        const parent = n.parentNode;
        if (!parent) return;
        const parts = n.nodeValue.split(regex);
        const matches = n.nodeValue.match(regex);
        const frag = document.createDocumentFragment();
        parts.forEach((p, i) => {
            frag.appendChild(document.createTextNode(p));
            if (matches?.[i]) {
                const a = document.createElement('a');
                a.href = `${JIRA_URL_BASE}${matches[i].toUpperCase()}`;
                a.target = '_blank';
                a.style.cssText = 'color:#0071e3;text-decoration:underline;';
                a.textContent = matches[i];
                frag.appendChild(a);
            }
        });
        parent.replaceChild(frag, n);
    });
}

function handleKeydown(e) {
    if (!activeSettings.fixCopy) return;
    const modifier = (navigator.platform.toUpperCase().includes('MAC')) ? e.metaKey : e.ctrlKey;
    if (modifier && e.key.toLowerCase() === 'c') {
        const sel = window.getSelection().toString();
        if (sel) {
            e.stopImmediatePropagation();
            navigator.clipboard.writeText(sel);
        }
    }
}

document.addEventListener('click', handleClick, true);
document.addEventListener('auxclick', handleClick, true);
document.addEventListener('keydown', handleKeydown, true);
window.addEventListener('load', () => {
    setTimeout(smartLinker, 3000);
    applyHighlighting();
});