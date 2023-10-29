// eslint-disable-next-line @typescript-eslint/no-var-requires
const perlin = require('perlin-noise');
const fs = require('fs');

const NOISE_FILE_NAME = 'noise.json';
// Define the type for the 'noiseArray' array.

const saveNoiseArrayToFile = (noiseArray) => {
	const data = JSON.stringify(noiseArray);

	fs.writeFile(NOISE_FILE_NAME, data, 'utf8', (err) => {
		if (err) {
			console.error('Error saving noiseArray to file:', err);
		} else {
			console.log('noiseArray saved to file:', NOISE_FILE_NAME);
		}
	});
};
const readNoiseArrayFromFile = () => {
	try {
		const data = fs.readFileSync(NOISE_FILE_NAME, 'utf8');
		const parsedData = JSON.parse(data);
		if (Array.isArray(parsedData)) {
			return parsedData;
		}
		return [];
	} catch (err) {
		return [];
	}
};

const noiseArray = readNoiseArrayFromFile();

 const getPerlin = () => {
	const now = Date.now();
	let currentNoise = noiseArray.find((x) => {
		return x.time <= now && x.time + 5 * 60 * 1000 > now;
	});
	if (currentNoise === undefined) {
		currentNoise = generatePerlin()[0];
	}
	return currentNoise;
};

 const generatePerlin = () => {
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
module.exports = {
	getPerlin,
	generatePerlin
  };