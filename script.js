class Print3DCostCalculator {
    constructor() {
        this.form = document.getElementById('calculatorForm');
        this.resultsDiv = document.getElementById('results');
        this.historyList = document.getElementById('historyList');
        this.init();
    }

    init() {
        this.form.addEventListener('submit', (e) => this.calculateCost(e));
        document.getElementById('saveResult').addEventListener('click', () => this.saveResult());
        document.getElementById('clearHistory').addEventListener('click', () => this.clearHistory());
        this.loadHistory();
    }

    calculateCost(e) {
        e.preventDefault();

        // Obter valores do formulário
        const data = this.getFormData();
        
        if (!this.validateData(data)) {
            return;
        }

        // Calcular custos
        const costs = this.performCalculations(data);
        
        // Exibir resultados
        this.displayResults(costs, data);
        
        // Rolar para os resultados
        this.resultsDiv.scrollIntoView({ behavior: 'smooth' });
    }

    getFormData() {
        return {
            filamentWeight: parseFloat(document.getElementById('filamentWeight').value) || 0,
            filamentCost: parseFloat(document.getElementById('filamentCost').value) || 0,
            filamentType: document.getElementById('filamentType').value,
            printHours: parseInt(document.getElementById('printHours').value) || 0,
            printMinutes: parseInt(document.getElementById('printMinutes').value) || 0,
            printerPower: parseFloat(document.getElementById('printerPower').value) || 0,
            energyCost: parseFloat(document.getElementById('energyCost').value) || 0,
            laborCost: parseFloat(document.getElementById('laborCost').value) || 0,
            maintenanceCost: parseFloat(document.getElementById('maintenanceCost').value) || 0,
            profitMargin: parseFloat(document.getElementById('profitMargin').value) || 0
        };
    }

    validateData(data) {
        if (data.filamentWeight <= 0) {
            alert('Por favor, insira o peso do filamento usado.');
            return false;
        }
        if (data.filamentCost <= 0) {
            alert('Por favor, insira o custo do filamento.');
            return false;
        }
        if (data.printHours === 0 && data.printMinutes === 0) {
            alert('Por favor, insira o tempo de impressão.');
            return false;
        }
        return true;
    }

    performCalculations(data) {
        // Converter tempo para horas decimais
        const printTimeHours = data.printHours + (data.printMinutes / 60);
        
        // Custo do material (peso em gramas / 1000 * custo por kg)
        const materialCost = (data.filamentWeight / 1000) * data.filamentCost;
        
        // Custo de energia (potência em kW * tempo em horas * custo por kWh)
        const energyCostTotal = (data.printerPower / 1000) * printTimeHours * data.energyCost;
        
        // Custo de mão de obra
        const laborCostTotal = printTimeHours * data.laborCost;
        
        // Custo de manutenção/desgaste
        const maintenanceCostTotal = printTimeHours * data.maintenanceCost;
        
        // Custo total sem lucro
        const totalCostWithoutProfit = materialCost + energyCostTotal + laborCostTotal + maintenanceCostTotal;
        
        // Margem de lucro
        const profitAmount = totalCostWithoutProfit * (data.profitMargin / 100);
        
        // Preço final
        const finalPrice = totalCostWithoutProfit + profitAmount;

        return {
            materialCost,
            energyCostTotal,
            laborCostTotal,
            maintenanceCostTotal,
            totalCostWithoutProfit,
            profitAmount,
            finalPrice,
            printTimeHours
        };
    }

    displayResults(costs, data) {
        // Mostrar seção de resultados
        this.resultsDiv.classList.remove('hidden');
        
        // Atualizar valores nos elementos
        document.getElementById('materialCost').textContent = this.formatCurrency(costs.materialCost);
        document.getElementById('energyCostResult').textContent = this.formatCurrency(costs.energyCostTotal);
        document.getElementById('laborCostResult').textContent = this.formatCurrency(costs.laborCostTotal);
        document.getElementById('maintenanceCostResult').textContent = this.formatCurrency(costs.maintenanceCostTotal);
        document.getElementById('totalCostWithoutProfit').textContent = this.formatCurrency(costs.totalCostWithoutProfit);
        document.getElementById('profitAmount').textContent = this.formatCurrency(costs.profitAmount);
        document.getElementById('finalPrice').textContent = this.formatCurrency(costs.finalPrice);
        
        // Exibir detalhes da impressão
        this.displayPrintSummary(data, costs);
        
        // Armazenar dados para salvar
        this.currentCalculation = { data, costs, timestamp: new Date() };
    }

    displayPrintSummary(data, costs) {
        const summary = document.getElementById('printSummary');
        const printTime = this.formatTime(data.printHours, data.printMinutes);
        const costPerGram = costs.finalPrice / data.filamentWeight;
        const costPerHour = costs.finalPrice / costs.printTimeHours;
        
        summary.innerHTML = `
            <p><strong>Material:</strong> ${data.filamentType}</p>
            <p><strong>Peso do filamento:</strong> ${data.filamentWeight}g</p>
            <p><strong>Tempo de impressão:</strong> ${printTime}</p>
            <p><strong>Custo por grama:</strong> ${this.formatCurrency(costPerGram)}</p>
            <p><strong>Custo por hora:</strong> ${this.formatCurrency(costPerHour)}</p>
            <p><strong>Potência da impressora:</strong> ${data.printerPower}W</p>
            <p><strong>Margem de lucro aplicada:</strong> ${data.profitMargin}%</p>
        `;
    }

    saveResult() {
        if (!this.currentCalculation) {
            alert('Nenhum cálculo para salvar!');
            return;
        }

        const history = this.getHistory();
        history.unshift(this.currentCalculation);
        
        // Limitar histórico a 20 itens
        if (history.length > 20) {
            history.splice(20);
        }
        
        localStorage.setItem('print3d_history', JSON.stringify(history));
        this.loadHistory();
        
        // Feedback visual
        const btn = document.getElementById('saveResult');
        const originalText = btn.textContent;
        btn.textContent = '✅ Salvo!';
        btn.style.background = '#48bb78';
        
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '';
        }, 2000);
    }

    loadHistory() {
        const history = this.getHistory();
        
        if (history.length === 0) {
            this.historyList.innerHTML = '<p class="empty-history">Nenhum cálculo salvo ainda.</p>';
            return;
        }
        
        this.historyList.innerHTML = history.map((item, index) => `
            <div class="history-item">
                <h4>${item.data.filamentType} - ${item.data.filamentWeight}g</h4>
                <p>Data: ${new Date(item.timestamp).toLocaleString('pt-BR')}</p>
                <p>Tempo: ${this.formatTime(item.data.printHours, item.data.printMinutes)}</p>
                <p>Material: ${this.formatCurrency(item.costs.materialCost)}</p>
                <p>Energia: ${this.formatCurrency(item.costs.energyCostTotal)}</p>
                <p class="final-price">Preço Final: ${this.formatCurrency(item.costs.finalPrice)}</p>
                <button onclick="calculator.deleteHistoryItem(${index})" style="background: #e53e3e; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-top: 10px;">Excluir</button>
            </div>
        `).join('');
    }

    deleteHistoryItem(index) {
        const history = this.getHistory();
        history.splice(index, 1);
        localStorage.setItem('print3d_history', JSON.stringify(history));
        this.loadHistory();
    }

    clearHistory() {
        if (confirm('Tem certeza que deseja limpar todo o histórico?')) {
            localStorage.removeItem('print3d_history');
            this.loadHistory();
        }
    }

    getHistory() {
        const history = localStorage.getItem('print3d_history');
        return history ? JSON.parse(history) : [];
    }

    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }

    formatTime(hours, minutes) {
        if (hours === 0) {
            return `${minutes} minutos`;
        } else if (minutes === 0) {
            return `${hours} horas`;
        } else {
            return `${hours}h ${minutes}min`;
        }
    }
}

