import {
  LEAD_STATUSES,
  getLeadById,
  getLeadStats,
  getLeadsByStatus,
  updateLeadStatus,
  reassignLead,
  type LeadRecord,
  type LeadStatus,
} from "@/lib/telegram-leads";

const token = () => process.env.TG_KEY?.trim() || "";
const ownerId = () => process.env.OWNER_ID?.trim() || "";

export type TelegramOperator = {
  id: string;
  name: string;
};

function configuredOperators(): TelegramOperator[] {
  const raw = process.env.TG_OPERATORS?.trim();
  const operators: TelegramOperator[] = [];
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          const id = String(item?.id ?? item?.telegramId ?? "").trim();
          const name = String(item?.name ?? "").trim().slice(0, 120);
          if (id && name) operators.push({ id, name });
        }
      }
    } catch {
      console.warn("[telegram.operators_invalid] TG_OPERATORS must be valid JSON");
    }
  }

  const owner = ownerId();
  if (owner && !operators.some((operator) => operator.id === owner)) {
    operators.unshift({ id: owner, name: "Владелец" });
  }

  return operators.filter((operator, index, list) => list.findIndex((x) => x.id === operator.id) === index);
}

function getOperator(userId: string) {
  return configuredOperators().find((operator) => operator.id === userId) || null;
}

function getAssignee(employeeId: string) {
  return configuredOperators().find((operator) => operator.id === employeeId) || null;
}

export function getTelegramOperators() {
  return configuredOperators();
}

