chrome.runtime.onMessage.addListener((message, sender) => {
    if (message.action === "createTab") {
        chrome.tabs.create({ url: message.url, active: true });
    } else if (message.action === "updateTab") {
        chrome.tabs.update(sender.tab.id, { url: message.url });
    }
    return true;
});