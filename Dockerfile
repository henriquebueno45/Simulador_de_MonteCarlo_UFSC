# Se estiver usando uma imagem base Alpine
FROM python:3.11-alpine
WORKDIR /simulador-montecarlo
COPY . /simulador-montecarlo/

# Instalar dependências de compilação
RUN apk add --no-cache \
    make \
    gcc \
    g++ \
    musl-dev \
    python3-dev \
    freetype-dev \
    fftw-dev \
    libjpeg-turbo-dev \
    libpng-dev \
    openblas-dev \
    gfortran \
    lapack-dev

# Resto do seu Dockerfile
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
EXPOSE 4000
CMD python ./app.py