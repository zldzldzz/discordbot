const {
  SlashCommandBuilder,
  PermissionFlagsBits
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("알림끄기")
    .setDescription("등록된 반복 알림을 비활성화합니다.")
    .addStringOption((option) =>
      option
        .setName("id")
        .setDescription("알림 ID")
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

    const id = interaction.options.getString("id", true);
    const reminder = reminderManager.getReminder(id);

    if (!reminder || reminder.guildId !== interaction.guildId) {
      await interaction.reply({
        content: "해당 ID의 알림을 찾지 못했습니다.",
        ephemeral: true
      });
      return;
    }

    const isCreator = reminder.creatorId === interaction.user.id;
    const canManageGuild = interaction.memberPermissions?.has(
      PermissionFlagsBits.ManageGuild
    );

    if (!isCreator && !canManageGuild) {
      await interaction.reply({
        content: "본인이 만든 알림이 아니므로 끌 수 없습니다. 서버 관리자 권한이 있으면 가능합니다.",
        ephemeral: true
      });
      return;
    }

    reminderManager.removeReminder(id);

    await interaction.reply({
      content: `알림이 비활성화되었습니다. ID: \`${id}\``,
      ephemeral: true
    });
  }
};