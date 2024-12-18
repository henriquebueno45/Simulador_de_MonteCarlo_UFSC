let generatedValues = [];
let chart = null;

document.addEventListener('DOMContentLoaded', function() {
    const addRowButton = document.getElementById('add-row');
    const variablesTable = document.getElementById('variables-table').getElementsByTagName('tbody')[0];

    if (addRowButton) {
        addRowButton.addEventListener('click', function() {
            addTableRow();
        });
    } else {
        console.error("Botão 'add-row' não encontrado");
    }

    addTableRow();

    document.getElementById('distribution-form').addEventListener('submit', handleFormSubmit);
    document.getElementById('interval-form').addEventListener('submit', handleIntervalCalculation);

    // Limita o número de simulações a 50.000 e informa ao usuário
    const numSimulationsInput = document.getElementById('num_simulations');
    numSimulationsInput.addEventListener('input', function() {
        const maxSimulations = 50000;
        if (this.value > maxSimulations) {
            this.value = maxSimulations;
            alert(`O número máximo de simulações permitido é ${maxSimulations}.`);
        }
    });

    const saveModelButton = document.getElementById('save-model-button');
    if (saveModelButton) {
        saveModelButton.addEventListener('click', function() {
            saveSimulationModel();
        });
    } else {
        console.error("Botão 'save-model-button' não encontrado");
    }

    const loadModelButton = document.getElementById('load-model');
    if (loadModelButton) {
        loadModelButton.addEventListener('click', function() {
            const fileInput = document.getElementById('model-file');
            const file = fileInput.files[0];

            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    try {
                        const modelData = JSON.parse(event.target.result);
                        loadModelToApplication(modelData);
                    } catch (error) {
                        alert('Erro ao ler o arquivo JSON: ' + error.message);
                    }
                };
                reader.readAsText(file);
            } else {
                alert('Por favor, selecione um arquivo JSON para carregar.');
            }
        });
    }
});

function loadModelToApplication(modelData) {
    // Este é um exemplo de como você pode enviar os dados para o servidor
    fetch('/load_model', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(modelData)
    })
    .then(response => response.json())
    .then(data => {
        // Manipula a resposta do servidor, preenchendo o formulário
        console.log(data);
        // Código para preencher o formulário com os dados recebidos
        populateFormWithData(data);
    })
    .catch(error => {
        console.error('Erro ao carregar o modelo:', error);
    });
}

function populateFormWithData(data) {
    // Preenche o formulário com os dados do modelo
    const variablesTableBody = document.getElementById('variables-table').getElementsByTagName('tbody')[0];
    variablesTableBody.innerHTML = ''; // Limpa as linhas existentes

    data.variables.forEach(variable => {
        const newRow = variablesTableBody.insertRow();
        newRow.innerHTML = `
            <td class="variable-id">${variable.id}</td>
            <td><input type="text" class="form-control" name="variable_name" value="${variable.name}" required></td>
            <td>
                <select class="form-control distribution-type" name="distribution_type" required>
                    <!-- Adicione as opções aqui, selecione a correta com base nos dados -->
                </select>
            </td>
            <td colspan="3" class="parameters">
                <!-- Preencher com os parâmetros da variável -->
            </td>
            <td><button type="button" class="btn btn-danger btn-sm remove-row">Remover</button></td>
        `;

        // Adicione lógica para preencher os parâmetros e selecionar a distribuição
    });
}

function addTableRow() {
    const variablesTable = document.getElementById('variables-table').getElementsByTagName('tbody')[0];
    if (!variablesTable) {
        console.error("Tabela de variáveis não encontrada");
        return;
    }

    const newRow = variablesTable.insertRow();
    const variableId = `V${variablesTable.rows.length}`;
    
    newRow.innerHTML = `
        <td class="variable-id">${variableId}</td>
        <td><input type="text" class="form-control" name="variable_name" required></td>
        <td>
            <select class="form-control distribution-type" name="distribution_type" required>
                <option value="">Selecione...</option>
                <option value="fixed">Valor Fixo</option>
                <option value="normal">Normal</option>
                <option value="uniform">Uniforme</option>
                <option value="triangular">Triangular</option>
                <option value="binary">Binária (sim ou não)</option>
            </select>
        </td>
        <td colspan="3" class="parameters"></td>
        <td><button type="button" class="btn btn-danger btn-sm remove-row">Remover</button></td>
    `;

    newRow.querySelector('.distribution-type').addEventListener('change', function() {
        updateParameterFields(this);
    });

    newRow.querySelector('.remove-row').addEventListener('click', function() {
        variablesTable.removeChild(newRow);
        updateVariableIds();
    });

    updateVariableIds();
}

