const { randomUUID } = require("crypto");
const {
  renderTemplate,
  formatSeoulDateTime
} = require("../utils/renderTemplate");
const { formatWeekday } = require("../utils/parseWeekday");

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

class ReminderManager {
  constructor(client) {
    this.client = client;
    this.reminders = new Map();
    this.timeouts = new Map();
  }

  addReminder({ guildId, channelId, creatorId, weekday, hour, minute, messageTemplate }) {
    const nextRunAt = this.getNextWeeklyRunAt({
      weekday,
      hour,
      minute,
      fromDate: new Date()
    });

    const reminder = {
      id: randomUUID(),
      guildId,
      channelId,
      creatorId,
      weekday,
      hour,
      minute,
      messageTemplate,
      nextRunAt,
      createdAt: new Date(),
      lastRunAt: null
    };

    this.reminders.set(reminder.id, reminder);
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
    return `매주 ${formatWeekday(reminder.weekday)} ${String(reminder.hour).padStart(2, "0")}:${String(reminder.minute).padStart(2, "0")}`;
  }

  getNextWeeklyRunAt({ weekday, hour, minute, fromDate }) {
    const now = fromDate ?? new Date();

    // 현재 시각을 서울 시간 기준 날짜로 계산
    const nowSeoul = new Date(now.getTime() + KST_OFFSET_MS);

    const currentSeoulYear = nowSeoul.getUTCFullYear();
    const currentSeoulMonth = nowSeoul.getUTCMonth();
    const currentSeoulDate = nowSeoul.getUTCDate();
    const currentSeoulWeekday = nowSeoul.getUTCDay();

    let dayDiff = (weekday - currentSeoulWeekday + 7) % 7;

    let candidate = new Date(
      Date.UTC(
        currentSeoulYear,
        currentSeoulMonth,
        currentSeoulDate + dayDiff,
        hour - 9,
        minute,
        0,
        0
      )
    );

    if (candidate.getTime() <= now.getTime()) {
      candidate = new Date(candidate.getTime() + ONE_WEEK_MS);
    }

    return candidate;
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
        console.error(`[${id}] 알림 전송 실패: 채널을 찾을 수 없거나 메시지 전송이 불가능합니다.`);
        this.removeReminder(id);
        return;
      }

      const content = renderTemplate(reminder.messageTemplate, scheduledAt);

      await channel.send({
        content,
        allowedMentions: { parse: [] }
      });

      reminder.lastRunAt = new Date();
      reminder.nextRunAt = new Date(scheduledAt.getTime() + ONE_WEEK_MS);

      this.scheduleReminder(id);
    } catch (error) {
      console.error(`[${id}] 알림 전송 중 오류`, error);

      // 실패해도 다음 주기로 진행
      reminder.lastRunAt = new Date();
      reminder.nextRunAt = new Date(scheduledAt.getTime() + ONE_WEEK_MS);

      this.scheduleReminder(id);
    }
  }
}

module.exports = {
  ReminderManager
};