// Dados de exemplo para diferentes filamentos
const filamentPresets = {
    'PLA': { cost: 85, power: 200 },
    'ABS': { cost: 90, power: 250 },
    'PETG': { cost: 95, power: 240 },
    'TPU': { cost: 120, power: 220 },
    'Wood': { cost: 110, power: 230 },
    'Metal': { cost: 150, power: 260 }
};

// Atualizar campos baseado no tipo de filamento selecionado
document.getElementById('filamentType').addEventListener('change', function() {
    const filamentType = this.value;
    const preset = filamentPresets[filamentType];
    
    if (preset) {
        const costField = document.getElementById('filamentCost');
        const powerField = document.getElementById('printerPower');
        
        if (costField.value === '' || costField.value === '0') {
            costField.value = preset.cost;
        }
        
        if (powerField.value === '' || powerField.value === '250') {
            powerField.value = preset.power;
        }
    }
});

// Inicializar calculadora
const calculator = new Print3DCostCalculator();

// Adicionar dicas de tooltips
const tooltips = {
    'filamentWeight': 'Peso do filamento que será consumido na impressão (geralmente mostrado no slicer)',
    'filamentCost': 'Preço pago pelo quilograma do filamento',
    'printerPower': 'Potência média consumida pela impressora durante a impressão',
    'energyCost': 'Valor cobrado pela energia elétrica (confira sua conta de luz)',
    'laborCost': 'Valor/hora para operação e supervisão da impressão',
    'maintenanceCost': 'Custo estimado de desgaste da impressora por hora de uso',
    'profitMargin': 'Percentual de lucro desejado sobre o custo total'
};

// Adicionar tooltips aos campos
Object.keys(tooltips).forEach(id => {
    const element = document.getElementById(id);
    if (element) {
        element.title = tooltips[id];
    }
});

// Adicionar validação em tempo real
document.querySelectorAll('input[type="number"]').forEach(input => {
    input.addEventListener('input', function() {
        if (this.value < 0) {
            this.value = 0;
        }
    });
});

// Adicionar formatação automática para valores monetários
document.getElementById('filamentCost').addEventListener('blur', function() {
    if (this.value) {
        this.value = parseFloat(this.value).toFixed(2);
    }
});

document.getElementById('energyCost').addEventListener('blur', function() {
    if (this.value) {
        this.value = parseFloat(this.value).toFixed(4);
    }
});

// Adicionar atalhos de teclado
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 'Enter') {
        document.querySelector('.calculate-btn').click();
    }
});

// Verificar se localStorage está funcionando
if (typeof(Storage) !== "undefined") {
    console.log('✅ LocalStorage disponível - Histórico será salvo!');
} else {
    console.log('❌ LocalStorage não disponível');
    alert('Seu navegador não suporta armazenamento local. O histórico não será salvo.');
}

console.log('🖨️ Calculadora de Custo de Impressão 3D carregada com sucesso!');

