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
import { getPerlin } from './perlin';

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
	render.send('log1', 'CGMSIM started!');

	function run(): Promise<void> {
		try {
			render.send('log2', 'CGMSIM run');

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

					const noise = getPerlin();
					const sgv = noise.noise * 18 * 6 + newEntry.sgv;

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

					const now = new Date().toLocaleTimeString();

					function logSgv(sgv: number) {
						let formattedSgv = sgv.toString();
						if (sgv < 55 || sgv > 240) {
							// Apply red color using ANSI escape codes
							formattedSgv = `\x1b[31m${formattedSgv}\x1b[0m at ` + now; // 31 is the ANSI code for red
						}else if(sgv < 75 || sgv > 180){
							formattedSgv = `\x1b[33m${formattedSgv}\x1b[0m at ` + now; // 33 is the ANSI code for yellow
						}else{
							formattedSgv = `\x1b[32m${formattedSgv}\x1b[0m at ` + now; // 32 is the ANSI code for green
						}
						console.log('colorized sgv:', formattedSgv);
					}

					const colorizedSgv = logSgv(newEntry.sgv);
					render.send('log', 'sgv ' + newEntry.sgv);
					render.send('noise', 'added noise ' + (noise.noise * 18 * 6).toFixed(0));



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
