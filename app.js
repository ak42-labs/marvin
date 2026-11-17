const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzpc1pni5JmggYzBtUiZym0k4jDLnXL7NDCYuzWAH6gKkWw1m7mcVfP7cASEcXv0tl0/exec';
let allTasks = [];
let currentStatus = 'Zu tun';

document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    loadTasks();
    
    // Platzhalter für die spätere Gemini Voice-Integration
    document.getElementById('marvin-btn').addEventListener('click', () => {
        alert('Hier startet später die Web Speech API. Marvin hört zu...');
    });
});

function initTabs() {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            // Aktiven Tab visuell wechseln
            tabs.forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            
            // Status setzen und Ansicht neu rendern
            currentStatus = e.target.dataset.target;
            renderTasks();
        });
    });
}

async function loadTasks() {
    const loading = document.getElementById('loading');
    
    try {
        // HTTP POST Request an deine Web-App
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'getTasks' }),
            headers: {
                'Content-Type': 'text/plain;charset=utf-8', // Umgeht den CORS-Preflight
            }
        });
        
        const result = await response.json();
        
        if(result.status === 'success') {
            allTasks = result.data;
            loading.style.display = 'none';
            renderTasks();
        } else {
            loading.innerText = 'Fehler beim Laden der Daten.';
        }
    } catch (error) {
        loading.innerText = 'Marvin ist offline (Netzwerkfehler).';
    }
}

function renderTasks() {
    const container = document.getElementById('task-list');
    container.innerHTML = '';
    
    // Filtern nach dem ausgewählten Status im UI
    const filteredTasks = allTasks.filter(t => t.Status === currentStatus);
    
    if (filteredTasks.length === 0) {
        container.innerHTML = `<div class="empty-state">Leer. Marvin ist fast beeindruckt.</div>`;
        return;
    }

    filteredTasks.forEach(task => {
        const card = document.createElement('div');
        card.className = 'task-card';
        
        const title = document.createElement('h3');
        title.className = 'task-title';
        title.innerText = task.Title;
        
        const meta = document.createElement('div');
        meta.className = 'task-meta';
        
        // Datum formatieren, falls vorhanden
        let dateString = '';
        if(task.DueDate) {
            const d = new Date(task.DueDate);
            // Einfacher Format-Check
            if(!isNaN(d.getTime())) {
                dateString = d.toLocaleDateString('de-AT');
            }
        }
        
        meta.innerHTML = `<span>${task.Category}</span> <span>${dateString}</span>`;
        
        card.appendChild(title);
        card.appendChild(meta);
        container.appendChild(card);
    });
}
