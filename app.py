from flask import Flask, render_template, request, jsonify
import numpy as np
from scipy import stats

app = Flask(__name__)

def generate_distribution(distribution_type, params, num_values):
    if distribution_type == 'fixed':
        return np.full(num_values, params['fixed_value'])
    elif distribution_type == 'normal':
        return np.random.normal(params['mean'], params['std_dev'], num_values)
    elif distribution_type == 'uniform':
        return np.random.uniform(params['min_value'], params['max_value'], num_values)
    elif distribution_type == 'triangular':
        return np.random.triangular(params['min_value'], params['mid_point'], params['max_value'], num_values)
    elif distribution_type == 'binary':
        return np.random.choice([params['binary_value'] * 0, params['binary_value'] * 1], size=num_values)
    else:
        raise ValueError(f"Tipo de distribuição não suportado: {distribution_type}")

def evaluate_function(function, variables, num_simulations):
    if function.startswith('='):
        function = function[1:]
    
    numpy_variables = {}
    for var_id, var_values in variables.items():
        if isinstance(var_values, (int, float)):
            numpy_variables[var_id] = np.full(num_simulations, var_values)
        else:
            numpy_variables[var_id] = np.array(var_values)
    
    for var_id in numpy_variables.keys():
        function = function.replace(var_id, f"numpy_variables['{var_id}']")
    
    local_dict = {'numpy_variables': numpy_variables, 'np': np}
    
    try:
        result = eval(function, {"__builtins__": None}, local_dict)
        if isinstance(result, (int, float)):
            return np.full(num_simulations, result)
        elif isinstance(result, np.ndarray):
            if result.ndim == 0:  # scalar numpy value
                return np.full(num_simulations, result.item())
            elif result.shape[0] != num_simulations:
                return np.tile(result, num_simulations // result.shape[0] + 1)[:num_simulations]
            return result
        else:
            raise ValueError(f"Resultado inesperado: {type(result)}")
    except Exception as e:
        app.logger.error(f"Erro ao avaliar função: {str(e)}")
        raise ValueError(f"Erro ao avaliar função: {str(e)}")

def calculate_statistics(values):
    values = np.array(values).flatten()  # Garantir que temos um array 1D
    return {
        'mean': float(np.mean(values)),
        'std_dev': float(np.std(values)),
        'median': float(np.median(values)),
        'mode': float(stats.mode(values)[0][0]),
        'cv': float((np.std(values) / np.mean(values)) * 100) if np.mean(values) != 0 else 0,
        'min': float(np.min(values)),
        'max': float(np.max(values)),
        'q1': float(np.percentile(values, 25)),
        'q3': float(np.percentile(values, 75)),
    }

@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        try:
            data = request.json
            app.logger.debug(f"Dados recebidos: {data}")
            variables = data['variables']
            function = data['function']
            num_simulations = min(data.get('num_simulations', 50000), 50000)
            
            generated_values = {}
            for var in variables:
                distribution_type = var['distribution_type']
                params = {k: v for k, v in var.items() if k not in ['id', 'name', 'distribution_type']}
                if distribution_type == 'fixed':
                    params['fixed_value'] = params.get('fixed_value', params.get('value', 0))
                elif distribution_type == 'triangular':
                    params['mid_point'] = params.get('mid_point', params.get('valor_medio', 0))
                generated_values[var['id']] = generate_distribution(distribution_type, params, num_simulations)
            
            app.logger.debug(f"Valores gerados: {generated_values}")
            app.logger.debug(f"Função a ser evaliada: {function}")
            
            result_values = evaluate_function(function, generated_values, num_simulations)
            
            app.logger.debug(f"Resultado da avaliação: {result_values}")
            
            # Transformar generated_values em um array de objetos, incluindo o nome
            variables_response = [
                {'id': var['id'], 'name': var['name'], 'values': values.tolist()} 
                for var, (var_id, values) in zip(variables, generated_values.items())
            ]
            
            response = {
                'num_variables': len(variables),
                'variables': variables_response,  # Agora é um array de objetos com nomes
                'values': result_values.tolist(),
                'mean': float(np.mean(result_values)),
                'std_dev': float(np.std(result_values))
            }
            app.logger.debug(f"Resposta gerada: {response}")
            return jsonify(response)
        except Exception as e:
            app.logger.error(f"Erro ao processar requisição: {str(e)}")
            return jsonify({'error': str(e)}), 400
    
    return render_template('index.html')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/calculate_percentage', methods=['POST'])
def calculate_percentage():
    try:
        data = request.json
        values = np.array(data['values'])
        
        # Lidar com valores infinitos
        min_val = data['min_val']
        max_val = data['max_val']
        
        if min_val == '-inf' or min_val == '':
            min_val = np.min(values)
        else:
            min_val = float(min_val)
        
        if max_val == 'inf' or max_val == '+inf' or max_val == '':
            max_val = np.max(values)
        else:
            max_val = float(max_val)
        
        count = np.sum((values >= min_val) & (values <= max_val))
        percentage = (count / len(values)) * 100
        
        return jsonify({
            'percentage': float(percentage),
            'mean': float(np.mean(values)),
            'std_dev': float(np.std(values)),
            'min_val': float(min_val),
            'max_val': float(max_val)
        })
    except Exception as e:
        app.logger.error(f"Erro ao calcular porcentagem: {str(e)}")
        return jsonify({'error': str(e)}), 400

@app.route('/load_model', methods=['POST'])
def load_model():
    try:
        model_data = request.json
        # Aqui você pode manipular e transformar os dados para que sejam enviados de volta ao front-end
        return jsonify(model_data)
    except Exception as e:
        app.logger.error(f"Erro ao carregar o modelo: {str(e)}")
        return jsonify({'error': str(e)}), 400

@app.route('/exemplos', methods=['GET'])
def exemplos():
    # Esta rota pode ser usada no futuro para servir uma página de exemplos separada ou mantê-la como está.
    return render_template('exemplos.html')

if __name__ == '__main__':
    app.run(debug=True)