import { NarrowedContext, Telegraf } from "telegraf";
import { Command } from "./command.class";
import { IBotContext } from "../context/context.interface";
import { supabase } from "../db";
import { Message, Update } from "telegraf/typings/core/types/typegram";

const calculateExpression = (expr: string) => {
  const [initialValue, percentage] = expr.split("-");

  const numericValue = parseFloat(initialValue);
  const numericPercentage = parseFloat(percentage);

  const discount = (numericValue * numericPercentage) / 100;
  const finalValue = numericValue - discount;
  return { finalValue, value: numericValue, percentage: numericPercentage };
};

export class MessageCommand extends Command {
  constructor(bot: Telegraf<IBotContext>) {
    super(bot);
  }

  entryCommand = async (
    ctx: NarrowedContext<IBotContext, Update.MessageUpdate<Message>>
  ) => {
    const chatId = ctx.message.chat.id;
    const messageId = ctx.message.message_id;
    const message = (ctx.message as { text: string }).text;
    const expression = message.split(" ").at(1);
    if (expression) {
      const { finalValue, value, percentage } = calculateExpression(expression);
      console.log(percentage, finalValue, value);
      const { error } = await supabase
        .from("statistics")
        .insert([
          {
            sum: value,
            calc_sum: finalValue,
            percentage,
            message_id: messageId,
            group_id: chatId,
          },
        ])
        .select();
      if (error) {
        console.log(error);
        ctx.reply("Что-то пошло не так!");
      } else {
        const { data } = await supabase
          .from("groups")
          .select("root_message_id, created_at")
          .eq("group_id", chatId);

        if (data?.at(0)?.root_message_id) {
          const message = await this.getStartMessageAndUpdatePaidSum(
            chatId,
            data?.at(0)?.created_at
          );
          try {
            await ctx.telegram.editMessageText(
              chatId,
              data?.at(0)?.root_message_id,
              undefined,
              message,
              {
                parse_mode: "HTML",
              }
            );
          } catch (error) {
            console.log(error);
          }
        }
      }
    } else {
      ctx.reply("Забыли написать выражение после двоеточия!");
    }
  };

  async cancelCommand(
    ctx: NarrowedContext<IBotContext, Update.MessageUpdate<Message>>
  ) {
    const chatId = ctx.message.chat.id;
    const replyMessageId = (
      ctx.message as {
        reply_to_message: {
          message_id: number;
        };
      }
    ).reply_to_message.message_id;
    if (replyMessageId) {
      const { error } = await supabase
        .from("statistics")
        .delete()
        .eq("message_id", replyMessageId);

      if (error) {
        ctx.reply("Что-то пошло не так!");
      } else {
        const { data } = await supabase
          .from("groups")
          .select("root_message_id, created_at")
          .eq("group_id", chatId);

        if (data?.at(0)?.root_message_id) {
          const message = await this.getStartMessageAndUpdatePaidSum(
            chatId,
            data?.at(0)?.created_at
          );
          try {
            await ctx.telegram.editMessageText(
              chatId,
              data?.at(0)?.root_message_id,
              undefined,
              message,
              {
                parse_mode: "HTML",
              }
            );
          } catch (error) {
            console.log(error);
          }
        }
      }
    } else {
      ctx.reply("Выберите сообщение!");
    }
  }

  async calculationCommand(
    ctx: NarrowedContext<IBotContext, Update.MessageUpdate<Message>>
  ) {
    const chatId = ctx.message.chat.id;
    const replyMessageId = (
      ctx.message as {
        reply_to_message: {
          message_id: number;
        };
      }
    )?.reply_to_message?.message_id;
    const message = (ctx.message as { text: string }).text;
    const course = message.split(" ").at(1);
    const messageId = message.split(" ").at(2);
    if (replyMessageId || messageId) {
      const { error } = await supabase
        .from("statistics")
        .update({ course })
        .eq("message_id", replyMessageId || messageId)
        .select();
      if (error) {
        console.log(error);
        ctx.reply("Что-то пошло не так!");
      } else {
        const { data } = await supabase
          .from("groups")
          .select("root_message_id, created_at")
          .eq("group_id", chatId);

        if (data?.at(0)?.root_message_id) {
          const message = await this.getStartMessageAndUpdatePaidSum(
            chatId,
            data?.at(0)?.created_at
          );
          try {
            await ctx.telegram.editMessageText(
              chatId,
              data?.at(0)?.root_message_id,
              undefined,
              message,
              {
                parse_mode: "HTML",
              }
            );
          } catch (error) {
            console.log(error);
          }
        }
      }
    } else {
      ctx.reply("Выберите сообщение!");
    }
  }

  async calcChat(
    ctx: NarrowedContext<IBotContext, Update.MessageUpdate<Message>>
  ) {
    const chatId = ctx.message.chat.id;
    const { error } = await supabase
      .from("statistics")
      .update({ is_paid: true })
      .not("course", "is", null);

    if (error) {
      console.log(error);
      ctx.reply("Что-то пошло не так!");
    } else {
      const { data } = await supabase
        .from("groups")
        .select("root_message_id, created_at")
        .eq("group_id", chatId);
      if (data?.at(0)?.root_message_id) {
        const message = await this.getStartMessageAndUpdatePaidSum(
          chatId,
          data?.at(0)?.created_at
        );
        try {
          await ctx.telegram.editMessageText(
            chatId,
            data?.at(0)?.root_message_id,
            undefined,
            message,
            {
              parse_mode: "HTML",
            }
          );
        } catch (error) {
          console.log(error);
        }
      }
    }
  }

  handle(): void {
    this.bot.on("message", async (ctx) => {
      const message = (ctx.message as { text: string }).text;

      if (this.isAllowedUser(ctx) && message) {
        if (message.startsWith("Заход")) {
          await this.entryCommand(ctx);
          return;
        }
        if (message.startsWith("Отмена")) {
          await this.cancelCommand(ctx);
          return;
        }

        if (message.startsWith("Расчет")) {
          await this.calculationCommand(ctx);
          return;
        }

        if (message.startsWith("Чат расчитан")) {
          await this.calcChat(ctx);
          return;
        }
      }
    });
  }
}