function updateVariableIds() {
    const rows = document.getElementById('variables-table').getElementsByTagName('tbody')[0].rows;
    for (let i = 0; i < rows.length; i++) {
        const idCell = rows[i].querySelector('.variable-id');
        if (idCell) {
            idCell.textContent = `V${i + 1}`;
        }
    }
}

function updateParameterFields(selectElement) {
    const parametersCell = selectElement.closest('tr').querySelector('.parameters');
    const distributionType = selectElement.value;

    switch(distributionType) {
        case 'fixed':
            parametersCell.innerHTML = `
                <input type="number" class="form-control" name="fixed_value" placeholder="Valor fixo" step="any" required>
                <small class="form-text text-muted">Use ponto (.) como separador decimal.</small>
            `;
            break;
        case 'normal':
            parametersCell.innerHTML = `
                <input type="number" class="form-control" name="mean" placeholder="Média" step="any" required>
                <input type="number" class="form-control" name="std_dev" placeholder="Desvio padrão" step="any" required>
                <small class="form-text text-muted">Use ponto (.) como separador decimal.</small>
            `;
            break;
        case 'uniform':
            parametersCell.innerHTML = `
                <input type="number" class="form-control" name="min_value" placeholder="Valor mínimo" step="any" required>
                <input type="number" class="form-control" name="max_value" placeholder="Valor máximo" step="any" required>
                <small class="form-text text-muted">Use ponto (.) como separador decimal.</small>
            `;
            break;
        case 'triangular':
            parametersCell.innerHTML = `
                <input type="number" class="form-control" name="mid_point" placeholder="Valor médio" step="any" required>
                <input type="number" class="form-control" name="min_value" placeholder="Valor mínimo" step="any" required>
                <input type="number" class="form-control" name="max_value" placeholder="Valor máximo" step="any" required>
                <small class="form-text text-muted">Use ponto (.) como separador decimal.</small>
            `;
            break;
        case 'binary':
            parametersCell.innerHTML = `
                <input type="number" class="form-control" name="binary_value" placeholder="Valor binário" step="any" required>
                <small class="form-text text-muted">Os valores gerados serão o número acima ou 0.</small>
            `;
            break;
        default:
            parametersCell.innerHTML = '';
    }
}

