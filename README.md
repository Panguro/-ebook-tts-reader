# Lettore Ebook TTS

Un'applicazione Docker con interfaccia moderna che permette di leggere gli ebook utilizzando la tecnologia Text-to-Speech, con possibilità di selezionare diverse voci e lingue per la lettura.

## Caratteristiche

- 🎯 Interfaccia web moderna e responsive
- 📚 Supporto per diversi formati di ebook (EPUB, PDF, TXT, MOBI)
- 🔊 Lettura TTS con voci in più lingue (Italiano, Inglese, Francese, Tedesco, Spagnolo)
- ⚙️ Controllo della velocità di lettura
- 📋 Visualizzazione del testo durante la lettura
- 🔄 Caricamento dinamico dei nuovi ebook
- 🚀 Facile da distribuire tramite Docker

## Tecnologie utilizzate

- **Backend**: Node.js con Express
- **Frontend**: HTML5, CSS3, JavaScript moderno
- **TTS**: [Piper](https://github.com/rhasspy/piper) (motore TTS open source di alta qualità)
- **Containerizzazione**: Docker

## Requisiti di sistema

- Docker e Docker Compose
- Almeno 2GB di RAM (consigliati 4GB)
- Circa 1GB di spazio su disco per l'applicazione e i modelli vocali
- Spazio aggiuntivo per gli ebook

## Installazione

1. Clona questo repository:
   ```bash
   git clone https://github.com/yourusername/ebook-tts-reader.git
   cd ebook-tts-reader
   ```

2. Crea le directory necessarie:
   ```bash
   mkdir -p ebooks temp public/audio
   ```

3. Avvia il container con Docker Compose:
   ```bash
   docker-compose up -d
   ```

4. L'applicazione sarà disponibile all'indirizzo: `http://localhost:3000`

## Utilizzo

1. **Caricamento degli ebook**:
   - Copia i tuoi file ebook (EPUB, PDF, TXT, MOBI) nella directory `ebooks`
   - L'applicazione rileverà automaticamente i nuovi file

2. **Lettura di un ebook**:
   - Seleziona un ebook dalla libreria visualizzata nel pannello laterale
   - Il testo dell'ebook verrà estratto e visualizzato nell'area principale

3. **Impostazioni TTS**:
   - Seleziona la voce desiderata dal menu a tendina (diverse lingue disponibili)
   - Regola la velocità di lettura utilizzando il cursore

4. **Controlli di riproduzione**:
   - Utilizza i pulsanti di controllo per riprodurre/mettere in pausa la lettura
   - Naviga tra le sezioni utilizzando i pulsanti avanti/indietro
   - Segui il testo durante la lettura con l'evidenziazione automatica

## Lingue supportate

- 🇮🇹 Italiano
- 🇺🇸 Inglese (US)
- 🇫🇷 Francese
- 🇩🇪 Tedesco
- 🇪🇸 Spagnolo

## Personalizzazione

### Aggiungere nuove voci

È possibile aggiungere ulteriori voci Piper modificando il Dockerfile:

1. Aggiungi nuovi modelli vocali nel blocco di download del Dockerfile
2. Aggiorna l'array `VOICE_MODELS` in `server.js`

### Modifica dell'interfaccia

L'interfaccia utente può essere personalizzata modificando i file nella directory `public`:
- `public/css/style.css` per lo stile
- `public/js/app.js` per la logica dell'applicazione
- `public/index.html` per la struttura HTML

## Risoluzione dei problemi

### L'applicazione non si avvia

- Verifica che le porte 3000 non sia già in uso
- Controlla i log del container: `docker-compose logs`

### Errori di estrazione del testo

- Verifica che il formato dell'ebook sia supportato
- Alcuni file PDF protetti o basati su scansioni potrebbero non essere compatibili

### Problemi audio

- Verifica che il browser supporti il formato audio WAV
- Controlla che i permessi delle directory `temp` e `public/audio` siano corretti

## Limitazioni note

- La qualità dell'estrazione del testo può variare in base al formato e alla complessità dell'ebook
- I file PDF basati su scansioni richiederebbero OCR (non implementato)
- La generazione dell'audio potrebbe richiedere tempo per sezioni di testo molto lunghe

## Contribuire

I contributi sono benvenuti! Sentiti libero di aprire issue o pull request.

## Licenza

Questo progetto è rilasciato sotto licenza MIT.
