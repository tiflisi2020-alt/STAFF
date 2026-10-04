export type MinuteInterval = {
  start: number;
  end: number;
};

export function toMinutes(value: string) {
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }
  return hours * 60 + minutes;
}

export function toInterval(start: string, end: string): MinuteInterval | null {
  const startMinutes = toMinutes(start);
  const endMinutes = toMinutes(end);
  if (startMinutes === null || endMinutes === null || startMinutes === endMinutes) {
    return null;
  }

  return {
    start: startMinutes,
    end: endMinutes <= startMinutes ? endMinutes + 24 * 60 : endMinutes,
  };
}

export function intervalsOverlap(left: MinuteInterval, right: MinuteInterval) {
  return left.start < right.end && right.start < left.end;
}

export function intervalContains(outer: MinuteInterval, inner: MinuteInterval) {
  return outer.start <= inner.start && inner.end <= outer.end;
}
