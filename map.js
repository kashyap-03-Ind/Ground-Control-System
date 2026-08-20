class MapManager {
  constructor() {
    this.map = null;
    this.marker = null;
    this.trail = null;
    this.trailCoords = [];
    this.centerOnUpdate = true;
    this.totalDistance = 0;
    this.prevCoords = null;
  }

  init(containerId = 'gps-map') {
    this.map = L.map(containerId, {
      center: [28.6139, 77.2090],
      zoom: 15,
      zoomControl: true,
      attributionControl: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(this.map);

    const icon = L.divIcon({
      html: '<div style="background:#4A7AFF;width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 0 10px #4A7AFF;"></div>',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
      className: 'gps-marker'
    });

    this.marker = L.marker([28.6139, 77.2090], { icon }).addTo(this.map);

    this.trail = L.polyline([], {
      color: '#4A7AFF',
      weight: 2,
      opacity: 0.7
    }).addTo(this.map);

    return this;
  }

  updatePosition(lat, lng) {
    if (!this.map || !this.marker || !this.trail) return;

    const latlng = [lat, lng];
    this.marker.setLatLng(latlng);
    this.trailCoords.push(latlng);

    if (this.trailCoords.length > 200) {
      this.trailCoords.shift();
    }

    this.trail.setLatLngs(this.trailCoords);

    if (this.prevCoords) {
      const dist = this.map.distance(
        L.latLng(this.prevCoords),
        L.latLng(latlng)
      );
      this.totalDistance += dist / 1000;
    }
    this.prevCoords = latlng;

    if (this.centerOnUpdate) {
      this.map.setView(latlng, this.map.getZoom());
    }
  }

  recenter() {
    if (this.marker && this.map) {
      const pos = this.marker.getLatLng();
      this.map.setView(pos, this.map.getZoom());
      this.centerOnUpdate = true;
    }
  }

  getDistance() {
    return this.totalDistance;
  }

  reset() {
    this.trailCoords = [];
    this.totalDistance = 0;
    this.prevCoords = null;
    if (this.trail) this.trail.setLatLngs([]);
  }

  setCenterOnUpdate(val) {
    this.centerOnUpdate = val;
  }
}

window.MapManager = MapManager;
