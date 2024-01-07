const { ipcRenderer } = require('electron');

const consoleElement = document.getElementById('console');
function addToConsole(text) {
	const message = document.createElement('div');
	message.textContent = `user@localhost:~$ ${text}`;
	consoleElement.appendChild(message);
	consoleElement.scrollTop = consoleElement.scrollHeight;
}
function addToConsoleError(text) {
	const messageDiv = document.createElement('div');
	messageDiv.className = 'console-message';

	// Create a span for the user prompt
	const userPromptSpan = document.createElement('span');
	userPromptSpan.textContent = `user@localhost:~$ `;
	// Create a span for the colorized sgv value
	const sgvSpan = document.createElement('span');
	sgvSpan.classList.add('red-text');
	sgvSpan.textContent = text;
	// Append the user prompt, "svg: " span, the colorized sgv span, and the local time span to the message div
	messageDiv.appendChild(userPromptSpan);
	messageDiv.appendChild(document.createTextNode(' '));
	messageDiv.appendChild(sgvSpan);
	consoleElement.appendChild(messageDiv);
	consoleElement.scrollTop = consoleElement.scrollHeight;
}
// Invia una richiesta asincrona al processo principale
ipcRenderer.send('im-ready', 'Dati da inviare');

// Gestisci la risposta dal processo principale
ipcRenderer.on('log', (event, message) => {
	addToConsole(message);
});

ipcRenderer.on('err', (event, message) => {
	addToConsoleError(message);
});

ipcRenderer.on('noise', (event, message) => {
	addToConsole(message);
});

ipcRenderer.on('sgv', (event, sgvValue) => {
	const messageDiv = document.createElement('div');
	messageDiv.className = 'console-message';

	// Create a span for the user prompt
	const userPromptSpan = document.createElement('span');
	userPromptSpan.textContent = `user@localhost:~$ `;

	// Create a span for "svg: " in green
	const svgLabelSpan = document.createElement('span');
	svgLabelSpan.textContent = 'svg ';
	// svgLabelSpan.classList.add('green-text');

	// Create a span for the colorized sgv value
	const sgvSpan = document.createElement('span');
	sgvSpan.textContent = sgvValue;

	// Apply CSS classes based on the sgv value
	if (parseFloat(sgvValue) < 55 || parseFloat(sgvValue) > 240) {
		sgvSpan.classList.add('red-text');
	} else if (parseFloat(sgvValue) < 75 || parseFloat(sgvValue) > 180) {
		sgvSpan.classList.add('yellow-text');
	} else {
		sgvSpan.classList.add('green-text');
	}

	// Create a span for the local time
	const timeSpan = document.createElement('span');
	const currentTime = new Date();
	const formattedTime = currentTime.toLocaleTimeString('en-GB', {
		hour: 'numeric',
		minute: 'numeric',
		second: 'numeric',
		hour12: false,
	});
	timeSpan.textContent = ` at ${formattedTime}`;
	// timeSpan.classList.add('green-text'); // You can style the time in green

	// Append the user prompt, "svg: " span, the colorized sgv span, and the local time span to the message div
	messageDiv.appendChild(userPromptSpan);
	messageDiv.appendChild(svgLabelSpan);
	messageDiv.appendChild(document.createTextNode(' '));
	messageDiv.appendChild(sgvSpan);
	messageDiv.appendChild(timeSpan);

	// Append the message div to the console element
	consoleElement.appendChild(messageDiv);
	consoleElement.scrollTop = consoleElement.scrollHeight;
});

ipcRenderer.on('start', (event, scheduler) => {
	console.log('start');
});
