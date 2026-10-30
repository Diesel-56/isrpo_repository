// Timer for work - лабораторная работа №3
// Шувалов Михаил Робертович, группа М3110

import * as vscode from 'vscode';

// режим таймера: работа или отдых
type Mode = 'work' | 'break';

// пока время задано прямо в коде, потом вынесу в настройки
const WORK_MINUTES = 1;
const BREAK_MINUTES = 5;

let statusBar: vscode.StatusBarItem;

let mode: Mode = 'work';
let secondsLeft = WORK_MINUTES * 60;
let running = false;
let interval: NodeJS.Timeout | undefined;

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
	secondsLeft = WORK_MINUTES * 60;
	updateStatusBar();
}

// вызывается каждую секунду
function tick() {
	secondsLeft--;

	if (secondsLeft <= 0) {
		if (mode === 'work') {
			mode = 'break';
			secondsLeft = BREAK_MINUTES * 60;
			vscode.window.showInformationMessage('Работа закончена! Время отдохнуть ' + BREAK_MINUTES + ' мин.');
		} else {
			mode = 'work';
			secondsLeft = WORK_MINUTES * 60;
			vscode.window.showInformationMessage('Отдых закончен, возвращаемся к работе!');
		}
	}

	updateStatusBar();
}

export function activate(context: vscode.ExtensionContext) {
	console.log('Timer for work запущен');

	// элемент в строке состояния справа
	statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	updateStatusBar();
	statusBar.show();
	context.subscriptions.push(statusBar);

	// регистрируем команды
	context.subscriptions.push(
		vscode.commands.registerCommand('timer-for-work.start', startTimer),
		vscode.commands.registerCommand('timer-for-work.pause', pauseTimer),
		vscode.commands.registerCommand('timer-for-work.stop', resetTimer)
	);
}

export function deactivate() {
	if (interval) {
		clearInterval(interval);
	}
}