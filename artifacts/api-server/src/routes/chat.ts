import { clerkClient, getAuth } from "@clerk/express";
import {
  CreateGroupBody,
  CreateConversationBody,
  CreateConversationResponse,
  GetProfileResponse,
  ListConversationsResponse,
  ListMessagesParams,
  ListMessagesResponse,
  UpdateProfileBody,
  SearchContactsQueryParams,
  SearchContactsResponse,
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
import { and, desc, eq, ilike, inArray, ne, or } from "drizzle-orm";
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
  const firstName =
    (typeof profile.unsafeMetadata["firstName"] === "string"
      ? profile.unsafeMetadata["firstName"]
      : profile.firstName) ?? "";
  const lastName =
    (typeof profile.unsafeMetadata["lastName"] === "string"
      ? profile.unsafeMetadata["lastName"]
      : profile.lastName) ?? "";
  const storedBirthday = profile.unsafeMetadata["dateOfBirth"];
  const dateOfBirth =
    typeof storedBirthday === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(storedBirthday) &&
    !Number.isNaN(Date.parse(`${storedBirthday}T00:00:00Z`))
      ? storedBirthday
      : null;
  const [user] = await db
    .insert(chatUsersTable)
    .values({
      id: profile.id,
      email: normalizedEmail,
      displayName: displayName(firstName, lastName, normalizedEmail),
      firstName,
      lastName,
      ...(dateOfBirth ? { dateOfBirth } : {}),
    })
    .onConflictDoUpdate({
      target: chatUsersTable.id,
      set: {
        email: normalizedEmail,
        displayName: displayName(firstName, lastName, normalizedEmail),
        firstName,
        lastName,
        ...(dateOfBirth ? { dateOfBirth } : {}),
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
  const [members, conversations, latestMessages] = await Promise.all([
    db
      .select({
        conversationId: chatConversationMembersTable.conversationId,
        userId: chatUsersTable.id,
        displayName: chatUsersTable.displayName,
        email: chatUsersTable.email,
        role: chatConversationMembersTable.role,
      })
      .from(chatConversationMembersTable)
      .innerJoin(
        chatUsersTable,
        eq(chatConversationMembersTable.userId, chatUsersTable.id),
      )
      .where(inArray(chatConversationMembersTable.conversationId, conversationIds)),
    db
      .select({
        id: chatConversationsTable.id,
        createdAt: chatConversationsTable.createdAt,
        type: chatConversationsTable.type,
        title: chatConversationsTable.title,
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
  const membersByConversation = new Map<number, typeof members>();
  for (const member of members) {
    const group = membersByConversation.get(member.conversationId) ?? [];
    group.push(member);
    membersByConversation.set(member.conversationId, group);
  }
  const summaries = conversations.flatMap((conversation) => {
    const conversationMembers = membersByConversation.get(conversation.id) ?? [];
    const otherMembers = conversationMembers.filter((member) => member.userId !== userId);
    if (!conversation) return [];
    const other = otherMembers[0];
    if (conversation.type === "direct" && !other) return [];
    const latest = messagesByConversation.get(conversation.id);
    const groupName =
      conversation.title?.trim() ||
      otherMembers.map((member) => member.displayName).join(", ") ||
      "Group chat";
    return [
      {
        id: String(conversation.id),
        userId: conversation.type === "direct" ? other?.userId ?? null : null,
        displayName: conversation.type === "group" ? groupName : other!.displayName,
        email: conversation.type === "direct" ? other?.email ?? null : null,
        type: conversation.type,
        title: conversation.title,
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

router.get("/chat/contacts", async (req, res): Promise<void> => {
  const userId = authenticatedUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = SearchContactsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Search needs at least two characters." });
    return;
  }

  const normalizedQuery = parsed.data.query.trim();
  const pattern = `%${normalizedQuery.replace(/[\\%_]/g, "\\$&")}%`;
  const [result, localMatches] = await Promise.all([
    clerkClient.users.getUserList({ query: normalizedQuery, limit: 20 }),
    db
      .select({
        id: chatUsersTable.id,
        displayName: chatUsersTable.displayName,
        email: chatUsersTable.email,
        username: chatUsersTable.username,
      })
      .from(chatUsersTable)
      .where(
        and(
          ne(chatUsersTable.id, userId),
          eq(chatUsersTable.isSearchable, true),
          or(
            ilike(chatUsersTable.username, pattern),
            ilike(chatUsersTable.firstName, pattern),
            ilike(chatUsersTable.lastName, pattern),
            ilike(chatUsersTable.displayName, pattern),
            ilike(chatUsersTable.email, pattern),
          ),
        ),
      )
      .limit(20),
  ]);
  const contacts = await Promise.all(
    result.data
      .filter((profile) => profile.id !== userId)
      .filter(
        (profile) =>
          profile.primaryEmailAddress?.emailAddress ??
          profile.emailAddresses[0]?.emailAddress,
      )
      .map(async (profile) => {
        const user = await syncUser(profile.id);
        return user.isSearchable
          ? {
              id: user.id,
              displayName: user.displayName,
              email: user.email,
              username: user.username,
            }
          : null;
      }),
  );
  const contactsById = new Map(
    localMatches.map((contact) => [contact.id, contact]),
  );
  for (const contact of contacts) {
    if (contact) contactsById.set(contact.id, contact);
  }
  res.json(
    SearchContactsResponse.parse(
      [...contactsById.values()].sort((a, b) =>
        a.displayName.localeCompare(b.displayName),
      ),
    ),
  );
});

router.get("/chat/profile", async (req, res): Promise<void> => {
  const userId = authenticatedUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const user = await syncUser(userId);
  res.json(
    GetProfileResponse.parse({
      firstName: user.firstName,
      lastName: user.lastName,
      dateOfBirth: user.dateOfBirth,
      username: user.username,
      bio: user.bio,
      isSearchable: user.isSearchable,
      showLastSeen: user.showLastSeen,
    }),
  );
});

router.patch("/chat/profile", async (req, res): Promise<void> => {
  const userId = authenticatedUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Check the profile fields and try again." });
    return;
  }

  const user = await syncUser(userId);
  const username = parsed.data.username?.trim().replace(/^@/, "").toLowerCase() || null;
  if (username && !/^[a-z0-9_]{3,32}$/.test(username)) {
    res.status(400).json({ error: "Username must be 3–32 letters, numbers, or underscores." });
    return;
  }
  const firstName = parsed.data.firstName.trim();
  const lastName = parsed.data.lastName.trim();
  if (!firstName || !lastName) {
    res.status(400).json({ error: "Enter your first and last name." });
    return;
  }

  try {
    const [updated] = await db
      .update(chatUsersTable)
      .set({
        firstName,
        lastName,
        displayName: displayName(firstName, lastName, user.email),
        dateOfBirth: parsed.data.dateOfBirth,
        username,
        bio: parsed.data.bio?.trim() || null,
        isSearchable: parsed.data.isSearchable,
        showLastSeen: parsed.data.showLastSeen,
        updatedAt: new Date(),
      })
      .where(eq(chatUsersTable.id, userId))
      .returning();

    res.json(
      GetProfileResponse.parse({
        firstName: updated.firstName,
        lastName: updated.lastName,
        dateOfBirth: updated.dateOfBirth,
        username: updated.username,
        bio: updated.bio,
        isSearchable: updated.isSearchable,
        showLastSeen: updated.showLastSeen,
      }),
    );
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "23505"
    ) {
      res.status(409).json({ error: "USERNAME_TAKEN" });
      return;
    }
    throw error;
  }
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
      type: "direct",
      title: null,
      lastMessage: null,
      lastMessageAt: null,
      lastMessageByMe: false,
    }),
  );
});

router.post("/chat/groups", async (req, res): Promise<void> => {
  const userId = authenticatedUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = CreateGroupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Choose at least two different people." });
    return;
  }
  const { memberIds } = parsed.data;
  const title = parsed.data.title?.trim().slice(0, 100) ?? "";
  if (memberIds.includes(userId) || new Set(memberIds).size !== memberIds.length) {
    res.status(400).json({ error: "Choose different people for the group." });
    return;
  }

  const profiles = await Promise.all(
    memberIds.map((memberId) => clerkClient.users.getUser(memberId)),
  );
  const currentUser = await syncUser(userId);
  const recipients = await Promise.all(profiles.map((profile) => syncUser(profile.id)));
  const [conversation] = await db.transaction(async (transaction) => {
    const [created] = await transaction
      .insert(chatConversationsTable)
      .values({
        type: "group",
        title: title || null,
        createdBy: userId,
      })
      .returning();

    await transaction.insert(chatConversationMembersTable).values([
      { conversationId: created.id, userId: currentUser.id, role: "admin" },
      ...recipients.map((recipient) => ({
        conversationId: created.id,
        userId: recipient.id,
        role: "member",
      })),
    ]);
    return [created];
  });
  const displayName =
    conversation.title || recipients.map((recipient) => recipient.displayName).join(", ");

  res.status(201).json(
    CreateConversationResponse.parse({
      id: String(conversation.id),
      userId: null,
      displayName,
      email: null,
      type: "group",
      title: conversation.title,
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
      .select({
        id: chatMessagesTable.id,
        conversationId: chatMessagesTable.conversationId,
        senderId: chatMessagesTable.senderId,
        senderName: chatUsersTable.displayName,
        text: chatMessagesTable.text,
        createdAt: chatMessagesTable.createdAt,
      })
      .from(chatMessagesTable)
      .innerJoin(
        chatUsersTable,
        eq(chatMessagesTable.senderId, chatUsersTable.id),
      )
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

    const sender = await syncUser(userId);
    const [message] = await db
      .insert(chatMessagesTable)
      .values({ conversationId, senderId: userId, text })
      .returning();

    res.status(201).json(
      SendMessageResponse.parse({
        ...message,
        id: String(message.id),
        conversationId: String(message.conversationId),
        senderName: sender.displayName,
      }),
    );
  },
);

export default router;
