FROM node:18-slim

# Installa dipendenze necessarie
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    git \
    libsndfile1 \
    ffmpeg \
    locales \
    && rm -rf /var/lib/apt/lists/*

# Imposta l'ambiente per supportare UTF-8
RUN localedef -i en_US -c -f UTF-8 -A /usr/share/locale/locale.alias en_US.UTF-8
ENV LANG en_US.utf8

# Crea directory di lavoro
WORKDIR /app

# Clona e installa piper (TTS open source)
RUN git clone https://github.com/rhasspy/piper /app/piper \
    && cd /app/piper \
    && pip3 install -e .

# Scarica alcuni modelli di voce popolari in diverse lingue
RUN mkdir -p /app/piper/voices \
    && cd /app/piper/voices \
    && wget -O en-us-libritts-high.tar.gz https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/libritts/high/en-us-libritts-high.tar.gz \
    && tar -xvf en-us-libritts-high.tar.gz \
    && wget -O it-riccardo-x-low.tar.gz https://huggingface.co/rhasspy/piper-voices/resolve/main/it/it_IT/riccardo/x_low/it-riccardo-x-low.tar.gz \
    && tar -xvf it-riccardo-x-low.tar.gz \
    && wget -O fr-siwis-medium.tar.gz https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR/siwis/medium/fr-siwis-medium.tar.gz \
    && tar -xvf fr-siwis-medium.tar.gz \
    && wget -O de-thorsten-medium.tar.gz https://huggingface.co/rhasspy/piper-voices/resolve/main/de/de_DE/thorsten/medium/de-thorsten-medium.tar.gz \
    && tar -xvf de-thorsten-medium.tar.gz \
    && wget -O es-carlfm-x-low.tar.gz https://huggingface.co/rhasspy/piper-voices/resolve/main/es/es_ES/carlfm/x_low/es-carlfm-x-low.tar.gz \
    && tar -xvf es-carlfm-x-low.tar.gz \
    && rm *.tar.gz

# Installa moduli Node.js per il frontend e backend
COPY package.json /app/
RUN npm install

# Installa strumenti per la gestione degli ebook
RUN pip3 install ebooklib beautifulsoup4 html2text

# Copia i file dell'applicazione
COPY . /app/

# Esponi la porta dell'applicazione
EXPOSE 3000

# Comando di avvio
CMD ["npm", "start"]
