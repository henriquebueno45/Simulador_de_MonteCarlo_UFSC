#TODO Fazer interface dinâmica para colocar os valores para usar a simulação
'''
    Estrutura: Nome da variável | Valor fixo | Valor mínimo | Valor máximo | Tipo de distribuição
    -> Deve ser dinâmico, deve ser possível adicionar linhas na tabela para novos valores
'''

from flask import Flask, render_template, request, jsonify
import numpy as np
import matplotlib.pyplot as plt
import io
import base64

app = Flask(__name__)

def generate_normal_distribution(mean, num_values, std_dev):
    values = np.random.normal(mean, std_dev, num_values)
    return values

def calculate_percentage_in_range(values, min_val, max_val):
    if min_val == "-inf":
        min_val = float('-inf')
    else:
        min_val = float(min_val)
    
    if max_val == "inf":
        max_val = float('inf')
    else:
        max_val = float(max_val)
    
    count = np.sum((values >= min_val) & (values <= max_val))
    percentage = (count / len(values)) * 100
    return percentage

@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        mean = float(request.form['mean'])
        num_values = int(request.form['num_values'])
        std_dev = float(request.form['std_dev'])
        
        values = generate_normal_distribution(mean, num_values, std_dev)
        
        # Criar o histograma
        plt.figure(figsize=(10, 6))
        plt.hist(values, bins=30, edgecolor='black', density=True)
        plt.title(f'Distribuição Normal (μ={mean}, σ={std_dev}, n={num_values})')
        plt.xlabel('Valores')
        plt.ylabel('Densidade')
        
        # Adicionar a curva de densidade normal teórica
        x = np.linspace(min(values), max(values), 100)
        plt.plot(x, 1/(std_dev * np.sqrt(2 * np.pi)) * np.exp( - (x - mean)**2 / (2 * std_dev**2) ), 
                 linewidth=2, color='r')
        
        # Converter o gráfico para uma imagem base64
        img = io.BytesIO()
        plt.savefig(img, format='png')
        img.seek(0)
        plot_url = base64.b64encode(img.getvalue()).decode()
        
        # Calcular estatísticas
        actual_mean = np.mean(values)
        actual_std_dev = np.std(values)
        
        return jsonify({
            'plot_url': plot_url,
            'actual_mean': actual_mean,
            'actual_std_dev': actual_std_dev,
            'values': values.tolist()  # Enviando os valores gerados para o cliente
        })
    
    return render_template('index.html')

@app.route('/calculate_percentage', methods=['POST'])
def calculate_percentage():
    data = request.json
    values = np.array(data['values'])
    min_val = data['min_val']
    max_val = data['max_val']
    
    percentage = calculate_percentage_in_range(values, min_val, max_val)
    
    return jsonify({'percentage': percentage})

if __name__ == '__main__':
    app.run(debug=True)