export async function telegramApi(method: string, payload: Record<string, unknown> = {}) {
  const tg = token();
  if (!tg) throw new Error("TG_KEY is not configured");
  const response = await fetch(`https://api.telegram.org/bot${tg}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(data.description || `Telegram ${method} failed`);
  return data;
}

export const getBotInfo = () => telegramApi("getMe");
export const getWebhookInfo = () => telegramApi("getWebhookInfo");

export const setWebhook = (url: string, secretToken?: string) =>
  telegramApi("setWebhook", {
    url,
    secret_token: secretToken || undefined,
    allowed_updates: ["message", "callback_query"],
  });

export const deleteWebhook = (dropPendingUpdates = false) =>
  telegramApi("deleteWebhook", { drop_pending_updates: dropPendingUpdates });

export const sendMessage = ({
  chatId,
  text,
  replyMarkup,
}: {
  chatId: string;
  text: string;
  replyMarkup?: unknown;
}) => telegramApi("sendMessage", {
  chat_id: chatId,
  text,
  reply_markup: replyMarkup,
  disable_web_page_preview: true,
});

export const editMessage = ({
  chatId,
  messageId,
  text,
  replyMarkup,
}: {
  chatId: string;
  messageId: number;
  text: string;
  replyMarkup?: unknown;
}) => telegramApi("editMessageText", {
  chat_id: chatId,
  message_id: messageId,
  text,
  reply_markup: replyMarkup,
  disable_web_page_preview: true,
});

export const answerCallbackQuery = ({
  callbackQueryId,
  text,
}: {
  callbackQueryId: string;
  text?: string;
}) => telegramApi("answerCallbackQuery", {
  callback_query_id: callbackQueryId,
  text,
  show_alert: false,
});

export function buildLeadMessage(lead: LeadRecord) {
  const lines = [
    "🆕 Новая заявка с сайта",
    "",
    `📞 Телефон: ${lead.phone || "Не указан"}`,
    `🛰️ Работа: ${lead.type || "Не указана"}`,
  ];
  if (lead.area) lines.push(`📐 Площадь: ${lead.area.toLocaleString("ru-RU")} м²`);
  if (lead.output) lines.push(`📄 Результат: ${lead.output}`);
  if (lead.urgency) lines.push(`⏱ Срок: ${lead.urgency}`);
  if (lead.complexity?.length) lines.push(`⚠️ Условия: ${lead.complexity.join(", ")}`);
  if (lead.estimate?.price) lines.push(`💰 Расчёт: ${Number(lead.estimate.price).toLocaleString("ru-RU")} ₸`);
  if (lead.estimate?.days) lines.push(`📅 Оценка срока: ${lead.estimate.days} дн.`);
  if (lead.assignedTo?.name) lines.push(`👤 Ответственный: ${lead.assignedTo.name}`);
  lines.push("", `📌 Статус: ${lead.status || LEAD_STATUSES.NEW}`, `🕒 ${new Date(lead.createdAt).toLocaleString("ru-RU")}`, `🆔 ${lead.id}`);
  return lines.join("\n");
}

const nav = () => ({
  inline_keyboard: [
    [
      { text: "🆕 Новые", callback_data: "menu:leads:new:0" },
      { text: "🛠 В работе", callback_data: "menu:leads:in_work:0" },
    ],
    [
      { text: "📊 Статистика", callback_data: "menu:stats" },
      { text: "👥 Операторы", callback_data: "menu:operators" },
    ],
    [{ text: "🏠 Главное меню", callback_data: "menu:main" }],
  ],
});

const leadKeyboard = (lead: LeadRecord) => ({
  inline_keyboard: [
    [
      { text: "🛠 Взять в работу", callback_data: `lead:take:${lead.id}` },
      { text: "👤 Передать", callback_data: `lead:assign_menu:${lead.id}` },
    ],
    [
      { text: "📌 Статус", callback_data: `lead:status_menu:${lead.id}` },
      { text: "🔄 Обновить", callback_data: `lead:open:${lead.id}` },
    ],
    [{ text: "🏠 Главное меню", callback_data: "menu:main" }],
  ],
});

const statusKeyboard = (id: string) => ({
  inline_keyboard: [
    [
      { text: "Новая", callback_data: `lead:status:${id}:new` },
      { text: "В работе", callback_data: `lead:status:${id}:in_work` },
    ],
    [
      { text: "Выполнена", callback_data: `lead:status:${id}:done` },
      { text: "Отменена", callback_data: `lead:status:${id}:cancelled` },
    ],
    [{ text: "Назад", callback_data: `lead:open:${id}` }],
  ],
});

const assignmentKeyboard = (leadId: string) => ({
  inline_keyboard: [
    ...configuredOperators().map((operator) => [{
      text: `👤 ${operator.name}`,
      callback_data: `lead:assign:${leadId}:${operator.id}`,
    }]),
    [{ text: "Назад", callback_data: `lead:open:${leadId}` }],
  ],
});

function mainMenuText() {
  return "Главное меню Малая геодезия\n\nВыберите раздел:";
}

function statsText(stats: Awaited<ReturnType<typeof getLeadStats>>) {
  return [
    "📊 Статистика заявок",
    "",
    `Всего: ${stats.total}`,
    `Новые: ${stats.new}`,
    `В работе: ${stats.inWork}`,
    `Выполненные: ${stats.done}`,
    `Переданные: ${stats.reassigned}`,
    `Отменённые: ${stats.cancelled}`,
  ].join("\n");
}

async function safeEditOrSend(chatId: string, messageId: number | undefined, text: string, replyMarkup?: unknown) {
  if (messageId) {
    try {
      await editMessage({ chatId, messageId, text, replyMarkup });
      return;
    } catch (error) {
      console.warn("[telegram.edit_failed]", error);
    }
  }
  await sendMessage({ chatId, text, replyMarkup });
}

async function showLeads(chatId: string, messageId: number | undefined, status: LeadStatus, offset = 0) {
  const pageSize = 10;
  const leads = await getLeadsByStatus(status);
  const page = leads.slice(offset, offset + pageSize);
  const rows = page.map((lead) => [{
    text: `Открыть ${lead.phone || lead.id}`,
    callback_data: `lead:open:${lead.id}`,
  }]);
  const navigation = [];
  if (offset > 0) navigation.push({ text: "⬅️ Назад", callback_data: `menu:leads:${status}:${Math.max(0, offset - pageSize)}` });
  if (offset + pageSize < leads.length) navigation.push({ text: "➡️ Далее", callback_data: `menu:leads:${status}:${offset + pageSize}` });
  if (navigation.length) rows.push(navigation);

  await safeEditOrSend(
    chatId,
    messageId,
    rows.length ? `Заявки: ${status}\nПоказаны ${offset + 1}–${Math.min(offset + pageSize, leads.length)} из ${leads.length}` : "Пока пусто.",
    { inline_keyboard: [...rows, [{ text: "🏠 Главное меню", callback_data: "menu:main" }]] },
  );
}

async function notifyAssignedOperator(lead: LeadRecord, event: string) {
  const operatorId = lead.assignedTo?.id;
  if (!operatorId || !getAssignee(operatorId)) return;
  try {
    await sendMessage({
      chatId: operatorId,
      text: `🔔 Заявка ${lead.id}: ${event}\n\n${buildLeadMessage(lead)}`,
      replyMarkup: leadKeyboard(lead),
    });
  } catch (error) {
    console.warn("[telegram.operator_notify_failed]", error);
  }
}

export async function sendOwnerLeadNotification(lead: LeadRecord) {
  const id = ownerId();
  if (!id) throw new Error("OWNER_ID is not configured");
  const response = await sendMessage({
    chatId: id,
    text: buildLeadMessage(lead),
    replyMarkup: leadKeyboard(lead),
  });
  return { ok: true, leadId: lead.id, messageId: Number(response.result?.message_id || 0) || undefined };
}

export async function handleTelegramUpdate(update: any) {
  const message = update?.message;
  const callback = update?.callback_query;
  const chatId = String(message?.chat?.id ?? callback?.message?.chat?.id ?? "");
  const userId = String(message?.from?.id ?? callback?.from?.id ?? "");

  if (!chatId || !getOperator(userId)) return { handled: false, reason: "forbidden" };

  if (callback) {
    const data = String(callback.data || "");
    const messageId = Number(callback.message?.message_id || 0) || undefined;

    try {
      if (data === "menu:main") return safeEditOrSend(chatId, messageId, mainMenuText(), nav());
      if (data === "menu:stats") return safeEditOrSend(chatId, messageId, statsText(await getLeadStats()), nav());
      if (data === "menu:operators") {
        const operators = configuredOperators();
        return safeEditOrSend(chatId, messageId, `👥 Операторы\n\n${operators.map((x) => `• ${x.name} (${x.id})`).join("\n") || "Не настроены"}`, nav());
      }

      const menu = data.match(/^menu:leads:(new|in_work):(\\d+)$/);
      if (menu) return showLeads(chatId, messageId, menu[1] as LeadStatus, Number(menu[2]));

      if (data.startsWith("lead:")) {
        const [, action, id, value] = data.split(":");
        const lead = await getLeadById(id);
        if (!lead) {
          await answerCallbackQuery({ callbackQueryId: String(callback.id), text: "Заявка уже недоступна" });
          return sendMessage({ chatId, text: "Заявка не найдена.", replyMarkup: nav() });
        }

        if (action === "open") {
          await answerCallbackQuery({ callbackQueryId: String(callback.id), text: "Обновлено" });
          return safeEditOrSend(chatId, messageId, buildLeadMessage(lead), leadKeyboard(lead));
        }

        if (action === "assign_menu") {
          await answerCallbackQuery({ callbackQueryId: String(callback.id), text: "Выберите оператора" });
          return safeEditOrSend(chatId, messageId, "Кому передать заявку?", assignmentKeyboard(id));
        }

        if (action === "assign") {
          const assignee = getAssignee(value);
          if (!assignee) {
            await answerCallbackQuery({ callbackQueryId: String(callback.id), text: "Оператор недоступен" });
            return safeEditOrSend(chatId, messageId, "Этот оператор больше не доступен. Откройте карточку заново.", leadKeyboard(lead));
          }
          if (lead.assignedTo?.id === assignee.id && lead.status === LEAD_STATUSES.REASSIGNED) {
            await answerCallbackQuery({ callbackQueryId: String(callback.id), text: "Заявка уже у этого оператора" });
            return safeEditOrSend(chatId, messageId, buildLeadMessage(lead), leadKeyboard(lead));
          }
          const updated = await reassignLead({ leadId: id, employeeId: assignee.id, employeeName: assignee.name, by: `telegram:${userId}` });
          if (!updated) return;
          await answerCallbackQuery({ callbackQueryId: String(callback.id), text: `Передано: ${assignee.name}` });
          await notifyAssignedOperator(updated, `назначена оператору ${assignee.name}`);
          return safeEditOrSend(chatId, messageId, buildLeadMessage(updated), leadKeyboard(updated));
        }

        if (action === "take") {
          if (lead.assignedTo?.id && lead.assignedTo.id !== userId && lead.status === LEAD_STATUSES.REASSIGNED) {
            await answerCallbackQuery({ callbackQueryId: String(callback.id), text: "Заявка уже передана другому оператору" });
            return safeEditOrSend(chatId, messageId, buildLeadMessage(lead), leadKeyboard(lead));
          }
          const operator = getOperator(userId)!;
          let assigned = lead;
          if (lead.assignedTo?.id !== userId) {
            assigned = await reassignLead({ leadId: id, employeeId: operator.id, employeeName: operator.name, by: `telegram:${userId}` }) || lead;
          }
          const updated = await updateLeadStatus({ leadId: id, status: LEAD_STATUSES.IN_WORK, by: `telegram:${userId}` });
          if (!updated) return;
          await answerCallbackQuery({ callbackQueryId: String(callback.id), text: "Заявка взята в работу" });
          await notifyAssignedOperator(updated, "взята в работу");
          return safeEditOrSend(chatId, messageId, buildLeadMessage(updated), leadKeyboard(updated));
        }

        if (action === "status_menu") {
          await answerCallbackQuery({ callbackQueryId: String(callback.id), text: "Выберите статус" });
          return safeEditOrSend(chatId, messageId, "Выберите статус:", statusKeyboard(id));
        }

        if (action === "status" && value && statusValues.has(value)) {
          if (lead.status === value) {
            await answerCallbackQuery({ callbackQueryId: String(callback.id), text: "Статус уже установлен" });
            return safeEditOrSend(chatId, messageId, buildLeadMessage(lead), leadKeyboard(lead));
          }
          const updated = await updateLeadStatus({ leadId: id, status: value as LeadStatus, by: `telegram:${userId}` });
          if (!updated) return;
          await answerCallbackQuery({ callbackQueryId: String(callback.id), text: "Статус изменён" });
          await notifyAssignedOperator(updated, `статус изменён на «${value}»`);
          return safeEditOrSend(chatId, messageId, buildLeadMessage(updated), leadKeyboard(updated));
        }
      }

      await answerCallbackQuery({ callbackQueryId: String(callback.id), text: "Кнопка устарела" });
    } catch (error) {
      console.error("[telegram.callback_failed]", error);
      try {
        await answerCallbackQuery({ callbackQueryId: String(callback.id), text: "Не удалось выполнить действие" });
      } catch {}
      throw error;
    }
    return;
  }

  if (message) {
    if (message.text === "/start" || message.text === "/reload" || message.text === "Главное меню") {
      return sendMessage({ chatId, text: mainMenuText(), replyMarkup: nav() });
    }
    return sendMessage({ chatId, text: "Не понял команду. Откройте главное меню.", replyMarkup: nav() });
  }

  return { handled: false, reason: "unsupported_update" };
}

const statusValues = new Set<string>(Object.values(LEAD_STATUSES));
