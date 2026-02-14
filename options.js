const SETTINGS_KEY = 'testops_settings';
const defaultSettings = {
    fixCopy: true,
    jiraRedirect: true,
    focusModeEnabled: true
};

document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get([SETTINGS_KEY], (result) => {
        const settings = result[SETTINGS_KEY] || defaultSettings;
        
        Object.keys(defaultSettings).forEach(key => {
            const checkbox = document.getElementById(key);
            if (checkbox) {
                checkbox.checked = settings[key] !== undefined ? settings[key] : defaultSettings[key];
                checkbox.addEventListener('change', (e) => {
                    saveSettings(key, e.target.checked);
                });
            }
        });
    });
});

function saveSettings(key, value) {
    chrome.storage.local.get([SETTINGS_KEY], (result) => {
        const settings = result[SETTINGS_KEY] || { ...defaultSettings };
        settings[key] = value;
        chrome.storage.local.set({ [SETTINGS_KEY]: settings });
    });
}