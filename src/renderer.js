const { ipcRenderer } = require('electron');


const consoleElement = document.getElementById('console');
function addToConsole(text) {
	const message = document.createElement('div');
	message.textContent =`user@localhost:~$ ${text}`;
	consoleElement.appendChild(message);
	consoleElement.scrollTop = consoleElement.scrollHeight;
}
		
// Invia una richiesta asincrona al processo principale
ipcRenderer.send('im-ready', 'Dati da inviare');

// Gestisci la risposta dal processo principale
ipcRenderer.on('log', (event, message) => {
		addToConsole(message);
});
ipcRenderer.on('start', (event, scheduler) => {
	console.log('start');
});
