// Digital Computation Engine - Modern Calculator Implementation
// Using ES6 modules and class-based architecture

class ComputationEngine {
    constructor() {
        this.state = {
            activeValue: '0',
            storedValue: null,
            pendingOperation: null,
            awaitingNewValue: false,
            expressionHistory: '',
            storageBank: 0,
            calculationHistory: []
        };
        
        this.displayElements = {
            result: document.getElementById('resultDisplay'),
            expression: document.getElementById('expressionDisplay'),
            storageIndicator: document.getElementById('storageStatus'),
            storageValue: document.getElementById('storageValue'),
            historyPanel: document.getElementById('historyPanel'),
            historyList: document.getElementById('historyList')
        };
        
        this.operationMap = {
            'add': (a, b) => a + b,
            'subtract': (a, b) => a - b,
            'multiply': (a, b) => a * b,
            'divide': (a, b) => b !== 0 ? a / b : null,
            'root': (a) => Math.sqrt(a),
            'percent': (a) => a / 100,
            'square': (a) => a * a,
            'reciprocal': (a) => a !== 0 ? 1 / a : null,
            'negate': (a) => -a
        };
        
        this.init();
    }
    
    init() {
        this.attachEventListeners();
        this.updateInterface();
        this.setupKeyboardSupport();
        this.loadSettings();
    }
    
