class MissionControl {
  constructor() {
    this.commandQueue = [];
    this.history = [];
    this.logs = [];
    this.maxLogs = 100;
    this.listeners = [];
    this.executing = false;
    this.missionState = 'STANDING BY';
    this.missionStartTime = null;
  }

  executeCommand(command) {
    return new Promise((resolve) => {
      const entry = {
        command,
        timestamp: new Date().toISOString(),
        status: 'pending',
        id: Date.now()
      };

      this.commandQueue.push(entry);
      this.notifyListeners('queue', this.commandQueue);

      this.addLog(`Command queued: ${command}`, 'info');

      this.processQueue().then(resolve);
    });
  }

  async processQueue() {
    if (this.executing || this.commandQueue.length === 0) return;
    this.executing = true;

    while (this.commandQueue.length > 0) {
      const entry = this.commandQueue[0];
      entry.status = 'executing';
      this.notifyListeners('queue', this.commandQueue);

      this.addLog(`Executing: ${entry.command}`, 'warn');

      await this.delay(1500);

      entry.status = 'completed';
      this.commandQueue.shift();
      this.history.push(entry);
      this.notifyListeners('queue', this.commandQueue);
      this.notifyListeners('history', entry);

      const severity = entry.command === 'ABORT' ? 'error' : 'info';
      this.addLog(`Command executed: ${entry.command}`, severity);
    }

    this.executing = false;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  addLog(message, severity = 'info') {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    this.logs.unshift({ time, message, severity });
    if (this.logs.length > this.maxLogs) this.logs.pop();
    this.notifyListeners('log', { time, message, severity });
  }

  setMissionState(state) {
    this.missionState = state;
    this.notifyListeners('state', state);
    this.addLog(`Mission state: ${state}`, 'info');
  }

  addListener(fn) {
    this.listeners.push(fn);
  }

  notifyListeners(type, data) {
    this.listeners.forEach(fn => fn(type, data));
  }

  clearQueue() {
    this.commandQueue = [];
    this.notifyListeners('queue', this.commandQueue);
    this.addLog('Command queue cleared', 'warn');
  }

  reset() {
    this.commandQueue = [];
    this.history = [];
    this.logs = [];
    this.missionState = 'STANDING BY';
    this.missionStartTime = null;
    this.executing = false;
  }
}

window.MissionControl = MissionControl;