function handleFormSubmit(e) {
    e.preventDefault();

    const progressMessage = document.getElementById('progress-message');
    progressMessage.style.display = 'block';
    progressMessage.textContent = 'Realizando Simulação... 0%';

    const variables = [];
    const functionInput = document.getElementById('function-input').value.replace(/v(\d+)/g, 'V$1');
    let numSimulations = parseInt(document.getElementById('num_simulations').value.replace(',', '.'), 10);

    if (numSimulations > 50000) {
        numSimulations = 50000;
    }

    const rows = document.getElementById('variables-table').getElementsByTagName('tbody')[0].rows;
    for (let i = 0; i < rows.length; i++) {
        const cells = rows[i].cells;
        const variableId = cells[0].textContent;
        const variableName = cells[1].getElementsByTagName('input')[0].value;
        const distributionType = cells[2].getElementsByTagName('select')[0].value;

        console.log(`Tipo de distribuição para ${variableId}: ${distributionType}`);

        const parameters = cells[3].getElementsByTagName('input');

        let variable = {
            id: variableId,
            name: variableName,
            distribution_type: distributionType,
            values: []
        };

        switch(distributionType) {
            case 'fixed':
                variable.fixed_value = parseFloat(parameters[0].value.replace(',', '.'));
                break;
            case 'normal':
                variable.mean = parseFloat(parameters[0].value.replace(',', '.'));
                variable.std_dev = parseFloat(parameters[1].value.replace(',', '.'));
                break;
            case 'uniform':
                variable.min_value = parseFloat(parameters[0].value.replace(',', '.'));
                variable.max_value = parseFloat(parameters[1].value.replace(',', '.'));
                break;
            case 'triangular':
                variable.mid_point = parseFloat(parameters[0].value.replace(',', '.'));
                variable.min_value = parseFloat(parameters[1].value.replace(',', '.'));
                variable.max_value = parseFloat(parameters[2].value.replace(',', '.'));
                break;
            case 'binary':
                variable.binary_value = parseFloat(parameters[0].value.replace(',', '.'));
                break;
        }

        variables.push(variable);
    }

    const data = { variables: variables, function: functionInput, num_simulations: numSimulations };

    console.log('Dados enviados para o servidor:', JSON.stringify(data, null, 2));

    let progress = 0;
    const progressInterval = setInterval(() => {
        if (progress < 100) {
            progress += 1;
            progressMessage.textContent = `Realizando Simulação... ${progress}%`;
        }
    }, 100);

    fetch('/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        clearInterval(progressInterval);
        if (!response.ok) {
            progressMessage.style.display = 'none';
            return response.text().then(text => {
                console.error('Resposta do servidor:', text);
                throw new Error(`HTTP error! status: ${response.status}, body: ${text}`);
            });
        }
        return response.json();
    })
    .then(data => {
        clearInterval(progressInterval);
        progressMessage.style.display = 'none';

        console.log('Dados recebidos do servidor:', data);

        document.getElementById('result').innerHTML = `
            <p><strong>Simulação concluída</strong></p>
            <p>Número total de variáveis: ${data.num_variables}</p>
        `;

        if (Array.isArray(data.values) && data.values.length > 0) {
            generatedValues = data.values;
            createHistogram(generatedValues, data.mean, data.std_dev, 'plot');
            document.getElementById('interval-calculator').style.display = 'block';

            // Cria um contêiner flexível para os botões
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'd-flex justify-content-between align-items-start mt-3';

            // Adiciona o botão de "Gerar Relatório PDF"
            const generatePdfButton = document.createElement('button');
            generatePdfButton.textContent = 'Gerar Relatório PDF';
            generatePdfButton.className = 'btn btn-primary';
            generatePdfButton.addEventListener('click', function() {
                console.log('Gerando PDF com dados:', data);
                generatePDF(data);
            });
            buttonContainer.appendChild(generatePdfButton);

            // Cria um contêiner para o botão e sua mensagem
            const saveModelContainer = document.createElement('div');
            saveModelContainer.style.display = 'flex';
            saveModelContainer.style.flexDirection = 'column'; // Alinha os itens verticalmente
            saveModelContainer.style.alignItems = 'center'; // Centraliza horizontalmente

            // Adiciona o botão de "Salvar Modelo" com ícone de download
            const saveModelButton = document.createElement('button');
            saveModelButton.className = 'btn btn-secondary';
            saveModelButton.innerHTML = '<i class="fas fa-download"></i>';
            saveModelButton.title = 'Salvar Modelo';

            saveModelButton.addEventListener('click', function() {
                saveSimulationModel(data);
            });

            saveModelContainer.appendChild(saveModelButton);

            // Adiciona o contêiner do botão e texto ao contêiner flexível
            buttonContainer.appendChild(saveModelContainer);
            document.getElementById('result').appendChild(buttonContainer);
        } else {
            console.error('Dados inválidos recebidos do servidor');
            document.getElementById('result').innerHTML += '<p>Erro: Dados inválidos recebidos do servidor</p>';
        }
    })
    .catch(error => {
        clearInterval(progressInterval);
        progressMessage.style.display = 'none';
        console.error('Erro ao processar a solicitação:', error);
        document.getElementById('result').innerHTML = `<p>Erro ao processar a solicitação: ${error.message}. Por favor, tente novamente.</p>`;
    });
}

