import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { conversations } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export default async function ChatIndexPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/chat");
  }

  const userId = parseInt(session.user.id, 10);

  // Ambil percakapan terbaru milik user
  const latestConv = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.updatedAt))
    .limit(1);

  if (latestConv.length > 0 && latestConv[0]) {
    redirect(`/chat/${latestConv[0].id}`);
  }

  // Jika belum ada percakapan sama sekali, buat percakapan pertama
  const newConv = await db
    .insert(conversations)
    .values({
      userId,
      title: "Percakapan Baru",
    })
    .returning({ id: conversations.id });

  if (newConv[0]) {
    redirect(`/chat/${newConv[0].id}`);
  }

  redirect("/login");
}
