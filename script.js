const URL_GOOGLE_SHEETS = 'https://script.google.com/macros/s/AKfycbyaJ22KfiTaxXIIAud_6vxVui2HrwVJA2Ot_Ee-tXO_WTDjK1CkUIpRAgNdV76hFAM/exec';

function parseLocalizedNumber(value) {
    let normalized = String(value ?? '').trim().replace(/[^\d,.-]/g, '');
    const commaPosition = normalized.lastIndexOf(',');
    const dotPosition = normalized.lastIndexOf('.');

    if (commaPosition > -1 && dotPosition > -1) {
        normalized = commaPosition > dotPosition
            ? normalized.replace(/\./g, '').replace(',', '.')
            : normalized.replace(/,/g, '');
    } else {
        normalized = normalized.replace(',', '.');
    }

    const number = Number(normalized);
    return Number.isFinite(number) ? number : 0;
}

class Print3DCostCalculator {
    constructor() {
        this.form = document.getElementById('calculatorForm');
        this.resultsDiv = document.getElementById('results');
        this.historyList = document.getElementById('historyList');
        this.themeToggle = document.getElementById('themeToggle');
        this.orcamentoOficial = false;
        this.initPricingMode();
        this.init();
    }

    init() {
        this.form.addEventListener('submit', (e) => this.calculateCost(e));
        document.getElementById('saveDraft').addEventListener('click', () => this.saveResult());
        document.getElementById('clearHistory').addEventListener('click', () => this.clearHistory());
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
        document.getElementById('printTechnology').addEventListener('change', () => this.updatePrintTechnology());
        this.initBlockQuote();
        this.initOfficialQuote();
        this.initCollapsibleSections();
        document.getElementById('serviceNumber').value = this.createInvoiceNumber();
        this.updatePrintTechnology();
        this.loadTheme();
        this.loadHistory();
        
        // Event listener para gerar nota fiscal
        document.getElementById('generateInvoice').addEventListener('click', () => this.generateInvoice());
        document.getElementById('saveToSheets').addEventListener('click', () => this.saveCurrentNoteToSheets());
        document.getElementById('generateCompleteInvoice').addEventListener('click', () => this.generateInvoice(true));
    }

    initPricingMode() {
        const pricingMode = document.getElementById('pricingMode');
        pricingMode.addEventListener('change', () => this.updatePricingMode());
        document.getElementById('quoteImage').addEventListener('change', (event) => {
            const file = event.target.files[0];
            document.getElementById('quoteImageName').textContent = file
                ? file.name
                : 'Opcional';
        });
        this.updatePricingMode();
    }

    updatePricingMode() {
        const isFixed = document.getElementById('pricingMode').value === 'fixed';
        document.getElementById('fixedPriceGroup').classList.toggle('hidden', !isFixed);
        document.getElementById('fixedProductGroup').classList.toggle('hidden', !isFixed);
        document.getElementById('quoteImageGroup').classList.toggle('hidden', !isFixed);
        document.querySelectorAll('.pricing-dependent').forEach((section) => {
            section.classList.toggle('hidden', isFixed);
        });
        document.querySelectorAll('.pricing-dependent input, .pricing-dependent select').forEach((field) => {
            field.disabled = isFixed;
        });
        if (!isFixed) {
            document.getElementById('fixedProductName').value = '';
            document.getElementById('quoteImage').value = '';
            document.getElementById('quoteImageName').textContent = 'Opcional';
        }
        document.querySelector('.calculate-btn').textContent = isFixed
            ? 'Gerar Orçamento'
            : 'Calcular Custo';
    }

    initBlockQuote() {
        const panel = document.getElementById('blockQuotePanel');
        document.getElementById('toggleBlockQuote').addEventListener('click', () => {
            panel.classList.toggle('hidden');
            const isActive = !panel.classList.contains('hidden');
            document.getElementById('toggleBlockQuote').textContent = isActive
                ? 'Ocultar produtos da nota'
                : 'Adicionar produtos à nota';
            if (isActive && document.getElementById('blockRows').children.length === 0) {
                this.addBlockRow();
            }
        });
        document.getElementById('addBlock').addEventListener('click', () => this.addBlockRow());
    }

