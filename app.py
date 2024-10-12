from flask import Flask, render_template, request, jsonify, send_file
import numpy as np
import matplotlib.pyplot as plt
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from io import BytesIO
import logging
import json
import os
from datetime import datetime
from scipy import stats

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
    if function.startswith('='):
        function = function[1:]
    
    numpy_variables = {}
    for var_id, var_values in variables.items():
        if isinstance(var_values, (int, float)):
            numpy_variables[var_id] = np.full(NUM_SIMULATIONS, var_values)
        else:
            numpy_variables[var_id] = np.array(var_values)
    
    for var_id in numpy_variables.keys():
        function = function.replace(var_id, f"numpy_variables['{var_id}']")
    
    local_dict = {'numpy_variables': numpy_variables, 'np': np}
    
    try:
        result = eval(function, {"__builtins__": None}, local_dict)
        if isinstance(result, (int, float)):
            return np.full(NUM_SIMULATIONS, result)
        elif isinstance(result, np.ndarray):
            if result.ndim == 0:  # scalar numpy value
                return np.full(NUM_SIMULATIONS, result.item())
            elif result.shape[0] != NUM_SIMULATIONS:
                return np.tile(result, NUM_SIMULATIONS // result.shape[0] + 1)[:NUM_SIMULATIONS]
            return result
        else:
            raise ValueError(f"Resultado inesperado: {type(result)}")
    except Exception as e:
        app.logger.error(f"Erro ao avaliar função: {str(e)}")
        raise ValueError(f"Erro ao avaliar função: {str(e)}")

def create_histogram(values, title):
    plt.figure(figsize=(8, 6))
    plt.hist(values, bins=50, edgecolor='black')
    plt.title(title)
    plt.xlabel('Valores')
    plt.ylabel('Frequência')
    img_buffer = BytesIO()
    plt.savefig(img_buffer, format='png')
    img_buffer.seek(0)
    plt.close()
    return img_buffer

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

def create_pdf_report(simulation_data, filename):
    pdf_buffer = BytesIO()
    c = canvas.Canvas(pdf_buffer, pagesize=letter)
    width, height = letter

    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, height - 50, "Relatório de Simulação")

    y_position = height - 100

    app.logger.info(f"Iniciando criação do PDF para {filename}")

    for var_id, values in simulation_data['variables'].items():
        try:
            app.logger.info(f"Processando variável {var_id}")
            stats = calculate_statistics(values)
            
            c.setFont("Helvetica-Bold", 14)
            c.drawString(50, y_position, f"Variável: {var_id}")
            y_position -= 20

            c.setFont("Helvetica", 10)
            for stat, value in stats.items():
                c.drawString(50, y_position, f"{stat}: {value:.4f}")
                y_position -= 15

            app.logger.info(f"Criando histograma para {var_id}")
            img_buffer = create_histogram(values, f"Histograma - {var_id}")
            img = ImageReader(img_buffer)
            c.drawImage(img, 50, y_position - 300, width=400, height=300)
            
            y_position -= 320

            if y_position < 100:
                c.showPage()
                y_position = height - 50
            
            app.logger.info(f"Variável {var_id} processada com sucesso")
        except Exception as e:
            app.logger.error(f"Erro ao processar variável {var_id}: {str(e)}")

    result_values = simulation_data['result_values']
    try:
        app.logger.info("Processando resultado final")
        stats = calculate_statistics(result_values)

        c.setFont("Helvetica-Bold", 14)
        c.drawString(50, y_position, "Resultado Final")
        y_position -= 20

        c.setFont("Helvetica", 10)
        for stat, value in stats.items():
            c.drawString(50, y_position, f"{stat}: {value:.4f}")
            y_position -= 15

        app.logger.info("Criando histograma para o resultado final")
        img_buffer = create_histogram(result_values, "Histograma - Resultado Final")
        img = ImageReader(img_buffer)
        c.drawImage(img, 50, y_position - 300, width=400, height=300)
        
        app.logger.info("Resultado final processado com sucesso")
    except Exception as e:
        app.logger.error(f"Erro ao processar resultado final: {str(e)}")

    c.save()
    with open(os.path.join('simulations', f"{filename}.pdf"), 'wb') as f:
        pdf_buffer.seek(0)
        f.write(pdf_buffer.getvalue())
    app.logger.info(f"PDF salvo em {filename}.pdf")
    return pdf_buffer

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
                if distribution_type == 'fixed':
                    params['fixed_value'] = params.get('fixed_value', params.get('value', 0))
                elif distribution_type == 'triangular':
                    params['mid_point'] = params.get('mid_point', params.get('valor_medio', 0))
                generated_values[var['id']] = generate_distribution(distribution_type, params).tolist()
            
            app.logger.debug(f"Valores gerados: {generated_values}")
            app.logger.debug(f"Função a ser avaliada: {function}")
            
            result_values = evaluate_function(function, generated_values)
            
            app.logger.debug(f"Resultado da avaliação: {result_values}")
            
            simulation_data = {
                'variables': generated_values,
                'function': function,
                'result_values': result_values.tolist()
            }
            
            filename = f"simulation_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            # Salvar dados em JSON
            with open(os.path.join('simulations', f"{filename}.json"), 'w') as f:
                json.dump(simulation_data, f)
            
            # Criar PDF
            try:
                pdf_buffer = create_pdf_report(simulation_data, filename)
                with open(os.path.join('simulations', f"{filename}.pdf"), 'wb') as f:
                    f.write(pdf_buffer.getvalue())
            except Exception as e:
                app.logger.error(f"Erro ao criar PDF: {str(e)}")
            
            response = {
                'num_variables': len(variables),
                'values': result_values.tolist(),
                'mean': float(np.mean(result_values)),
                'std_dev': float(np.std(result_values)),
                'simulation_file': f"{filename}.pdf"
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
        
        return jsonify({'percentage': float(percentage)})
    except Exception as e:
        app.logger.error(f"Erro ao calcular porcentagem: {str(e)}")
        return jsonify({'error': str(e)}), 400

@app.route('/download/<filename>', methods=['GET'])
def download_file(filename):
    try:
        file_path = os.path.join('simulations', filename)
        if not os.path.exists(file_path):
            app.logger.error(f"Arquivo não encontrado: {file_path}")
            return jsonify({'error': 'Arquivo não encontrado'}), 404
        return send_file(file_path, as_attachment=True)
    except Exception as e:
        app.logger.error(f"Erro ao baixar arquivo: {str(e)}")
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    os.makedirs('simulations', exist_ok=True)
    app.run(debug=True)