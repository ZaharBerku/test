import { Telegraf } from "telegraf";
import { Command } from "./command.class";
import { IBotContext } from "../context/context.interface";
import { supabase } from "../db";

export class StartCommand extends Command {
  constructor(bot: Telegraf<IBotContext>) {
    super(bot);
  }

  handle(): void {
    this.bot.start(async (ctx) => {
      if (!this.isAllowedChatId(ctx)) {
        const { id, type, title } = ctx.update.message.chat as {
          title: string;
          id: number;
          type: string;
        };
        if (type === "supergroup") {
          let message: string | null = null;
          const oldChatId = ctx.payload;
          if (oldChatId) {
            const { data, error } = await supabase
              .from("groups")
              .update({ group_id: id })
              .eq("group_id", oldChatId)
              .select();
            if (error) {
              ctx.reply("Такой группы нет или она была удалена!");
            }
            message = await this.getStartMessageAndUpdatePaidSum(
              id,
              data?.at(0)?.create_at
            );
          } else {
            message = this.getMeesage({ chatId: id });
          }
          if (message) {
            const sentMessage = await ctx.telegram.sendMessage(id, message, {
              parse_mode: "HTML",
            });

            await ctx.telegram.pinChatMessage(id, sentMessage.message_id);
            if (!oldChatId) {
              const error = await this.createGroup(
                id,
                title,
                sentMessage.message_id
              );
              if (error) {
                ctx.reply(
                  error.code === "23505"
                    ? "Такая группа уже была добалена"
                    : "Группа не была добавлена"
                );
              }
            }
          } else {
            ctx.reply("Что-то пошло не так!");
          }
        } else {
          ctx.reply("Необходимо сделать бота админом группы");
        }
      } else {
        ctx.reply("Эту группу нельзя добавить в список!");
      }
    });
  }
}
