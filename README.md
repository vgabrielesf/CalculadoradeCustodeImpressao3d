# Calculadora de Custo de Impressão 3D

Aplicação web simples (HTML/CSS/JS) para calcular o custo total de uma impressão 3D, considerando material, tempo de impressão, energia, custos operacionais e margem de lucro.

## Funcionalidades

- Cálculo de **custo do material** (peso do filamento em gramas + custo do filamento em R$/kg)
- Cálculo de **custo de energia** (potência da impressora em W + custo da energia em R$/kWh + tempo de impressão)
- **Custos operacionais**
  - Mão de obra (R$/h)
  - Manutenção/desgaste (R$/h)
  - Custo adicional por hora (R$/h)
  - Margem de lucro (%)
- Exibição do **preço final**
- Histórico de cálculos
- Botões para:
  - Salvar resultado
  - Gerar PDF
  - Gerar Nota Fiscal

## Como usar

1. Abra o arquivo `index.html` no navegador (duplo clique ou usando um servidor local).
2. Preencha os campos:
   - **Peso do filamento usado (g)**
   - **Custo do filamento (R$/kg)**
   - **Tempo de impressão** (horas e minutos)
   - (Opcional) ajuste potência, energia e demais custos
3. Clique em **Calcular Custo**.

## Estrutura do projeto

- `index.html` — interface da calculadora
- `style.css` — estilos
- `script.js` — lógica de cálculo, histórico e geração de documentos

## Tecnologias

- HTML5
- CSS3
- JavaScript
- [Google Material Symbols](https://fonts.google.com/icons)
- [jsPDF](https://github.com/parallax/jsPDF) (via CDN)

## Executar localmente (opcional)

Você pode usar um servidor simples para evitar limitações do navegador com arquivos locais.

### Usando Python

```bash
# Python 3
python -m http.server 8000
```

Depois acesse `http://localhost:8000`.

## Licença

Defina a licença que você deseja para o projeto (por exemplo, MIT).

---

Desenvolvido por **Vitória Gabriele**.