function saveSimulationModel(data) {
    const currentDate = new Date().toLocaleString('pt-BR'); // Horário local da máquina do usuário

    let fileContent = `Simulação Montecarlo - Data ${currentDate}\n\n"variables":\n{`;

    data.variables.forEach(variable => {
        fileContent += `\n  "${variable.id}": {\n`;
        fileContent += `    "name": "${variable.name}",\n`;
        fileContent += `    "distribution": "${variable.distribution_type}",\n`;  
        fileContent += `    "values": ${JSON.stringify(variable.values || [], null, 2)}\n`;
        fileContent += `  },`;
    });

    // Remove a última vírgula e fecha o objeto de variáveis
    fileContent = fileContent.slice(0, -1) + '\n},\n';

    fileContent += `"results": {\n`;
    fileContent += `  "values": ${JSON.stringify(data.values, null, 2)}\n`;
    fileContent += `}\n`;

    const blob = new Blob([fileContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'simulation_model.txt';
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function handleIntervalCalculation(e) {
    e.preventDefault();
    let minVal = document.getElementById('min_val').value.toLowerCase();
    let maxVal = document.getElementById('max_val').value.toLowerCase();

    fetch('/calculate_percentage', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            values: generatedValues,
            min_val: minVal,
            max_val: maxVal
        })
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                throw new Error(`HTTP error! status: ${response.status}, body: ${text}`);
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('Resposta do servidor para cálculo de porcentagem:', data);
        if (data.percentage !== undefined) {
            document.getElementById('percentage-result').innerHTML = `
                <p><strong>Porcentagem de valores no intervalo [${data.min_val.toFixed(4)}, ${data.max_val.toFixed(4)}]:</strong> ${data.percentage.toFixed(2)}%</p>
            `;
            // Atualiza o histograma com o intervalo destacado
            updateHistogram(data.min_val, data.max_val);
        } else {
            throw new Error('A resposta do servidor não inclui a propriedade "percentage"');
        }
    })
    .catch(error => {
        console.error('Erro ao calcular a porcentagem:', error);
        document.getElementById('percentage-result').innerHTML = `<p>Erro ao calcular a porcentagem: ${error.message}</p>`;
    });
}

function createHistogram(values, mean, stdDev, canvasId, minVal = null, maxVal = null) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    const numBins = 50;
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const binWidth = (maxValue - minValue) / numBins;
    
    const bins = Array(numBins).fill(0);
    values.forEach(value => {
        const binIndex = Math.min(Math.floor((value - minValue) / binWidth), numBins - 1);
        bins[binIndex]++;
    });
    
    const labels = Array.from({length: numBins}, (_, i) => (minValue + (i + 0.5) * binWidth).toFixed(2));

    // Calcula a curva normal teórica
    const normalCurve = labels.map(label => {
        const x = parseFloat(label);
        const exponent = -0.5 * Math.pow((x - mean) / stdDev, 2);
        return (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
    });

    // Normaliza a curva para que se ajuste ao histograma
    const maxBin = Math.max(...bins);
    const maxCurve = Math.max(...normalCurve);
    const scaleFactor = maxBin / maxCurve;
    const scaledCurve = normalCurve.map(value => value * scaleFactor);

    if (chart) {
        chart.destroy();
    }
    
    chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Frequência',
                data: bins,
                backgroundColor: labels.map(label => {
                    const value = parseFloat(label);
                    return (minVal !== null && maxVal !== null && value >= minVal && value <= maxVal) 
                        ? 'rgba(255, 0, 0, 0.5)' 
                        : 'rgba(0, 123, 255, 0.5)';
                }),
                borderColor: 'rgba(0, 123, 255, 1)',
                borderWidth: 1
            }, {
                label: 'Curva Normal Teórica',
                data: scaledCurve,
                type: 'line',
                borderColor: 'rgba(255, 99, 132, 1)', // Vermelho mais claro
                borderWidth: 2,
                fill: false,
                pointRadius: 0 // Remove os pontos
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Valores'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Frequência'
                    },
                    beginAtZero: true
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: `Histograma (μ=${mean.toFixed(2)}, σ=${stdDev.toFixed(2)})`
                }
            }
        }
    });
}

