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

document.addEventListener('click', handleClick, true);
document.addEventListener('auxclick', handleClick, true);