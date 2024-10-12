from flask import Flask, render_template, request, jsonify
import numpy as np
import logging

app = Flask(__name__)
logging.basicConfig(level=logging.DEBUG)

NUM_SIMULATIONS = 10000

def generate_distribution(distribution_type, params, num_values=NUM_SIMULATIONS):
    if distribution_type == 'fixed':
        return np.full(num_values, params['fixed_value'])
    elif distribution_type == 'normal':
        return np.random.normal(params['mean'], params['std_dev'], num_values)
    elif distribution_type == 'uniform':
        return np.random.uniform(params['min_value'], params['max_value'], num_values)
    elif distribution_type == 'triangular':
        return np.random.triangular(params['min_value'], params['mid_point'], params['max_value'], num_values)
    else:
        raise ValueError(f"Tipo de distribuição não suportado: {distribution_type}")

def evaluate_function(function, variables):
    # Remover o '=' inicial, se presente
    if function.startswith('='):
        function = function[1:]
    
    # Substituir os IDs das variáveis pelos valores gerados
    for var_id, var_values in variables.items():
        function = function.replace(var_id, f"variables['{var_id}']")
    
    # Criar um dicionário local com as variáveis e numpy
    local_dict = {'variables': variables, 'np': np}
    
    # Avaliar a função
    return eval(function, {"__builtins__": None}, local_dict)

@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        try:
            data = request.json
            app.logger.debug(f"Dados recebidos: {data}")
            variables = data['variables']
            function = data['function']
            
            generated_values = {}
            for var in variables:
                distribution_type = var['distribution_type']
                params = {k: v for k, v in var.items() if k not in ['id', 'name', 'distribution_type']}
                generated_values[var['id']] = generate_distribution(distribution_type, params)
            
            # Avaliar a função para cada conjunto de valores gerados
            result_values = evaluate_function(function, generated_values)
            
            response = {
                'num_variables': len(variables),
                'values': result_values.tolist(),  # Convertendo para lista para serialização JSON
                'mean': float(np.mean(result_values)),
                'std_dev': float(np.std(result_values))
            }
            app.logger.debug(f"Resposta gerada: {response}")
            return jsonify(response)
        except Exception as e:
            app.logger.error(f"Erro ao processar requisição: {str(e)}")
            return jsonify({'error': str(e)}), 400
    
    return render_template('index.html')

@app.route('/calculate_percentage', methods=['POST'])
def calculate_percentage():
    try:
        data = request.json
        values = np.array(data['values'])
        min_val = float(data['min_val']) if data['min_val'] != '-inf' else float('-inf')
        max_val = float(data['max_val']) if data['max_val'] != 'inf' else float('inf')
        
        count = np.sum((values >= min_val) & (values <= max_val))
        percentage = (count / len(values)) * 100
        
        return jsonify({'percentage': percentage})
    except Exception as e:
        app.logger.error(f"Erro ao calcular porcentagem: {str(e)}")
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    app.run(debug=True)