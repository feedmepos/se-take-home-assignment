class Bot {
  constructor(id) {
    this.id = id
    this.order = null
    this.status = "IDLE"
    this.timer = null
  }
}

module.exports = Bot