class TelemetrySystem {
  constructor() {
    this.packetCount = 0;
    this.missionTime = 0;
    this.currentData = this.getInitialData();
    this.history = [];
    this.maxHistory = 500;
    this.running = false;
    this.paused = false;
    this.intervalId = null;
    this.listeners = [];
    this.startLat = 28.6139;
    this.startLng = 77.2090;
  }

  getInitialData() {
    return {
      packetNumber: 0,
      missionTime: '00:00:00',
      altitude: 485,
      pressure: 943,
      temperature: 24,
      humidity: 55,
      voltage: 7.6,
      battery: 82,
      latitude: this.startLat,
      longitude: this.startLng,
      gpsSatellites: 8,
      roll: 0,
      pitch: 0,
      yaw: 0,
      speed: 14,
      descentRate: 8.5,
      accelX: 0.02,
      accelY: 0.01,
      accelZ: 9.81,
      gyro: 0.05,
      magnetometer: 48.2,
      rssi: -45,
      signalStrength: 92,
      gpsStatus: 'LOCKED',
      payloadPacket: 0,
      payloadTemp: 22,
      payloadHumidity: 50,
      payloadPressure: 940,
      payloadVoltage: 5.1,
      payloadBattery: 78,
      payloadStatus: 'NOMINAL'
    };
  }

  generatePacket() {
    if (this.paused) return null;
    this.packetCount++;
    this.missionTime += 1;
    const d = this.currentData;

    d.packetNumber = this.packetCount;
    const hrs = Math.floor(this.missionTime / 3600);
    const mins = Math.floor((this.missionTime % 3600) / 60);
    const secs = this.missionTime % 60;
    d.missionTime = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    d.altitude = Math.max(0, d.altitude + (Math.random() - 0.48) * 5);
    d.pressure = Math.max(900, d.pressure + (Math.random() - 0.5) * 2);
    d.temperature = d.temperature + (Math.random() - 0.5) * 0.5;
    d.humidity = Math.max(10, Math.min(100, d.humidity + (Math.random() - 0.5) * 1));
    d.voltage = Math.max(5.0, Math.min(8.4, d.voltage + (Math.random() - 0.5) * 0.05));
    d.battery = Math.max(5, Math.min(100, d.battery - 0.01));

    d.latitude += (Math.random() - 0.5) * 0.0005;
    d.longitude += (Math.random() - 0.5) * 0.0005;
    d.gpsSatellites = Math.max(4, Math.min(16, d.gpsSatellites + (Math.random() > 0.95 ? (Math.random() > 0.5 ? 1 : -1) : 0)));

    d.roll = (d.roll + (Math.random() - 0.5) * 2) % 360;
    d.pitch = Math.max(-90, Math.min(90, d.pitch + (Math.random() - 0.5) * 1));
    d.yaw = (d.yaw + (Math.random() - 0.5) * 3) % 360;

    d.speed = Math.max(0, d.speed + (Math.random() - 0.48) * 0.5);
    d.descentRate = Math.max(5, Math.min(15, d.descentRate + (Math.random() - 0.5) * 0.3));
    d.accelX = (Math.random() - 0.5) * 0.1;
    d.accelY = (Math.random() - 0.5) * 0.1;
    d.accelZ = 9.81 + (Math.random() - 0.5) * 0.1;
    d.gyro = (Math.random() - 0.5) * 0.2;
    d.magnetometer = 48 + (Math.random() - 0.5) * 2;
    d.rssi = Math.max(-100, Math.min(-30, d.rssi + (Math.random() - 0.5) * 1));
    d.signalStrength = Math.max(40, Math.min(100, d.signalStrength + (Math.random() - 0.5) * 1));
    d.gpsStatus = d.gpsSatellites >= 4 ? 'LOCKED' : 'SEARCHING';

    d.payloadPacket = d.packetNumber;
    d.payloadTemp = d.temperature - 2 + (Math.random() - 0.5) * 0.5;
    d.payloadHumidity = d.humidity + (Math.random() - 0.5) * 2;
    d.payloadPressure = d.pressure - 3 + (Math.random() - 0.5) * 1;
    d.payloadVoltage = Math.max(3.3, Math.min(5.5, d.payloadVoltage + (Math.random() - 0.5) * 0.02));
    d.payloadBattery = Math.max(5, Math.min(100, d.payloadBattery - 0.005));
    d.payloadStatus = d.payloadBattery > 10 ? 'NOMINAL' : 'LOW POWER';

    this.history.push({ ...d });
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    this.notifyListeners(d);
    return d;
  }

  start(intervalMs = 1000) {
    if (this.running) return;
    this.running = true;
    this.paused = false;
    this.intervalId = setInterval(() => this.generatePacket(), intervalMs);
  }

  stop() {
    this.running = false;
    this.paused = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
  }

  reset() {
    this.stop();
    this.packetCount = 0;
    this.missionTime = 0;
    this.currentData = this.getInitialData();
    this.history = [];
  }

  addListener(fn) {
    this.listeners.push(fn);
  }

  notifyListeners(data) {
    this.listeners.forEach(fn => fn(data));
  }

  getHistory() {
    return this.history;
  }

  exportCSV() {
    if (this.history.length === 0) return null;
    const headers = Object.keys(this.history[0]);
    let csv = headers.join(',') + '\n';
    this.history.forEach(row => {
      csv += headers.map(h => row[h]).join(',') + '\n';
    });
    return csv;
  }
}

window.TelemetrySystem = TelemetrySystem;
