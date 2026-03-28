export class ErrDuplicateID extends Error {
  constructor(id: number) {
    super(`Order with ID ${id} already exists.`);
    this.name = this.constructor.name;
  }
}

export class ErrBotNotFound extends Error {
  constructor(id: number) {
    super(`Bot with ID ${id} not found.`);
    this.name = this.constructor.name;
  }
}
