const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("특정날짜알림")
    .setDescription("특정 날짜/시간에 1회 알림을 등록합니다.")
    .addIntegerOption((option) => option.setName("년도").setDescription("예: 2026").setRequired(true))
    .addIntegerOption((option) =>
      option.setName("월").setDescription("1~12").setRequired(true).setMinValue(1).setMaxValue(12)
    )
    .addIntegerOption((option) =>
      option.setName("일").setDescription("1~31").setRequired(true).setMinValue(1).setMaxValue(31)
    )
    .addIntegerOption((option) =>
      option.setName("시").setDescription("0~23").setRequired(true).setMinValue(0).setMaxValue(23)
    )
    .addIntegerOption((option) =>
      option.setName("분").setDescription("0~59").setRequired(true).setMinValue(0).setMaxValue(59)
    )
    .addStringOption((option) =>
      option.setName("메시지").setDescription("예: 10분 뒤 회의가 시작됩니다. 오늘은 ${요일} 입니다.").setRequired(true)
    ),

  async execute(interaction, reminderManager) {
    if (!interaction.inGuild()) {
      await interaction.reply({
        content: "이 명령어는 서버 안에서만 사용할 수 있습니다.",
        ephemeral: true,
      });
      return;
    }

    const year = interaction.options.getInteger("년도", true);
    const month = interaction.options.getInteger("월", true);
    const day = interaction.options.getInteger("일", true);
    const hour = interaction.options.getInteger("시", true);
    const minute = interaction.options.getInteger("분", true);
    const messageTemplate = interaction.options.getString("메시지", true);

    try {
      const reminder = reminderManager.addOneTimeReminder({
        guildId: interaction.guildId,
        channelId: interaction.channelId,
        creatorId: interaction.user.id,
        year,
        month,
        day,
        hour,
        minute,
        messageTemplate,
      });

      await interaction.reply({
        content:
          `특정 날짜 알림이 등록되었습니다.\n` +
          `ID: \`${reminder.id}\`\n` +
          `실행: \`${reminderManager.formatDateTime(reminder.nextRunAt)}\`\n` +
          `채널: <#${reminder.channelId}>`,
        ephemeral: true,
      });
    } catch (error) {
      await interaction.reply({
        content: error.message,
        ephemeral: true,
      });
    }
  },
};
