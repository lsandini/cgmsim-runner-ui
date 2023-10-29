/* eslint-disable @typescript-eslint/no-var-requires */
const { configure: squirrelConfig } = require('electron-squirrel-startup');

module.exports = {
	packagerConfig: {
		icon: './assets/icon32.ico',
	},
	makers: [
		{
			name: '@electron-forge/maker-squirrel',
			platforms: ['win32'],
			config: {
				name: 'cgmsim',
				authors: 'Lorenzo and Nicola',
				description: 'cgmsim',
				setupExe: 'cgmsim.exe',
				iconUrl: 'https://cgmsim.com/images/favicon.ico',
				setupIcon: './assets/icon32.ico',
				skipUpdateIcon: true, // Set to false if you want to use the setupIcon for update files
			},
		},
	],
	publishers: [
		{
			name: '@electron-forge/publisher-github',
			config: {
				repository: 'nickxbs/cgmsim-run-ui',
				draft: true, // Set to false to publish as a release
			},
		},
	],
	// Add electron-updater configuration here
	hooks: {
		packageAfterPrune: squirrelConfig,
	},
};
