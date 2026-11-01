// Timer for work - лабораторная работа №3
// Шувалов Михаил Робертович, группа М3110

import * as vscode from 'vscode';

// режим таймера: работа или отдых
type Mode = 'work' | 'break';

let statusBar: vscode.StatusBarItem;

let mode: Mode = 'work';
let secondsLeft = 0;
let running = false;
let interval: NodeJS.Timeout | undefined;

// читаем настройки
function getConfig() {
	const config = vscode.workspace.getConfiguration('timerForWork');
	return {
		work: config.get<number>('workMinutes', 25),
		break: config.get<number>('breakMinutes', 5)
	};
}


// перевод секунд в формат мм:сс
function formatTime(sec: number): string {
	const m = Math.floor(sec / 60);
	const s = sec % 60;
	return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
}

// обновляем текст в строке состояния
function updateStatusBar() {
	let text = '';
	if (mode === 'work') {
		text = 'Работа ' + formatTime(secondsLeft);
	} else {
		text = 'Отдых ' + formatTime(secondsLeft);
	}

	if (!running) {
		text = '(пауза) ' + text;
		statusBar.command = 'timer-for-work.start';
		statusBar.tooltip = 'Нажмите, чтобы запустить таймер';
	} else {
		statusBar.command = 'timer-for-work.pause';
		statusBar.tooltip = 'Нажмите для паузы';
	}
	statusBar.text = text;
}

function startTimer() {
	if (running) {
		return;
	}
	running = true;
	interval = setInterval(tick, 1000);
	updateStatusBar();
}

function pauseTimer() {
	running = false;
	if (interval) {
		clearInterval(interval);
		interval = undefined;
	}
	updateStatusBar();
}

function resetTimer() {
	pauseTimer();
	mode = 'work';
	secondsLeft = getConfig().work * 60;
	updateStatusBar();
}

// вызывается каждую секунду
function tick() {
	const config = getConfig();

	secondsLeft--;

	if (secondsLeft <= 0) {
		if (mode === 'work') {
			mode = 'break';
			secondsLeft = config.break * 60;
			vscode.window.showInformationMessage('Работа закончена! Время отдохнуть ' + config.break + ' мин.');
		} else {
			mode = 'work';
			secondsLeft = config.work * 60;
			vscode.window.showInformationMessage('Отдых закончен, возвращаемся к работе!');
		}
	}

	updateStatusBar();
}

// Настройка интервалов через окно ввода
async function setIntervals() {
	const config = vscode.workspace.getConfiguration('timerForWork');

	const work = await vscode.window.showInputBox({
		prompt: 'Сколько минут работать?',
		value: String(config.get<number>('workMinutes', 25)),
		validateInput: checkNumber
	});
	if (work === undefined) {
		return; // нажали Esc
	}

	const rest = await vscode.window.showInputBox({
		prompt: 'Сколько минут отдыхать?',
		value: String(config.get<number>('breakMinutes', 5)),
		validateInput: checkNumber
	});
	if (rest === undefined) {
		return;
	}

	await config.update('workMinutes', Number(work), vscode.ConfigurationTarget.Global);
	await config.update('breakMinutes', Number(rest), vscode.ConfigurationTarget.Global);

	vscode.window.showInformationMessage('Интервалы сохранены: работа ' + work + ' мин, отдых ' + rest + ' мин');
}

function checkNumber(value: string): string | undefined {
	const n = Number(value);
	if (!Number.isInteger(n) || n < 1 || n > 180) {
		return 'Введите целое число от 1 до 180';
	}
	return undefined;
}

export function activate(context: vscode.ExtensionContext) {
	console.log('Timer for work запущен');

	secondsLeft = getConfig().work * 60;

	// элемент в строке состояния справа
	statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	updateStatusBar();
	statusBar.show();
	context.subscriptions.push(statusBar);

	// регистрируем команды
	context.subscriptions.push(
		vscode.commands.registerCommand('timer-for-work.start', startTimer),
		vscode.commands.registerCommand('timer-for-work.pause', pauseTimer),
		vscode.commands.registerCommand('timer-for-work.stop', resetTimer),
		vscode.commands.registerCommand('timer-for-work.setIntervals', setIntervals)
	);

	// если поменяли настройки, а таймер стоит - сразу обновляем время
	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration((e) => {
			if (e.affectsConfiguration('timerForWork') && !running) {
				resetTimer();
			}
		})
	);
}

export function deactivate() {
	if (interval) {
		clearInterval(interval);
	}
}