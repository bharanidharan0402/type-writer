/**
 * FluidType - Professional Typing Test Logic
 */

// --- Constants & Data ---
const STORAGE_KEY_SETTINGS = 'fluidtype_settings_v1';
const STORAGE_KEY_HISTORY = 'fluidtype_history_v1';

const wordList = ["the", "be", "to", "of", "and", "a", "in", "that", "have", "I", "it", "for", "not", "on", "with", "he", "as", "you", "do", "at", "this", "but", "his", "by", "from", "they", "we", "say", "her", "she", "or", "an", "will", "my", "one", "all", "would", "there", "their", "what", "so", "up", "out", "if", "about", "who", "get", "which", "go", "me", "when", "make", "can", "like", "time", "no", "just", "him", "know", "take", "people", "into", "year", "your", "good", "some", "could", "them", "see", "other", "than", "then", "now", "look", "only", "come", "its", "over", "think", "also", "back", "after", "use", "two", "how", "our", "work", "first", "well", "way", "even", "new", "want", "because", "any", "these", "give", "day", "most", "us"];

const paragraphs = [
    "The crisp morning air filled my lungs as I stood on the porch, looking out over the quiet neighborhood. A single bird chirped from the oak tree, breaking the silence.",
    "Programming is not about typing code, it is about solving problems. The best developers spend more time thinking about the architecture than writing the actual syntax.",
    "In the heart of the bustling city, a small cafe remained a hidden gem. Its walls were lined with old books, and the aroma of freshly roasted coffee beans invited weary travelers inside."
];

const codeSnippets = [
    "function calculateWPM(chars, timeInMins) {\n  return Math.round((chars / 5) / timeInMins);\n}",
    "const unique = [...new Set(array)];\nconsole.log(unique);",
    "def factorial(n):\n    if n == 0:\n        return 1\n    return n * factorial(n-1)"
];

// --- State Management ---
const defaultSettings = {
    theme: 'light',
    fontFamily: 'JetBrains Mono',
    fontSize: 1.8,
    caretStyle: 'line',
    smoothCaret: true,
    mode: 'small_words',
    customLetters: '',
    lengthType: 'time',
    lengthValue: 30
};

let appState = {
    settings: { ...defaultSettings },
    history: [],
    test: {
        active: false,
        text: [],
        rawTextStr: "", // Full string for paragraph/code modes
        currentWordIndex: 0,
        currentCharIndex: 0,
        timer: null,
        timeLeft: 0,
        timeElapsed: 0,
        correctChars: 0,
        incorrectChars: 0,
        totalTypedChars: 0
    }
};

// --- DOM Elements ---
const DOM = {
    sections: {
        config: document.getElementById('config-section'),
        typing: document.getElementById('typing-section'),
        results: document.getElementById('results-section')
    },
    settingsModal: document.getElementById('settings-modal'),
    textDisplay: document.getElementById('text-display'),
    hiddenInput: document.getElementById('hidden-input'),
    liveTimer: document.getElementById('live-timer'),
    liveWpm: document.getElementById('live-wpm'),
    liveAcc: document.getElementById('live-acc'),
    historyBody: document.getElementById('history-preview-body')
};

