// --- Wait for the page to be fully loaded before running script ---
document.addEventListener('DOMContentLoaded', () => {

    // =================================================================
    // === 1. CONFIGURATION ============================================
    // =================================================================
    const SERVER_IP = "192.168.100.7";
    const SERVER_PORT = "8000";
    const POLLING_INTERVAL_MS = 1000;

    // Correctly defined with an underscore
    const SERVER_URL = `http://${SERVER_IP}:${SERVER_PORT}`;

    // =================================================================
    // === 2. DOM ELEMENT REFERENCES ===================================
    // =================================================================
    const statusLine = document.getElementById('status-line');
    const notesContainer = document.getElementById('notes-container');
    const errorOverlay = document.getElementById('error-overlay');
    const serverAddress = document.getElementById('server-address');

    // =================================================================
    // === 3. STATE MANAGEMENT =========================================
    // =================================================================
    let allNotes = [];
    let currentSlideIndex = -1;
    let totalSlides = 0;
    let serverIsConnected = false;

    // =================================================================
    // === 4. CORE LOGIC ===============================================
    // =================================================================

    async function fetchAndUpdateState() {
        try {
            // Uses SERVER_URL (correct)
            const response = await fetch(`${SERVER_URL}/state`);
            if (!response.ok) throw new Error(`Server responded with status ${response.status}`);
            const data = await response.json();
            if (!serverIsConnected) handleConnectionRestored();
            if (data.slide_index !== currentSlideIndex) {
                currentSlideIndex = data.slide_index;
                totalSlides = data.total_notes || allNotes.length;
                updateActiveNote();
            }
            updateStatusLine();
        } catch (error) {
            console.error("Failed to fetch state:", error);
            handleConnectionLost();
        }
    }

    function renderInitialNotesList() {
        notesContainer.innerHTML = '';
        allNotes.forEach((note, index) => {
            const li = document.createElement('div');
            li.id = `note-${index}`;
            li.className = 'note-item';
            const noteText = note || "(This slide has no notes)";
            if (!note) li.classList.add('no-notes');
            li.textContent = noteText;
            li.setAttribute('data-line-number', `(${index + 1})`);
            notesContainer.appendChild(li);
        });
    }

    function updateActiveNote() {
        const oldActive = notesContainer.querySelector('.active');
        if (oldActive) oldActive.classList.remove('active');
        const newActive = document.getElementById(`note-${currentSlideIndex}`);
        if (newActive) {
            newActive.classList.add('active');
            newActive.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        }
    }

    function updateStatusLine() {
        statusLine.textContent = `Status: CONNECTED | On Slide ${currentSlideIndex + 1} of ${totalSlides}`;
    }

    function handleConnectionLost() {
        if (serverIsConnected) {
            serverIsConnected = false;
            statusLine.textContent = 'Status: CONNECTION LOST...';
            errorOverlay.classList.remove('hidden');
            // Uses SERVER_URL (correct)
            serverAddress.textContent = `${SERVER_IP}:${SERVER_PORT}`;
        }
    }

    function handleConnectionRestored() {
        serverIsConnected = true;
        initializeApp();
    }

    async function initializeApp() {
        try {
            statusLine.textContent = 'Status: Fetching notes from server..';
            // Uses SERVER_URL (correct)
            const response = await fetch(`${SERVER_URL}/all_notes`);
            if (!response.ok) throw new Error("Could not fetch notes list.");
            allNotes = await response.json();
            totalSlides = allNotes.length;
            serverIsConnected = true;
            renderInitialNotesList();
            await fetchAndUpdateState();
            setInterval(fetchAndUpdateState, POLLING_INTERVAL_MS);
        } catch (error) {
            console.error("Initialization failed:", error);
            handleConnectionLost();
            setTimeout(initializeApp, 5000);
        }
    }

    // =================================================================
    // === 5. KEYBOARD CONTROLS ========================================
    // =================================================================

    async function sendControlCommand(command) {
        try {
            // Uses SERVER_URL (correct)
            await fetch(`${SERVER_URL}/control/${command}`);
            fetchAndUpdateState();
        } catch (error) {
            console.error(`Failed to send command '${command}':`, error);
        }
    }

    document.addEventListener('keydown', (event) => {
        switch (event.key) {
            case 'ArrowRight':
                sendControlCommand('next');
                break;
            case 'ArrowLeft':
                sendControlCommand('previous');
                break;
            case 'ArrowUp':
                console.log("Manual resync triggered.");
                fetchAndUpdateState();
                break;
        }
    });

    // =================================================================
    // === 6. START THE APPLICATION ====================================
    // =================================================================
    initializeApp();

});
