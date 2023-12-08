const { ipcRenderer } = require('electron');

let env;
document.querySelector('form').addEventListener('submit', function (e) {
	e.preventDefault(); // Evita il comportamento predefinito dell'invio del modulo
	const res = {};
	for (const prop in env) {
		const value = document.querySelector('#' + prop).value;
		res[prop] = value;
	}
	ipcRenderer.send('form-submission', res);
});

// Invia una richiesta asincrona al processo principale
ipcRenderer.on('startForum', (event, params) => {
	env = params;
	for (const p in env) {
		const el = document.getElementById(p);
		el.value = env[p];
		console.log('###', p, env[p]);
	}
});
ipcRenderer.send('im-readyForm');
