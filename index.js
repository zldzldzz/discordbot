require("dotenv").config();

const { Client, GatewayIntentBits, Collection } = require("discord.js");
const { ReminderManager } = require("./services/reminderManager");
const repeatReminderCommand = require("./commands/repeatReminder");
const stopReminderCommand = require("./commands/stopReminder");
const listRemindersCommand = require("./commands/listReminders");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const reminderManager = new ReminderManager(client);

const commands = [
  repeatReminderCommand,
  stopReminderCommand,
  listRemindersCommand
];

client.commands = new Collection();
for (const command of commands) {
  client.commands.set(command.data.name, command);
}

client.once("ready", () => {
  console.log(`로그인 완료: ${client.user.tag}`);
  console.log(`현재 메모리 내 알림 수: ${reminderManager.count()}`);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, reminderManager);
  } catch (error) {
    console.error(`[${interaction.commandName}] 실행 오류`, error);

    const content = "명령 처리 중 오류가 발생했습니다.";

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content, ephemeral: true });
    } else {
      await interaction.reply({ content, ephemeral: true });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);