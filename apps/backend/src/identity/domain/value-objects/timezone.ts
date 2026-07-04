export function isValidIanaTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export class Timezone {
  readonly value: string;

  constructor(raw: string) {
    if (!isValidIanaTimezone(raw)) {
      throw new Error(`Invalid IANA timezone: ${raw}`);
    }

    this.value = raw;
  }
}
