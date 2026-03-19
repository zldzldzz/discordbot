const { randomUUID } = require("crypto");
const { ReminderStore } = require("./reminderStore");
const { renderTemplate, formatSeoulDateTime } = require("../utils/renderTemplate");
const { formatWeekday } = require("../utils/parseWeekday");

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

class ReminderManager {
  constructor(client) {
    this.client = client;
    this.store = new ReminderStore(process.env.DATA_DIR);
    this.reminders = new Map();
    this.timeouts = new Map();

    this.restoreReminders();
  }

  restoreReminders() {
    const loaded = this.store.load();
    const now = new Date();
    let changed = false;

    for (const item of loaded) {
      const reminder = this.deserializeReminder(item);
      if (!reminder) {
        changed = true;
        continue;
      }

      if (reminder.type === "WEEKLY") {
        if (reminder.nextRunAt.getTime() <= now.getTime()) {
          reminder.nextRunAt = this.getNextWeeklyRunAt({
            weekday: reminder.weekday,
            hour: reminder.hour,
            minute: reminder.minute,
            fromDate: now,
          });
          changed = true;
        }

        this.reminders.set(reminder.id, reminder);
        this.scheduleReminder(reminder.id);
        continue;
      }

      if (reminder.type === "ONETIME") {
        if (reminder.nextRunAt.getTime() <= now.getTime()) {
          changed = true;
          continue;
        }

        this.reminders.set(reminder.id, reminder);
        this.scheduleReminder(reminder.id);
      }
    }

    if (changed) {
      this.persist();
    }
  }

  deserializeReminder(item) {
    try {
      if (!item || !item.id || !item.type || !item.guildId || !item.channelId) {
        return null;
      }

      return {
        ...item,
        createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
        lastRunAt: item.lastRunAt ? new Date(item.lastRunAt) : null,
        nextRunAt: new Date(item.nextRunAt),
      };
    } catch (error) {
      console.error("알림 역직렬화 실패", error);
      return null;
    }
  }

  serializeReminder(reminder) {
    return {
      ...reminder,
      createdAt: reminder.createdAt?.toISOString?.() ?? null,
      lastRunAt: reminder.lastRunAt?.toISOString?.() ?? null,
      nextRunAt: reminder.nextRunAt.toISOString(),
    };
  }

  persist() {
    const serialized = [...this.reminders.values()].map((reminder) => this.serializeReminder(reminder));
    this.store.save(serialized);
  }

  addWeeklyReminder({ guildId, channelId, creatorId, weekday, hour, minute, messageTemplate }) {
    const nextRunAt = this.getNextWeeklyRunAt({
      weekday,
      hour,
      minute,
      fromDate: new Date(),
    });

    const reminder = {
      id: randomUUID(),
      type: "WEEKLY",
      guildId,
      channelId,
      creatorId,
      weekday,
      hour,
      minute,
      messageTemplate,
      nextRunAt,
      createdAt: new Date(),
      lastRunAt: null,
    };

    this.reminders.set(reminder.id, reminder);
    this.persist();
    this.scheduleReminder(reminder.id);

    return reminder;
  }

  addOneTimeReminder({ guildId, channelId, creatorId, year, month, day, hour, minute, messageTemplate }) {
    const nextRunAt = this.getSpecificDateRunAt({
      year,
      month,
      day,
      hour,
      minute,
    });

    if (nextRunAt.getTime() <= Date.now()) {
      throw new Error("특정 날짜 알림은 현재 시각 이후만 등록할 수 있습니다.");
    }

    const reminder = {
      id: randomUUID(),
      type: "ONETIME",
      guildId,
      channelId,
      creatorId,
      year,
      month,
      day,
      hour,
      minute,
      messageTemplate,
      nextRunAt,
      createdAt: new Date(),
      lastRunAt: null,
    };

    this.reminders.set(reminder.id, reminder);
    this.persist();
    this.scheduleReminder(reminder.id);

    return reminder;
  }

  removeReminder(id) {
    const timeout = this.timeouts.get(id);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(id);
    }

