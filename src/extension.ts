// Timer for work - лабораторная работа №3
// Шувалов Михаил Робертович, группа М3110

import * as vscode from 'vscode';
import { Stats } from './stats';

// режим таймера: работа или отдых
type Mode = 'work' | 'break';

let statusBar: vscode.StatusBarItem;

let stats: Stats;

let mode: Mode = 'work';
let secondsLeft = 0;
let running = false;
let pausedByIdle = false; // true если пауза включилась сама из-за бездействия
let lastActivity = Date.now(); // время последнего действия пользователя
let interval: NodeJS.Timeout | undefined;

// читаем настройки
function getConfig() {
	const config = vscode.workspace.getConfiguration('timerForWork');
	return {
		work: config.get<number>('workMinutes', 25),
		break: config.get<number>('breakMinutes', 5),
		idle: config.get<number>('idleMinutes', 3)
	};
}

function getProjectName(): string {
	if (vscode.workspace.name) {
		return vscode.workspace.name;
	}
	return 'Без проекта';
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
		statusBar.tooltip = pausedByIdle ? 'Пауза из-за бездействия. Нажмите, чтобы продолжить' : 'Нажмите, чтобы запустить таймер';
	} else {
		statusBar.command = 'timer-for-work.pause';
		statusBar.tooltip = 'Проект: ' + getProjectName() + '. Нажмите для паузы';
	}
	stats.save();
	statusBar.text = text;
}

function startTimer() {
	if (running) {
		return;
	}
	running = true;
	pausedByIdle = false;
	lastActivity = Date.now();
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
	pausedByIdle = false;
	mode = 'work';
	secondsLeft = getConfig().work * 60;
	updateStatusBar();
}

// вызывается каждую секунду
function tick() {
	const config = getConfig();

	// проверяем бездействие во время работы
	if (mode === 'work') {
		const idleSeconds = (Date.now() - lastActivity) / 1000;
		if (idleSeconds > config.idle * 60) {
			pauseTimer();
			pausedByIdle = true;
			updateStatusBar();
			vscode.window.showWarningMessage('Timer for work: вы давно ничего не делали, таймер поставлен на паузу');
			return;
		}
		stats.addSecond(getProjectName());
	}

	secondsLeft--;

	if (secondsLeft <= 0) {
		if (mode === 'work') {
			stats.addCycle();
			stats.save();
			mode = 'break';
			secondsLeft = config.break * 60;
			vscode.window.showInformationMessage('Работа закончена! Время отдохнуть ' + config.break + ' мин.');
		} else {
			mode = 'work';
			secondsLeft = config.work * 60;
			vscode.window.showInformationMessage('Отдых закончен, возвращаемся к работе!');
		}
	}
	if (secondsLeft % 30 === 0) {
		stats.save();
	}
	updateStatusBar();
}

// любое действие пользователя в редакторе
function onActivity() {
	lastActivity = Date.now();
	// если пауза была из-за бездействия - продолжаем сами
	if (pausedByIdle && !running) {
		startTimer();
		vscode.window.showInformationMessage('Timer for work: с возвращением! Таймер снова идёт');
	}
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

// показываем статистику по проектам
function showStats() {
	const projects = stats.getProjects();
	const items: vscode.QuickPickItem[] = [];

	items.push({
		label: 'Сегодня завершено циклов: ' + stats.getTodayCycles(),
		description: 'всего ' + Stats.formatHours(stats.getTodaySeconds())
	});

	const names = Object.keys(projects);
	// сортируем по времени, сначала самые большие
	names.sort((a, b) => projects[b] - projects[a]);

	for (const name of names) {
		items.push({
			label: name,
			description: Stats.formatHours(projects[name])
		});
	}

	if (names.length === 0) {
		items.push({ label: 'Пока нет данных, запустите таймер' });
	}

	vscode.window.showQuickPick(items, { title: 'Timer for work - время по проектам' });
}

async function clearStats() {
	const answer = await vscode.window.showWarningMessage('Удалить всю статистику?', 'Да', 'Нет');
	if (answer === 'Да') {
		stats.clear();
		vscode.window.showInformationMessage('Статистика очищена');
	}
}

export function activate(context: vscode.ExtensionContext) {
	console.log('Timer for work запущен');
	stats = new Stats(context.globalState);

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
		vscode.commands.registerCommand('timer-for-work.setIntervals', setIntervals),
		vscode.commands.registerCommand('timer-for-work.showStats', showStats),
		vscode.commands.registerCommand('timer-for-work.clearStats', clearStats)
	);

	// следим за действиями пользователя
	context.subscriptions.push(
		vscode.workspace.onDidChangeTextDocument(onActivity),
		vscode.window.onDidChangeTextEditorSelection(onActivity),
		vscode.window.onDidChangeActiveTextEditor(onActivity),
		vscode.window.onDidChangeWindowState((state) => {
			if (state.focused) {
				onActivity();
			}
		})
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
	if (stats) {
		stats.save();
	}
}