const fs = require('fs');
const {
	simulator,
	downloads,
	uploadEntries,
	simulatorUVA,
	uploadNotes,
	arrows,
} = require('@lsandini/cgmsim-lib');
const cron = require('node-cron');
const { getPerlin } = require('./perlin');

const ENV_FILE_NAME = 'params.json';
//const env = process.env as EnvRunner;
const defaultEnv = {
	AGE: '53',
	APISECRET: 'change_me_please!',
	CARBS_ABS_TIME: '360',
	CR: '10',
	DIA: '6',
	GENDER: 'Male',
	ISF: '30',
	LOG_LEVEL: 'info',
	NIGHTSCOUT_URL: 'https://test2.oracle.cgmsim.com',
	TP: '75',
	WEIGHT: '84',
};
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
	let _readEnv = readEnv();
	if (!_readEnv) {
		saveEnv(defaultEnv);
		_readEnv = defaultEnv;
	}
	let env = { ...defaultEnv, ..._readEnv };
	console.log('env', env);

	const logLevel = env.LOG_LEVEL;
	render.send('log1', 'CGMSIM started!');

	function run() {
		try {
			render.send('log2', 'CGMSIM run');

			// Fetch data from Nightscout API
			return downloads(env.NIGHTSCOUT_URL, env.APISECRET).then(function (down) {
				const treatments = down.treatments;
				const entries = down.entries;

				// Simulate new data entry
				const newEntry = simulator({
					entries,
					profiles: [],
					env,
					treatments,
					user: {
						nsUrl: env.NIGHTSCOUT_URL,
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
					env.NIGHTSCOUT_URL,
					env.APISECRET,
				);

				const now = new Date().toLocaleTimeString();

				function logSgv(formattedSgv) {
					let _logSgv = '';
					if (sgv < 55 || sgv > 240) {
						// Apply red color using ANSI escape codes
						_logSgv = `\x1b[31m sgv ${formattedSgv} at ${now} \x1b[0m`; // 31 is the ANSI code for red
					} else if (sgv < 75 || sgv > 180) {
						_logSgv = `\x1b[33m sgv ${formattedSgv} at ${now} \x1b[0m at `; // 33 is the ANSI code for yellow
					} else {
						_logSgv = `\x1b[32m sgv${formattedSgv} at ${now} \x1b[0m at `; // 32 is the ANSI code for green
					}
					return _logSgv;
				}
				let formattedSgv = sgv.toFixed(0);
				const colorizedSgv = logSgv(formattedSgv);
				console.log('sgv:', colorizedSgv);
				// console.log('formattedSgv:', formattedSgv);
				render.send('log', formattedSgv);
				render.send(
					'noise',
					'added noise ' + (noise.noise * 18 * 6).toFixed(0),
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
					uploadNotes(notes, env.NIGHTSCOUT_URL, env.APISECRET);
				}
			});
		} catch (e) {
			render.send('log', 'Error2:' + JSON.stringify(e));
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
