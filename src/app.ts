import { Telegraf } from "telegraf";
import { IConfigService } from "./config/config.interface";
import { ConfigService } from "./config/config.service";
import { IBotContext } from "./context/context.interface";
import { Command } from "./commands/command.class";
import { StartCommand } from "./commands/start.command";
// import LocalSession from "telegraf-session-local";
import { SendingMessages } from "./commands/sendingMessages.command";
import { DeleteGroup } from "./commands/deleteGroup.command";
import { Groups } from "./commands/groups.command copy";
import { Help } from "./commands/help.command";
import { SendingMessage } from "./commands/sendingMessage.command";
import { MessageCommand } from "./commands/message.command";

class Bot {
  bot: Telegraf<IBotContext>;
  commands: Command[] = [];
  constructor(private readonly configService: IConfigService) {
    this.bot = new Telegraf<IBotContext>(this.configService.get("TOKEN"));
    // this.bot.use(new LocalSession({ database: "sessions.json" }).middleware());
  }

  init() {
    this.commands = [
      new StartCommand(this.bot),
      new SendingMessages(this.bot),
      new DeleteGroup(this.bot),
      new Groups(this.bot),
      new Help(this.bot),
      new SendingMessage(this.bot),
      new MessageCommand(this.bot)
    ];
    for (const command of this.commands) {
      command.handle();
    }
    this.bot.launch();
  }
}

const bot = new Bot(new ConfigService());
bot.init();
