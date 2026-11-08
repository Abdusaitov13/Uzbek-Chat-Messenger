import {
  index,
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
  doublePrecision,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const conversationsTable = pgTable(
  "chat_conversations",
  {
    id: serial("id").primaryKey(),
    type: varchar("type", { length: 12 }).notNull().default("direct"),
    title: varchar("title", { length: 100 }),
    createdBy: varchar("created_by", { length: 255 }).references(
      () => usersTable.id,
      { onDelete: "set null" },
    ),
    directKey: text("direct_key"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("chat_conversations_direct_key_idx").on(table.directKey)],
);

export const conversationMembersTable = pgTable(
  "chat_conversation_members",
  {
    conversationId: integer("conversation_id")
      .notNull()
      .references(() => conversationsTable.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    role: varchar("role", { length: 12 }).notNull().default("member"),
  },
  (table) => [
    primaryKey({
      name: "chat_conversation_members_pk",
      columns: [table.conversationId, table.userId],
    }),
    index("chat_conversation_members_user_idx").on(table.userId),
  ],
);

export const messagesTable = pgTable(
  "chat_messages",
  {
    id: serial("id").primaryKey(),
    conversationId: integer("conversation_id")
      .notNull()
      .references(() => conversationsTable.id, { onDelete: "cascade" }),
    senderId: varchar("sender_id", { length: 255 })
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 12 }).notNull().default("text"),
    text: varchar("text", { length: 5000 }),
    attachmentPath: text("attachment_path"),
    attachmentName: varchar("attachment_name", { length: 255 }),
    contentType: varchar("content_type", { length: 128 }),
    fileSize: integer("file_size"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("chat_messages_conversation_created_idx").on(
      table.conversationId,
      table.createdAt,
    ),
  ],
);

export type Conversation = typeof conversationsTable.$inferSelect;
export type Message = typeof messagesTable.$inferSelect;
