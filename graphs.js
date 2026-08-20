class GraphManager {
  constructor() {
    this.charts = {};
    this.maxDataPoints = 100;
    this.chartConfigs = {
      'chart-altitude': { label: 'Altitude (m)', color: '#4A7AFF', min: 0, max: 1000 },
      'chart-temperature': { label: 'Temperature (°C)', color: '#FF9100', min: 10, max: 40 },
      'chart-pressure': { label: 'Pressure (hPa)', color: '#00E676', min: 900, max: 1000 },
      'chart-battery': { label: 'Battery (%)', color: '#00E5FF', min: 0, max: 100 },
      'chart-voltage': { label: 'Voltage (V)', color: '#E040FB', min: 5, max: 9 },
      'chart-humidity': { label: 'Humidity (%)', color: '#FF6F00', min: 0, max: 100 },
      'chart-descent': { label: 'Descent (m/s)', color: '#FF1744', min: 0, max: 15 },
      'chart-speed': { label: 'Speed (m/s)', color: '#76FF03', min: 0, max: 30 },
      'chart-signal': { label: 'Signal (%)', color: '#FFD600', min: 0, max: 100 }
    };
  }

  initAll() {
    Object.keys(this.chartConfigs).forEach(id => {
      this.createChart(id);
    });
  }

  createChart(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');
    const config = this.chartConfigs[canvasId];

    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: config.label,
          data: [],
          borderColor: config.color,
          backgroundColor: config.color + '20',
          borderWidth: 1.5,
          pointRadius: 0,
          pointHitRadius: 5,
          tension: 0.3,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300 },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1A2140',
            titleColor: '#E8EEF8',
            bodyColor: '#E8EEF8',
            borderColor: '#4A7AFF',
            borderWidth: 1,
            displayColors: false,
            callbacks: {
              title: (items) => `Packet ${items[0].label}`,
              label: (item) => `${item.raw.toFixed(1)}`
            }
          },
          crosshair: {
            line: { color: '#4A7AFF', width: 1 }
          }
        },
        scales: {
          x: {
            display: true,
            grid: { color: 'rgba(42,58,106,0.3)', drawBorder: false },
            ticks: { color: '#8899BB', font: { size: 8, family: 'Roboto Mono' }, maxTicksLimit: 8 }
          },
          y: {
            display: true,
            grid: { color: 'rgba(42,58,106,0.3)', drawBorder: false },
            ticks: { color: '#8899BB', font: { size: 8, family: 'Roboto Mono' } },
            min: config.min,
            max: config.max
          }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        }
      }
    });

    this.charts[canvasId] = chart;
    return chart;
  }

  update(telemetryData) {
    const d = telemetryData;
    const packetNum = d.packetNumber;

    const dataMap = {
      'chart-altitude': d.altitude,
      'chart-temperature': d.temperature,
      'chart-pressure': d.pressure,
      'chart-battery': d.battery,
      'chart-voltage': d.voltage,
      'chart-humidity': d.humidity,
      'chart-descent': d.descentRate,
      'chart-speed': d.speed,
      'chart-signal': d.signalStrength
    };

    Object.keys(dataMap).forEach(canvasId => {
      const chart = this.charts[canvasId];
      if (!chart) return;

      chart.data.labels.push(packetNum);
      chart.data.datasets[0].data.push(dataMap[canvasId]);

      if (chart.data.labels.length > this.maxDataPoints) {
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
      }

      chart.update('none');
    });
  }

  resetAll() {
    Object.keys(this.charts).forEach(canvasId => {
      const chart = this.charts[canvasId];
      chart.data.labels = [];
      chart.data.datasets[0].data = [];
      chart.update();
    });
  }

  exportAll() {
    Object.keys(this.charts).forEach(canvasId => {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;
      const link = document.createElement('a');
      link.download = `${canvasId}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    });
  }
}

window.GraphManager = GraphManager;
