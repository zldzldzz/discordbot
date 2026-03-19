const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("알림목록")
    .setDescription("현재 서버에 등록된 반복 알림 목록을 조회합니다."),

  async execute(interaction, reminderManager) {
    if (!interaction.inGuild()) {
      await interaction.reply({
        content: "이 명령어는 서버 안에서만 사용할 수 있습니다.",
        ephemeral: true
      });
      return;
    }

    const reminders = reminderManager.listRemindersByGuild(interaction.guildId);

    if (reminders.length === 0) {
      await interaction.reply({
        content: "현재 등록된 알림이 없습니다.",
        ephemeral: true
      });
      return;
    }

    const lines = reminders.map((reminder, index) => {
      return [
        `${index + 1}. ID: \`${reminder.id}\``,
        `- 채널: <#${reminder.channelId}>`,
        `- 반복: ${reminderManager.formatSchedule(reminder)}`,
        `- 다음 실행: ${reminderManager.formatDateTime(reminder.nextRunAt)}`,
        `- 메시지: ${reminder.messageTemplate}`
      ].join("\n");
    });

    const content = lines.join("\n\n");

    if (content.length > 1900) {
      const summary = reminders
        .map((reminder, index) => {
          return `${index + 1}. \`${reminder.id}\` | ${reminderManager.formatSchedule(reminder)} | ${reminderManager.formatDateTime(reminder.nextRunAt)}`;
        })
        .join("\n");

      await interaction.reply({
        content: `알림 수가 많아 요약으로 표시합니다.\n\n${summary}`,
        ephemeral: true
      });
      return;
    }

    await interaction.reply({
      content,
      ephemeral: true
    });
  }
};