function updateHistogram(minVal, maxVal) {
    if (!chart) return;

    const newBackgroundColors = chart.data.labels.map(label => {
        const value = parseFloat(label);
        return (value >= minVal && value <= maxVal) 
            ? 'rgba(255, 0, 0, 0.5)' 
            : 'rgba(0, 123, 255, 0.5)';
    });

    chart.data.datasets[0].backgroundColor = newBackgroundColors;
    chart.update();
}

function createHistogramForPDF(values, mean, stdDev, title) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = 600;  // Reduzido de 800 para 600
        canvas.height = 400; // Reduzido de 600 para 400
        const ctx = canvas.getContext('2d');
        
        const numBins = 50;
        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);
        const binWidth = (maxValue - minValue) / numBins;
        
        const bins = Array(numBins).fill(0);
        values.forEach(value => {
            const binIndex = Math.min(Math.floor((value - minValue) / binWidth), numBins - 1);
            bins[binIndex]++;
        });
        
        const labels = Array.from({length: numBins}, (_, i) => (minValue + (i + 0.5) * binWidth).toFixed(2));
        
        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Frequência',
                    data: bins,
                    backgroundColor: 'rgba(0, 123, 255, 0.5)',
                    borderColor: 'rgba(0, 123, 255, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: false,
                animation: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Valores'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Frequência'
                        },
                        beginAtZero: true
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: `${title} (μ=${mean.toFixed(2)}, σ=${stdDev.toFixed(2)})`,
                        font: {
                            size: 14  // Reduzido de 16 para 14
                        }
                    },
                    legend: {
                        labels: {
                            font: {
                                size: 12  // Reduzido de 14 para 12
                            }
                        }
                    }
                }
            }
        });

        setTimeout(() => {
            resolve(canvas.toDataURL('image/png'));
        }, 500);
    });
}

