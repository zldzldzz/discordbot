const WEEKDAY_MAP = {
  "일": 0,
  "일요일": 0,
  "월": 1,
  "월요일": 1,
  "화": 2,
  "화요일": 2,
  "수": 3,
  "수요일": 3,
  "목": 4,
  "목요일": 4,
  "금": 5,
  "금요일": 5,
  "토": 6,
  "토요일": 6
};

const WEEKDAY_LABELS = [
  "일요일",
  "월요일",
  "화요일",
  "수요일",
  "목요일",
  "금요일",
  "토요일"
];

function parseWeekday(input) {
  const value = String(input).trim();
  const weekday = WEEKDAY_MAP[value];

  if (weekday === undefined) {
    throw new Error("요일 형식이 올바르지 않습니다. 예: 월, 월요일, 화, 화요일");
  }

  return weekday;
}

function formatWeekday(weekday) {
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
    throw new Error("요일 값이 올바르지 않습니다.");
  }

  return WEEKDAY_LABELS[weekday];
}

module.exports = {
  parseWeekday,
  formatWeekday
};