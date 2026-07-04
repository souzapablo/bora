export class Email {
  readonly value: string;

  constructor(raw: string) {
    this.value = raw.trim().toLowerCase();
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }
}