    this.reminders.delete(id);
    this.persist();
  }

  getReminder(id) {
    return this.reminders.get(id);
  }

  listRemindersByGuild(guildId) {
    return [...this.reminders.values()]
      .filter((reminder) => reminder.guildId === guildId)
      .sort((a, b) => a.nextRunAt.getTime() - b.nextRunAt.getTime());
  }

  count() {
    return this.reminders.size;
  }

  formatDateTime(date) {
    return formatSeoulDateTime(date);
  }

  formatSchedule(reminder) {
    if (reminder.type === "WEEKLY") {
      return `매주 ${formatWeekday(reminder.weekday)} ${String(reminder.hour).padStart(2, "0")}:${String(
        reminder.minute
      ).padStart(2, "0")}`;
    }

    if (reminder.type === "ONETIME") {
      return `1회 ${String(reminder.year).padStart(4, "0")}-${String(reminder.month).padStart(2, "0")}-${String(
        reminder.day
      ).padStart(2, "0")} ${String(reminder.hour).padStart(2, "0")}:${String(reminder.minute).padStart(2, "0")}`;
    }

    return "알 수 없음";
  }

  getNextWeeklyRunAt({ weekday, hour, minute, fromDate }) {
    const now = fromDate ?? new Date();
    const nowSeoul = new Date(now.getTime() + KST_OFFSET_MS);

    const currentSeoulYear = nowSeoul.getUTCFullYear();
    const currentSeoulMonth = nowSeoul.getUTCMonth();
    const currentSeoulDate = nowSeoul.getUTCDate();
    const currentSeoulWeekday = nowSeoul.getUTCDay();

    let dayDiff = (weekday - currentSeoulWeekday + 7) % 7;

    let candidate = new Date(
      Date.UTC(currentSeoulYear, currentSeoulMonth, currentSeoulDate + dayDiff, hour - 9, minute, 0, 0)
    );

    if (candidate.getTime() <= now.getTime()) {
      candidate = new Date(candidate.getTime() + ONE_WEEK_MS);
    }

    return candidate;
  }

  getSpecificDateRunAt({ year, month, day, hour, minute }) {
    const candidateUtc = new Date(Date.UTC(year, month - 1, day, hour - 9, minute, 0, 0));

    const seoul = new Date(candidateUtc.getTime() + KST_OFFSET_MS);

    if (
      seoul.getUTCFullYear() !== year ||
      seoul.getUTCMonth() + 1 !== month ||
      seoul.getUTCDate() !== day ||
      seoul.getUTCHours() !== hour ||
      seoul.getUTCMinutes() !== minute
    ) {
      throw new Error("존재하지 않는 날짜 또는 시간입니다.");
    }

    return candidateUtc;
  }

  scheduleReminder(id) {
    const reminder = this.reminders.get(id);
    if (!reminder) return;

    const existingTimeout = this.timeouts.get(id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const delay = Math.max(0, reminder.nextRunAt.getTime() - Date.now());

    const timeout = setTimeout(async () => {
      await this.executeReminder(id);
    }, delay);

    this.timeouts.set(id, timeout);
  }

  async executeReminder(id) {
    const reminder = this.reminders.get(id);
    if (!reminder) return;

    const scheduledAt = new Date(reminder.nextRunAt.getTime());

    try {
      const channel = await this.client.channels.fetch(reminder.channelId);

      if (!channel || !channel.isTextBased() || typeof channel.send !== "function") {
        console.error(`[${id}] 알림 전송 실패: 채널을 찾을 수 없거나 전송 불가`);
        this.removeReminder(id);
        return;
      }

      const content = renderTemplate(reminder.messageTemplate, scheduledAt);

      await channel.send({
        content,
        allowedMentions: { parse: [] },
      });

      if (reminder.type === "ONETIME") {
        this.removeReminder(id);
        return;
      }

      reminder.lastRunAt = new Date();
      reminder.nextRunAt = new Date(scheduledAt.getTime() + ONE_WEEK_MS);
      this.persist();
      this.scheduleReminder(id);
    } catch (error) {
      console.error(`[${id}] 알림 전송 중 오류`, error);

      if (reminder.type === "ONETIME") {
        this.removeReminder(id);
        return;
      }

      reminder.lastRunAt = new Date();
      reminder.nextRunAt = new Date(scheduledAt.getTime() + ONE_WEEK_MS);
      this.persist();
      this.scheduleReminder(id);
    }
  }
}

module.exports = {
  ReminderManager,
};
