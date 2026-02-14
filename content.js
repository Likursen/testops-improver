const REDIRECT_PATH = '/iframe/issue-tracker-testcase/';
const TARGET_BASE = 'https://testops.moscow.alfaintra.net/project/163/test-cases/';

function processLink(linkElement) {
    try {
        const url = new URL(linkElement.href);
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

function handleClick(e) {
    if (e.button !== 0 && e.button !== 1) return;

    const link = e.target.closest('a[href*="/iframe/issue-tracker-testcase/"]');
    if (!link) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    const newUrl = processLink(link);
    if (!newUrl) return;

    const isNewTab = e.button === 1 || e.metaKey || e.ctrlKey;

    chrome.runtime.sendMessage({
        action: isNewTab ? "createTab" : "updateTab",
        url: newUrl
    });
}

function handleKeydown(e) {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') !== -1;
    const modifier = isMac ? e.metaKey : e.ctrlKey;

    if (modifier && e.key.toLowerCase() === 'c') {
        const selectedText = window.getSelection().toString();
        if (selectedText) {
            e.stopImmediatePropagation();
            navigator.clipboard.writeText(selectedText).then(() => {
            }).catch(err => {
                console.error('Copy error:', err);
            });
        }
    }
}

document.addEventListener('click', handleClick, true);
document.addEventListener('auxclick', handleClick, true);
document.addEventListener('keydown', handleKeydown, true);