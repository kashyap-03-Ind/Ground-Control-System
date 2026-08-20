class ErrorSystem {
  constructor() {
    this.currentCode = '0000';
    this.listeners = [];
    this.errorLog = [];
    this.maxLogEntries = 50;
  }

  evaluate(telemetryData) {
    const d = telemetryData;
    let d1 = '0', d2 = '0', d3 = '0', d4 = '0';

    if (d.descentRate < 8 || d.descentRate > 10) {
      d1 = '1';
    }

    if (d.gpsStatus !== 'LOCKED' || d.gpsSatellites < 4) {
      d2 = '1';
    }

    if (d.payloadStatus === 'FAILURE' || d.payloadBattery < 5) {
      d3 = '1';
    }

    const emergencyTriggered = d.descentRate > 12 || d.altitude < 100;
    if (emergencyTriggered) {
      d4 = '1';
    }

    const newCode = d1 + d2 + d3 + d4;

    if (newCode !== this.currentCode) {
      this.currentCode = newCode;
      this.logError(d1, d2, d3, d4);
    }

    this.notifyListeners(this.currentCode);
    return this.currentCode;
  }

  getMessage(code) {
    const messages = {
      '0000': 'ALL SYSTEMS NOMINAL',
      '1000': 'UNSAFE DESCENT RATE',
      '0100': 'GPS SIGNAL LOST',
      '0010': 'PAYLOAD SEPARATION FAILURE',
      '0001': 'EMERGENCY PARACHUTE ACTIVE',
      '1100': 'DESCENT + GPS FAULT',
      '1010': 'DESCENT + PAYLOAD FAULT',
      '1001': 'DESCENT + PARACHUTE ACTIVE',
      '0110': 'GPS + PAYLOAD FAULT',
      '0101': 'GPS LOST + PARACHUTE ACTIVE',
      '0011': 'PAYLOAD FAIL + PARACHUTE',
      '1110': 'MULTIPLE SYSTEM FAULTS',
      '1101': 'MULTIPLE SYSTEM FAULTS',
      '1011': 'MULTIPLE SYSTEM FAULTS',
      '0111': 'MULTIPLE SYSTEM FAULTS',
      '1111': 'CRITICAL EMERGENCY - ALL SYSTEMS FAIL'
    };
    return messages[code] || `ERROR CODE ${code}`;
  }

  logError(d1, d2, d3, d4) {
    const faults = [];
    let severity = 'info';
    if (d1 === '1') { faults.push('Unsafe descent rate'); severity = 'warn'; }
    if (d2 === '1') { faults.push('GPS lost'); severity = 'warn'; }
    if (d3 === '1') { faults.push('Payload failure'); severity = 'error'; }
    if (d4 === '1') { faults.push('Parachute activated'); severity = 'error'; }

    if (faults.length === 0) {
      faults.push('All systems restored to nominal');
      severity = 'info';
    }

    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    this.errorLog.unshift({
      time,
      code: this.currentCode,
      description: faults.join('; '),
      severity
    });

    if (this.errorLog.length > this.maxLogEntries) {
      this.errorLog.pop();
    }
  }

  getLog() {
    return this.errorLog;
  }

  addListener(fn) {
    this.listeners.push(fn);
  }

  notifyListeners(code) {
    this.listeners.forEach(fn => fn(code));
  }

  reset() {
    this.currentCode = '0000';
    this.errorLog = [];
  }
}

window.ErrorSystem = ErrorSystem;
