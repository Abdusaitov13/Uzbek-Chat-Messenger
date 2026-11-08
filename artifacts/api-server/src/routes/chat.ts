import { clerkClient, getAuth } from "@clerk/express";
import {
  CreateConversationBody,
  CreateConversationResponse,
  ListConversationsResponse,
  ListMessagesParams,
  ListMessagesResponse,
  SendMessageBody,
  SendMessageParams,
  SendMessageResponse,
} from "@workspace/api-zod";
import {
  conversationsTable as chatConversationsTable,
  conversationMembersTable as chatConversationMembersTable,
  messagesTable as chatMessagesTable,
  usersTable as chatUsersTable,
  db,
} from "@workspace/db";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { Router, type IRouter, type Request } from "express";

const router: IRouter = Router();

function authenticatedUserId(req: Request): string | null {
  return getAuth(req).userId ?? null;
}

function displayName(firstName?: string | null, lastName?: string | null, email?: string): string {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  return name || email?.split("@")[0] || "Suhbat user";
}

async function syncUser(clerkUserId: string) {
  const profile = await clerkClient.users.getUser(clerkUserId);
  const email =
    profile.primaryEmailAddress?.emailAddress ??
    profile.emailAddresses[0]?.emailAddress;

  if (!email) {
    throw new Error("This account needs a verified email address to use chat.");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const [user] = await db
    .insert(chatUsersTable)
    .values({
      id: profile.id,
      email: normalizedEmail,
      displayName: displayName(profile.firstName, profile.lastName, normalizedEmail),
    })
    .onConflictDoUpdate({
      target: chatUsersTable.id,
      set: {
        email: normalizedEmail,
        displayName: displayName(profile.firstName, profile.lastName, normalizedEmail),
        updatedAt: new Date(),
      },
    })
    .returning();

  return user;
}

function parseConversationId(rawId: string): number | null {
  if (!/^[1-9]\d*$/.test(rawId)) return null;
  const id = Number(rawId);
  return Number.isSafeInteger(id) ? id : null;
}

router.get("/chat/conversations", async (req, res): Promise<void> => {
  const userId = authenticatedUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  await syncUser(userId);
  const memberships = await db
    .select({ conversationId: chatConversationMembersTable.conversationId })
    .from(chatConversationMembersTable)
    .where(eq(chatConversationMembersTable.userId, userId));
  if (memberships.length === 0) {
    res.json(ListConversationsResponse.parse([]));
    return;
  }

  const conversationIds = memberships.map((item) => item.conversationId);
  const [otherUsers, conversations, latestMessages] = await Promise.all([
    db
      .select({
        conversationId: chatConversationMembersTable.conversationId,
        userId: chatUsersTable.id,
        displayName: chatUsersTable.displayName,
        email: chatUsersTable.email,
      })
      .from(chatConversationMembersTable)
      .innerJoin(
        chatUsersTable,
        eq(chatConversationMembersTable.userId, chatUsersTable.id),
      )
      .where(
        and(
          inArray(chatConversationMembersTable.conversationId, conversationIds),
          ne(chatConversationMembersTable.userId, userId),
        ),
      ),
    db
      .select({
        id: chatConversationsTable.id,
        createdAt: chatConversationsTable.createdAt,
      })
      .from(chatConversationsTable)
      .where(inArray(chatConversationsTable.id, conversationIds)),
    db
      .selectDistinctOn([chatMessagesTable.conversationId], {
        conversationId: chatMessagesTable.conversationId,
        senderId: chatMessagesTable.senderId,
        text: chatMessagesTable.text,
        createdAt: chatMessagesTable.createdAt,
      })
      .from(chatMessagesTable)
      .where(inArray(chatMessagesTable.conversationId, conversationIds))
      .orderBy(
        chatMessagesTable.conversationId,
        desc(chatMessagesTable.createdAt),
        desc(chatMessagesTable.id),
      ),
  ]);

  const conversationsById = new Map(conversations.map((item) => [item.id, item]));
  const messagesByConversation = new Map(
    latestMessages.map((item) => [item.conversationId, item]),
  );
  const summaries = otherUsers.flatMap((other) => {
    const conversation = conversationsById.get(other.conversationId);
    if (!conversation) return [];
    const latest = messagesByConversation.get(other.conversationId);
    return [
      {
        id: String(other.conversationId),
        userId: other.userId,
        displayName: other.displayName,
        email: other.email,
        lastMessage: latest?.text ?? null,
        lastMessageAt: latest?.createdAt ?? null,
        lastMessageByMe: latest ? latest.senderId === userId : false,
        activityAt: latest?.createdAt ?? conversation.createdAt,
      },
    ];
  });

  summaries.sort((a, b) => b.activityAt.getTime() - a.activityAt.getTime());
  res.json(
    ListConversationsResponse.parse(
      summaries.map(({ activityAt: _activityAt, ...summary }) => summary),
    ),
  );
});

router.post("/chat/conversations", async (req, res): Promise<void> => {
  const userId = authenticatedUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = CreateConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const currentUser = await syncUser(userId);
  const recipientEmail = parsed.data.recipientEmail.trim().toLowerCase();
  const lookup = await clerkClient.users.getUserList({
    emailAddress: [recipientEmail],
    limit: 1,
  });
  const recipientProfile = lookup.data.find((profile) => profile.id !== userId);

  if (!recipientProfile) {
    res.status(404).json({ error: "No Suhbat account found for that email." });
    return;
  }

  const recipient = await syncUser(recipientProfile.id);
  const directKey = JSON.stringify([userId, recipient.id].sort());
  let [conversation] = await db
    .select()
    .from(chatConversationsTable)
    .where(eq(chatConversationsTable.directKey, directKey))
    .limit(1);

  if (!conversation) {
    const created = await db.transaction(async (transaction) => {
      const [inserted] = await transaction
        .insert(chatConversationsTable)
        .values({ directKey })
        .onConflictDoNothing({
          target: chatConversationsTable.directKey,
        })
        .returning();

      if (!inserted) return null;

      await transaction.insert(chatConversationMembersTable).values([
        { conversationId: inserted.id, userId },
        { conversationId: inserted.id, userId: recipient.id },
      ]);
      return inserted;
    });
    if (created) {
      conversation = created;
    } else {
      [conversation] = await db
        .select()
        .from(chatConversationsTable)
        .where(eq(chatConversationsTable.directKey, directKey))
        .limit(1);
    }
  }

  if (!conversation) {
    res.status(500).json({ error: "Could not create this conversation." });
    return;
  }

  res.json(
    CreateConversationResponse.parse({
      id: String(conversation.id),
      userId: recipient.id,
      displayName: recipient.displayName,
      email: recipient.email,
      lastMessage: null,
      lastMessageAt: null,
      lastMessageByMe: false,
    }),
  );
});

router.get(
  "/chat/conversations/:conversationId/messages",
  async (req, res): Promise<void> => {
    const userId = authenticatedUserId(req);
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const params = ListMessagesParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const conversationId = parseConversationId(params.data.conversationId);
    if (!conversationId) {
      res.status(400).json({ error: "Invalid conversation ID." });
      return;
    }

    const [membership] = await db
      .select({ conversationId: chatConversationMembersTable.conversationId })
      .from(chatConversationMembersTable)
      .where(
        and(
          eq(chatConversationMembersTable.conversationId, conversationId),
          eq(chatConversationMembersTable.userId, userId),
        ),
      )
      .limit(1);
    if (!membership) {
      res.status(404).json({ error: "Conversation not found." });
      return;
    }

    const messages = await db
      .select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.conversationId, conversationId))
      .orderBy(desc(chatMessagesTable.createdAt), desc(chatMessagesTable.id))
      .limit(100);

    res.json(
      ListMessagesResponse.parse(
        messages.map((message) => ({
          ...message,
          id: String(message.id),
          conversationId: String(message.conversationId),
        })),
      ),
    );
  },
);

router.post(
  "/chat/conversations/:conversationId/messages",
  async (req, res): Promise<void> => {
    const userId = authenticatedUserId(req);
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const params = SendMessageParams.safeParse(req.params);
    const body = SendMessageBody.safeParse(req.body);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }

    const conversationId = parseConversationId(params.data.conversationId);
    const text = body.data.text.trim();
    if (!conversationId || !text) {
      res.status(400).json({ error: "Enter a message before sending." });
      return;
    }

    const [membership] = await db
      .select({ conversationId: chatConversationMembersTable.conversationId })
      .from(chatConversationMembersTable)
      .where(
        and(
          eq(chatConversationMembersTable.conversationId, conversationId),
          eq(chatConversationMembersTable.userId, userId),
        ),
      )
      .limit(1);
    if (!membership) {
      res.status(404).json({ error: "Conversation not found." });
      return;
    }

    await syncUser(userId);
    const [message] = await db
      .insert(chatMessagesTable)
      .values({ conversationId, senderId: userId, text })
      .returning();

    res.status(201).json(
      SendMessageResponse.parse({
        ...message,
        id: String(message.id),
        conversationId: String(message.conversationId),
      }),
    );
  },
);

export default router;
