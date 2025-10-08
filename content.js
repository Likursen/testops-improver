const REDIRECT_PATH = '/iframe/issue-tracker-testcase/';
const TARGET_BASE = 'https://testops.moscow.alfaintra.net/project/163/test-cases/';

document.addEventListener('click', function (e) {
    const link = e.target.closest('a[href*="/iframe/issue-tracker-testcase/"]');
    if (!link) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    try {
        const url = new URL(link.href);
        const pathParts = url.pathname.split('/');
        const targetId = pathParts[pathParts.indexOf('issue-tracker-testcase') + 1];

        if (!targetId?.match(/^\d+$/)) return;

        const newUrl = `${TARGET_BASE}${targetId}`;
        const isNewTab = e.button === 1 || e.metaKey || e.ctrlKey;

        chrome.runtime.sendMessage({
            action: isNewTab ? "createTab" : "updateTab",
            url: newUrl
        });

    } catch (error) {
        console.error('Redirect Error:', error);
    }
}, true);