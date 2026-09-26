/**
 * Database Schema — Wangun v1
 *
 * Tabel v1 (sesuai Blueprint §13 / LRS):
 *   users, plans, conversations, messages, attachments,
 *   agent_tasks, tool_calls, model_providers, memories, usage_logs
 *
 * TIDAK dibuat sekarang (v2/v3):
 *   api_keys, workspaces, files
 *
 * Desain forward-compatible:
 *   - users.plan_id siap untuk relasi ke plans (sudah ada)
 *   - usage_logs.source sudah ada kolom 'source' untuk isolasi kuota
 *   - usage_logs.api_key_id ada sebagai nullable — aktif di v2
 */

import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  boolean,
  decimal,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";

// ============================================================
// plans — Paket/kuota user (dirancang untuk billing v2+)
// ============================================================
export const plans = pgTable("plans", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(), // "Free", "Pro", dll
  quotaDaily: integer("quota_daily").notNull().default(100), // maks request/hari
  price: decimal("price", { precision: 10, scale: 2 }).notNull().default("0"),
});

// ============================================================
// users
// ============================================================
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }), // nullable: user OAuth tidak punya password
    planId: integer("plan_id")
      .notNull()
      .default(1) // default ke plan "Free"
      .references(() => plans.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("users_email_idx").on(table.email)]
);

// ============================================================
// model_providers — Konfigurasi provider AI (dari DB, bukan hardcode)
// ============================================================
export const modelProviders = pgTable("model_providers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(), // "Gemini", "DeepSeek", dll
  apiEndpoint: varchar("api_endpoint", { length: 500 }).notNull(),
  priority: integer("priority").notNull().default(1), // urutan fallback (1=utama)
  costPer1kToken: decimal("cost_per_1k_token", { precision: 10, scale: 6 })
    .notNull()
    .default("0"), // 0 untuk yang gratis
  isActive: boolean("is_active").notNull().default(true),
});

// ============================================================
// conversations
// ============================================================
export const conversations = pgTable(
  "conversations",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull().default("Percakapan baru"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("conversations_user_id_idx").on(table.userId),
    index("conversations_updated_at_idx").on(table.updatedAt),
  ]
);

// ============================================================
// messages
// ============================================================
export const messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    conversationId: integer("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 20 }).notNull(), // "user" | "assistant" | "system"
    content: text("content").notNull(),
    modelProviderId: integer("model_provider_id").references(
      () => modelProviders.id
    ), // nullable: pesan user tidak punya provider
    tokensUsed: integer("tokens_used").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("messages_conversation_id_idx").on(table.conversationId)]
);