    initOfficialQuote() {
        const button = document.getElementById('toggleOfficialQuote');
        button.addEventListener('click', () => {
            this.orcamentoOficial = !this.orcamentoOficial;
            button.textContent = this.orcamentoOficial
                ? 'Orçamento oficial'
                : 'Orçamento não oficial';
            button.setAttribute('aria-pressed', String(this.orcamentoOficial));
            button.classList.toggle('official', this.orcamentoOficial);
            button.classList.toggle('unofficial', !this.orcamentoOficial);
        });
    }

    initCollapsibleSections() {
        document.querySelectorAll('.collapsible-section').forEach((section) => {
            const button = section.querySelector('.section-collapse-toggle');
            const icon = button.querySelector('.material-symbols-outlined');

            button.addEventListener('click', () => {
                const expanded = section.classList.toggle('collapsed') === false;
                button.setAttribute('aria-expanded', String(expanded));
                button.setAttribute('title', expanded ? 'Ocultar informações' : 'Mostrar informações');
                icon.textContent = expanded ? 'expand_less' : 'expand_more';
            });
        });
    }

    addBlockRow() {
        const blockRows = document.getElementById('blockRows');
        const row = document.createElement('div');
        row.className = 'block-row';
        row.innerHTML = `
            <div><label>Produto</label><input class="block-product" type="text" placeholder="Ex: Suporte"></div>
            <div><label>Peso (g)</label><input class="block-weight" type="text" inputmode="decimal" placeholder="Ex: 25,5"></div>
            <div><label>Horas</label><input class="block-hours" type="number" min="0" step="1" value="0"></div>
            <div><label>Minutos</label><input class="block-minutes" type="number" min="0" max="59" step="1" value="0"></div>
            <button type="button" class="remove-block-btn" title="Remover bloco">Remover</button>
        `;
        row.querySelectorAll('input').forEach((input) => input.addEventListener('input', () => this.updateBlockTotals()));
        row.querySelector('.remove-block-btn').addEventListener('click', () => {
            row.remove();
            this.updateBlockTotals();
        });
        blockRows.appendChild(row);
        this.updateBlockTotals();
    }

    updateBlockTotals() {
        let totalWeight = 0;
        let totalMinutes = 0;
        document.querySelectorAll('.block-row').forEach((row) => {
            totalWeight += parseLocalizedNumber(row.querySelector('.block-weight').value);
            totalMinutes += (parseLocalizedNumber(row.querySelector('.block-hours').value) * 60);
            totalMinutes += parseLocalizedNumber(row.querySelector('.block-minutes').value);
        });
        const totalHours = Math.floor(totalMinutes / 60);
        const remainingMinutes = totalMinutes % 60;
        document.getElementById('blocksTotalWeight').textContent = `${totalWeight.toFixed(2).replace('.', ',')} g`;
        document.getElementById('blocksTotalTime').textContent = `${totalHours}h ${remainingMinutes}min`;
        document.getElementById('filamentWeight').value = totalWeight ? totalWeight.toFixed(2) : '';
        document.getElementById('printHours').value = totalHours || '';
        document.getElementById('printMinutes').value = remainingMinutes || '';
    }

