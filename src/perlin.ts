const perlin = require('perlin-noise');
import * as fs from 'fs';

const NOISE_FILE_NAME = 'noise.json';
// Define the type for the 'noiseArray' array.
interface NoiseEntry {
	noise: number;
	time: number;
}
const saveNoiseArrayToFile = (noiseArray: NoiseEntry[]) => {
	const data = JSON.stringify(noiseArray);

	fs.writeFile(NOISE_FILE_NAME, data, 'utf8', (err) => {
		if (err) {
			console.error('Error saving noiseArray to file:', err);
		} else {
			console.log('noiseArray saved to file:', NOISE_FILE_NAME);
		}
	});
};
const readNoiseArrayFromFile = (): NoiseEntry[] => {
	try {
		const data = fs.readFileSync(NOISE_FILE_NAME, 'utf8');
		const parsedData = JSON.parse(data);
		if (Array.isArray(parsedData)) {
			return parsedData as NoiseEntry[];
		}
		return [];
	} catch (err) {
		return [];
	}
};

const noiseArray: NoiseEntry[] = readNoiseArrayFromFile();

export const getPerlin = (): NoiseEntry | undefined => {
	const now = Date.now();
	let currentNoise = noiseArray.find((x) => {
		return x.time <= now && x.time + 5 * 60 * 1000 > now;
	});
	if (currentNoise === undefined) {
		currentNoise = generatePerlin()[0];
	}
	return currentNoise;
};

export const generatePerlin = (): NoiseEntry[] => {
	const noise = perlin.generatePerlinNoise(2016, 1, {
		amplitude: 0.3,
		octaves: 3,
		persistence: 0.4,
	});

	// Define 'time' (assuming it's a global variable, otherwise provide a type for it)
	const time = Date.now();

	// push the noise values into a new noiseArray
	for (let j = 0; j < noise.length; j++) {
		noiseArray.push({
			noise: noise[j] / 10 - 0.05,
			time: time + j * 1000 * 60 * 5,
		});
	}
	saveNoiseArrayToFile(noiseArray);
	return noiseArray;
};