    attachEventListeners() {
        const controlGrid = document.querySelector('.control-grid');
        controlGrid.addEventListener('click', (e) => {
            const button = e.target.closest('.control-btn');
            if (!button) return;
            
            const digit = button.dataset.digit;
            const action = button.dataset.action;
            
            if (digit !== undefined) {
                this.processDigitInput(digit);
            } else if (action) {
                this.processAction(action);
            }
        });
        
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });
        
        // History clear
        document.getElementById('historyClear').addEventListener('click', () => {
            this.clearHistory();
        });
        
        // History item clicks
        this.displayElements.historyList.addEventListener('click', (e) => {
            const item = e.target.closest('.history-item');
            if (item) {
                this.state.activeValue = item.dataset.result;
                this.state.awaitingNewValue = true;
                this.updateInterface();
            }
        });
    }
    
    processDigitInput(digit) {
        if (this.state.awaitingNewValue) {
            this.state.activeValue = digit;
            this.state.awaitingNewValue = false;
        } else {
            // Limit input length to prevent overflow
            if (this.state.activeValue.length < 16) {
                this.state.activeValue = this.state.activeValue === '0' ? 
                    digit : this.state.activeValue + digit;
            }
        }
        this.updateInterface();
    }
    
    processAction(action) {
        const actionHandlers = {
            'decimal': () => this.handleDecimal(),
            'reset': () => this.performReset(),
            'execute': () => this.executeCalculation(),
            'root': () => this.performUnaryOperation('root'),
            'percent': () => this.performUnaryOperation('percent'),
            'square': () => this.performUnaryOperation('square'),
            'reciprocal': () => this.performUnaryOperation('reciprocal'),
            'negate': () => this.performUnaryOperation('negate'),
            'add': () => this.setBinaryOperation('add'),
            'subtract': () => this.setBinaryOperation('subtract'),
            'multiply': () => this.setBinaryOperation('multiply'),
            'divide': () => this.setBinaryOperation('divide'),
            'storage-retrieve': () => this.retrieveFromStorage(),
            'storage-save': () => this.saveToStorage(),
            'storage-increase': () => this.modifyStorage('add'),
            'storage-decrease': () => this.modifyStorage('subtract'),
            'history': () => this.toggleHistory()
        };
        
        const handler = actionHandlers[action];
        if (handler) handler();
    }
    
    handleDecimal() {
        if (this.state.awaitingNewValue) {
            this.state.activeValue = '0.';
            this.state.awaitingNewValue = false;
        } else if (!this.state.activeValue.includes('.')) {
            this.state.activeValue += '.';
        }
        this.updateInterface();
    }
    
    performReset() {
        this.state = {
            ...this.state,
            activeValue: '0',
            storedValue: null,
            pendingOperation: null,
            awaitingNewValue: false,
            expressionHistory: ''
        };
        this.updateInterface();
    }
    
    performUnaryOperation(operation) {
        const value = parseFloat(this.state.activeValue);
        let result = this.operationMap[operation](value);
        
        // Validation for specific operations
        if (operation === 'root' && value < 0) {
            this.showError('Invalid operation: negative square root');
            return;
        }
        
        if (operation === 'reciprocal' && value === 0) {
            this.showError('Cannot divide by zero');
            return;
        }
        
        if (result !== null) {
            const formattedResult = this.formatResult(result);
            let historyEntry = '';
            
            switch(operation) {
                case 'square':
                    historyEntry = `${value}² = ${formattedResult}`;
                    break;
                case 'reciprocal':
                    historyEntry = `1/${value} = ${formattedResult}`;
                    break;
                case 'negate':
                    historyEntry = `-(${value}) = ${formattedResult}`;
                    break;
                default:
                    historyEntry = `${this.getOperationSymbol(operation)}(${value}) = ${formattedResult}`;
            }
            
            this.state.activeValue = formattedResult;
            this.state.expressionHistory = historyEntry;
            this.state.awaitingNewValue = true;
            this.addToHistory(historyEntry, formattedResult);
            this.updateInterface();
        }
    }
    
    setBinaryOperation(operation) {
        const currentValue = parseFloat(this.state.activeValue);
        
        if (this.state.storedValue === null) {
            this.state.storedValue = currentValue;
        } else if (this.state.pendingOperation && !this.state.awaitingNewValue) {
            const result = this.performBinaryCalculation();
            if (result !== null) {
                this.state.activeValue = this.formatResult(result);
                this.state.storedValue = result;
            } else {
                return;
            }
        }
        
        this.state.pendingOperation = operation;
        this.state.awaitingNewValue = true;
        this.state.expressionHistory = `${this.state.storedValue} ${this.getOperationSymbol(operation)}`;
        this.updateInterface();
    }
    
    executeCalculation() {
        if (this.state.storedValue !== null && this.state.pendingOperation) {
            const result = this.performBinaryCalculation();
            if (result !== null) {
                const formattedResult = this.formatResult(result);
                const historyEntry = 
                    `${this.state.storedValue} ${this.getOperationSymbol(this.state.pendingOperation)} ${this.state.activeValue} = ${formattedResult}`;
                
                this.state.expressionHistory = historyEntry;
                this.state.activeValue = formattedResult;
                this.state.storedValue = null;
                this.state.pendingOperation = null;
                this.state.awaitingNewValue = true;
                this.addToHistory(historyEntry, formattedResult);
                this.updateInterface();
            }
        }
    }
    
    performBinaryCalculation() {
        const a = this.state.storedValue;
        const b = parseFloat(this.state.activeValue);
        const result = this.operationMap[this.state.pendingOperation](a, b);
        
        if (result === null) {
            this.showError('Cannot divide by zero');
            return null;
        }
        
        return result;
    }
    
    retrieveFromStorage() {
        this.state.activeValue = this.formatResult(this.state.storageBank);
        this.state.awaitingNewValue = true;
        this.updateInterface();
    }
    
    saveToStorage() {
        this.state.storageBank = parseFloat(this.state.activeValue);
        this.state.awaitingNewValue = true;
        this.updateInterface();
    }
    
    modifyStorage(operation) {
        const value = parseFloat(this.state.activeValue);
        this.state.storageBank = this.operationMap[operation](this.state.storageBank, value);
        this.state.awaitingNewValue = true;
        this.updateInterface();
    }
    
    formatResult(value) {
        // Format large numbers and decimals appropriately
        if (Math.abs(value) > 1e9 || (Math.abs(value) < 1e-7 && value !== 0)) {
            return value.toExponential(4);
        }
        // Remove trailing zeros after decimal
        const formatted = parseFloat(value.toPrecision(12)).toString();
        return formatted;
    }
    
    getOperationSymbol(operation) {
        const symbols = {
            'add': '+',
            'subtract': '−',
            'multiply': '×',
            'divide': '÷',
            'root': '√',
            'percent': '%'
        };
        return symbols[operation] || operation;
    }
    
    showError(message) {
        this.state.activeValue = 'Error';
        this.state.expressionHistory = message;
        const device = document.getElementById('computeDevice');
        device.classList.add('error-shake');
        
        setTimeout(() => {
            device.classList.remove('error-shake');
            this.performReset();
        }, 2000);
        
        this.updateInterface();
    }
    
    toggleHistory() {
        this.displayElements.historyPanel.classList.toggle('active');
    }
    
    addToHistory(expression, result) {
        // Add to history array
        this.state.calculationHistory.unshift({ expression, result });
        
        // Keep only last 50 calculations
        if (this.state.calculationHistory.length > 50) {
            this.state.calculationHistory.pop();
        }
        
        // Update history display
        this.updateHistoryDisplay();
        
        // Save to localStorage
        this.saveHistory();
    }
    
    updateHistoryDisplay() {
        this.displayElements.historyList.innerHTML = this.state.calculationHistory
            .map(item => `
                <div class="history-item" data-result="${item.result}">
                    ${item.expression}
                </div>
            `).join('');
    }
    
    clearHistory() {
        this.state.calculationHistory = [];
        this.updateHistoryDisplay();
        this.saveHistory();
    }
    
    saveHistory() {
        localStorage.setItem('calculatorHistory', JSON.stringify(this.state.calculationHistory));
    }
    
    loadHistory() {
        const saved = localStorage.getItem('calculatorHistory');
        if (saved) {
            this.state.calculationHistory = JSON.parse(saved);
            this.updateHistoryDisplay();
        }
    }
    
    toggleTheme() {
        document.body.classList.toggle('light-theme');
        const themeIcon = document.querySelector('.theme-icon');
        themeIcon.textContent = document.body.classList.contains('light-theme') ? '☀️' : '🌙';
        this.saveSettings();
    }
    
    saveSettings() {
        const settings = {
            theme: document.body.classList.contains('light-theme') ? 'light' : 'dark'
        };
        localStorage.setItem('calculatorSettings', JSON.stringify(settings));
    }
    
    loadSettings() {
        const saved = localStorage.getItem('calculatorSettings');
        if (saved) {
            const settings = JSON.parse(saved);
            if (settings.theme === 'light') {
                document.body.classList.add('light-theme');
                document.querySelector('.theme-icon').textContent = '☀️';
            }
        }
        
        // Load history
        this.loadHistory();
    }
    
    updateInterface() {
        // Update display values
        this.displayElements.result.textContent = this.state.activeValue;
        this.displayElements.expression.textContent = this.state.expressionHistory;
        
        // Update storage indicator
        if (this.state.storageBank !== 0) {
            this.displayElements.storageIndicator.classList.add('active');
            this.displayElements.storageValue.textContent = this.formatResult(this.state.storageBank);
        } else {
            this.displayElements.storageIndicator.classList.remove('active');
            this.displayElements.storageValue.textContent = '0';
        }
    }
    
    setupKeyboardSupport() {
        const keyMap = {
            '0': () => this.processDigitInput('0'),
            '1': () => this.processDigitInput('1'),
            '2': () => this.processDigitInput('2'),
            '3': () => this.processDigitInput('3'),
            '4': () => this.processDigitInput('4'),
            '5': () => this.processDigitInput('5'),
            '6': () => this.processDigitInput('6'),
            '7': () => this.processDigitInput('7'),
            '8': () => this.processDigitInput('8'),
            '9': () => this.processDigitInput('9'),
            '.': () => this.processAction('decimal'),
            '+': () => this.processAction('add'),
            '-': () => this.processAction('subtract'),
            '*': () => this.processAction('multiply'),
            '/': () => this.processAction('divide'),
            'Enter': () => this.processAction('execute'),
            '=': () => this.processAction('execute'),
            'Escape': () => this.processAction('reset'),
            'c': () => this.processAction('reset'),
            'C': () => this.processAction('reset'),
            '%': () => this.processAction('percent'),
            'h': () => this.processAction('history'),
            'H': () => this.processAction('history')
        };
        
        document.addEventListener('keydown', (e) => {
            const handler = keyMap[e.key];
            if (handler) {
                e.preventDefault();
                handler();
            }
        });
    }
}

// Initialize the computation engine when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.computationEngine = new ComputationEngine();
});

// Export for module usage
export default ComputationEngine; 