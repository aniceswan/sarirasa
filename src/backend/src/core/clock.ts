export interface Clock {
  now(): Date;
}
export const systemClock: Clock = { now: () => new Date() };
export class TestClock implements Clock {
  constructor(private instant = new Date('2026-10-05T12:00:00Z')) {}
  now() {
    return new Date(this.instant);
  }
  advance(ms: number) {
    this.instant = new Date(this.instant.getTime() + ms);
  }
  set(at: Date) {
    this.instant = new Date(at);
  }
}
