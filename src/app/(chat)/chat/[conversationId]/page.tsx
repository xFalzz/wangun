// TODO Build #6 + #9: Halaman /chat/[conversationId]
// Tampilkan riwayat pesan, input box, toggle mode agentic
export default function ChatPage({ params }: { params: { conversationId: string } }) {
  return (
    <div>
      <h1>Chat {params.conversationId} — Coming in Build #6</h1>
    </div>
  );
}
