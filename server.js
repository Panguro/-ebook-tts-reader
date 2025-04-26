const express = require('express');
const path = require('path');
const fs = require('fs');
const { spawn, exec } = require('child_process');
const multer = require('multer');
const cors = require('cors');
const socketIo = require('socket.io');
const chokidar = require('chokidar');
const http = require('http');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Configurazione middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Directory per ebook
const EBOOKS_DIR = process.env.EBOOKS_DIR || '/ebooks';
const AUDIO_DIR = path.join(__dirname, 'public', 'audio');

// Assicurati che le directory esistano
if (!fs.existsSync(EBOOKS_DIR)) {
  fs.mkdirSync(EBOOKS_DIR, { recursive: true });
}
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

// Disponibilità modelli vocali
const VOICE_MODELS = [
  { id: 'en-us-libritts-high', name: 'English (US) - LibriTTS', language: 'en-US' },
  { id: 'it-riccardo-x-low', name: 'Italiano - Riccardo', language: 'it-IT' },
  { id: 'fr-siwis-medium', name: 'Français - SIWIS', language: 'fr-FR' },
  { id: 'de-thorsten-medium', name: 'Deutsch - Thorsten', language: 'de-DE' },
  { id: 'es-carlfm-x-low', name: 'Español - CarlfM', language: 'es-ES' }
];

// API per ottenere la lista di ebook
app.get('/api/ebooks', (req, res) => {
  fs.readdir(EBOOKS_DIR, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'Errore nella lettura della directory degli ebook' });
    }
    
    const ebooks = files
      .filter(file => /\.(epub|pdf|mobi|txt)$/i.test(file))
      .map(file => ({
        filename: file,
        path: path.join(EBOOKS_DIR, file),
        title: path.parse(file).name
      }));
    
    res.json(ebooks);
  });
});

// API per ottenere i modelli vocali disponibili
app.get('/api/voices', (req, res) => {
  res.json(VOICE_MODELS);
});

// Estrai testo dall'ebook
app.get('/api/extract-text/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(EBOOKS_DIR, filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File non trovato' });
  }
  
  const extension = path.extname(filename).toLowerCase();
  const outputFile = path.join(__dirname, 'temp', `${path.parse(filename).name}.txt`);
  
  // Assicurati che la directory temp esista
  if (!fs.existsSync(path.join(__dirname, 'temp'))) {
    fs.mkdirSync(path.join(__dirname, 'temp'), { recursive: true });
  }
  
  let scriptPath = path.join(__dirname, 'scripts', 'extract_text.py');
  
  const pythonProcess = spawn('python3', [scriptPath, filePath, outputFile, extension]);
  
  pythonProcess.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
  });
  
  pythonProcess.on('close', (code) => {
    if (code !== 0) {
      return res.status(500).json({ error: 'Errore nell\'estrazione del testo' });
    }
    
    fs.readFile(outputFile, 'utf8', (err, data) => {
      if (err) {
        return res.status(500).json({ error: 'Errore nella lettura del file di testo' });
      }
      
      // Dividi il testo in sezioni più piccole
      const sections = data.split(/\n\s*\n/).filter(section => section.trim().length > 0);
      
      res.json({
        title: path.parse(filename).name,
        sections: sections
      });
    });
  });
});

// Converti testo in audio
app.post('/api/text-to-speech', async (req, res) => {
  const { text, voiceId, outputFileName } = req.body;
  
  if (!text || !voiceId || !outputFileName) {
    return res.status(400).json({ error: 'Parametri mancanti' });
  }
  
  const outputPath = path.join(AUDIO_DIR, `${outputFileName}.wav`);
  const tempTextFile = path.join(__dirname, 'temp', `${outputFileName}.txt`);
  
  // Assicurati che la directory temp esista
  if (!fs.existsSync(path.join(__dirname, 'temp'))) {
    fs.mkdirSync(path.join(__dirname, 'temp'), { recursive: true });
  }
  
  // Scrivi il testo in un file temporaneo
  fs.writeFileSync(tempTextFile, text, 'utf8');
  
  // Esegui Piper per la conversione TTS
  const modelPath = path.join('/app/piper/voices', voiceId, `${voiceId}.onnx`);
  const configPath = path.join('/app/piper/voices', voiceId, `${voiceId}.json`);
  
  const piperProcess = spawn('python3', [
    '-m', 'piper',
    '--model', modelPath,
    '--config', configPath,
    '--output_file', outputPath,
    '--input_file', tempTextFile
  ]);
  
  piperProcess.stderr.on('data', (data) => {
    console.error(`Piper stderr: ${data}`);
  });
  
  piperProcess.on('close', (code) => {
    // Rimuovi il file temporaneo
    fs.unlinkSync(tempTextFile);
    
    if (code !== 0) {
      return res.status(500).json({ error: 'Errore nella conversione text-to-speech' });
    }
    
    res.json({
      audioUrl: `/audio/${outputFileName}.wav`
    });
  });
});

// Avvia il server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server in ascolto sulla porta ${PORT}`);
});

// WebSocket per aggiornamenti in tempo reale
io.on('connection', (socket) => {
  console.log('Client connesso');
  
  // Invia aggiornamenti quando vengono aggiunti nuovi ebook
  const watcher = chokidar.watch(EBOOKS_DIR, {
    ignored: /(^|[\/\\])\../,
    persistent: true
  });
  
  watcher.on('add', path => {
    if (/\.(epub|pdf|mobi|txt)$/i.test(path)) {
      socket.emit('new-ebook', { path });
    }
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnesso');
    watcher.close();
  });
});