async function getBase64FromUrl(url) {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

async function generatePDF(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Carregar o logo (substitua pela URL correta do logo)
    const logoImg = await getBase64FromUrl('static/images/brasao_UFSC_horizontal_sombreado.png');

    function addHeader(doc) {
        // Cor do fundo do cabeçalho
        doc.setFillColor(17, 4, 155); // Azul escuro
        doc.rect(0, 0, doc.internal.pageSize.width, 20, 'F'); // Retângulo de fundo para o cabeçalho

        // Adicionar imagem do logo com proporções corretas
        const logoWidth = 60; // Define a largura desejada no PDF
        const logoHeight = logoWidth / 4.47; // Calcula a altura mantendo a proporção original
        const logoY = 10 - (logoHeight / 2); // Ajuste para centralizar verticalmente com o texto
        doc.addImage(logoImg, 'PNG', 5, logoY, logoWidth, logoHeight); // Ajusta a posição para alinhar ao texto

        // Nome da empresa centralizado
        doc.setFontSize(16);
        doc.setTextColor(255, 255, 255); // Cor do texto em branco
        const headerText = 'Relatório de Simulação de MonterCarlo';
        const textWidth = doc.getTextWidth(headerText);
        const pageWidth = doc.internal.pageSize.width;
        const textX = (pageWidth - textWidth + (logoWidth/2)) / 2; // Calcula a posição x para centralizar o texto
        doc.text(headerText, textX, 12);
    }

    // Adicionar o cabeçalho na primeira página
    addHeader(doc);

    let yPosition = 40;
    let itemCounter = 0;

    // Verifique se data.variables é um array
    if (!Array.isArray(data.variables)) {
        console.error("Erro: data.variables não é um array.");
        return;
    }

    for (let variable of data.variables) {
        if (itemCounter >= 2) {
            doc.addPage();
            addHeader(doc); // Adicionar cabeçalho nas páginas adicionais
            yPosition = 40;
            itemCounter = 0;
        }

        const varName = variable.name || `Variável ${variable.id}`;
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0); // Cor do texto preto para o corpo
        doc.text(`Variável: ${varName}`, 20, yPosition);
        yPosition += 10;

        doc.setFontSize(10);
        const stats = calculateCustomStatistics(variable.values, variable.distribution_type);
        for (let stat in stats) {
            doc.text(`${stat}: ${stats[stat]}`, 30, yPosition);
            yPosition += 7;
        }

        const meanOrZero = stats['Valor Médio Real'] || stats['Média Real'] || 0;
        const stdDevOrZero = stats['Desvio Padrão Real'] || 0;
        const chartImg = await createHistogramForPDF(variable.values, meanOrZero, stdDevOrZero, `Histograma - ${varName}`);
        doc.addImage(chartImg, 'PNG', 20, yPosition, 170 * 0.55, 100 * 0.55);

        yPosition += 100 * 0.55 + 15;
        itemCounter++;
    }

    if (itemCounter >= 2) {
        doc.addPage();
        addHeader(doc);
        yPosition = 30;
    }

    doc.setFontSize(14);
    doc.text('Resultado Final', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    const finalStats = calculateStatistics(data.values);
    for (let stat in finalStats) {
        doc.text(`${stat}: ${finalStats[stat].toFixed(4)}`, 30, yPosition);
        yPosition += 7;
    }

    const finalChartImg = await createHistogramForPDF(data.values, finalStats['Média'], finalStats['Desvio Padrão'], 'Histograma - Resultado Final');
    doc.addImage(finalChartImg, 'PNG', 20, yPosition, 170 * 0.55, 100 * 0.55);

    doc.save('relatorio_simulacao.pdf');
}

function calculateCustomStatistics(values, distributionType) {
    if (!Array.isArray(values)) {
        console.error('Valores inválidos recebidos:', values);
        return {
            'Erro': 'Dados inválidos'
        };
    }

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const min = Math.min(...values);
    const max = Math.max(...values);

    switch (distributionType) {
        case 'triangular':
            return {
                'Valor Médio Real': mean.toFixed(4),
                'Valor Mínimo Real': min.toFixed(4),
                'Valor Máximo Real': max.toFixed(4)
            };
        case 'normal':
            return {
                'Valor Médio Real': mean.toFixed(4),
                'Desvio Padrão Real': stdDev.toFixed(4)
            };
        case 'uniform':
            return {
                'Valor Mínimo Real': min.toFixed(4),
                'Valor Máximo Real': max.toFixed(4)
            };
        case 'binary':
            const count0 = values.filter(v => v === 0).length;
            const count1 = values.filter(v => v === 1).length;
            return {
                'Porcentagem de valores 0': ((count0 / values.length) * 100).toFixed(2) + '%',
                'Porcentagem de valores 1': ((count1 / values.length) * 100).toFixed(2) + '%'
            };
        case 'fixed':
            return {
                'Valor Fixo': values[0].toFixed(4)
            };
        default:
            return {
                'Valor Médio': mean.toFixed(4),
                'Valor Mínimo': min.toFixed(4),
                'Valor Máximo': max.toFixed(4)
            };
    }
}



function createHistogramForPDF(values, mean, stdDev, title) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = 600;  // Reduzido de 800 para 600
        canvas.height = 400; // Reduzido de 600 para 400
        const ctx = canvas.getContext('2d');
        
        const numBins = 50;
        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);
        const binWidth = (maxValue - minValue) / numBins;
        
        const bins = Array(numBins).fill(0);
        values.forEach(value => {
            const binIndex = Math.min(Math.floor((value - minValue) / binWidth), numBins - 1);
            bins[binIndex]++;
        });
        
        const labels = Array.from({length: numBins}, (_, i) => (minValue + (i + 0.5) * binWidth).toFixed(2));
        
        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Frequência',
                    data: bins,
                    backgroundColor: 'rgba(0, 123, 255, 0.5)',
                    borderColor: 'rgba(0, 123, 255, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: false,
                animation: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Valores'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Frequência'
                        },
                        beginAtZero: true
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: `${title} (μ=${mean.toFixed(2)}, σ=${stdDev.toFixed(2)})`
                    }
                }
            }
        });

        // Esperar um momento para garantir que o gráfico seja renderizado
        setTimeout(() => {
            resolve(canvas.toDataURL('image/png'));
        }, 500);
    });
}

function calculateStatistics(values) {
    const mean = values.reduce((a, b) => a + b) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    return {
        'Média': mean,
        'Desvio Padrão': stdDev,
        'Mínimo': Math.min(...values),
        'Máximo': Math.max(...values)
    };
}