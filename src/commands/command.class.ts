import { ConfigService } from "./../config/config.service";
import { Context, NarrowedContext, Telegraf } from "telegraf";
import { IBotContext } from "../context/context.interface";
import { Update, Message } from "telegraf/typings/core/types/typegram";
import { CommandContextExtn } from "telegraf/typings/telegram-types";
import { supabase } from "../db";
import { getDate } from "../utils/getDate";

type DataStatType = {
  sum: number;
  percentage: number;
  calc_sum: number;
};

export abstract class Command {
  allowedChatId: string;
  allowedUsers: string;

  constructor(public bot: Telegraf<IBotContext>) {
    this.allowedChatId = new ConfigService().get("ALLOWED_CHAT_ID");
    this.allowedUsers = new ConfigService().get("ALLOWED_USERS");
  }

  abstract handle(): void;

  getMeesage({
    chatId,
    fullSum = 0,
    paidSum = 0,
    toPaySum = 0,
    stat = "",
    currentDate,
  }: {
    chatId: number;
    fullSum?: number;
    toPaySum?: number;
    paidSum?: number;
    stat?: string;
    currentDate?: string;
  }) {
    const date = getDate(currentDate);
    const message = `Начало работы: ${date}\n\n📟 <b>Айди чата:</b> <i>${chatId}</i>\n\n\n📈 <b>Статистика:</b>\n${stat}\n\n📦 <b>Общая сумма:</b> ${fullSum} \n📤 <b>К выплате:</b> ${toPaySum}\n💸 <b>Выплачено:</b> <i>${paidSum} $</i>`;
    return message;
  }

  getStat(data: DataStatType[]) {
    if (!data) {
      return "";
    }
    const stat = data?.reduce((item, stat) => {
      item += `\n💰${stat.sum}-${stat.percentage}% = ${stat.calc_sum}`;
      return item;
    }, "");
    return stat;
  }

  async getFullCommonSum(chatId: number) {
    const { data } = await supabase
      .from("statistics")
      .select("*")
      .eq("group_id", chatId);
    const fullSum = data?.reduce(
      (item, message) => +(item + message.sum).toFixed(2),
      0
    );
    const fullToPaidSum = data?.reduce(
      (item, message) =>
        message.course && !message.is_paid
          ? +(item + message.calc_sum / message.course).toFixed(2)
          : item,
      0
    );

    const fullPaidSum = data?.reduce(
      (item, message) =>
        message.is_paid
          ? +(item + message.calc_sum / message.course).toFixed(2)
          : item,
      0
    );

    const stat = this.getStat(data as DataStatType[]);
    return { fullSum, fullToPaidSum, stat, fullPaidSum };
  }

  async getStartMessageAndUpdatePaidSum(chatId: number, date: string) {
    const { fullToPaidSum, fullSum, stat, fullPaidSum } =
      await this.getFullCommonSum(chatId);
    return this.getMeesage({
      chatId,
      fullSum,
      toPaySum: fullToPaidSum,
      stat,
      paidSum: fullPaidSum,
      currentDate: date,
    });
  }

  isAllowedChatId(
    ctx: Context<{
      message: Update.New & Update.NonChannel & Message.TextMessage;
      update_id: number;
    }> &
      Omit<IBotContext, keyof Context<Update>> &
      CommandContextExtn
  ) {
    const chatId = ctx.update.message.chat.id;
    return `${chatId}` === this.allowedChatId;
  }

  isAllowedUser(
    ctx: NarrowedContext<IBotContext, Update.MessageUpdate<Message>>
  ) {
    const userId = ctx.message.from.id;
    return this.allowedUsers.includes(`${userId}`);
  }

  async sendMessageToGroup(groupId: number, message: string) {
    try {
      await this.bot.telegram.sendMessage(groupId, message);
      console.log(`Message sent to group ${groupId}`);
    } catch (error) {
      console.error(`Failed to send message to group ${groupId}:`, error);
    }
  }

  async createGroup(id: number, title: string, message_id: number) {
    const { error } = await supabase
      .from("groups")
      .insert([
        {
          group_id: id,
          title,
          root_message_id: message_id,
        },
      ])
      .select();
    return error;
  }
}
