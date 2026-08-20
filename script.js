(function() {
  'use strict';

  const telemetry = new TelemetrySystem();
  const errorSystem = new ErrorSystem();
  const missionControl = new MissionControl();
  const graphs = new GraphManager();
  const mapManager = new MapManager();

  let isDarkMode = true;
  let telemetryRunning = false;
  let previousData = null;

  function init() {
    graphs.initAll();
    mapManager.init();

    setupControlBar();
    setupTelemetryTabs();
    setupMissionCommands();
    setupVideo();
    setupMapControls();
    setupGraphReset();
    setupSettings();

    missionControl.addListener(handleMissionEvent);
    telemetry.addListener(handleTelemetryData);
    errorSystem.addListener(updateErrorDisplay);

    updateClock();
    setInterval(updateClock, 1000);

    populateCameraSelect();

    addLogEntry('System initialized', 'info');
    missionControl.setMissionState('STANDING BY');
  }

  function setupControlBar() {
    document.querySelectorAll('.ctrl-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const action = this.dataset.action;
        handleControlAction(action, this);
      });
    });
  }

  function handleControlAction(action, btn) {
    switch (action) {
      case 'start':
        startTelemetry();
        break;
      case 'stop':
        stopTelemetry();
        break;
      case 'pause':
        pauseTelemetry();
        break;
      case 'resume':
        resumeTelemetry();
        break;
      case 'connect-serial':
        connectSerial();
        break;
      case 'disconnect-serial':
        disconnectSerial();
        break;
      case 'export-csv':
        exportCSV();
        break;
      case 'export-graph':
        graphs.exportAll();
        showNotification('Graphs exported as PNG', 'success');
        break;
      case 'sync-time':
        syncTime();
        break;
      case 'reset-packets':
        resetPackets();
        break;
      case 'dark-mode':
        toggleDarkMode();
        break;
      case 'fullscreen':
        toggleFullscreen();
        break;
      case 'settings':
        showSettings();
        break;
    }
  }

  function startTelemetry() {
    if (telemetryRunning) return;
    telemetry.start(1000);
    telemetryRunning = true;
    missionControl.setMissionState('IN FLIGHT');
    setConnectionStatus(true);
    addLogEntry('Telemetry started', 'info');
    toggleButtons(['start'], true);
    toggleButtons(['stop', 'pause'], false);
  }

  function stopTelemetry() {
    telemetry.stop();
    telemetryRunning = false;
    missionControl.setMissionState('COMPLETED');
    setConnectionStatus(false);
    addLogEntry('Telemetry stopped', 'info');
    toggleButtons(['start', 'resume'], false);
    toggleButtons(['stop', 'pause'], true);
  }

  function pauseTelemetry() {
    telemetry.pause();
    addLogEntry('Telemetry paused', 'warn');
    toggleButtons(['pause'], true);
    toggleButtons(['resume'], false);
  }

  function resumeTelemetry() {
    telemetry.resume();
    addLogEntry('Telemetry resumed', 'info');
    toggleButtons(['pause'], false);
    toggleButtons(['resume'], true);
  }

  function connectSerial() {
    addLogEntry('Serial connection requested', 'info');
    showNotification('Serial: Port selection dialog opened', 'info');
    toggleButtons(['connect-serial'], true);
    toggleButtons(['disconnect-serial'], false);
    setConnectionStatus(true);
  }

  function disconnectSerial() {
    addLogEntry('Serial disconnected', 'warn');
    if (telemetryRunning) stopTelemetry();
    toggleButtons(['disconnect-serial'], true);
    toggleButtons(['connect-serial'], false);
    setConnectionStatus(false);
  }

  function exportCSV() {
    const csv = telemetry.exportCSV();
    if (!csv) {
      showNotification('No telemetry data to export', 'error');
      return;
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cansat_telemetry_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('CSV exported successfully', 'success');
  }

  function syncTime() {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    addLogEntry(`PC time synced: ${timeStr}`, 'info');
    showNotification(`Time synced: ${timeStr}`, 'success');
  }

  function resetPackets() {
    if (telemetryRunning) stopTelemetry();
    telemetry.reset();
    graphs.resetAll();
    mapManager.reset();
    errorSystem.reset();
    updateTelemetryDisplay(telemetry.getInitialData());
    updateErrorDisplay('0000');
    addLogEntry('All packets and data reset', 'warn');
    showNotification('Telemetry data reset', 'success');
  }

  function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    document.body.style.filter = isDarkMode ? 'none' : 'invert(1) hue-rotate(180deg)';
    const icon = document.querySelector('[data-action="dark-mode"] i');
    icon.className = isDarkMode ? 'fas fa-moon' : 'fas fa-sun';
    addLogEntry(`Dark mode: ${isDarkMode ? 'ON' : 'OFF'}`, 'info');
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  function showSettings() {
    addLogEntry('Settings panel requested', 'info');
    showNotification('Settings - Feature placeholder', 'info');
  }

  function handleTelemetryData(data) {
    updateTelemetryDisplay(data);
    graphs.update(data);
    errorSystem.evaluate(data);
    mapManager.updatePosition(data.latitude, data.longitude);
    updateMissionStats(data);
    updateFooterInfo(data);
    previousData = data;
  }

  function updateTelemetryDisplay(data) {
    document.getElementById('current-packet').textContent = `PACKET: ${String(data.packetNumber).padStart(3, '0')}`;

    const containerEls = document.querySelectorAll('#container-telemetry .telem-item');
    containerEls.forEach(item => {
      const key = item.dataset.key;
      if (data[key] !== undefined) {
        const valEl = item.querySelector('.telem-value');
        const oldVal = valEl.textContent;
        let newVal = formatValue(key, data[key]);
        valEl.textContent = newVal;

        if (oldVal !== newVal) {
          item.classList.add('highlight');
          setTimeout(() => item.classList.remove('highlight'), 500);
        }

        applyTelemetryColor(item, key, data[key]);
      }
    });

    const payloadEls = document.querySelectorAll('#payload-telemetry .telem-item');
    payloadEls.forEach(item => {
      const key = item.dataset.key;
      if (data[key] !== undefined) {
        const valEl = item.querySelector('.telem-value');
        valEl.textContent = formatValue(key, data[key]);
        applyTelemetryColor(item, key, data[key]);
      }
    });
  }

  function formatValue(key, value) {
    const formats = {
      altitude: v => `${Math.round(v)} m`,
      pressure: v => `${Math.round(v)} hPa`,
      temperature: v => `${v.toFixed(1)}°C`,
      humidity: v => `${Math.round(v)}%`,
      voltage: v => `${v.toFixed(1)} V`,
      battery: v => `${Math.round(v)}%`,
      latitude: v => v.toFixed(4),
      longitude: v => v.toFixed(4),
      gpsSatellites: v => `${Math.round(v)}`,
      roll: v => `${v.toFixed(0)}°`,
      pitch: v => `${v.toFixed(0)}°`,
      yaw: v => `${v.toFixed(0)}°`,
      speed: v => `${v.toFixed(1)} m/s`,
      descentRate: v => `${v.toFixed(1)} m/s`,
      accelX: v => `${v.toFixed(2)} m/s²`,
      accelY: v => `${v.toFixed(2)} m/s²`,
      accelZ: v => `${v.toFixed(2)} m/s²`,
      gyro: v => `${v.toFixed(2)} °/s`,
      magnetometer: v => `${v.toFixed(1)} µT`,
      rssi: v => `${Math.round(v)} dBm`,
      signalStrength: v => `${Math.round(v)}%`,
      missionTime: v => v,
      gpsStatus: v => v,
      payloadStatus: v => v,
      payloadTemp: v => `${v.toFixed(1)}°C`,
      payloadHumidity: v => `${Math.round(v)}%`,
      payloadPressure: v => `${Math.round(v)} hPa`,
      payloadVoltage: v => `${v.toFixed(1)} V`,
      payloadBattery: v => `${Math.round(v)}%`,
      payloadPacket: v => `${Math.round(v)}`
    };
    return formats[key] ? formats[key](value) : String(value);
  }

  function applyTelemetryColor(item, key, value) {
    const valEl = item.querySelector('.telem-value');
    valEl.className = 'telem-value';

    const critical = item.querySelector('.telem-value.status-green, .telem-value.status-yellow, .telem-value.status-red');
    if (critical) critical.className = 'telem-value';

    if (key === 'battery' && value < 20) valEl.classList.add('status-red');
    else if (key === 'battery' && value < 40) valEl.classList.add('status-yellow');
    else if (key === 'descentRate' && (value < 8 || value > 10)) valEl.classList.add('status-red');
    else if (key === 'gpsStatus' && value === 'LOCKED') valEl.classList.add('status-green');
    else if (key === 'gpsStatus' && value === 'SEARCHING') valEl.classList.add('status-yellow');
    else if (key === 'signalStrength' && value < 50) valEl.classList.add('status-red');
    else if (key === 'signalStrength' && value < 70) valEl.classList.add('status-yellow');
    else if (key === 'temperature' && (value < 5 || value > 45)) valEl.classList.add('status-red');
    else if (key === 'altitude' && value < 100) valEl.classList.add('status-yellow');
  }

  function updateErrorDisplay(code) {
    const digits = code.split('');
    document.querySelectorAll('.error-digit').forEach((el, i) => {
      const digit = digits[i];
      el.textContent = digit;
      el.classList.toggle('fault', digit === '1');
    });

    const msgEl = document.getElementById('error-message');
    msgEl.textContent = errorSystem.getMessage(code);
    msgEl.classList.toggle('fault', code !== '0000');

    const logList = document.getElementById('error-log-list');
    logList.innerHTML = '';
    const logs = errorSystem.getLog();
    logs.slice(0, 8).forEach(log => {
      const div = document.createElement('div');
      div.className = `log-entry log-severity-${log.severity}`;
      div.innerHTML = `<span class="log-time">${log.time}</span><span class="log-msg">[${log.code}] ${log.description}</span>`;
      logList.appendChild(div);
    });
  }

  function updateMissionStats(data) {
    document.getElementById('mission-timer').textContent = data.missionTime;
    document.getElementById('packet-counter').textContent = data.packetNumber;
    document.getElementById('signal-strength').textContent = `${data.rssi} dBm`;
  }

  function updateOrientation(data) {
    document.getElementById('orient-roll').textContent = `${data.roll.toFixed(0)}°`;
    document.getElementById('orient-pitch').textContent = `${data.pitch.toFixed(0)}°`;
    document.getElementById('orient-yaw').textContent = `${data.yaw.toFixed(0)}°`;

    const horizonInner = document.getElementById('horizon-inner');
    if (horizonInner) {
      horizonInner.style.transform = `rotate(${data.roll}deg) translateY(${data.pitch * 0.5}px)`;
    }
    document.getElementById('horizon-roll').textContent = `${data.roll.toFixed(0)}°`;
    document.getElementById('horizon-pitch').textContent = `${data.pitch.toFixed(0)}°`;
  }

  function setupTelemetryTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.telemetry-content').forEach(c => c.classList.remove('active'));
        this.classList.add('active');
        document.getElementById(this.dataset.tab + '-telemetry').classList.add('active');
      });
    });
  }

  function setupMissionCommands() {
    document.querySelectorAll('.cmd-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const cmd = this.dataset.cmd;
        const cmdName = this.textContent.trim().toUpperCase().replace(/\s+/g, '_');
        executeMissionCommand(cmd, cmdName);
      });
    });
  }

  function executeMissionCommand(cmd, cmdName) {
    if (cmd === 'abort' || cmd === 'reset' || cmd === 'parachute') {
      if (!confirm(`ARE YOU SURE you want to execute ${cmdName}?`)) return;
    }

    missionControl.executeCommand(cmdName);
    showNotification(`Command: ${cmdName}`, 'info');
  }

  function handleMissionEvent(type, data) {
    if (type === 'log') {
      addLogEntry(data.message, data.severity);
    }
    if (type === 'queue') {
      updateCommandQueue(data);
    }
    if (type === 'state') {
      document.getElementById('mission-phase').textContent = data;
      document.getElementById('status-mission').textContent = data;
    }
  }

  function updateCommandQueue(queue) {
    const list = document.getElementById('queue-list');
    document.getElementById('queue-count').textContent = queue.length;
    if (queue.length === 0) {
      list.innerHTML = '<div class="queue-empty">No pending commands</div>';
      return;
    }
    list.innerHTML = '';
    queue.forEach(entry => {
      const div = document.createElement('div');
      div.className = 'queue-item';
      div.innerHTML = `<span>${entry.command}</span><span>${entry.status}</span>`;
      list.appendChild(div);
    });
  }

  function addLogEntry(message, severity = 'info') {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const logList = document.getElementById('mission-log-list');
    const div = document.createElement('div');
    div.className = `log-entry log-severity-${severity}`;
    div.innerHTML = `<span class="log-time">${time}</span><span class="log-msg">${message}</span>`;
    logList.insertBefore(div, logList.firstChild);

    if (logList.children.length > 50) {
      logList.removeChild(logList.lastChild);
    }
  }

  function updateFooterInfo(data) {
    document.getElementById('status-packets').textContent = data.packetNumber;
  }

  function setConnectionStatus(connected) {
    const indicator = document.getElementById('connection-indicator');
    const dot = document.getElementById('indicator-dot');
    const text = document.getElementById('indicator-text');
    const statusConn = document.getElementById('status-connection');

    if (connected) {
      indicator.classList.add('connected');
      text.textContent = 'CONNECTED';
      statusConn.textContent = 'CONNECTED';
      statusConn.className = 'status-success';
    } else {
      indicator.classList.remove('connected');
      text.textContent = 'DISCONNECTED';
      statusConn.textContent = 'DISCONNECTED';
      statusConn.className = 'status-danger';
    }
  }

  function toggleButtons(actions, disabled) {
    actions.forEach(action => {
      document.querySelectorAll(`[data-action="${action}"]`).forEach(btn => {
        btn.disabled = disabled;
      });
    });
  }

  function updateClock() {
    const now = new Date();
    document.getElementById('status-clock').textContent = now.toLocaleTimeString('en-GB', { hour12: false });
  }

  function setupVideo() {
    let mediaStream = null;
    let recording = false;
    let fpsCount = 0;
    let fpsTime = Date.now();

    document.getElementById('video-start').addEventListener('click', async () => {
      try {
        const deviceId = document.getElementById('camera-select').value;
        const constraints = { video: { deviceId: deviceId ? { exact: deviceId } : undefined } };
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        const video = document.getElementById('live-video');
        video.srcObject = mediaStream;
        video.style.display = 'block';
        document.getElementById('video-placeholder').style.display = 'none';
        document.getElementById('video-start').disabled = true;
        document.getElementById('video-stop').disabled = false;
        addLogEntry('Video stream started', 'info');
      } catch (err) {
        showNotification('Camera access denied or unavailable', 'error');
      }
    });

    document.getElementById('video-stop').addEventListener('click', () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(t => t.stop());
        mediaStream = null;
      }
      document.getElementById('live-video').style.display = 'none';
      document.getElementById('video-placeholder').style.display = 'flex';
      document.getElementById('video-start').disabled = false;
      document.getElementById('video-stop').disabled = true;
      addLogEntry('Video stream stopped', 'info');
    });

    document.getElementById('video-snapshot').addEventListener('click', () => {
      const video = document.getElementById('live-video');
      if (!video.srcObject) { showNotification('No video to capture', 'error'); return; }
      const canvas = document.getElementById('video-canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      const link = document.createElement('a');
      link.download = `cansat_snapshot_${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showNotification('Snapshot captured', 'success');
    });

    setInterval(() => {
      const fps = document.getElementById('live-video');
      if (fps.srcObject) {
        fpsCount++;
        const now = Date.now();
        if (now - fpsTime >= 1000) {
          document.getElementById('video-fps').textContent = `${fpsCount} FPS`;
          fpsCount = 0;
          fpsTime = now;
        }
      }
    }, 200);
  }

  async function populateCameraSelect() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      const select = document.getElementById('camera-select');
      select.innerHTML = '<option value="">Default Camera</option>';
      videoDevices.forEach(device => {
        const opt = document.createElement('option');
        opt.value = device.deviceId;
        opt.textContent = device.label || `Camera ${select.children.length}`;
        select.appendChild(opt);
      });
    } catch (e) {
      // Camera enumeration not supported or denied
    }
  }

  function setupMapControls() {
    document.getElementById('map-recenter').addEventListener('click', () => {
      mapManager.recenter();
    });

    setInterval(() => {
      document.getElementById('map-distance').textContent = `Dist: ${mapManager.getDistance().toFixed(2)} km`;
      if (previousData) {
        document.getElementById('map-coords').textContent =
          `${previousData.latitude.toFixed(4)}, ${previousData.longitude.toFixed(4)}`;
      }
    }, 1000);
  }

  function setupGraphReset() {
    document.getElementById('graph-reset-btn').addEventListener('click', () => {
      graphs.resetAll();
      showNotification('Graphs reset', 'success');
    });
  }

  function setupSettings() {
    // Settings modal placeholder - could be expanded
  }

  function showNotification(message, type = 'info') {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    Object.assign(notification.style, {
      position: 'fixed',
      bottom: '50px',
      right: '20px',
      padding: '10px 20px',
      borderRadius: '8px',
      fontFamily: "'Roboto Mono', monospace",
      fontSize: '12px',
      zIndex: '1000',
      animation: 'fadeIn 0.3s',
      border: '1px solid',
      backdropFilter: 'blur(10px)'
    });

    const colors = {
      success: { bg: 'rgba(0,230,118,0.15)', border: '#00E676', color: '#00E676' },
      error: { bg: 'rgba(255,23,68,0.15)', border: '#FF1744', color: '#FF1744' },
      info: { bg: 'rgba(74,122,255,0.15)', border: '#4A7AFF', color: '#4A7AFF' }
    };
    const c = colors[type] || colors.info;
    notification.style.background = c.bg;
    notification.style.borderColor = c.border;
    notification.style.color = c.color;

    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
