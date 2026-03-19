require("dotenv").config();

const { REST, Routes } = require("discord.js");
const repeatReminderCommand = require("./commands/repeatReminder");
const stopReminderCommand = require("./commands/stopReminder");
const listRemindersCommand = require("./commands/listReminders");

const commands = [
  repeatReminderCommand.data.toJSON(),
  stopReminderCommand.data.toJSON(),
  listRemindersCommand.data.toJSON()
];

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

async function deployCommands() {
  try {
    console.log("슬래시 커맨드 등록 시작");

    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commands }
    );

    console.log("슬래시 커맨드 등록 완료");
  } catch (error) {
    console.error("슬래시 커맨드 등록 실패", error);
  }
}

deployCommands();