// --- Core App Object ---
const app = {
    init() {
        this.loadData();
        this.applySettings();
        this.renderHistory();
        this.setupEventListeners();
    },

    switchSection(sectionId) {
        Object.values(DOM.sections).forEach(s => s.classList.remove('active'));
        DOM.sections[sectionId].classList.add('active');
        if(sectionId === 'config') this.renderHistory();
    },

    loadData() {
        try {
            const storedSettings = localStorage.getItem(STORAGE_KEY_SETTINGS);
            if (storedSettings) appState.settings = { ...defaultSettings, ...JSON.parse(storedSettings) };
            
            const storedHistory = localStorage.getItem(STORAGE_KEY_HISTORY);
            if (storedHistory) appState.history = JSON.parse(storedHistory);
        } catch (e) { console.error("Could not load local storage", e); }
    },

    saveSettings() {
        localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(appState.settings));
        this.applySettings();
    },

    saveHistory(record) {
        appState.history.unshift(record);
        if (appState.history.length > 50) appState.history.pop();
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(appState.history));
    },

    applySettings() {
        const s = appState.settings;
        
        // Theme
        document.body.className = `theme-${s.theme}`;
        document.getElementById('theme-select').value = s.theme;

        // Font & Size
        document.documentElement.style.setProperty('--font-mono', `'${s.fontFamily}', monospace`);
        document.documentElement.style.setProperty('--font-size', `${s.fontSize}rem`);
        document.getElementById('font-select').value = s.fontFamily;
        document.getElementById('font-size-slider').value = s.fontSize;

        // Caret
        DOM.textDisplay.className = `text-display caret-${s.caretStyle} ${s.smoothCaret ? 'smooth-caret' : ''} ${s.mode === 'code' ? 'code-mode' : ''}`;
        document.getElementById('caret-select').value = s.caretStyle;
        document.getElementById('smooth-caret-toggle').checked = s.smoothCaret;

        // Restore active buttons based on loaded settings
        document.querySelectorAll('#mode-options .option-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.mode === s.mode);
        });
        document.getElementById('custom-letters-input-group').style.display = s.mode === 'custom_letters' ? 'flex' : 'none';
        
        document.querySelectorAll('.length-toggle .toggle-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.type === s.lengthType);
        });
        document.getElementById('time-options').style.display = s.lengthType === 'time' ? 'flex' : 'none';
        document.getElementById('words-options').style.display = s.lengthType === 'words' ? 'flex' : 'none';
        
        // Length value
        document.querySelectorAll(`#${s.lengthType}-options .option-btn`).forEach(b => {
            b.classList.toggle('active', parseInt(b.dataset.val) === s.lengthValue);
        });
    },

    renderHistory() {
        if (appState.history.length === 0) {
            DOM.historyBody.innerHTML = `<tr><td colspan="4" class="empty-state">No recent tests. Start typing!</td></tr>`;
            return;
        }

        DOM.historyBody.innerHTML = appState.history.slice(0, 5).map(record => `
            <tr>
                <td style="text-transform:capitalize">${record.mode.replace('_', ' ')}</td>
                <td style="color:var(--accent-color); font-weight:600">${record.wpm}</td>
                <td>${record.acc}%</td>
                <td style="color:var(--text-secondary)">${new Date(record.date).toLocaleDateString()}</td>
            </tr>
        `).join('');
    },

    setupEventListeners() {
        // Theme Toggle (Quick action)
        document.getElementById('theme-toggle-btn').addEventListener('click', () => {
            appState.settings.theme = appState.settings.theme === 'light' ? 'dark' : 'light';
            this.saveSettings();
        });

        // Settings Modal
        document.getElementById('settings-btn').addEventListener('click', () => DOM.settingsModal.classList.add('active'));
        document.querySelector('.close-modal').addEventListener('click', () => DOM.settingsModal.classList.remove('active'));
        DOM.settingsModal.addEventListener('click', (e) => { if(e.target === DOM.settingsModal) DOM.settingsModal.classList.remove('active'); });

        // Settings Inputs
        document.getElementById('theme-select').addEventListener('change', (e) => { appState.settings.theme = e.target.value; this.saveSettings(); });
        document.getElementById('font-select').addEventListener('change', (e) => { appState.settings.fontFamily = e.target.value; this.saveSettings(); });
        document.getElementById('caret-select').addEventListener('change', (e) => { appState.settings.caretStyle = e.target.value; this.saveSettings(); });
        document.getElementById('font-size-slider').addEventListener('input', (e) => { appState.settings.fontSize = e.target.value; this.saveSettings(); });
        document.getElementById('smooth-caret-toggle').addEventListener('change', (e) => { appState.settings.smoothCaret = e.target.checked; this.saveSettings(); });

        // Config Listeners
        document.querySelectorAll('#mode-options .option-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                appState.settings.mode = e.target.dataset.mode;
                this.saveSettings();
            });
        });

        document.getElementById('custom-letters-input').addEventListener('input', (e) => {
            appState.settings.customLetters = e.target.value.toLowerCase().replace(/[^a-z]/g, '');
            e.target.value = appState.settings.customLetters;
        });

        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                appState.settings.lengthType = e.target.dataset.type;
                // find active sub-option
                const activeSub = document.querySelector(`#${appState.settings.lengthType}-options .option-btn.active`);
                if(activeSub) appState.settings.lengthValue = parseInt(activeSub.dataset.val);
                this.saveSettings();
            });
        });

        document.querySelectorAll('.options-row .option-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                appState.settings.lengthValue = parseInt(e.target.dataset.val);
                this.saveSettings();
            });
        });

        // Navigation
        document.getElementById('start-btn').addEventListener('click', () => engine.startTest());
        document.getElementById('config-back-btn').addEventListener('click', () => this.switchSection('config'));
        document.getElementById('restart-test-btn').addEventListener('click', () => engine.startTest());
        document.getElementById('next-test-btn').addEventListener('click', () => engine.startTest());
    }
};