    updatePrintTechnology() {
        const isResin = document.getElementById('printTechnology').value === 'resin';
        const materialType = document.getElementById('filamentType');
        const options = isResin
            ? [
                ['Standard', 'Resina Standard'],
                ['ABS-like', 'Resina ABS-like'],
                ['Tough', 'Resina Tough'],
                ['Water washable', 'Resina Lavável em Água'],
                ['Other', 'Outra']
            ]
            : [
                ['PLA', 'PLA'],
                ['ABS', 'ABS'],
                ['PETG', 'PETG'],
                ['TPU', 'TPU'],
                ['Wood', 'Wood Fill'],
                ['Metal', 'Metal Fill'],
                ['Other', 'Outro']
            ];

        materialType.innerHTML = options.map(([value, label]) => `<option value="${value}">${label}</option>`).join('');
        document.getElementById('materialSectionTitle').textContent = isResin ? 'Informações da Resina' : 'Informações do Material';
        document.getElementById('materialWeightLabel').textContent = isResin ? 'Peso da resina usada (g):' : 'Peso do filamento usado (g):';
        document.getElementById('materialCostLabel').textContent = isResin ? 'Custo da resina (R$/kg):' : 'Custo do filamento (R$/kg):';
        document.getElementById('materialTypeLabel').textContent = isResin ? 'Tipo de resina:' : 'Tipo de filamento:';
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
            pricingMode: document.getElementById('pricingMode').value,
            fixedPrice: parseLocalizedNumber(document.getElementById('fixedPrice').value),
            printTechnology: document.getElementById('printTechnology').value,
            filamentWeight: parseLocalizedNumber(document.getElementById('filamentWeight').value),
            filamentCost: parseLocalizedNumber(document.getElementById('filamentCost').value),
            filamentType: document.getElementById('filamentType').value,
            printHours: parseInt(document.getElementById('printHours').value) || 0,
            printMinutes: parseInt(document.getElementById('printMinutes').value) || 0,
            printerPower: parseLocalizedNumber(document.getElementById('printerPower').value),
            energyCost: parseLocalizedNumber(document.getElementById('energyCost').value),
            laborCost: parseLocalizedNumber(document.getElementById('laborCost').value),
            maintenanceCost: parseLocalizedNumber(document.getElementById('maintenanceCost').value),
            profitMargin: parseLocalizedNumber(document.getElementById('profitMargin').value),
            additionalHourlyCost: parseLocalizedNumber(document.getElementById('additionalHourlyCost').value)
        };
    }

    validateData(data) {
        if (data.pricingMode === 'fixed') {
            if (data.fixedPrice <= 0) {
                alert('Por favor, insira o preço fixo do orçamento.');
                return false;
            }
            return true;
        }

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
        if (data.pricingMode === 'fixed') {
            return {
                materialCost: 0,
                energyCostTotal: 0,
                laborCostTotal: 0,
                maintenanceCostTotal: 0,
                additionalCostTotal: 0,
                totalCostWithoutProfit: data.fixedPrice,
                profitAmount: 0,
                finalPrice: data.fixedPrice,
                printTimeHours: 0
            };
        }

        // Converter tempo para horas decimais
        const printTimeHours = data.printHours + (data.printMinutes / 60);
        
        // Tanto filamento quanto resina usam o peso consumido pelo slicer.
        const materialCost = this.calculateMaterialCost(data);
        
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

    calculateMaterialCost(data) {
        const materialInKg = data.filamentWeight / 1000;
        return materialInKg * data.filamentCost;
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
        const costPerGram = data.filamentWeight > 0 ? costs.finalPrice / data.filamentWeight : 0;
        const costPerHour = costs.printTimeHours > 0 ? costs.finalPrice / costs.printTimeHours : 0;
        
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
            ${data.pricingMode === 'fixed' ? '<p><strong>Tipo:</strong> Preço fixo</p>' : ''}
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
        const btn = document.getElementById('saveDraft');
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
        // Iniciar no tema claro quando ainda não houver preferência salva
        const savedTheme = localStorage.getItem('theme') || 'light';
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

    createInvoiceNumber() {
        const date = new Date();
        return `NF-${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    }

    salvarNotaNoGoogleSheets(dados) {
        return fetch(URL_GOOGLE_SHEETS, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8'
            },
            body: JSON.stringify(dados)
        }).catch((erro) => {
            console.error('Erro ao salvar nota no Google Sheets:', erro);
        });
    }

    getImageData() {
        if (document.getElementById('pricingMode').value !== 'fixed') {
            return Promise.resolve(null);
        }

        const file = document.getElementById('quoteImage').files[0];
        if (!file) {
            return Promise.resolve(null);
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve({
                dataUrl: reader.result,
                name: file.name
            });
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async salvarNotaComImagem(dados, tipoNota) {
        const imagem = await this.getImageData();
        return this.salvarNotaNoGoogleSheets({
            ...dados,
            tipoNota,
            imagemData: imagem ? imagem.dataUrl : '',
            imagemNome: imagem ? imagem.name : ''
        });
    }

    getDadosNotaServico() {
        const pricingMode = document.getElementById('pricingMode').value;
        const precoFixo = parseLocalizedNumber(document.getElementById('fixedPrice').value);
        const nomeProduto = document.getElementById('fixedProductName').value.trim();
        const blocks = Array.from(document.querySelectorAll('.block-row'))
            .map((row, index) => {
                const product = row.querySelector('.block-product').value.trim();
                const weight = parseLocalizedNumber(row.querySelector('.block-weight').value);
                const hours = parseLocalizedNumber(row.querySelector('.block-hours').value);
                const minutes = parseLocalizedNumber(row.querySelector('.block-minutes').value);

                return {
                    number: index + 1,
                    product: product || `Produto ${index + 1}`,
                    weight,
                    hours,
                    minutes,
                    preenchido: Boolean(product) || weight > 0 || hours > 0 || minutes > 0
                };
            })
            .filter((block) => block.preenchido)
            .map(({ preenchido, ...block }) => block);

        return {
            pricingMode,
            precoFixo,
            nomeProduto,
            numeroNota: document.getElementById('serviceNumber').value.trim() || this.createInvoiceNumber(),
            cliente: document.getElementById('clientName').value.trim() || 'Não informado',
            peso: parseLocalizedNumber(document.getElementById('filamentWeight').value),
            material: document.getElementById('filamentType').value,
            horas: parseInt(document.getElementById('printHours').value, 10) || 0,
            minutos: parseInt(document.getElementById('printMinutes').value, 10) || 0,
            printId: document.getElementById('printId').value.trim() || 'Não informado',
            infill: document.getElementById('infill').value.trim(),
            wallLoops: document.getElementById('wallLoops').value.trim(),
            dimensions: document.getElementById('dimensions').value.trim() || 'Não informado',
            precoFinal: pricingMode === 'fixed'
                ? precoFixo
                : parseLocalizedNumber(document.getElementById('finalPrice').textContent),
            statusOrcamento: this.orcamentoOficial ? 'Oficial' : 'Não oficial',
            produtos: blocks
        };
    }

    async saveCurrentNoteToSheets() {
        if (this.resultsDiv.classList.contains('hidden')) {
            alert('Por favor, calcule o custo primeiro antes de salvar na planilha.');
            return;
        }

        const button = document.getElementById('saveToSheets');
        const originalText = button.textContent;
        button.textContent = 'Salvando...';

        try {
            await this.salvarNotaComImagem(this.getDadosNotaServico(), 'Nota de Serviço');
            button.textContent = 'Salvo na Planilha!';
        } catch (erro) {
            console.error('Erro ao salvar orçamento:', erro);
            button.textContent = 'Erro ao salvar';
        }

        setTimeout(() => {
            button.textContent = originalText;
        }, 2500);
    }

    generateInvoice(complete = false) {
        // Verificar se há resultados para gerar a nota fiscal
        if (this.resultsDiv.classList.contains('hidden')) {
            alert('Por favor, calcule o custo primeiro antes de gerar a nota fiscal.');
            return;
        }

        const notaServico = this.getDadosNotaServico();
        const { peso, material: tipoFilamento, numeroNota, cliente: clientName, infill, wallLoops, printId, dimensions, horas, minutos, precoFinal: finalPrice, statusOrcamento, produtos: blocks } = notaServico;
        const pixEmail = 'vgabrielesf@gmail.com';
        const pixCopyPaste = '00020126430014BR.GOV.BCB.PIX0121vgabrielesf@gmail.com5204000053039865802BR5925VITORIA GABRIELE DA SILVA6009SAO PAULO622605222TJx4MlFaAnTxLSFl8BDPo63047CDC';
        const dataHoje = new Date();

        this.salvarNotaComImagem(notaServico, complete ? 'NS Completa' : 'Nota de Serviço');

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const blue = [9, 55, 121];
        const orange = [255, 111, 36];
        const gray = [105, 105, 105];
        const margin = 21;
        const pageWidth = 210;
        const right = pageWidth - margin;
        const dateText = dataHoje.toLocaleDateString('pt-BR');
        const timeText = this.formatTime(horas, minutos);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...blue);

        // Cabeçalho com a mesma composição visual do modelo.
        doc.setDrawColor(...orange);
        doc.setLineWidth(0.45);
        doc.line(margin, 21, 47, 21);
        doc.line(163, 21, right, 21);
        doc.setFillColor(...orange);
        doc.circle(47, 21, 1.5, 'F');
        doc.circle(163, 21, 1.5, 'F');
        doc.setFontSize(22);
        doc.text('NOTA DE SERVIÇO', pageWidth / 2, 25, { align: 'center' });

        const drawWithIcons = () => {
            let pessoa;
            let papel;
            let enterprise;
            let calendario;
            let impressora;
            let pix;
            let pendingIcons = 6;
            const finish = () => {
                pendingIcons -= 1;
                if (pendingIcons === 0) {
                    this.drawInvoiceContent(doc, {
                        blue, orange, gray, margin, right, peso, tipoFilamento, finalPrice,
                        numeroNota, dateText, timeText, clientName, infill, wallLoops, printId, dimensions, statusOrcamento, pixEmail, pixCopyPaste, blocks, pessoa, papel, enterprise, calendario, impressora, pix, complete
                    });
                }
            };
            const loadIcon = (source, assign) => {
                const icon = new Image();
                icon.onload = () => {
                    if (!source.endsWith('.svg')) {
                        assign(icon);
                        finish();
                        return;
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = icon.naturalWidth || 64;
                    canvas.height = icon.naturalHeight || 64;
                    const context = canvas.getContext('2d');
                    context.drawImage(icon, 0, 0, canvas.width, canvas.height);

                    const pngIcon = new Image();
                    pngIcon.onload = () => {
                        assign(pngIcon);
                        finish();
                    };
                    pngIcon.onerror = finish;
                    pngIcon.src = canvas.toDataURL('image/png');
                };
                icon.onerror = finish;
                icon.src = source;
            };
            const tintIcon = (icon, color) => {
                const canvas = document.createElement('canvas');
                canvas.width = icon.naturalWidth || 64;
                canvas.height = icon.naturalHeight || 64;
                const context = canvas.getContext('2d');
                context.drawImage(icon, 0, 0, canvas.width, canvas.height);
                context.globalCompositeOperation = 'source-in';
                context.fillStyle = `rgb(${color.join(',')})`;
                context.fillRect(0, 0, canvas.width, canvas.height);
                return canvas;
            };

            loadIcon('pessoa.png', (icon) => { pessoa = icon; });
            loadIcon('papel.png', (icon) => { papel = icon; });
            loadIcon('enterprise.png', (icon) => { enterprise = tintIcon(icon, blue); });
            loadIcon('calendario.png', (icon) => { calendario = icon; });
            loadIcon('impressora.png', (icon) => { impressora = icon; });
            loadIcon('pix.jpeg', (icon) => { pix = icon; });
        };

        // Logo da prestadora, quando o arquivo estiver disponível.
        const logo = new Image();
        logo.onload = () => {
            const maxLogoWidth = 43;
            const maxLogoHeight = 46;
            const logoRatio = logo.naturalWidth / logo.naturalHeight;
            const logoWidth = Math.min(maxLogoWidth, maxLogoHeight * logoRatio);
            const logoHeight = logoWidth / logoRatio;
            doc.addImage(logo, 'PNG', 181 - logoWidth, 40, logoWidth, logoHeight);
            drawWithIcons();
        };
        logo.onerror = drawWithIcons;
        logo.src = 'logo.png';
    }

    drawInvoiceContent(doc, details) {
        const { blue, orange, gray, margin, right, peso, tipoFilamento, finalPrice, numeroNota, dateText, timeText, clientName, infill, wallLoops, printId, dimensions, statusOrcamento, pixEmail, pixCopyPaste, blocks, pessoa, papel, enterprise, calendario, impressora, pix, complete } = details;
        const section = (number, title, y) => {
            doc.setFillColor(...orange);
            doc.circle(margin + 3, y - 0.2, 3.2, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text(String(number), margin + 3, y + 1.2, { align: 'center' });
            doc.setTextColor(...blue);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(12);
            doc.text(title, margin + 9, y + 2);
        };

        const infoRow = (label, value, y, icon) => {
            if (icon) {
                doc.addImage(icon, 'PNG', 26, y - 4, 10, 10);
            }
            doc.setDrawColor(...orange);
            doc.setLineWidth(0.45);
            doc.line(42, y - 5, 42, y + 6);
            doc.setTextColor(...blue);
            doc.setFontSize(10);
            doc.text(`${label}:`, 47, y);
            doc.setTextColor(...gray);
            doc.text(value, 47, y + 5);
        };

        section(1, 'INFORMAÇÕES GERAIS', 43);
        infoRow('Número da Nota', numeroNota, 55, papel);
        infoRow('Nome do Cliente', clientName, 70, pessoa);
        infoRow('Prestador de Serviço', 'Vitória G. S. Figueiredo & Jackson N Rocha', 85, enterprise);
        infoRow('Data de Emissão', dateText, 100, calendario);
        doc.setTextColor(...blue);
        doc.setFontSize(10);
        doc.text('@jg_print3d', 151, 91);
        doc.text(`Orçamento: ${statusOrcamento}`, 151, 100);

        section(2, 'ESPECIFICAÇÕES TÉCNICAS', 122);
        doc.setDrawColor(...orange);
        const specs = [
            ['ID', printId],
            ['Dimensões Totais', dimensions],
            ['Material', tipoFilamento]
        ];
        if (infill && complete) {
            specs.push(['Preenchimento', `${infill}%`]);
        }
        if (complete) {
            if (wallLoops) {
                specs.push(['Loops de parede', wallLoops]);
            }
            specs.push(['Peso do Material', `${peso}g`], ['Tempo de Impressão', timeText]);
        }
        doc.line(31, 134, 31, 134 + (specs.length - 1) * 10 + 6);
        specs.forEach((item, index) => {
            const y = 136 + index * 10;
            doc.setFillColor(...orange);
            doc.circle(31, y - 2, 1.5, 'F');
            doc.setTextColor(20, 20, 20);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text(`${item[0]}:`, 36, y);
            doc.setFont('helvetica', 'normal');
            doc.text(item[1], 82, y);
        });

        const descriptionY = 146 + (specs.length - 1) * 10;
        section(3, 'DESCRIÇÃO DO SERVIÇO', descriptionY);
        if (impressora) {
            doc.addImage(impressora, 'PNG', 26, descriptionY + 12, 10, 10);
        }
        doc.setDrawColor(...orange);
        doc.line(42, descriptionY + 11, 42, descriptionY + 23);
        doc.setTextColor(...gray);
        doc.setFontSize(10);
        doc.text('serviço de impressão será realizado conforme especificações', 47, descriptionY + 14);
        doc.text('técnicas descritas nesse documento.', 47, descriptionY + 20);

        const paymentY = descriptionY + 35;
        const qrMaxSize = complete ? 34 : 55;
        const qrY = paymentY + 8;
        section(4, 'PAGAMENTO', paymentY);
        if (pix) {
            const qrRatio = pix.naturalWidth / pix.naturalHeight;
            const qrWidth = qrRatio >= 1 ? qrMaxSize : qrMaxSize * qrRatio;
            const qrHeight = qrRatio >= 1 ? qrMaxSize / qrRatio : qrMaxSize;
            doc.addImage(pix, 'JPEG', margin, qrY, qrWidth, qrHeight);
            const textX = margin + qrWidth + 12;
            doc.setTextColor(...blue);
            doc.setFontSize(9);
            doc.text('Chave PIX:', textX, qrY + 5);
            doc.setTextColor(...gray);
            doc.text(pixEmail, textX, qrY + 11);
            doc.setTextColor(...blue);
            doc.text('Copia e Cola:', textX, qrY + 19);
            doc.setTextColor(...gray);
            doc.setFontSize(8);
            const copyLines = doc.splitTextToSize(pixCopyPaste, right - textX);
            doc.text(copyLines, textX, qrY + 24);
            const textBottom = qrY + 24 + (copyLines.length * 3);
            const totalLineY = Math.max(qrY + qrHeight + 5, textBottom + 4);
            doc.setDrawColor(...orange);
            doc.setLineWidth(0.45);
            doc.line(margin, totalLineY, right, totalLineY);
            doc.setTextColor(...blue);
            doc.setFontSize(11);
            doc.text('VALOR TOTAL:', 137, totalLineY + 10);
            doc.setFontSize(22);
            doc.text(finalPrice, 137, totalLineY + 24);
        } else {
            const totalLineY = qrY + 5;
            doc.setDrawColor(...orange);
            doc.setLineWidth(0.45);
            doc.line(margin, totalLineY, right, totalLineY);
            doc.setTextColor(...blue);
            doc.setFontSize(11);
            doc.text('VALOR TOTAL:', 137, totalLineY + 10);
            doc.setFontSize(22);
            doc.text(finalPrice, 137, totalLineY + 24);
        }

        if (blocks.length > 0) {
            this.drawBlockQuotePage(doc, blocks, blue, orange, gray, finalPrice, complete);
        }

        doc.save(`Nota_de_Servico_${numeroNota}.pdf`);
    }

    drawBlockQuotePage(doc, blocks, blue, orange, gray, finalPrice, complete) {
        doc.addPage();
        doc.setTextColor(...blue);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.text('PRODUTOS DA NOTA', 105, 25, { align: 'center' });

        const columns = complete
            ? { product: 25, weight: 105, hours: 140, minutes: 170 }
            : { product: 25, price: 145 };
        doc.setFillColor(...blue);
        doc.roundedRect(21, 35, 168, 17, 2, 2, 'F');
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.text('Produto', columns.product, 45);
        if (complete) {
            doc.text('Peso (g)', columns.weight, 45);
            doc.text('Horas', columns.hours, 45);
            doc.text('Minutos', columns.minutes, 45);
        } else {
            doc.text('Preço individual', columns.price, 45);
        }

        let y = 60;
        const totalWeight = blocks.reduce((sum, block) => sum + block.weight, 0);
        let totalMinutes = 0;
        const totalPrice = parseLocalizedNumber(finalPrice);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...gray);
        blocks.forEach((block, index) => {
            totalMinutes += block.hours * 60 + block.minutes;
            if (index % 2 === 0) {
                doc.setFillColor(244, 248, 253);
                doc.rect(21, y - 7, 168, 9, 'F');
            }
            doc.setDrawColor(220, 228, 238);
            doc.setLineWidth(0.2);
            doc.line(21, y + 4, 189, y + 4);
            doc.text(block.product, columns.product, y);
            if (complete) {
                doc.text(block.weight.toFixed(2).replace('.', ','), columns.weight, y);
                doc.text(String(block.hours), columns.hours, y);
                doc.text(String(block.minutes), columns.minutes, y);
            } else {
                const individualPrice = totalWeight > 0
                    ? totalPrice * (block.weight / totalWeight)
                    : 0;
                doc.text(this.formatCurrency(individualPrice), columns.price, y);
            }
            y += 9;
        });

        const totalHours = Math.floor(totalMinutes / 60);
        const remainingMinutes = totalMinutes % 60;
        y += 4;
        doc.setFillColor(...orange);
        doc.roundedRect(21, y - 7, 168, 14, 2, 2, 'F');
        y += 2;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('TOTAIS', 25, y);
        if (complete) {
            doc.text(`${totalWeight.toFixed(2).replace('.', ',')} g`, columns.weight, y);
            doc.text(`${totalHours}h`, columns.hours, y);
            doc.text(`${remainingMinutes} min`, columns.minutes, y);
        } else {
            doc.text(this.formatCurrency(totalPrice), columns.price, y);
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
        this.value = parseLocalizedNumber(this.value).toFixed(2);
    }
});

document.getElementById('energyCost').addEventListener('blur', function() {
    if (this.value) {
        this.value = parseLocalizedNumber(this.value).toFixed(2);
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
    const peso = parseLocalizedNumber(document.getElementById('filamentWeight').value);
    const custoFilamento = parseLocalizedNumber(document.getElementById('filamentCost').value);
    const tipoFilamento = document.getElementById('filamentType').value;
    const horas = parseLocalizedNumber(document.getElementById('printHours').value);
    const minutos = parseLocalizedNumber(document.getElementById('printMinutes').value);
    const potencia = parseLocalizedNumber(document.getElementById('printerPower').value);
    const energia = parseLocalizedNumber(document.getElementById('energyCost').value);
    const maoObra = parseLocalizedNumber(document.getElementById('laborCost').value);
    const manutencao = parseLocalizedNumber(document.getElementById('maintenanceCost').value);
    const adicional = parseLocalizedNumber(document.getElementById('additionalHourlyCost').value);
    const lucroPerc = parseLocalizedNumber(document.getElementById('profitMargin').value);

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
        `Custo = ${potenciaKw} × ${tempoHoras} × ${energia.toFixed(2)} = ${(potenciaKw * tempoHoras).toFixed(2)} × ${energia.toFixed(2)} = R$ ${parseLocalizedNumber(energiaTotal).toFixed(2)}`
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
    const finalValue = parseLocalizedNumber(final);
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
