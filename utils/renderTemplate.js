function getSeoulParts(date) {
  const formatter = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "long",
    hour12: false
  });

  const parts = formatter.formatToParts(date);
  const map = {};

  for (const part of parts) {
    map[part.type] = part.value;
  }

  return {
    date: `${map.year}-${map.month}-${map.day}`,
    time: `${map.hour}:${map.minute}`,
    weekday: map.weekday
  };
}

function renderTemplate(template, date) {
  const { date: formattedDate, time, weekday } = getSeoulParts(date);

  return String(template)
    .replaceAll("${날짜}", formattedDate)
    .replaceAll("${시간}", time)
    .replaceAll("${요일}", weekday);
}

function formatSeoulDateTime(date) {
  const { date: formattedDate, time, weekday } = getSeoulParts(date);
  return `${formattedDate} ${time} (${weekday})`;
}

module.exports = {
  renderTemplate,
  formatSeoulDateTime
};