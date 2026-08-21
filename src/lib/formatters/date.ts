export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Shanghai",
  }).format(new Date(value));
}

export function toShanghaiDateTimeLocalValue(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Shanghai",
    year: "numeric",
  })
    .formatToParts(value)
    .reduce<Record<string, string>>((result, part) => {
      if (part.type !== "literal") result[part.type] = part.value;
      return result;
    }, {});

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function toShanghaiTomorrowDateTimeLocalValue() {
  return toShanghaiDateTimeLocalValue(
    new Date(new Date().getTime() + 24 * 60 * 60 * 1000),
  );
}

export function getShanghaiDayRange(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Shanghai",
    year: "numeric",
  })
    .formatToParts(now)
    .reduce<Record<string, string>>((result, part) => {
      if (part.type !== "literal") result[part.type] = part.value;
      return result;
    }, {});

  const todayStart = new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00+08:00`);
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  return { todayStart: todayStart.toISOString(), tomorrowStart: tomorrowStart.toISOString() };
}

export function getShanghaiSecondDayAtTen(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Shanghai",
    year: "numeric",
  })
    .formatToParts(value)
    .reduce<Record<string, string>>((result, part) => {
      if (part.type !== "literal") result[part.type] = part.value;
      return result;
    }, {});
  const atTen = new Date(`${parts.year}-${parts.month}-${parts.day}T10:00:00+08:00`);
  return new Date(atTen.getTime() + 2 * 24 * 60 * 60 * 1000);
}

export function getShanghaiTomorrowAtTen(now = new Date()) {
  const { tomorrowStart } = getShanghaiDayRange(now);
  return new Date(new Date(tomorrowStart).getTime() + 10 * 60 * 60 * 1000);
}
