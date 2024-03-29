const fs = require('fs');
const {
	simulator,
	downloads,
	uploadEntries,
	uploadNotes,
	arrows,
} = require('@lsandini/cgmsim-lib');
const cron = require('node-cron');
const { getPerlin } = require('./perlin');

const ENV_FILE_NAME = 'params.json';

const readEnv = () => {
	try {
		const data = fs.readFileSync(ENV_FILE_NAME, 'utf8');
		const parsedData = JSON.parse(data);
		return parsedData;
	} catch (err) {
		return null;
	}
};

const saveEnv = (env) => {
	const data = JSON.stringify(env);

	fs.writeFile(ENV_FILE_NAME, data, 'utf8', (err) => {
		if (err) {
			console.error('Error saving env to file:', err);
		} else {
			console.log('env saved to file:', ENV_FILE_NAME);
		}
	});
};
// Read environment variables and type them

const startCron = (render) => {
	// dotenv.config();
	// const env = process.env as EnvRunner;
	render.send('log', 'CGMSIM started!');
	function run() {
		let _readEnv = readEnv();
		if (!_readEnv || !_readEnv.NIGHTSCOUT_URL || !_readEnv.APISECRET) {
			const msg =
				'Open File - Settings, and configure the Nightscout parameters';
			render.send('err', msg);
			return;
		}
		// let env = { ..._readEnv };
		let patient = {
			..._readEnv,
			ISF: parseInt(_readEnv.ISF),
			CR: parseInt(_readEnv.CR),
			DIA: parseInt(_readEnv.DIA),
			WEIGHT: parseInt(_readEnv.WEIGHT),
			TP: parseInt(_readEnv.TP),
			CARBS_ABS_TIME: parseInt(_readEnv.CARBS_ABS_TIME),
			AGE: parseInt(_readEnv.AGE),
			GENDER: _readEnv.GENDER,
		};
		if (
			isNaN(patient.ISF) ||
			isNaN(patient.CR) ||
			isNaN(patient.DIA) ||
			isNaN(patient.WEIGHT) ||
			isNaN(patient.TP) ||
			isNaN(patient.CARBS_ABS_TIME) ||
			isNaN(patient.AGE)
		) {
			render.send('err', `Error: params ${JSON.stringify(patient)}`);
			return;
		}
		const logLevel = patient.LOG_LEVEL;
		try {
			render.send('log', 'CGMSIM run');
			// Fetch data from Nightscout API

			return downloads(patient.NIGHTSCOUT_URL, patient.APISECRET)
				.then(function (down) {
					const treatments = down.treatments;
					const entries = down.entries;
					// Simulate new data entry
					const newEntry = simulator({
						entries,
						profiles: [],
						patient,
						treatments,
						user: {
							nsUrl: patient.NIGHTSCOUT_URL,
						},
					});
					let svgs = entries.map((e) => e.sgv);
					if (svgs.length < 3) {
						svgs = [...svgs, 90, 90, 90];
					}

					const noise = getPerlin();
					const sgv = Math.round(noise.noise * 18 * 6 + newEntry.sgv);

					// Calculate the direction using arrows
					const { direction } = arrows(sgv, svgs[0], svgs[1], svgs[2]);

					// Upload the new entry data to Nightscout
					uploadEntries(
						{
							sgv: newEntry.sgv,
							direction,
						},
						patient.NIGHTSCOUT_URL,
						patient.APISECRET,
					);

					let formattedSgv = Math.round(sgv).toFixed(0);
					render.send('sgv', formattedSgv);

					render.send(
						'noise',
						'added noise ' + Math.round(noise.noise * 18 * 6).toFixed(0),
					);

					// If log level is 'debug', upload additional notes
					if (logLevel === 'debug') {
						const notes = `
						sgv:${sgv}<br>
						min:${newEntry.deltaMinutes}<br>
						carb:${newEntry.carbsActivity.toFixed(4)}<br>
						bas:${newEntry.basalActivity.toFixed(4)}<br>
						bol:${newEntry.bolusActivity.toFixed(4)}<br>
						liv:${newEntry.liverActivity.toFixed(4)}<br>`;
						uploadNotes(notes, patient.NIGHTSCOUT_URL, patient.APISECRET);
					}
				})
				.catch((e) => {
					render.send('err', e);
					console.error(e);
				});
		} catch (e) {
			render.send('err', 'Error:' + JSON.stringify(e));
			console.error(e);
		}
	}
	run();
	// Schedule the 'run' function to run periodically with node-cron
	const cronJob = cron.schedule(`*/5 * * * *`, run); // Periodic execution. First run after 5 minutes.
	cronJob.start();
	return cronJob;
};
module.exports = {
	readEnv,
	saveEnv,
	startCron,
};
