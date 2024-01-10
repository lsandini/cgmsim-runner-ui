const { ipcRenderer } = require('electron');

let env;
document.querySelector('form').addEventListener('submit', function (e) {
	e.preventDefault(); // Evita il comportamento predefinito dell'invio del modulo
	const res = {};
	for (const prop in env) {
		const inputElement = document.getElementById(prop);
		if (inputElement.type === 'number') {
			var numberValue = parseInt(inputElement.value);
			if (isNaN(numberValue)) {
				alert('Please enter a valid number.');
				event.preventDefault();
			} else {
				res[prop] = numberValue;
			}
		} else {
			res[prop] = inputElement.value;
		}
	}
	ipcRenderer.send('form-submission', res);
});
const defaultEnv = {
	AGE: 50,
	APISECRET: '',
	CARBS_ABS_TIME: 360,
	CR: 10,
	DIA: 6,
	GENDER: 'Male',
	ISF: 30,
	LOG_LEVEL: 'info',
	NIGHTSCOUT_URL: '',
	TP: 75,
	WEIGHT: 80,
};

// Invia una richiesta asincrona al processo principale
ipcRenderer.on('startForum', (event, params) => {
	env = { ...defaultEnv, ...params };
	for (const p in env) {
		const el = document.getElementById(p);
		el.value = env[p];
	}
});
ipcRenderer.send('im-readyForm');
