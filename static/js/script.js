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

    // Adicionar a primeira linha por padrão
    addTableRow();

    document.getElementById('distribution-form').addEventListener('submit', handleFormSubmit);
    document.getElementById('interval-form').addEventListener('submit', handleIntervalCalculation);
});

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
        <td>
            <select class="form-control distribution-type" name="distribution_type" required>
                <option value="">Selecione...</option>
                <option value="fixed">Valor Fixo</option>
                <option value="normal">Normal</option>
                <option value="uniform">Uniforme</option>
                <option value="triangular">Triangular</option>
            </select>
        </td>
        <td><input type="text" class="form-control" name="variable_name" required></td>
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
            `;
            break;
        case 'normal':
            parametersCell.innerHTML = `
                <input type="number" class="form-control" name="mean" placeholder="Média" step="any" required>
                <input type="number" class="form-control" name="std_dev" placeholder="Desvio padrão" step="any" required>
            `;
            break;
        case 'uniform':
            parametersCell.innerHTML = `
                <input type="number" class="form-control" name="min_value" placeholder="Valor mínimo" step="any" required>
                <input type="number" class="form-control" name="max_value" placeholder="Valor máximo" step="any" required>
            `;
            break;
        case 'triangular':
            parametersCell.innerHTML = `
                <input type="number" class="form-control" name="mid_point" placeholder="Valor médio" step="any" required>
                <input type="number" class="form-control" name="min_value" placeholder="Valor mínimo" step="any" required>
                <input type="number" class="form-control" name="max_value" placeholder="Valor máximo" step="any" required>
            `;
            break;
        default:
            parametersCell.innerHTML = '';
    }
}

function handleFormSubmit(e) {
    e.preventDefault();
    const variables = [];
    const functionInput = document.getElementById('function-input').value;

    const rows = document.getElementById('variables-table').getElementsByTagName('tbody')[0].rows;
    for (let i = 0; i < rows.length; i++) {
        const cells = rows[i].cells;
        const variableId = cells[0].textContent;
        const distributionType = cells[1].getElementsByTagName('select')[0].value;
        const variableName = cells[2].getElementsByTagName('input')[0].value;
        const parameters = cells[3].getElementsByTagName('input');

        let variable = {
            id: variableId,
            name: variableName,
            distribution_type: distributionType
        };

        switch(distributionType) {
            case 'fixed':
                variable.fixed_value = parseFloat(parameters[0].value);
                break;
            case 'normal':
                variable.mean = parseFloat(parameters[0].value);
                variable.std_dev = parseFloat(parameters[1].value);
                break;
            case 'uniform':
                variable.min_value = parseFloat(parameters[0].value);
                variable.max_value = parseFloat(parameters[1].value);
                break;
            case 'triangular':
                variable.mid_point = parseFloat(parameters[0].value);
                variable.min_value = parseFloat(parameters[1].value);
                variable.max_value = parseFloat(parameters[2].value);
                break;
        }

        variables.push(variable);
    }

    const data = { variables: variables, function: functionInput };
    console.log('Dados enviados para o servidor:', JSON.stringify(data, null, 2));

    fetch('/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                console.error('Resposta do servidor:', text);
                throw new Error(`HTTP error! status: ${response.status}, body: ${text}`);
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('Dados recebidos do servidor:', data);
        
        document.getElementById('result').innerHTML = `
            <p><strong>Simulação concluída</strong></p>
            <p>Número total de variáveis: ${data.num_variables}</p>
        `;
        
        if (Array.isArray(data.values) && data.values.length > 0) {
            generatedValues = data.values;
            createHistogram(generatedValues, data.mean, data.std_dev, 'plot');
            document.getElementById('interval-calculator').style.display = 'block';
            
            // Criar botão para gerar PDF
            const generatePdfButton = document.createElement('button');
            generatePdfButton.textContent = 'Gerar Relatório PDF';
            generatePdfButton.className = 'btn btn-primary mt-3';
            generatePdfButton.addEventListener('click', function() {
                generatePDF(data);
            });
            document.getElementById('result').appendChild(generatePdfButton);
        } else {
            console.error('Dados inválidos recebidos do servidor');
            document.getElementById('result').innerHTML += '<p>Erro: Dados inválidos recebidos do servidor</p>';
        }
    })
    .catch(error => {
        console.error('Erro ao processar a solicitação:', error);
        document.getElementById('result').innerHTML = `<p>Erro ao processar a solicitação: ${error.message}. Por favor, tente novamente.</p>`;
    });
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
            // Recria o histograma com o intervalo destacado
            createHistogram(generatedValues, data.mean, data.std_dev, 'plot', data.min_val, data.max_val);
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

function calculateCustomStatistics(values, distributionType) {
    if (!Array.isArray(values)) {
        console.error('Valores inválidos recebidos:', values);
        return {
            'Erro': 'Dados inválidos'
        };
    }

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    switch (distributionType) {
        case 'triangular':
        case 'uniform':
            return {
                'Valor Médio Real': mean.toFixed(4),
                'Valor Mínimo Real': min.toFixed(4),
                'Valor Máximo Real': max.toFixed(4)
            };
        case 'normal':
            return {
                'Valor Médio Real': mean.toFixed(4),
                'Desvio Padrão Real': stdDev.toFixed(4),
                'Valor Mínimo': min.toFixed(4),
                'Valor Máximo': max.toFixed(4)
            };
        case 'fixed':
            return {
                'Valor Fixo': values[0].toFixed(4)
            };
        default:
            return {
                'Valor Médio': mean.toFixed(4),
                'Desvio Padrão': stdDev.toFixed(4),
                'Valor Mínimo': min.toFixed(4),
                'Valor Máximo': max.toFixed(4)
            };
    }
}

async function generatePDF(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Relatório de Simulação', 105, 15, null, null, 'center');
    
    let yPosition = 30;
    
    // Informações das variáveis
    for (let varId in data.variables) {
        const varName = data.variables[varId].name || varId; // Usa o nome da variável se disponível, senão usa o ID
        
        // Verifica se há espaço suficiente na página atual, senão adiciona uma nova página
        if (yPosition > 230) {
            doc.addPage();
            yPosition = 20;
        }
        
        doc.setFontSize(14);
        doc.text(`Variável: ${varName}`, 20, yPosition);
        yPosition += 10;
        
        doc.setFontSize(10);
        const stats = calculateStatistics(data.variables[varId]);
        for (let stat in stats) {
            doc.text(`${stat}: ${stats[stat].toFixed(4)}`, 30, yPosition);
            yPosition += 7;
        }
        
        // Criar e adicionar o gráfico
        const chartImg = await createHistogramForPDF(data.variables[varId], stats['Média'], stats['Desvio Padrão'], `Histograma - ${varName}`);
        doc.addImage(chartImg, 'PNG', 20, yPosition, 170 * 0.55, 100 * 0.55); // Reduzido em 45%
        
        yPosition += 100 * 0.55 + 15; // Altura do gráfico reduzida + espaço extra
    }
    
    // Resultado final
    if (yPosition > 230) {
        doc.addPage();
        yPosition = 20;
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
    
    // Criar e adicionar o gráfico do resultado final
    const finalChartImg = await createHistogramForPDF(data.values, finalStats['Média'], finalStats['Desvio Padrão'], 'Histograma - Resultado Final');
    doc.addImage(finalChartImg, 'PNG', 20, yPosition, 170 * 0.55, 100 * 0.55); // Reduzido em 45%
    
    // Salvar o PDF
    doc.save('relatorio_simulacao.pdf');
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

// Nova função createHistogramForPDF (adicione após generatePDF)
function createHistogramForPDF(values, mean, stdDev, title) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = 600;
        canvas.height = 400;
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