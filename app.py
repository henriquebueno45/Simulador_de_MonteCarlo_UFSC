from flask import Flask, render_template, request, jsonify
import numpy as np

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
        
        actual_mean = np.mean(values)
        actual_std_dev = np.std(values)
        
        return jsonify({
            'actual_mean': actual_mean,
            'actual_std_dev': actual_std_dev,
            'values': values.tolist(),
            'mean': mean,
            'std_dev': std_dev,
            'num_values': num_values  # Adicionando o número de valores
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