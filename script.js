class Print3DCostCalculator {
    constructor() {
        this.form = document.getElementById('calculatorForm');
        this.resultsDiv = document.getElementById('results');
        this.historyList = document.getElementById('historyList');
        this.themeToggle = document.getElementById('themeToggle');
        this.init();
    }

    init() {
        this.form.addEventListener('submit', (e) => this.calculateCost(e));
        document.getElementById('saveResult').addEventListener('click', () => this.saveResult());
        document.getElementById('clearHistory').addEventListener('click', () => this.clearHistory());
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
        this.loadTheme();
        this.loadHistory();
        
        // Event listener para gerar nota fiscal
        document.getElementById('generateInvoice').addEventListener('click', () => this.generateInvoice());
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
            profitMargin: parseFloat(document.getElementById('profitMargin').value) || 0,
            additionalHourlyCost: parseFloat(document.getElementById('additionalHourlyCost').value) || 0
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
        
        // Custo de mão de obra (por hora)
        const laborCostTotal = printTimeHours * data.laborCost;
        
        // Custo de manutenção/desgaste (por hora) + custo adicional
        const maintenanceCostTotal = printTimeHours * (data.maintenanceCost + data.additionalHourlyCost);
        
        // Custo adicional por hora (já incluído na manutenção para interface)
        const additionalCostTotal = printTimeHours * data.additionalHourlyCost;
        
        // Custo total sem lucro
        const totalCostWithoutProfit = materialCost + energyCostTotal + laborCostTotal + maintenanceCostTotal;
        
        // Margem de lucro sobre o custo total (sem mão de obra para evitar dupla margem)
        const profitBase = materialCost + energyCostTotal + maintenanceCostTotal;
        const profitAmount = profitBase * (data.profitMargin / 100);
        
        // Preço final
        const finalPrice = totalCostWithoutProfit + profitAmount;

        return {
            materialCost,
            energyCostTotal,
            laborCostTotal,
            maintenanceCostTotal,
            additionalCostTotal,
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
            <p><strong>Mão de obra por hora:</strong> ${this.formatCurrency(data.laborCost)}/h</p>
            <p><strong>Manutenção + adicional por hora:</strong> ${this.formatCurrency(data.maintenanceCost + data.additionalHourlyCost)}/h</p>
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
        btn.textContent = 'Salvo!';
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
                <button class="delete-item-btn" onclick="calculator.deleteHistoryItem(${index})" title="Excluir este item">×</button>
                <h4>${item.data.filamentType} - ${item.data.filamentWeight}g</h4>
                <p>Data: ${new Date(item.timestamp).toLocaleString('pt-BR')}</p>
                <p>Tempo: ${this.formatTime(item.data.printHours, item.data.printMinutes)}</p>
                <p>Material: ${this.formatCurrency(item.costs.materialCost)}</p>
                <p>Energia: ${this.formatCurrency(item.costs.energyCostTotal)}</p>
                <p class="final-price">Preço Final: ${this.formatCurrency(item.costs.finalPrice)}</p>
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

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        this.updateThemeButton(newTheme);
    }

    loadTheme() {
        // Sempre iniciar com tema escuro
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeButton(savedTheme);
    }

    updateThemeButton(theme) {
        const themeIcon = document.querySelector('.theme-icon');
        const themeText = document.querySelector('.theme-text');
        
        if (theme === 'dark') {
            themeIcon.textContent = 'brightness_7';
            themeText.textContent = 'Claro';
        } else {
            themeIcon.textContent = 'nightlight';
            themeText.textContent = 'Escuro';
        }
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

    generateInvoice() {
        // Verificar se há resultados para gerar a nota fiscal
        if (this.resultsDiv.classList.contains('hidden')) {
            alert('Por favor, calcule o custo primeiro antes de gerar a nota fiscal.');
            return;
        }

        // Obter dados dos campos
        const peso = parseFloat(document.getElementById('filamentWeight').value) || 0;
        const custoFilamento = parseFloat(document.getElementById('filamentCost').value) || 0;
        const tipoFilamento = document.getElementById('filamentType').value;
        const horas = parseFloat(document.getElementById('printHours').value) || 0;
        const minutos = parseFloat(document.getElementById('printMinutes').value) || 0;
        
        // Obter valores dos resultados
        const finalPrice = document.getElementById('finalPrice').textContent;
        const material = document.getElementById('materialCost').textContent;
        const energiaTotal = document.getElementById('energyCostResult').textContent;
        const maoObraTotal = document.getElementById('laborCostResult').textContent;
        const manutencaoTotal = document.getElementById('maintenanceCostResult').textContent;
        const total = document.getElementById('totalCostWithoutProfit').textContent;
        const lucro = document.getElementById('profitAmount').textContent;
        
        const dataHoje = new Date();
        const numeroNota = `NF-${dataHoje.getFullYear()}${(dataHoje.getMonth() + 1).toString().padStart(2, '0')}${dataHoje.getDate().toString().padStart(2, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        let y = 20;
        const margin = 20;
        const pageWidth = 210;
        
        // Cabeçalho da Nota Fiscal
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text('NOTA FISCAL DE SERVIÇO', pageWidth/2, y, { align: 'center' });
        y += 10;
        
        doc.setFontSize(12);
        doc.text(`Número: ${numeroNota}`, pageWidth/2, y, { align: 'center' });
        y += 15;
        
        // Dados do prestador
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('PRESTADOR DE SERVIÇOS:', margin, y);
        y += 7;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text('Nome: Vitória Gabriele', margin, y);
        y += 5;
        doc.text('Data de Emissão: ' + dataHoje.toLocaleDateString('pt-BR'), margin, y);
        y += 5;
        doc.text('Email: vgabrielesf@gmail.com', margin, y);
        y += 15;
        
        // Linha separadora
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.5);
        doc.line(margin, y, pageWidth - margin, y);
        y += 10;
        
        // Descrição do serviço
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('DESCRIÇÃO DO SERVIÇO:', margin, y);
        y += 10;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text('Serviço de Impressão 3D', margin, y);
        y += 7;
        
        // Especificações técnicas
        doc.setFont('helvetica', 'bold');
        doc.text('Especificações Técnicas:', margin, y);
        y += 7;
        
        doc.setFont('helvetica', 'normal');
        doc.text(`• Material: ${tipoFilamento}`, margin + 5, y);
        y += 5;
        doc.text(`• Peso do material: ${peso}g`, margin + 5, y);
        y += 5;
        doc.text(`• Tempo de impressão: ${this.formatTime(horas, minutos)}`, margin + 5, y);
        y += 5;
        doc.text(`• Data de produção: ${dataHoje.toLocaleDateString('pt-BR')}`, margin + 5, y);
        y += 15;
        
        // Tabela de custos
        doc.setFont('helvetica', 'bold');
        doc.text('DISCRIMINAÇÃO DOS CUSTOS:', margin, y);
        y += 10;
        
        // Headers da tabela
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        const col1 = margin;
        const col2 = margin + 80;
        const col3 = margin + 130;
        
        doc.text('Descrição', col1, y);
        doc.text('Valor Unit.', col2, y);
        doc.text('Total', col3, y);
        y += 5;
        
        // Linha da tabela
        doc.line(margin, y, pageWidth - margin, y);
        y += 7;
        
        // Itens da tabela
        doc.setFont('helvetica', 'normal');
        const itens = [
            ['Material (' + tipoFilamento + ')', material, material],
            ['Energia elétrica', energiaTotal, energiaTotal],
            ['Taxa de serviço', lucro, lucro],
            ['Manutenção/Desgaste', manutencaoTotal, manutencaoTotal]
        ];
        
        itens.forEach(item => {
            doc.text(item[0], col1, y);
            doc.text(item[1], col2, y);
            doc.text(item[2], col3, y);
            y += 6;
        });
        
        // Linha separadora
        y += 3;
        doc.line(margin, y, pageWidth - margin, y);
        y += 7;
        
        // Subtotal
        doc.setFont('helvetica', 'normal');
        doc.text('Subtotal (sem margem):', col2, y);
        doc.text(total, col3, y);
        y += 6;
        
        // Taxa de serviço
        doc.text('Taxa de serviço:', col2, y);
        doc.text(lucro, col3, y);
        y += 8;
        
        // Total final
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('VALOR TOTAL:', col2, y);
        doc.text(finalPrice, col3, y);
        y += 15;
        
        // Rodapé
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text('Esta nota fiscal refere-se ao serviço de impressão 3D prestado.', margin, y);
        y += 5;
        doc.text('Documento gerado automaticamente pela Calculadora de Custo de Impressão 3D.', margin, y);
        
        // Salvar o PDF
        doc.save(`Nota_Fiscal_${numeroNota}.pdf`);
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
        this.value = parseFloat(this.value).toFixed(3);
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

document.getElementById('generatePdf').addEventListener('click', function() {
    const peso = parseFloat(document.getElementById('filamentWeight').value) || 0;
    const custoFilamento = parseFloat(document.getElementById('filamentCost').value) || 0;
    const tipoFilamento = document.getElementById('filamentType').value;
    const horas = parseFloat(document.getElementById('printHours').value) || 0;
    const minutos = parseFloat(document.getElementById('printMinutes').value) || 0;
    const potencia = parseFloat(document.getElementById('printerPower').value) || 0;
    const energia = parseFloat(document.getElementById('energyCost').value) || 0;
    const maoObra = parseFloat(document.getElementById('laborCost').value) || 0;
    const manutencao = parseFloat(document.getElementById('maintenanceCost').value) || 0;
    const adicional = parseFloat(document.getElementById('additionalHourlyCost').value) || 0;
    const lucroPerc = parseFloat(document.getElementById('profitMargin').value) || 0;

    const material = document.getElementById('materialCost').textContent;
    const energiaTotal = document.getElementById('energyCostResult').textContent;
    const maoObraTotal = document.getElementById('laborCostResult').textContent;
    const manutencaoTotal = document.getElementById('maintenanceCostResult').textContent;
    const total = document.getElementById('totalCostWithoutProfit').textContent;
    const lucro = document.getElementById('profitAmount').textContent;
    const final = document.getElementById('finalPrice').textContent;
    const printSummary = document.getElementById('printSummary').innerText;

    const pesoKg = (peso / 1000).toFixed(2);
    const potenciaKw = (potencia / 1000).toFixed(2);
    const tempoHoras = horas + (minutos / 60);
    const custoAdicionalTotal = (tempoHoras * adicional).toFixed(2);
    const dataHoje = new Date().toLocaleDateString('pt-BR');

    // Margens uniformes: 2cm (20mm) em todos os lados
    const margin = 20;
    let y = margin;
    const pageWidth = 210;
    const pageHeight = 297;
    const rightX = pageWidth - margin;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFont('helvetica', 'normal'); // Use Helvetica para todo o texto
    doc.setFontSize(10); // menor fonte para caber tudo

    // Cabeçalho: Extrato à esquerda, Data/Material/Peso/Tempo à direita
    //doc.setDrawColor(180, 180, 180);
    //doc.setLineWidth(0.1);
    //doc.line(margin, y, pageWidth - margin, y);
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Custo de Produção', margin, y, {align: 'left'});
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Impressão 669 esc.: 1:40', margin, y, {align: 'left'});
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Data: ${dataHoje}`, rightX, y, {align: 'right'});
    y += 5;
    doc.text(`Material: ${tipoFilamento}`, rightX, y, {align: 'right'});
    y += 5;
    doc.text(`Peso: ${peso}g (${pesoKg}kg)`, rightX, y, {align: 'right'});
    y += 5;
    doc.text(`Tempo: ${tempoHoras}h`, rightX, y, {align: 'right'});
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    // Bloco: Resumo dos Totais (duas colunas)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Resumo', margin, y);
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const resumoLeft = [
        `Material: ${material}`,
        `Energia: ${energiaTotal}`,
        `Mão de Obra: ${maoObraTotal}`,
        `Manutenção: ${manutencaoTotal}`
    ];
    const resumoRight = [
        `Adicional: R$${custoAdicionalTotal}`,
        `Total: ${total}`,
        `Taxa de Serviço: ${lucroPerc}% (${lucro})`,
        `Preço final: ${final}`
    ];
    let resumoY = y;
    resumoLeft.forEach((txt, i) => {
        doc.text(txt, margin, resumoY);
        resumoY += 6;
    });
    resumoY = y;
    resumoRight.forEach((txt, i) => {
        if (txt.startsWith('Preço final:')) {
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 102, 0); // Dark green for resumo
            doc.text(txt, margin + 60, resumoY);
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'normal');
        } else {
            doc.text(txt, margin + 60, resumoY);
        }
        resumoY += 6;
    });
    y += Math.max(resumoLeft.length, resumoRight.length) * 6 + 2;

    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    // Corpo detalhado em duas colunas: dados e resultado à esquerda (resultado em vermelho), cálculos à direita
    // Define largura total da divisória para alinhar com o grid de resultados
    const dividerWidth = 120; // ajuste conforme o grid do PDF
    // Função para desenhar texto com quebra automática respeitando a borda direita do cabeçalho
    function drawTextWrapped(txt, x, y, maxWidth) {
        const lines = doc.splitTextToSize(txt, maxWidth);
        lines.forEach(line => {
            doc.text(line, x, y);
            y += 7;
        });
        return y;
    }

    // Espaço extra antes do primeiro bloco detalhado
    y += 5;
    const contentMaxWidth = rightX - margin; // largura máxima entre margem esquerda e borda virtual direita

    function blocoDuplo(titulo, dados, calculos, resultado) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(titulo, margin, y);
        y += 8;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        let dadosY = y;
        dados.forEach(txt => {
            dadosY = drawTextWrapped(txt, margin, dadosY, contentMaxWidth - 10);
        });
        if (resultado) {
            if (resultado.startsWith('Preço Final:')) {
                doc.setTextColor(0, 102, 0);
                doc.setFont('helvetica', 'bold');
                dadosY = drawTextWrapped(resultado, margin, dadosY, contentMaxWidth - 10);
                doc.setTextColor(0, 0, 0);
                doc.setFont('helvetica', 'normal');
                dadosY += 8;
            } else {
                doc.setTextColor(255, 100, 100);
                doc.setFont('helvetica', 'bold');
                dadosY = drawTextWrapped(resultado, margin, dadosY, contentMaxWidth - 10);
                doc.setTextColor(0, 0, 0);
                doc.setFont('helvetica', 'normal');
                dadosY += 8;
            }
        }
        let calcY = y;
        calculos.forEach(txt => {
            calcY = drawTextWrapped(txt, margin + 80, calcY, contentMaxWidth - 90);
        });
        let dividerY = Math.max(dadosY, calcY) + 1;
        y = dividerY + 12;
        // Adiciona divisória horizontal fina e escura de ponta a ponta após cada bloco
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.1);
        doc.line(margin, dividerY, pageWidth - margin, dividerY);
        if (y > 270) {
            doc.addPage();
            y = margin;
        }
    }

    // Espaço extra antes do primeiro bloco detalhado
    
    blocoDuplo('1. Custo do Material', [
        `Peso do filamento usado: ${peso}g`,
        `Custo do filamento: R$ ${custoFilamento.toFixed(2)} por kg`
    ], [
        'Cálculo:',
        `${peso}g = ${pesoKg}kg`,
        `Custo = ${pesoKg} × ${custoFilamento.toFixed(2)} = R$ ${material}`
    ], `Custo: R$ ${material}`);

    blocoDuplo('2. Custo de Energia', [
        `Potência da impressora: ${potencia}W`,
        `Tempo de impressão: ${tempoHoras} horas`,
        `Custo da energia: R$ ${energia.toFixed(4)} por kWh`
    ], [
        'Cálculo:',
        `Potência em kW = ${potencia} / 1000 = ${potenciaKw} kW`,
        `Custo = ${potenciaKw} × ${tempoHoras} × ${energia.toFixed(4)} = ${(potenciaKw * tempoHoras).toFixed(2)} × ${energia.toFixed(4)} = R$ ${parseFloat(energiaTotal.replace('R$','').replace(',','.')).toFixed(2)}`
    ], `Custo: ${energiaTotal}`);

    blocoDuplo('3. Custo de Mão de Obra', [
        `Valor fixo: R$ ${maoObra.toFixed(2)}`
    ], [
        'Cálculo:',
        `Custo = R$ ${maoObraTotal}`
    ], `Custo: ${maoObraTotal}`);

    blocoDuplo('4. Custo de Manutenção/Desgaste', [
        `Valor por hora: R$ ${manutencao.toFixed(2)}`
    ], [
        'Cálculo:',
        `Custo = ${tempoHoras} × ${manutencao.toFixed(2)} = R$ ${manutencaoTotal}`
    ], `Custo: ${manutencaoTotal}`);

    blocoDuplo('5. Custo Adicional por Hora', [
        `Valor por hora: R$ ${adicional.toFixed(2)}`
    ], [
        'Cálculo:',
        `Custo = ${tempoHoras} × ${adicional.toFixed(2)} = R$ ${custoAdicionalTotal}`
    ], `Custo: R$ ${custoAdicionalTotal}`);

    blocoDuplo('6. Custo Total (sem lucro)', [], [
        'Cálculo:',
        `Material + Energia + Mão de Obra + Manutenção + Adicional`,
        `= ${material} + ${energiaTotal} + ${maoObraTotal} + ${manutencaoTotal} + ${custoAdicionalTotal}`,
        `= R$ ${total}`
    ], `Total: ${total}`);

    blocoDuplo('7. Taxa de Serviço', [
        `Percentual: ${lucroPerc}%`
    ], [
        'Cálculo:',
        `Taxa = ${lucroPerc}% sobre material, energia e manutenção = R$ ${lucro}`
    ], `Taxa de Serviço: R$ ${lucro}`);

        // Bloco Detalhes da Impressão em duas colunas
    const finalValue = parseFloat(final.replace(/[^\d,\.]/g, '').replace(',', '.'));
    const custoPorGrama = peso > 0 ? (finalValue / peso) : 0;
    const custoPorHora = tempoHoras > 0 ? (finalValue / tempoHoras) : 0;
    const detalhesDados = [
        `Material: ${tipoFilamento}`,
        `Peso do filamento: ${peso}g`,
        `Tempo de impressão: ${tempoHoras} horas`,
        `Potência da impressora: ${potencia}W`,
        `Margem de lucro aplicada: ${lucroPerc}%`
    ];
    const detalhesCalculos = [
        `Custo por grama: ${final} / ${peso} = R$ ${custoPorGrama.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
        `Custo por hora: ${final} / ${tempoHoras} = R$ ${custoPorHora.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
    ];
    blocoDuplo('8. Detalhes da Impressão', detalhesDados, detalhesCalculos, '');

    blocoDuplo('9. Preço Final', [], [
        'Cálculo:',
        `Preço Final = ${total} + ${lucro} = R$ ${final}`
    ], `Preço Final: ${final}`); // Changed label and made it uppercase for emphasis


    // Adiciona rodapé do relatório
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.text('Relatório gerado automaticamente. © Vitória Gabriele', margin, pageHeight - 10);

    doc.save(`Fatura_Impressao3D_${dataHoje.replace(/\//g, '-')}.pdf`);
});
