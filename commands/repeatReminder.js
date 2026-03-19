const { SlashCommandBuilder } = require("discord.js");
const { parseWeekday, formatWeekday } = require("../utils/parseWeekday");

function parseTime(timeStr) {
  if (!/^\d{2}:\d{2}$/.test(timeStr)) {
    throw new Error("시간 형식은 HH:mm 이어야 합니다.");
  }

  const [hour, minute] = timeStr.split(":").map(Number);

  if (hour < 0 || hour > 23) {
    throw new Error("시 값이 올바르지 않습니다.");
  }

  if (minute < 0 || minute > 59) {
    throw new Error("분 값이 올바르지 않습니다.");
  }

  return { hour, minute };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("반복알림")
    .setDescription("매주 특정 요일/시간에 반복 알림을 등록합니다.")
    .addStringOption((option) =>
      option
        .setName("요일")
        .setDescription("예: 월, 월요일, 화, 화요일")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("시간")
        .setDescription("예: 09:50")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("메시지")
        .setDescription("예: 10분 뒤 회의가 시작됩니다. 오늘은 ${요일} 입니다.")
        .setRequired(true)
    ),

  async execute(interaction, reminderManager) {
    if (!interaction.inGuild()) {
      await interaction.reply({
        content: "이 명령어는 서버 안에서만 사용할 수 있습니다.",
        ephemeral: true
      });
      return;
    }

    const weekdayInput = interaction.options.getString("요일", true);
    const timeInput = interaction.options.getString("시간", true);
    const messageTemplate = interaction.options.getString("메시지", true);

    let weekday;
    let hour;
    let minute;

    try {
      weekday = parseWeekday(weekdayInput);
      ({ hour, minute } = parseTime(timeInput));
    } catch (error) {
      await interaction.reply({
        content: error.message,
        ephemeral: true
      });
      return;
    }

    try {
      const reminder = reminderManager.addReminder({
        guildId: interaction.guildId,
        channelId: interaction.channelId,
        creatorId: interaction.user.id,
        weekday,
        hour,
        minute,
        messageTemplate
      });

      await interaction.reply({
        content:
          `반복 알림이 등록되었습니다.\n` +
          `ID: \`${reminder.id}\`\n` +
          `반복: \`매주 ${formatWeekday(reminder.weekday)} ${String(reminder.hour).padStart(2, "0")}:${String(reminder.minute).padStart(2, "0")}\`\n` +
          `다음 실행: \`${reminderManager.formatDateTime(reminder.nextRunAt)}\`\n` +
          `채널: <#${reminder.channelId}>`,
        ephemeral: true
      });
    } catch (error) {
      await interaction.reply({
        content: error.message,
        ephemeral: true
      });
    }
  }
};