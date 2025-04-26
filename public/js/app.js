document.addEventListener('DOMContentLoaded', function() {
    // Elementi DOM
    const ebookList = document.getElementById('ebook-list');
    const searchInput = document.getElementById('search-library');
    const welcomeScreen = document.getElementById('welcome-screen');
    const readerView = document.getElementById('reader-view');
    const bookTitle = document.getElementById('book-title');
    const textContent = document.getElementById('text-content');
    const voiceSelect = document.getElementById('voice-select');
    const speedControl = document.getElementById('speed-control');
    const speedValue = document.getElementById('speed-value');
    const playPauseBtn = document.getElementById('play-pause');
    const stopBtn = document.getElementById('stop');
    const prevSectionBtn = document.getElementById('prev-section');
    const nextSectionBtn = document.getElementById('next-section');
    const progressBar = document.getElementById('progress-bar');
    const progressFill = document.getElementById('progress-fill');
    const currentTimeDisplay = document.getElementById('current-time');
    const totalTimeDisplay = document.getElementById('total-time');
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingMessage = document.getElementById('loading-message');

    // Stato dell'applicazione
    const appState = {
        ebooks: [],
        voices: [],
        currentEbook: null,
        currentSection: 0,
        sections: [],
        audioPlayer: new Audio(),
        isPlaying: false,
        currentSpeed: 1.0,
        activeEbookElement: null
    };

    // Inizializza Socket.io
    const socket = io();

    // Carica gli ebook disponibili
    async function loadEbooks() {
        try {
            const response = await fetch('/api/ebooks');
            if (!response.ok) throw new Error('Errore nel caricamento degli ebook');
            
            appState.ebooks = await response.json();
            renderEbookList(appState.ebooks);
        } catch (error) {
            console.error('Errore:', error);
            ebookList.innerHTML = '<div class="error">Errore nel caricamento degli ebook</div>';
        }
    }

    // Carica le voci disponibili
    async function loadVoices() {
        try {
            const response = await fetch('/api/voices');
            if (!response.ok) throw new Error('Errore nel caricamento delle voci');
            
            appState.voices = await response.json();
            renderVoiceOptions(appState.voices);
        } catch (error) {
            console.error('Errore:', error);
            voiceSelect.innerHTML = '<option value="">Nessuna voce disponibile</option>';
        }
    }

    // Renderizza la lista degli ebook
    function renderEbookList(ebooks) {
        if (ebooks.length === 0) {
            ebookList.innerHTML = '<div class="empty-state">Nessun ebook disponibile</div>';
            return;
        }

        ebookList.innerHTML = ebooks.map(ebook => `
            <div class="ebook-item" data-filename="${ebook.filename}">
                <h3>${ebook.title || ebook.filename}</h3>
                <p>${getFileExtension(ebook.filename).toUpperCase()}</p>
            </div>
        `).join('');

        // Aggiungi eventi click
        document.querySelectorAll('.ebook-item').forEach(item => {
            item.addEventListener('click', function() {
                const filename = this.getAttribute('data-filename');
                selectEbook(filename, this);
            });
        });
    }

    // Renderizza le opzioni per le voci
    function renderVoiceOptions(voices) {
        voiceSelect.innerHTML = voices.map(voice => `
            <option value="${voice.id}" data-language="${voice.language}">
                ${voice.name}
            </option>
        `).join('');

        // Imposta evento change
        voiceSelect.addEventListener('change', function() {
            if (appState.currentEbook && appState.sections.length > 0) {
                stopAudio();
                checkAndGenerateAudio();
            }
        });
    }

    // Seleziona un ebook
    async function selectEbook(filename, element) {
        showLoading('Caricamento ebook...');
        
        // Aggiorna la selezione visiva
        if (appState.activeEbookElement) {
            appState.activeEbookElement.classList.remove('active');
        }
        element.classList.add('active');
        appState.activeEbookElement = element;

        try {
            // Ferma qualsiasi audio in riproduzione
            stopAudio();
            
            // Estrai il testo dall'ebook
            const response = await fetch(`/api/extract-text/${filename}`);
            if (!response.ok) throw new Error('Errore nell\'estrazione del testo');
            
            const data = await response.json();
            
            // Aggiorna lo stato dell'applicazione
            appState.currentEbook = filename;
            appState.currentSection = 0;
            appState.sections = data.sections;
            
            // Aggiorna l'interfaccia utente
            bookTitle.textContent = data.title || filename;
            renderTextContent();
            
            // Mostra la vista del lettore
            welcomeScreen.classList.add('hidden');
            readerView.classList.remove('hidden');
            
            // Genera l'audio per la prima sezione
            checkAndGenerateAudio();
            
        } catch (error) {
            console.error('Errore:', error);
            showError('Errore nel caricamento dell\'ebook');
        } finally {
            hideLoading();
        }
    }

    // Renderizza il contenuto del testo
    function renderTextContent() {
        if (!appState.sections.length) {
            textContent.innerHTML = '<p>Nessun contenuto disponibile</p>';
            return;
        }

        // Renderizza tutte le sezioni, evidenziando quella corrente
        textContent.innerHTML = appState.sections.map((section, index) => `
            <div class="section ${index === appState.currentSection ? 'active-paragraph' : ''}" data-section="${index}">
                <p>${formatText(section)}</p>
            </div>
        `).join('');

        // Scorri alla sezione attiva
        const activeSection = textContent.querySelector('.active-paragraph');
        if (activeSection) {
            activeSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    // Formatta il testo per la visualizzazione
    function formatText(text) {
        // Sostituisci le nuove linee con tag <br>
        return text.replace(/\n/g, '<br>');
    }

    // Controlla e genera l'audio per la sezione corrente
    async function checkAndGenerateAudio() {
        if (!appState.sections.length || appState.currentSection >= appState.sections.length) {
            return;
        }

        showLoading('Generazione audio in corso...');

        const section = appState.sections[appState.currentSection];
        const selectedVoice = voiceSelect.value;
        const outputFileName = `${getFilenameWithoutExtension(appState.currentEbook)}_section_${appState.currentSection}`;

        try {
            const response = await fetch('/api/text-to-speech', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: section,
                    voiceId: selectedVoice,
                    outputFileName: outputFileName
                })
            });

            if (!response.ok) throw new Error('Errore nella generazione dell\'audio');

            const data = await response.json();
            
            // Imposta la nuova fonte audio
            appState.audioPlayer.src = data.audioUrl;
            appState.audioPlayer.playbackRate = appState.currentSpeed;
            
            // Aggiungi i listener degli eventi all'audio player
            setupAudioPlayerEvents();
            
            // Riproduzione automatica
            playAudio();
            
        } catch (error) {
            console.error('Errore:', error);
            showError('Errore nella generazione dell\'audio');
        } finally {
            hideLoading();
        }
    }

    // Configura eventi per l'audio player
    function setupAudioPlayerEvents() {
        // Rimuovi i listener esistenti per evitare duplicati
        appState.audioPlayer.onended = null;
        appState.audioPlayer.ontimeupdate = null;
        appState.audioPlayer.onloadedmetadata = null;
        
        // Quando l'audio finisce
        appState.audioPlayer.onended = function() {
            appState.isPlaying = false;
            updatePlayPauseButton();
            
            // Passa automaticamente alla sezione successiva se disponibile
            if (appState.currentSection < appState.sections.length - 1) {
                nextSection();
            }
        };
        
        // Aggiorna la barra di progresso
        appState.audioPlayer.ontimeupdate = function() {
            const currentTime = appState.audioPlayer.currentTime;
            const duration = appState.audioPlayer.duration || 0;
            
            // Aggiorna la barra di progresso
            if (duration > 0) {
                const percentage = (currentTime / duration) * 100;
                progressFill.style.width = `${percentage}%`;
            }
            
            // Aggiorna il tempo visualizzato
            currentTimeDisplay.textContent = formatTime(currentTime);
        };
        
        // Quando i metadati sono caricati
        appState.audioPlayer.onloadedmetadata = function() {
            totalTimeDisplay.textContent = formatTime(appState.audioPlayer.duration);
        };
    }

    // Formatta il tempo in mm:ss
    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    // Riproduzione dell'audio
    function playAudio() {
        appState.audioPlayer.play()
            .then(() => {
                appState.isPlaying = true;
                updatePlayPauseButton();
            })
            .catch(error => {
                console.error('Errore nella riproduzione:', error);
                appState.isPlaying = false;
                updatePlayPauseButton();
            });
    }

    // Pausa dell'audio
    function pauseAudio() {
        appState.audioPlayer.pause();
        appState.isPlaying = false;
        updatePlayPauseButton();
    }

    // Stop dell'audio
    function stopAudio() {
        appState.audioPlayer.pause();
        appState.audioPlayer.currentTime = 0;
        appState.isPlaying = false;
        updatePlayPauseButton();
    }

    // Aggiorna il pulsante play/pause
    function updatePlayPauseButton() {
        if (appState.isPlaying) {
            playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        } else {
            playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
    }

    // Passa alla sezione precedente
    function prevSection() {
        if (appState.currentSection > 0) {
            appState.currentSection--;
            renderTextContent();
            stopAudio();
            checkAndGenerateAudio();
        }
    }

    // Passa alla sezione successiva
    function nextSection() {
        if (appState.currentSection < appState.sections.length - 1) {
            appState.currentSection++;
            renderTextContent();
            stopAudio();
            checkAndGenerateAudio();
        }
    }

    // Mostra l'overlay di caricamento
    function showLoading(message = 'Caricamento...') {
        loadingMessage.textContent = message;
        loadingOverlay.classList.remove('hidden');
    }

    // Nascondi l'overlay di caricamento
    function hideLoading() {
        loadingOverlay.classList.add('hidden');
    }

    // Mostra un messaggio di errore
    function showError(message) {
        alert(message);
    }

    // Funzioni di utilità
    function getFileExtension(filename) {
        return filename.split('.').pop();
    }

    function getFilenameWithoutExtension(filename) {
        return filename.split('.').slice(0, -1).join('.');
    }

    // Setup eventi UI
    function setupEventListeners() {
        // Play/Pause
        playPauseBtn.addEventListener('click', function() {
            if (appState.isPlaying) {
                pauseAudio();
            } else {
                playAudio();
            }
        });
        
        // Stop
        stopBtn.addEventListener('click', function() {
            stopAudio();
        });
        
        // Sezione precedente
        prevSectionBtn.addEventListener('click', function() {
            prevSection();
        });
        
        // Sezione successiva
        nextSectionBtn.addEventListener('click', function() {
            nextSection();
        });
        
        // Controllo velocità
        speedControl.addEventListener('input', function() {
            appState.currentSpeed = parseFloat(this.value);
            speedValue.textContent = `${appState.currentSpeed.toFixed(1)}x`;
            
            if (appState.audioPlayer) {
                appState.audioPlayer.playbackRate = appState.currentSpeed;
            }
        });
        
        // Click sulla barra di progresso
        progressBar.addEventListener('click', function(event) {
            const rect = this.getBoundingClientRect();
            const clickPosition = (event.clientX - rect.left) / rect.width;
            
            if (appState.audioPlayer && appState.audioPlayer.duration) {
                appState.audioPlayer.currentTime = clickPosition * appState.audioPlayer.duration;
            }
        });
        
        // Filtro ricerca
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            
            if (!searchTerm) {
                renderEbookList(appState.ebooks);
                return;
            }
            
            const filteredEbooks = appState.ebooks.filter(ebook => 
                ebook.title.toLowerCase().includes(searchTerm) || 
                ebook.filename.toLowerCase().includes(searchTerm)
            );
            
            renderEbookList(filteredEbooks);
        });
        
        // Aggiornamenti in tempo reale
        socket.on('new-ebook', function() {
            loadEbooks(); // Ricarica la lista degli ebook quando viene aggiunto un nuovo file
        });
    }

    // Inizializzazione
    function init() {
        loadEbooks();
        loadVoices();
        setupEventListeners();
    }

    // Avvia l'applicazione
    init();
});
