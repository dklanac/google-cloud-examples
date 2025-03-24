// Well class - represents a well entity
export class Well {
  constructor(id, lat, lng, name) {
    this.id = id;
    this.lat = lat;
    this.lng = lng;
    this.name = name;
    this.status = "online";
    this.marker = null;
  }

  getPosition() {
    return { lat: this.lat, lng: this.lng };
  }

  setStatus(status) {
    this.status = status;
  }

  isOnline() {
    return this.status === "online";
  }
}
