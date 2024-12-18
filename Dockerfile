# syntax=docker/dockerfile:1

FROM python:3.10.15-slim

WORKDIR /simulador-montecarlo

COPY requirements.txt requirements.txt
RUN pip3 install -r requirements.txt

COPY . .

CMD [ "python3", "-m", "flask", "run", "--host=0.0.0.0", "--port=3000"]
