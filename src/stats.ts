interface StatsData {
	projects: { [name: string]: number };
	days: { [date: string]: { seconds: number; cycles: number } };
}

// Учёт статистики
export class Stats{
    private data: StatsData;

    constructor() {
        this.data = { projects: {}, days: {} };
    }

    // Сегодняшняя дата
    private today(): string {
		const d = new Date();
		return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
	}

    private getDay() {
		const key = this.today();
		if (!this.data.days[key]) {
			this.data.days[key] = { seconds: 0, cycles: 0 };
		}
		return this.data.days[key];
	}

    addSecond(project: string) {
		if (!this.data.projects[project]) {
			this.data.projects[project] = 0;
		}
		this.data.projects[project]++;
		this.getDay().seconds++;
	}

    addCycle() {
		this.getDay().cycles++;
	}

    getProjects() {
		return this.data.projects;
	}

	getTodaySeconds(): number {
		return this.getDay().seconds;
	}

	getTodayCycles(): number {
		return this.getDay().cycles;
	}

    static formatHours(sec: number): string {
		const h = Math.floor(sec / 3600);
		const m = Math.floor((sec % 3600) / 60);
		if (h > 0) {
			return h + ' ч ' + m + ' мин';
		}
		return m + ' мин';
	}
}