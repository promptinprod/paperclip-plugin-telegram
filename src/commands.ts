import type { PluginContext } from "@paperclipai/plugin-sdk";
import { sendMessage, escapeMarkdownV2, sendChatAction } from "./telegram-api.js";
import { METRIC_NAMES } from "./constants.js";

type BotCommand = {
  command: string;
  description: string;
};

export const BOT_COMMANDS: BotCommand[] = [
  { command: "status", description: "Company health: active agents, open issues" },
  { command: "issues", description: "List open issues (optionally by project)" },
  { command: "agents", description: "List agents with current status" },
  { command: "approve", description: "Approve a pending request by ID" },
  { command: "help", description: "Show available commands" },
];

export async function handleCommand(
  ctx: PluginContext,
  token: string,
  chatId: string,
  command: string,
  args: string,
  messageThreadId?: number,
): Promise<void> {
  await ctx.metrics.write(METRIC_NAMES.commandsHandled, 1);

  switch (command) {
    case "status":
      await handleStatus(ctx, token, chatId, messageThreadId);
      break;
    case "issues":
      await handleIssues(ctx, token, chatId, args, messageThreadId);
      break;
    case "agents":
      await handleAgents(ctx, token, chatId, messageThreadId);
      break;
    case "approve":
      await handleApprove(ctx, token, chatId, args, messageThreadId);
      break;
    case "help":
      await handleHelp(ctx, token, chatId, messageThreadId);
      break;
    case "connect":
      await handleConnect(ctx, token, chatId, args, messageThreadId);
      break;
    default:
      await sendMessage(ctx, token, chatId, `Unknown command: /${command}. Try /help`, {
        messageThreadId,
      });
  }
}

async function handleStatus(
  ctx: PluginContext,
  token: string,
  chatId: string,
  messageThreadId?: number,
): Promise<void> {
  await sendChatAction(ctx, token, chatId);

  // TODO: Use ctx.entities/ctx.agents to fetch real data when SDK supports it
  const text = [
    escapeMarkdownV2("📊") + " *Paperclip Status*",
    "",
    escapeMarkdownV2("Status check connected. Agent and issue queries will be available once the Plugin SDK exposes entity read APIs."),
  ].join("\n");

  await sendMessage(ctx, token, chatId, text, {
    parseMode: "MarkdownV2",
    messageThreadId,
  });
}

async function handleIssues(
  ctx: PluginContext,
  token: string,
  chatId: string,
  projectFilter: string,
  messageThreadId?: number,
): Promise<void> {
  await sendChatAction(ctx, token, chatId);

  // TODO: Query issues via SDK when available
  const filter = projectFilter ? ` for project "${projectFilter}"` : "";
  await sendMessage(
    ctx,
    token,
    chatId,
    `Issue listing${filter} will be available once the Plugin SDK exposes entity read APIs.`,
    { messageThreadId },
  );
}

async function handleAgents(
  ctx: PluginContext,
  token: string,
  chatId: string,
  messageThreadId?: number,
): Promise<void> {
  await sendChatAction(ctx, token, chatId);

  // TODO: Query agents via SDK when available
  await sendMessage(
    ctx,
    token,
    chatId,
    "Agent listing will be available once the Plugin SDK exposes entity read APIs.",
    { messageThreadId },
  );
}

async function handleApprove(
  ctx: PluginContext,
  token: string,
  chatId: string,
  approvalId: string,
  messageThreadId?: number,
): Promise<void> {
  if (!approvalId.trim()) {
    await sendMessage(ctx, token, chatId, "Usage: /approve <approval-id>", {
      messageThreadId,
    });
    return;
  }

  try {
    await ctx.http.fetch(
      `http://localhost:3100/api/approvals/${approvalId.trim()}/approve`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decidedByUserId: `telegram:${chatId}` }),
      },
    );

    await sendMessage(
      ctx,
      token,
      chatId,
      `${escapeMarkdownV2("✅")} *Approved*: \`${escapeMarkdownV2(approvalId.trim())}\``,
      { parseMode: "MarkdownV2", messageThreadId },
    );
  } catch (err) {
    await sendMessage(
      ctx,
      token,
      chatId,
      `Failed to approve ${approvalId}: ${err instanceof Error ? err.message : String(err)}`,
      { messageThreadId },
    );
  }
}

async function handleHelp(
  ctx: PluginContext,
  token: string,
  chatId: string,
  messageThreadId?: number,
): Promise<void> {
  const lines = [
    escapeMarkdownV2("📎") + " *Paperclip Bot Commands*",
    "",
    ...BOT_COMMANDS.map(
      (cmd) => `/${escapeMarkdownV2(cmd.command)} \\- ${escapeMarkdownV2(cmd.description)}`,
    ),
    "",
    `/${escapeMarkdownV2("connect")} \\- ${escapeMarkdownV2("Link this chat to a Paperclip company")}`,
  ];

  await sendMessage(ctx, token, chatId, lines.join("\n"), {
    parseMode: "MarkdownV2",
    messageThreadId,
  });
}

async function handleConnect(
  ctx: PluginContext,
  token: string,
  chatId: string,
  companyName: string,
  messageThreadId?: number,
): Promise<void> {
  if (!companyName.trim()) {
    await sendMessage(ctx, token, chatId, "Usage: /connect <company-name>", {
      messageThreadId,
    });
    return;
  }

  await ctx.state.set(
    { scopeKind: "plugin", scopeId: "routing", stateKey: `chat_${chatId}` },
    { companyName: companyName.trim(), linkedAt: new Date().toISOString() },
  );

  await sendMessage(
    ctx,
    token,
    chatId,
    `${escapeMarkdownV2("🔗")} ${escapeMarkdownV2("Linked this chat to company:")} *${escapeMarkdownV2(companyName.trim())}*`,
    { parseMode: "MarkdownV2", messageThreadId },
  );

  ctx.logger.info("Chat linked to company", { chatId, companyName: companyName.trim() });
}