// ============================================================
// attachments — File yang di-upload ke conversation
// ============================================================
export const attachments = pgTable(
  "attachments",
  {
    id: serial("id").primaryKey(),
    conversationId: integer("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    filePath: varchar("file_path", { length: 1000 }).notNull(),
    fileType: varchar("file_type", { length: 100 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("attachments_conversation_id_idx").on(table.conversationId),
  ]
);

// ============================================================
// agent_tasks — Satu agent task per message yang memicu mode agentic
// ============================================================
export const agentTasks = pgTable(
  "agent_tasks",
  {
    id: serial("id").primaryKey(),
    messageId: integer("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    // workspace_id nullable — disiapkan untuk v3 IDE tanpa breaking change
    // workspaceId: integer("workspace_id") — aktifkan di Build v3
    taskType: varchar("task_type", { length: 50 }).notNull().default("chat"), // "chat" | "ide"
    status: varchar("status", { length: 30 }).notNull().default("pending"),
    // status: pending | planning | acting | observing | awaiting_confirmation | done | failed
    stepsTaken: integer("steps_taken").notNull().default(0),
    plan: text("plan"), // rencana awal agent
    result: text("result"), // output final atau pesan error
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("agent_tasks_message_id_idx").on(table.messageId),
    index("agent_tasks_status_idx").on(table.status),
  ]
);

// ============================================================
// tool_calls — Satu baris per pemanggilan tool dalam satu agent task
// ============================================================
export const toolCalls = pgTable(
  "tool_calls",
  {
    id: serial("id").primaryKey(),
    agentTaskId: integer("agent_task_id")
      .notNull()
      .references(() => agentTasks.id, { onDelete: "cascade" }),
    toolName: varchar("tool_name", { length: 100 }).notNull(),
    input: text("input").notNull(), // JSON string
    output: text("output").notNull(), // JSON string
    isError: boolean("is_error").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("tool_calls_agent_task_id_idx").on(table.agentTaskId)]
);

// ============================================================
// memories — Long-term memory per user (RAG)
// Kolom embedding menggunakan tipe vector dari pgvector
// ============================================================
export const memories = pgTable(
  "memories",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    key: varchar("key", { length: 255 }).notNull(),
    value: text("value").notNull(),
    // pgvector: tipe vector(1536) — ukuran embedding Gemini text-embedding-004
    // Drizzle belum punya tipe native vector, pakai sql custom type
    embedding: text("embedding"), // akan di-cast ke vector di query pgvector
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("memories_user_id_idx").on(table.userId),
    uniqueIndex("memories_user_key_idx").on(table.userId, table.key),
  ]
);

// ============================================================
// usage_logs — Audit trail setiap panggilan provider
// Didesain untuk isolasi kuota internal (chat) vs eksternal (v2 API key)
// ============================================================
export const usageLogs = pgTable(
  "usage_logs",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // api_key_id nullable — aktif di v2. Sudah ada sekarang agar migrasi v2 tidak breaking.
    apiKeyId: integer("api_key_id"), // FK ke api_keys.id ditambah di v2
    modelProviderId: integer("model_provider_id")
      .notNull()
      .references(() => modelProviders.id),
    // source: kunci isolasi kuota internal vs eksternal (Blueprint §6, §10)
    source: varchar("source", { length: 30 }).notNull().default("internal_chat"),
    // source: "internal_chat" | "api_external"
    tokensInput: integer("tokens_input").notNull().default(0),
    tokensOutput: integer("tokens_output").notNull().default(0),
    cost: decimal("cost", { precision: 10, scale: 6 }).notNull().default("0"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("usage_logs_user_id_idx").on(table.userId),
    index("usage_logs_source_idx").on(table.source),
    index("usage_logs_created_at_idx").on(table.createdAt),
  ]
);

// ============================================================
// RELATIONS — untuk query builder Drizzle
// ============================================================

export const plansRelations = relations(plans, ({ many }) => ({
  users: many(users),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  plan: one(plans, { fields: [users.planId], references: [plans.id] }),
  conversations: many(conversations),
  memories: many(memories),
  usageLogs: many(usageLogs),
}));

export const modelProvidersRelations = relations(modelProviders, ({ many }) => ({
  messages: many(messages),
  usageLogs: many(usageLogs),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, { fields: [conversations.userId], references: [users.id] }),
  messages: many(messages),
  attachments: many(attachments),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  modelProvider: one(modelProviders, {
    fields: [messages.modelProviderId],
    references: [modelProviders.id],
  }),
  agentTask: one(agentTasks, {
    fields: [messages.id],
    references: [agentTasks.messageId],
  }),
}));

export const agentTasksRelations = relations(agentTasks, ({ one, many }) => ({
  message: one(messages, {
    fields: [agentTasks.messageId],
    references: [messages.id],
  }),
  toolCalls: many(toolCalls),
}));

export const toolCallsRelations = relations(toolCalls, ({ one }) => ({
  agentTask: one(agentTasks, {
    fields: [toolCalls.agentTaskId],
    references: [agentTasks.id],
  }),
}));

export const memoriesRelations = relations(memories, ({ one }) => ({
  user: one(users, { fields: [memories.userId], references: [users.id] }),
}));

export const usageLogsRelations = relations(usageLogs, ({ one }) => ({
  user: one(users, { fields: [usageLogs.userId], references: [users.id] }),
  modelProvider: one(modelProviders, {
    fields: [usageLogs.modelProviderId],
    references: [modelProviders.id],
  }),
}));

// ============================================================
// TYPE EXPORTS — untuk dipakai di seluruh codebase
// ============================================================
export type Plan = typeof plans.$inferSelect;
export type NewPlan = typeof plans.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type ModelProvider = typeof modelProviders.$inferSelect;
export type NewModelProvider = typeof modelProviders.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type AgentTask = typeof agentTasks.$inferSelect;
export type NewAgentTask = typeof agentTasks.$inferInsert;
export type ToolCall = typeof toolCalls.$inferSelect;
export type NewToolCall = typeof toolCalls.$inferInsert;
export type Memory = typeof memories.$inferSelect;
export type NewMemory = typeof memories.$inferInsert;
export type UsageLog = typeof usageLogs.$inferSelect;
export type NewUsageLog = typeof usageLogs.$inferInsert;
