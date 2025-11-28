(function() {
    const STORAGE_KEY = 'testopsFocusModeState';
    const ELEMENT_LOCATORS = {
        tree: "div#PROJECT_TEST_CASES > div[data-panel-group-id]", 
        leftPanel: "div[data-testid='sidebar-layout__sidebar-container']",
        rightPanel: "div.TestCaseOverview__secondary",
        gridParent: "div.TestCaseOverview"
    };
    const LEFT_PANEL_CONTENT_SELECTOR = "div[data-testid='sidebar-layout__content']"; 

    const INITIAL_STYLES = {
        tree: { cssText: "flex: 53 1 0px; overflow: hidden; min-width: 360px;" },
        leftPanel: { wasVisible: true, cssText: "" }, 
        rightPanel: { cssText: "" },
        gridParent: { hasGridAttribute: false } 
    };

    function getElementsAndInitialState() {
        const elements = {};
        const state = { active: false, initialStyles: {} };
        let allFound = true;

        for (const key in ELEMENT_LOCATORS) {
            const selector = ELEMENT_LOCATORS[key];
            const element = document.querySelector(selector);
            
            state.initialStyles[key] = { ...INITIAL_STYLES[key] };
            
            if (element) {
                elements[key] = element;
                
                state.initialStyles[key].cssText = element.getAttribute('style') || '';
                
                if (key === 'leftPanel') {
                    const computedWidth = window.getComputedStyle(element).width;
                    state.initialStyles[key].wasVisible = (computedWidth === '200px'); 
                    
                    const contentElement = element.querySelector(LEFT_PANEL_CONTENT_SELECTOR);
                    if (contentElement) {
                         state.initialStyles[key].contentCssText = contentElement.getAttribute('style') || '';
                         elements.leftPanelContent = contentElement; 
                    }
                }
                
                if (key === 'gridParent') {
                    state.initialStyles[key].hasGridAttribute = element.hasAttribute('data-grid');
                }
            } else {
                console.error(`[Focus Mode] Element not found: ${key} (${selector}). Stopping execution of click handler.`);
                allFound = false;
            }
        }
        
        if (!allFound) {
            return null;
        }

        return { elements, state };
    }

    function applyFocusMode(elements, storedInitialStyles) {
        elements.tree.style.cssText = "flex: 0 0 0px !important; overflow: hidden !important; min-width: 0px !important;";
        
        if (elements.leftPanel.initialStyles.wasVisible) {
            elements.leftPanel.style.cssText = 'width: 0px !important; transition: none !important;'; 
            if (elements.leftPanelContent) {
                 elements.leftPanelContent.style.cssText = 'display: none !important;'; 
            }
        }
        
        if (elements.gridParent && storedInitialStyles.gridParent.hasGridAttribute) {
            elements.gridParent.removeAttribute('data-grid');
        }
        elements.rightPanel.style.cssText = 'display: none !important;';
    }

    function restoreElements(elements, initialStyles) {
        elements.tree.style.cssText = initialStyles.tree.cssText;
        
        if (initialStyles.leftPanel.wasVisible) {
             elements.leftPanel.style.cssText = 'width: 200px !important; transition: none !important;'; 
             
             if (elements.leftPanelContent) {
                elements.leftPanelContent.style.cssText = initialStyles.leftPanel.contentCssText;
             }
        } 
        
        if (elements.gridParent && initialStyles.gridParent.hasGridAttribute) {
            elements.gridParent.setAttribute('data-grid', 'true');
        }
        elements.rightPanel.style.cssText = initialStyles.rightPanel.cssText;
    }

    chrome.storage.local.get([STORAGE_KEY], (data) => {
        let storedState = data[STORAGE_KEY];
        const result = getElementsAndInitialState();

        if (!result) return;
        
        const { elements, state: freshState } = result;

        elements.leftPanel.initialStyles = freshState.initialStyles.leftPanel;
        
        if (storedState && storedState.initialStyles && 
            (!storedState.initialStyles.leftPanel || !('wasVisible' in storedState.initialStyles.leftPanel))) {
            
            console.warn(`[Focus Mode] Storage structure mismatch detected. Clearing storage.`);
            storedState = null;
            chrome.storage.local.remove(STORAGE_KEY);
        }

        if (!storedState) {
            storedState = freshState;
        } else {
            if (storedState.active === false) {
                 storedState.initialStyles = freshState.initialStyles;
            } else if (!storedState.initialStyles.tree.cssText) {
                 storedState.initialStyles = freshState.initialStyles;
            }
        }

        const newActiveState = !storedState.active;

        if (newActiveState) {
            applyFocusMode(elements, storedState.initialStyles);
        } else {
            restoreElements(elements, storedState.initialStyles);
        }

        storedState.active = newActiveState;
        chrome.storage.local.set({ [STORAGE_KEY]: storedState });
    });
})();