// --- Typing Engine Object ---
const engine = {
    generateText() {
        const { mode, customLetters, lengthType, lengthValue } = appState.settings;
        let wordsArray = [];
        
        if (mode === 'paragraph') {
            const para = paragraphs[Math.floor(Math.random() * paragraphs.length)];
            wordsArray = para.split(' ');
            if (lengthType === 'words') wordsArray = wordsArray.slice(0, lengthValue);
        } else if (mode === 'code') {
            const code = codeSnippets[Math.floor(Math.random() * codeSnippets.length)];
            // Preserve spacing by splitting on spaces and newlines carefully
            wordsArray = code.split(/(\s+)/).filter(s => s.length > 0);
        } else {
            const count = lengthType === 'words' ? lengthValue : 200;
            for (let i = 0; i < count; i++) {
                let word = '';
                switch(mode) {
                    case 'sentence':
                        let sentWord = wordList[Math.floor(Math.random() * wordList.length)];
                        if (Math.random() > 0.8) sentWord += [',', '.', '?', '!'][Math.floor(Math.random() * 4)];
                        if (Math.random() > 0.8) sentWord = sentWord.charAt(0).toUpperCase() + sentWord.slice(1).toLowerCase();
                        word = sentWord;
                        break;
                    case 'mixed_numbers':
                        if (Math.random() > 0.3) {
                            word = wordList[Math.floor(Math.random() * wordList.length)];
                            word = Math.random() > 0.5 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
                        } else word = Math.floor(Math.random() * 100).toString();
                        break;
                    case 'custom_letters':
                        const letters = customLetters.length > 0 ? customLetters : 'asdf';
                        const len = Math.floor(Math.random() * 5) + 2;
                        for(let j=0; j<len; j++) word += letters.charAt(Math.floor(Math.random() * letters.length));
                        break;
                    default: // small_words
                        word = wordList[Math.floor(Math.random() * wordList.length)].toLowerCase();
                }
                wordsArray.push(word);
            }
        }
        return wordsArray;
    },

    startTest() {
        const t = appState.test;
        t.text = this.generateText();
        t.active = false;
        t.currentWordIndex = 0;
        t.currentCharIndex = 0;
        t.timeLeft = appState.settings.lengthType === 'time' ? appState.settings.lengthValue : 0;
        t.timeElapsed = 0;
        t.correctChars = 0;
        t.incorrectChars = 0;
        t.totalTypedChars = 0;
        if(t.timer) clearInterval(t.timer);
        
        DOM.liveWpm.textContent = '0';
        DOM.liveAcc.textContent = '100';
        
        // Ensure proper class for code mode
        DOM.textDisplay.className = `text-display caret-${appState.settings.caretStyle} ${appState.settings.smoothCaret ? 'smooth-caret' : ''} ${appState.settings.mode === 'code' ? 'code-mode' : ''}`;

        this.renderText();
        this.updateTimerDisplay();
        app.switchSection('typing');
        
        setTimeout(() => {
            DOM.hiddenInput.value = '';
            DOM.hiddenInput.focus();
        }, 100);
    },

    renderText() {
        DOM.textDisplay.innerHTML = '';
        const t = appState.test;
        
        t.text.forEach((word, wIdx) => {
            const wordEl = document.createElement('div');
            wordEl.className = `word ${wIdx === t.currentWordIndex ? 'active' : ''}`;
            
            // Handle whitespace preservation for code mode
            if (appState.settings.mode === 'code' && /^\s+$/.test(word)) {
                // It's a space/newline token
                wordEl.textContent = word; // Just insert the raw space/newline
                wordEl.classList.add('whitespace-token');
            } else {
                for (let i = 0; i < word.length; i++) {
                    const charEl = document.createElement('span');
                    charEl.className = 'letter';
                    if (wIdx === t.currentWordIndex && i === t.currentCharIndex) charEl.classList.add('active');
                    charEl.textContent = word[i];
                    wordEl.appendChild(charEl);
                }
            }
            DOM.textDisplay.appendChild(wordEl);
        });
        
        // Handle space caret
        if (t.currentCharIndex >= t.text[t.currentWordIndex].length) {
            const activeWord = document.querySelector('.word.active');
            if(activeWord) {
                const letters = activeWord.querySelectorAll('.letter');
                if(letters.length > 0) letters[letters.length-1].classList.add('active-space');
            }
        }
        
        this.scrollActiveWord();
    },

    scrollActiveWord() {
        const activeWord = document.querySelector('.word.active');
        if (activeWord && appState.settings.mode !== 'code') {
            const displayRect = DOM.textDisplay.getBoundingClientRect();
            const wordRect = activeWord.getBoundingClientRect();
            if (wordRect.top > displayRect.bottom - 40 || wordRect.top < displayRect.top) {
                activeWord.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    },

    startTimer() {
        if (appState.test.active) return;
        appState.test.active = true;
        
        appState.test.timer = setInterval(() => {
            appState.test.timeElapsed++;
            if (appState.settings.lengthType === 'time') {
                appState.test.timeLeft--;
                this.updateTimerDisplay();
                if (appState.test.timeLeft <= 0) this.endTest();
            } else {
                this.updateTimerDisplay();
            }
            this.updateLiveStats();
        }, 1000);
    },

    updateTimerDisplay() {
        if (appState.settings.lengthType === 'time') {
            DOM.liveTimer.textContent = appState.test.timeLeft;
        } else {
            DOM.liveTimer.textContent = `${appState.test.currentWordIndex}/${appState.settings.lengthValue}`;
        }
    },

    updateLiveStats() {
        const timeInMins = appState.test.timeElapsed / 60;
        if (timeInMins > 0) {
            const netWPM = Math.max(0, Math.round(((appState.test.totalTypedChars - appState.test.incorrectChars) / 5) / timeInMins));
            DOM.liveWpm.textContent = netWPM;
        }
        const acc = appState.test.totalTypedChars > 0 ? Math.round((appState.test.correctChars / appState.test.totalTypedChars) * 100) : 100;
        DOM.liveAcc.textContent = acc;
    },

    endTest() {
        clearInterval(appState.test.timer);
        appState.test.active = false;
        
        const t = appState.test;
        const timeInMins = t.timeElapsed / 60;
        
        const grossWPM = timeInMins > 0 ? Math.round((t.totalTypedChars / 5) / timeInMins) : 0;
        const netWPM = timeInMins > 0 ? Math.max(0, Math.round(((t.totalTypedChars - t.incorrectChars) / 5) / timeInMins)) : 0;
        const accuracy = t.totalTypedChars > 0 ? Math.round((t.correctChars / t.totalTypedChars) * 100) : 100;
        const errorRate = t.totalTypedChars > 0 ? Math.round((t.incorrectChars / t.totalTypedChars) * 100) : 0;
            
        document.getElementById('wpm-val').textContent = netWPM;
        document.getElementById('acc-val').textContent = accuracy + '%';
        document.getElementById('raw-wpm-val').textContent = grossWPM;
        document.getElementById('err-val').textContent = errorRate + '%';
        document.getElementById('correct-chars').textContent = t.correctChars;
        document.getElementById('total-chars').textContent = t.totalTypedChars;
        document.getElementById('time-val').textContent = t.timeElapsed + 's';
        
        app.saveHistory({
            mode: appState.settings.mode,
            wpm: netWPM,
            acc: accuracy,
            date: new Date().toISOString()
        });
        
        app.switchSection('results');
    },

    handleInput(e) {
        if (e.key === 'Tab' || e.key === 'Enter') {
            if (appState.test.active || e.key === 'Tab') {
                e.preventDefault();
                this.startTest();
            }
            return;
        }

        const t = appState.test;
        if (!t.active && e.key.length === 1) this.startTimer();
        
        // Skip whitespace tokens in code mode logic for simplicity
        if (appState.settings.mode === 'code' && /^\s+$/.test(t.text[t.currentWordIndex])) {
            t.currentWordIndex++;
            if (t.currentWordIndex >= t.text.length) { this.endTest(); return; }
        }

        const currentWordStr = t.text[t.currentWordIndex];

        if (e.key === 'Backspace') {
            if (t.currentCharIndex > 0) {
                // Revert visual class
                const wordEls = DOM.textDisplay.children;
                if(wordEls[t.currentWordIndex]) {
                    // clear active classes
                    wordEls[t.currentWordIndex].querySelectorAll('.active').forEach(n => n.classList.remove('active', 'active-space'));
                    
                    t.currentCharIndex--;
                    const charEl = wordEls[t.currentWordIndex].children[t.currentCharIndex];
                    charEl.className = 'letter active'; // remove correct/incorrect
                }
            }
            return;
        }

        if (e.key === ' ' || e.code === 'Space') {
            if (appState.settings.mode !== 'code') e.preventDefault();
            
            // Check if word is fully correct
            const wordEls = DOM.textDisplay.children;
            let hasError = false;
            if(wordEls[t.currentWordIndex]) {
                const letters = wordEls[t.currentWordIndex].querySelectorAll('.letter');
                letters.forEach(l => { if(!l.classList.contains('correct')) hasError = true; });
                if(hasError) wordEls[t.currentWordIndex].classList.add('error-word');
                
                // clear active classes
                wordEls[t.currentWordIndex].querySelectorAll('.active, .active-space').forEach(n => n.classList.remove('active', 'active-space'));
            }

            t.currentWordIndex++;
            t.currentCharIndex = 0;
            
            // Skip whitespaces in code mode
            if (appState.settings.mode === 'code') {
                while(t.currentWordIndex < t.text.length && /^\s+$/.test(t.text[t.currentWordIndex])) {
                    t.currentWordIndex++;
                }
            }
            
            if (appState.settings.lengthType === 'words' || t.currentWordIndex >= t.text.length) {
                this.updateTimerDisplay();
                if (t.currentWordIndex >= (appState.settings.lengthType === 'words' ? appState.settings.lengthValue : t.text.length)) {
                    this.endTest();
                    return;
                }
            }
            
            // Set new active word
            if(wordEls[t.currentWordIndex]) {
                wordEls[t.currentWordIndex].classList.add('active');
                if(wordEls[t.currentWordIndex].children[0]) {
                    wordEls[t.currentWordIndex].children[0].classList.add('active');
                }
            }
            this.scrollActiveWord();
            return;
        }

        if (e.key.length === 1) {
            t.totalTypedChars++;
            const wordEls = DOM.textDisplay.children;
            
            if (t.currentCharIndex < currentWordStr.length) {
                const expectedChar = currentWordStr[t.currentCharIndex];
                const isCorrect = e.key === expectedChar;
                
                if (isCorrect) t.correctChars++;
                else t.incorrectChars++;
                
                if (wordEls[t.currentWordIndex]) {
                    const charEl = wordEls[t.currentWordIndex].children[t.currentCharIndex];
                    charEl.className = `letter ${isCorrect ? 'correct' : 'incorrect'}`;
                    
                    t.currentCharIndex++;
                    if (t.currentCharIndex < currentWordStr.length) {
                        wordEls[t.currentWordIndex].children[t.currentCharIndex].classList.add('active');
                    } else {
                        // End of word
                        charEl.classList.add('active-space');
                        if (appState.settings.lengthType === 'words' && t.currentWordIndex === appState.settings.lengthValue - 1) {
                            this.endTest();
                        }
                    }
                }
            }
        }
    }
};

DOM.hiddenInput.addEventListener('keydown', (e) => engine.handleInput(e));
document.querySelector('.typing-container').addEventListener('click', () => DOM.hiddenInput.focus());

// Boot
app.init();
