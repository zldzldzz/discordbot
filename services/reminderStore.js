const fs = require("fs");
const path = require("path");

class ReminderStore {
  constructor(baseDir) {
    this.baseDir = baseDir || path.join(process.cwd(), "data");
    this.filePath = path.join(this.baseDir, "reminders.json");
    this.ensureStorage();
  }

  ensureStorage() {
    fs.mkdirSync(this.baseDir, { recursive: true });

    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, "[]", "utf8");
    }
  }

  load() {
    try {
      const raw = fs.readFileSync(this.filePath, "utf8");
      const parsed = JSON.parse(raw);

      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed;
    } catch (error) {
      console.error("reminders.json 로드 실패", error);
      return [];
    }
  }

  save(reminders) {
    const json = JSON.stringify(reminders, null, 2);
    fs.writeFileSync(this.filePath, json, "utf8");
  }
}

module.exports = {
  ReminderStore,
};
