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

export async function telegramApi(method: string, payload: Record<string, unknown> = {}) {
  const tg = token();
  if (!tg) throw new Error("TG_KEY is not configured");
  const response = await fetch(`https://api.telegram.org/bot${tg}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
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
      { text: "🆕 Новые", callback_data: "menu:leads:new" },
      { text: "🛠 В работе", callback_data: "menu:leads:in_work" },
    ],
    [
      { text: "📊 Статистика", callback_data: "menu:stats" },
      { text: "🏠 Главное меню", callback_data: "menu:main" },
    ],
  ],
});

const leadKeyboard = (lead: LeadRecord) => ({
  inline_keyboard: [
    [
      { text: "🛠 Взять в работу", callback_data: `lead:take:${lead.id}` },
      { text: "📌 Статус", callback_data: `lead:status_menu:${lead.id}` },
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

async function showLeads(chatId: string, messageId: number | undefined, status: LeadStatus) {
  const leads = await getLeadsByStatus(status);
  const rows = leads.slice(0, 10).map((lead) => [{
    text: `Открыть ${lead.phone || lead.id}`,
    callback_data: `lead:open:${lead.id}`,
  }]);
  await safeEditOrSend(
    chatId,
    messageId,
    rows.length ? `Заявки: ${status}\n\nВыберите заявку:` : "Пока пусто.",
    { inline_keyboard: [...rows, [{ text: "🏠 Главное меню", callback_data: "menu:main" }]] },
  );
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
  const configuredOwner = ownerId();

  if (!chatId || !configuredOwner || userId !== configuredOwner) return { handled: false, reason: "forbidden" };

  if (callback) {
    await answerCallbackQuery({ callbackQueryId: String(callback.id), text: "Готово" });
    const data = String(callback.data || "");
    const messageId = Number(callback.message?.message_id || 0) || undefined;

    if (data === "menu:main") return safeEditOrSend(chatId, messageId, mainMenuText(), nav());
    if (data === "menu:stats") return safeEditOrSend(chatId, messageId, statsText(await getLeadStats()), nav());
    if (data === "menu:leads:new") return showLeads(chatId, messageId, LEAD_STATUSES.NEW);
    if (data === "menu:leads:in_work") return showLeads(chatId, messageId, LEAD_STATUSES.IN_WORK);

    if (data.startsWith("lead:")) {
      const [, action, id, status] = data.split(":");
      const lead = await getLeadById(id);
      if (!lead) return sendMessage({ chatId, text: "Заявка не найдена.", replyMarkup: nav() });

      if (action === "open") return safeEditOrSend(chatId, messageId, buildLeadMessage(lead), leadKeyboard(lead));
      if (action === "take") {
        const updated = await updateLeadStatus({ leadId: id, status: LEAD_STATUSES.IN_WORK, by: "telegram" });
        return safeEditOrSend(chatId, messageId, buildLeadMessage(updated!), leadKeyboard(updated!));
      }
      if (action === "status_menu") return safeEditOrSend(chatId, messageId, "Выберите статус:", statusKeyboard(id));
      if (action === "status" && status && statusValues.has(status)) {
        const updated = await updateLeadStatus({ leadId: id, status: status as LeadStatus, by: "telegram" });
        return safeEditOrSend(chatId, messageId, buildLeadMessage(updated!), leadKeyboard(updated!));
      }
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
