let generatedValues = [];
let chart = null;

document.getElementById('normal-distribution-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    fetch('/', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        console.log('Dados recebidos do servidor:', data);
        
        document.getElementById('result').innerHTML = `
            <p><strong>Média real:</strong> ${data.actual_mean.toFixed(4)}</p>
            <p><strong>Desvio padrão real:</strong> ${data.actual_std_dev.toFixed(4)}</p>
            <p><strong>Número de valores:</strong> ${data.num_values}</p>
        `;
        
        generatedValues = data.values;
        createHistogram(generatedValues, data.mean, data.std_dev);
        
        document.getElementById('interval-calculator').style.display = 'block';
    })
    .catch(error => {
        console.error('Erro ao processar a solicitação:', error);
        document.getElementById('result').innerHTML = '<p>Erro ao processar a solicitação. Por favor, tente novamente.</p>';
    });
});

document.getElementById('interval-form').addEventListener('submit', function(e) {
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
});

function createHistogram(values, mean, stdDev) {
    const ctx = document.getElementById('plot').getContext('2d');
    
    // Calcular bins para o histograma
    const numBins = Math.ceil(Math.sqrt(values.length));
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const binWidth = (maxValue - minValue) / numBins;
    
    const bins = Array(numBins).fill(0);
    values.forEach(value => {
        const binIndex = Math.min(Math.floor((value - minValue) / binWidth), numBins - 1);
        bins[binIndex]++;
    });
    
    // Normalizar os bins para densidade de probabilidade
    const totalCount = values.length;
    const normalizedBins = bins.map(count => count / (totalCount * binWidth));
    
    // Gerar pontos para a curva normal teórica
    const xValues = [];
    const yValues = [];
    for (let i = 0; i < numBins; i++) {
        const x = minValue + (i + 0.5) * binWidth;
        xValues.push(x);
        const y = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mean) / stdDev, 2));
        yValues.push(y);
    }
    
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
                title: {
                    display: true,
                    text: `Distribuição Normal (μ=${mean.toFixed(2)}, σ=${stdDev.toFixed(2)})`
                }
            }
        }
    });
}