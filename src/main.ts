import * as path from 'path';
import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } from 'electron';
import { readEnv, saveEnv, startCron } from './run';
import * as cron from 'node-cron';
if (require('electron-squirrel-startup')) {
	app.quit();
}

let mainWindow: BrowserWindow;
let formWindow: BrowserWindow | null = null;
let tray: Tray | null;
let logger: Electron.WebContents;
let scheduler: cron.ScheduledTask;

function createWindow() {
	// Create the browser window.
	let icon16 = nativeImage.createFromDataURL(
		'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAACxFBMVEUAAAA5NzPOt6UWGhkkJSKfjH86NzNbVE0eHx2xm4yikINvZVyQfG9pYFdEPjgnJyRDPjoeHRowLCgFBQTEp5YpJyQ2OTf///9HREBiWlSUhHkRGRmXin2fjoB2bGMAAABuZFqZiHqUhHaZhnqijoCQgHSljnytlYd7b2WQgXW2nY27nIqwjHrUrp3Xt6WfiHtAQz6CdWqnjH6/oZGLfHFrY1qchniKaFuKcGR4aV9pYFh3ZFltUkeTfHBCPDdAOjUzMi8bHx6Ld2ubhXg3NzQAAACGdWmXg3YTGBeCcWeQfXATGBeJeG2Uf3CJeG5NSkaQe3GchXeskYJ9cmhSTEmWgXSkhHWZhXhDQ0CUfW+nh3ahiHiAc2mnhnNvUkRxYFGUgnOZdWN+X09EMyqNgGyeiHeGZVNUPjA/NS2XiXLBopHZtqSqhnSRZliwi32uinuSZ1i9iXnjsqLlvqzlvarTqJindWm7jX+MaFtsQDaib2TQm43es6PjuqnKno7Up5e4joCieGvUpZbFn4/VsqHat6XLqJfVsaHGopO7monDopG+n4/DoZHFopHEoZHEo5O9no6zlITDoI7Qq5nVr53Wr53RqZfIopG/n46sj3+sjX2pinumiXqtj4Coi3ufg3WpjX2njH2zl4e9oZDFqJbMrpvGqZa5noyljHyiiXq1mYq6no2xloWvlIWrkICehnaKdWaff26CYFKEb2CTgnGRgm+Uh3WOgm91Z1dvYE9XQjaDZFWoiXeWcmN8XE54Z1RjWUhvZlRza1hya1dVSjpCNCU9JhpsUEKVd2WgfGmBdF0iFQ4vIxs3Kx81KB0nGA8aCwBNOChwVkeLbV6miHeckHMtIBQLAAANAAAPAQASAwAaDAFkUD9yWUp+YVGjhXOroIJrX0YiEgcTAwAWBwAwIxOCcFttVECEZ1Slh3OfhnL////oCYnzAAAAanRSTlMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEXHMeAR9eZVJiXuHEMVTV/f37+6wKROb2TxrL8+diJLvexy4LAhKuwgoDqLwIf8ALje5gCmjh5zwLhvisDJH49Fnx+/m38/Wn5/P2pUfxc1yrCwAAAAFiS0dEFwvWmI8AAAAJcEhZcwAACxIAAAsSAdLdfvwAAAAHdElNRQfnChgTISS2dApQAAABF0lEQVQY02NggAJGaRlZOSZmEJNFXkFRSVlFVS1LXYMVyGeT19TS1tHN1svJzdM3YGfg4DQ0yi8oLCouKS0rNzbhYuA2NauorKquqa2rbzC3sORh4LWytmlsam5pbWvvsLWz52Pgd3B06uzq7unt65/g7CIANFTQ1W3ipMlTpk6bPsPdQwgoICziOXPW7Dlz581f4OUtChQQE/dZuGjxkqXLlq/w9ZOXYJD0DwhcuWr1mrXr1m/YGBQsxRASGrZp85at27bv2Llr957wCIbIqL379h84eOjwkaPHjp+IjmGIPRkXf+r0mbPnzl+4eOnylQSGxKTklKvXrt+4eev2nbv37qcypKVnZD54+Ojx4ydPnz1/8fIVAJPabInGo8thAAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDIzLTEwLTI0VDE5OjMzOjA3KzAwOjAw/WYkpgAAACV0RVh0ZGF0ZTptb2RpZnkAMjAyMy0xMC0yNFQxOTozMzowNyswMDowMIw7nBoAAAAASUVORK5CYII='
	);
	const icon32 = nativeImage.createFromDataURL(
		'data:image/png;base64,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'
	);

	mainWindow = new BrowserWindow({
		icon: icon32,
		height: 600,
		webPreferences: {
			preload: path.join(__dirname, 'preload.js'),
			plugins: true,
			nodeIntegration: true,
			contextIsolation: false,
		},

		width: 800,
	});

	const template: Electron.MenuItemConstructorOptions[] = [
		{
			label: 'File',
			submenu: [
				{
					label: 'Settings',
					click() {
						createFormWindow();
					},
				},
				{
					label: 'Exit',
					click() {
						app.quit();
					},
				},
			],
		},
	];

	const menu = Menu.buildFromTemplate(template);
	Menu.setApplicationMenu(menu);
	mainWindow.webContents.on('dom-ready', () => {
		mainWindow.webContents.insertCSS(`
            .electron-menu {
                background-color: black; 
            }
        `);
	});

	
	//   console.log('icon', icon);
	icon16 = icon16.resize({
		height: 16,
		width: 16,
	});
	tray = new Tray(icon16);

	const contextMenu = Menu.buildFromTemplate([
		{
			label: 'Exit',
			type: 'normal',
			click: () => {
				app.quit();
			},
		},
	]);
	tray.setContextMenu(contextMenu);
	// and load the index.html of the app.
	mainWindow.loadFile(path.join(__dirname, '../index.html'));

	// Handle window close event
	mainWindow.on('close', (event) => {
		// Prevent the default close behavior
		event.preventDefault();
		// Hide the window instead
		mainWindow.hide();
	});
	// Handle double-click on the tray icon
	tray.on('double-click', () => {
		mainWindow.show();
	});
	// Open the DevTools.
	mainWindow.webContents.openDevTools();
	ipcMain.on('im-ready', (event, data) => {
		if (!scheduler) {
			logger = event.sender;
			scheduler = startCron(logger);
		}
		event.sender.send('start');
	});
}
function createFormWindow() {
	if (formWindow) {
		formWindow.focus();
		return;
	}

	formWindow = new BrowserWindow({
		width: 400,
		height: 300,
		webPreferences: {
			preload: path.join(__dirname, 'preloadForm.js'),
			plugins: true,
			nodeIntegration: true,
			contextIsolation: false,
		},
	});
	formWindow.loadFile(path.join(__dirname, '../form.html'));

	formWindow.on('closed', () => {
		formWindow = null;
	});
	// formWindow.webContents.openDevTools();

	ipcMain.on('im-readyForm', (event, data) => {
		const params = readEnv();
		event.sender.send('startForum', params);
	});
	ipcMain.on('form-submission', (event, data) => {
		saveEnv(data);
		console.log('data', data);
		logger.send('log', 'Params saved!');
		formWindow.close();
	});
}
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
	createWindow();

	app.on('activate', function () {
		// On macOS it's common to re-create a window in the app when the
		// dock icon is clicked and there are no other windows open.
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('before-quit', function (evt) {
	mainWindow.destroy();
	formWindow.destroy();
	tray.destroy();
});
app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
		scheduler.stop();
	}
});

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
