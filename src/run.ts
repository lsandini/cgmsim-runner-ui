import * as fs from 'fs';

import {
	simulator,
	downloads,
	uploadEntries,
	simulatorUVA,
	uploadNotes,
	arrows,
} from '@lsandini/cgmsim-lib';
import * as cron from 'node-cron';
import { GenderType } from '@lsandini/cgmsim-lib/dist/Types';

// Define a type for environment variables
type EnvRunner = {
	CR: string;
	ISF: string;
	CARBS_ABS_TIME: string;
	TP: string;
	DIA: string;
	WEIGHT: string;
	LOG_LEVEL: string;
	NIGHTSCOUT_URL: string;
	APISECRET: string;
	AGE: string;
	GENDER: GenderType;
};
const ENV_FILE_NAME = 'params.json';
//const env: EnvRunner = process.env as EnvRunner;
const defaultEnv: EnvRunner = {
	AGE: '30',
	APISECRET: 'change_me_please!',
	CARBS_ABS_TIME: '360',
	CR: '10',
	DIA: '6',
	GENDER: 'Male',
	ISF: '30',
	LOG_LEVEL: 'debug',
	NIGHTSCOUT_URL: 'https://nicola6.oracle.cgmsim.com',
	TP: '75',
	WEIGHT: '90',
};
export const readEnv = (): EnvRunner => {
	try {
		const data = fs.readFileSync(ENV_FILE_NAME, 'utf8');
		const parsedData = JSON.parse(data);
		return parsedData as EnvRunner;
	} catch (err) {
		return null;
	}
};

export const saveEnv = (env: EnvRunner) => {
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

export const startCron = (render: Electron.WebContents): cron.ScheduledTask => {
	// dotenv.config();
	// const env: EnvRunner = process.env as EnvRunner;
	let env: EnvRunner = readEnv();
	if (!env) {
		saveEnv(defaultEnv);
		env = defaultEnv;
	}

	const logLevel: string = env.LOG_LEVEL;
	render.send('log', 'CGMSIM started!');

	function run(): Promise<void> {
		try {
			render.send('log', 'CGMSIM run');

			// Fetch data from Nightscout API
			return downloads(env.NIGHTSCOUT_URL, env.APISECRET)
				.then(function (down) {
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

					// Calculate the direction using arrows
					const { direction } = arrows(newEntry.sgv, svgs[0], svgs[1], svgs[2]);

					// Upload the new entry data to Nightscout
					uploadEntries(
						{
							sgv: newEntry.sgv,
							direction,
						},
						env.NIGHTSCOUT_URL,
						env.APISECRET
					);

					render.send('log', 'sgv ' + newEntry.sgv);

					// If log level is 'debug', upload additional notes
					if (logLevel === 'debug') {
						const notes = `
			sgv:${newEntry.sgv}<br>
			min:${newEntry.deltaMinutes}<br>
			carb:${newEntry.carbsActivity.toFixed(4)}<br>
			bas:${newEntry.basalActivity.toFixed(4)}<br>
			bol:${newEntry.bolusActivity.toFixed(4)}<br>
			liv:${newEntry.liverActivity.toFixed(4)}<br>`;
						uploadNotes(notes, env.NIGHTSCOUT_URL, env.APISECRET);
					}
				})
				.catch((e) => {
					render.send('log', 'Error1:' + JSON.stringify(e));
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
