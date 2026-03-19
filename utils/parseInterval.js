function parseInterval(input) {
  const value = String(input).trim().toLowerCase();
  const match = /^(\d+)(m|h|d)$/.exec(value);

  if (!match) {
    throw new Error("간격 형식이 올바르지 않습니다. 예: 10m, 2h, 1d, 3d");
  }

  const amount = Number(match[1]);
  const unit = match[2];

  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("간격 값은 1 이상의 정수여야 합니다.");
  }

  switch (unit) {
    case "m":
      return amount * 60 * 1000;
    case "h":
      return amount * 60 * 60 * 1000;
    case "d":
      return amount * 24 * 60 * 60 * 1000;
    default:
      throw new Error("지원하지 않는 간격 단위입니다.");
  }
}

module.exports = {
  parseInterval
};