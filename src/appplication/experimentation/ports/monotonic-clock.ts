export interface MonotonicClock {
  originId: string;
  nowMs(): number;
}
