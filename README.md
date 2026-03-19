# paperclip-plugin-telegram

[![npm](https://img.shields.io/npm/v/paperclip-plugin-telegram)](https://www.npmjs.com/package/paperclip-plugin-telegram)

Bidirectional Telegram integration for [Paperclip](https://github.com/paperclipai/paperclip). Push agent notifications to Telegram, receive bot commands, approve requests with inline buttons, and route forum topics to projects.

Built on the Paperclip plugin SDK and the domain event bridge ([PR #909](https://github.com/paperclipai/paperclip/pull/909)).

## Features

- **Push notifications** on issue created, issue done, approval requested, agent error, run lifecycle
- **Bot commands**: `/status`, `/issues`, `/agents`, `/approve`, `/help`, `/connect`
- **Inline buttons** for approve/reject on approval notifications
- **Inbound routing**: reply to a notification in Telegram and it becomes an issue comment in Paperclip
- **Per-company chat routing** with `/connect` command
- **Forum topic routing**: map Telegram topics to Paperclip projects
- **Daily digest**: scheduled summary of agent activity
- **MarkdownV2 formatting** with automatic plain text fallback
- **HITL escalation**: agents that get stuck can escalate to a dedicated channel with full conversation context, suggested replies, and approve/reject/override buttons. Configurable timeouts with automatic default actions.

## Setup

### 1. Create a Telegram bot

1. Open Telegram and chat with [@BotFather](https://t.me/BotFather)
2. Run `/newbot` and follow the prompts
3. Save the bot token

### 2. Get your chat ID

Send a message to your bot, then run:

```bash
curl "https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates"
```

Find the `chat.id` field in the response. For groups, the ID is a negative number.

### 3. Install the plugin

```bash
# From your Paperclip directory
pnpm paperclipai plugin install /path/to/paperclip-plugin-telegram
```

### 4. Configure

In your Paperclip instance settings, configure:

| Setting | Required | Description |
|---------|----------|-------------|
| `telegramBotTokenRef` | Yes | Secret reference to your bot token |
| `defaultChatId` | Yes | Chat ID for notifications |
| `approvalsChatId` | No | Separate chat for approvals |
| `errorsChatId` | No | Separate chat for errors |
| `enableCommands` | No | Enable bot commands (default: true) |
| `enableInbound` | No | Route Telegram replies to issues (default: true) |
| `dailyDigestEnabled` | No | Send daily activity summary |
| `topicRouting` | No | Map forum topics to projects |
| `escalationChatId` | No | Dedicated chat/topic for agent escalations |
| `escalationTimeoutMs` | No | Timeout before default action fires (default: 900000 / 15 min) |
| `escalationDefaultAction` | No | Action on timeout: `defer`, `close`, `retry`, `escalate_further` (default: `defer`) |
| `escalationHoldMessage` | No | Message sent to customer while waiting (default: "Let me check on that - I'll get back to you shortly.") |

### 5. Add bot to group (optional)

If using a group chat:
1. Add the bot to your Telegram group
2. Disable privacy mode via BotFather (`/setprivacy` -> Disable) if you want the bot to see all messages
3. Run `/connect <company-name>` in the group

## How it works

### Notifications (outbound)

When Paperclip events fire (issue created, approval needed, agent error), the plugin formats them as Telegram messages with MarkdownV2 and sends to the configured chat.

Approval notifications include inline Approve/Reject buttons. Clicking a button calls the Paperclip API directly and updates the message to show the resolution.

### Commands (inbound)

The bot registers commands with Telegram's command menu. Users can interact with Paperclip directly:

- `/status` - overview of agents and tasks
- `/issues` - list open issues
- `/agents` - list agents with status
- `/approve <id>` - approve a pending request
- `/connect <company>` - link this chat to a Paperclip company

### Reply routing

When a user replies to a bot notification, the plugin looks up which Paperclip entity that notification was about and posts the reply as an issue comment. This turns Telegram threads into a natural conversation interface for Paperclip issues.

## Comparison with PR #407

| Feature | PR #407 | This plugin |
|---------|---------|-------------|
| Push notifications | Yes | Yes |
| Receive messages | No | Yes |
| Bot commands | No | /status, /issues, /agents, /approve |
| Inline buttons | No | Approve/reject on approvals |
| Reply routing | No | Replies become issue comments |
| Topic routing | No | Forum topic = project |
| Daily digest | No | Yes |
| Architecture | Monorepo example | Standalone npm package |

## Development

```bash
pnpm install
pnpm build
pnpm typecheck
```

## License

MIT

## Credits

[@MatB57](https://github.com/MatB57) - Escalation channel concept, "Chat OS" vision for turning chat plugins into bidirectional agent command centers, and the HITL suggested-reply flow.

[@leeknowsai](https://github.com/leeknowsai) - Worker bootstrap patterns adapted from the Discord plugin.

Inspired by [OpenClaw's Telegram integration](https://github.com/openclaw/openclaw) (grammY, bidirectional messaging, inline buttons) and adapted for the Paperclip plugin SDK.
