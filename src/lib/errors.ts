export class SetupError extends Error {
  constructor() {
    super("Середовище Surreal Cloud ще не налаштовано.");
    this.name = "SetupError";
  }
}

export class AccessError extends Error {
  constructor(message = "У вас немає прав для цієї операції.") {
    super(message);
    this.name = "AccessError";
  }
}
