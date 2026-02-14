const SETTINGS_KEY = 'testops_settings';
const defaultSettings = {
    fixCopy: true,
    jiraRedirect: true,
    focusModeEnabled: true,
    smartLinkerEnabled: true,
    searchByIdEnabled: true,
    jiraPrefix: '',
    defaultProjectId: ''
};

document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get([SETTINGS_KEY], (result) => {
        const settings = result[SETTINGS_KEY] || defaultSettings;
        Object.keys(defaultSettings).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = settings[key] !== undefined ? settings[key] : defaultSettings[key];
                    element.addEventListener('change', (e) => saveSettings(key, e.target.checked));
                } else {
                    element.value = settings[key] || '';
                    element.addEventListener('input', (e) => saveSettings(key, e.target.value));
                }
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