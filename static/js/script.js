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
                <input type="number" class="form-control" name="mid_point" placeholder="Ponto médio" step="any" required>
                <input type="number" class="form-control" name="min_value" placeholder="Ponto mínimo" step="any" required>
                <input type="number" class="form-control" name="max_value" placeholder="Ponto máximo" step="any" required>
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
    console.log('Dados enviados para o servidor:', data);

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
            createHistogram(generatedValues, data.mean, data.std_dev);
            document.getElementById('interval-calculator').style.display = 'block';
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
    const minVal = document.getElementById('min_val').value;
    const maxVal = document.getElementById('max_val').value;

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
    .then(response => response.json())
    .then(data => {
        document.getElementById('percentage-result').innerHTML = `
            <p><strong>Porcentagem de valores no intervalo [${minVal}, ${maxVal}]:</strong> ${data.percentage.toFixed(2)}%</p>
        `;
    })
    .catch(error => {
        console.error('Erro ao calcular a porcentagem:', error);
        document.getElementById('percentage-result').innerHTML = '<p>Erro ao calcular a porcentagem. Por favor, tente novamente.</p>';
    });
}

function createHistogram(values, mean, stdDev) {
    const ctx = document.getElementById('plot').getContext('2d');
    
    // Calcular os limites do histograma
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    
    // Determinar o número de bins (use um número fixo ou calcule baseado nos dados)
    const numBins = 50;
    
    // Calcular a largura de cada bin
    const binWidth = (maxValue - minValue) / numBins;
    
    // Criar os bins
    const bins = Array(numBins).fill(0);
    values.forEach(value => {
        const binIndex = Math.min(Math.floor((value - minValue) / binWidth), numBins - 1);
        bins[binIndex]++;
    });
    
    // Normalizar os bins
    const totalCount = values.length;
    const normalizedBins = bins.map(count => count / (totalCount * binWidth));
    
    // Criar os valores do eixo X (centro de cada bin)
    const xValues = Array.from({length: numBins}, (_, i) => minValue + (i + 0.5) * binWidth);
    
    // Calcular a curva normal teórica
    const yValues = xValues.map(x => 
        (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mean) / stdDev, 2))
    );
    
    if (chart) {
        chart.destroy();
    }
    
    chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: xValues.map(x => x.toFixed(2)),
            datasets: [{
                label: 'Histograma',
                data: normalizedBins,
                backgroundColor: 'rgba(0, 123, 255, 0.5)',
                borderColor: 'rgba(0, 123, 255, 1)',
                borderWidth: 1
            }, {
                label: 'Curva Normal Teórica',
                data: yValues,
                type: 'line',
                fill: false,
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 2,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Valores'
                    },
                    ticks: {
                        callback: function(value, index, values) {
                            return Number(this.getLabelForValue(value)).toFixed(2);
                        }
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Densidade de Probabilidade'
                    },
                    beginAtZero: true
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            const index = context[0].dataIndex;
                            const lowerBound = xValues[index] - binWidth / 2;
                            const upperBound = xValues[index] + binWidth / 2;
                            return `Intervalo: [${lowerBound.toFixed(2)}, ${upperBound.toFixed(2)}]`;
                        }
                    }
                },
                title: {
                    display: true,
                    text: `Distribuição (μ=${mean.toFixed(2)}, σ=${stdDev.toFixed(2)})`
                }
            }
        }
    });
}