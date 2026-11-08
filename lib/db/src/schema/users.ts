import {
  boolean,
  date,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const usersTable = pgTable("chat_users", {
  id: varchar("id", { length: 255 }).primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  displayName: varchar("display_name", { length: 180 }).notNull(),
  firstName: varchar("first_name", { length: 80 }).notNull().default(""),
  lastName: varchar("last_name", { length: 80 }).notNull().default(""),
  username: varchar("username", { length: 32 }).unique(),
  dateOfBirth: date("date_of_birth"),
  bio: varchar("bio", { length: 180 }),
  avatarPath: text("avatar_path"),
  isSearchable: boolean("is_searchable").notNull().default(true),
  showLastSeen: boolean("show_last_seen").notNull().default(true),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export type User = typeof usersTable.$inferSelect;
