/**
 * Agent Loop — ReAct Implementation (Build #7)
 *
 * Implementasi loop sesuai Blueprint §7:
 *   planning → acting → observing → done/failed
 *
 * Streaming event ke client via WritableStreamDefaultWriter (injected dari API route).
 * Setiap langkah menghasilkan event JSON yang dikirim ke client secara real-time.
 *
 * Catatan penting:
 *  - routeRequest (bukan stream) dipakai di loop — LLM harus jawab JSON lengkap
 *    sebelum di-parse. Stream sulit di-parse kalau JSON belum selesai.
 *  - Tool web_search dan lainnya belum diimplementasi (Build #8) — callTool()
 *    melempar error jelas supaya loop-nya bisa diverifikasi strukturnya sekarang.
 *  - needsUserConfirmation selalu false di v1 (tidak ada tool berisiko aktif)
 *  - Semua DB write (agent_tasks, tool_calls) dilakukan dari fungsi ini, bukan dari API route
 */

import { db } from "@/db/client";
import { agentTasks, toolCalls, messages, conversations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { routeRequest } from "@/router/index";
import type { ChatMessage } from "@/providers/types";
import { getTool } from "@/tools/registry";
import { parseAgentAction } from "./parseAction";
import { buildPlannerSystemPrompt, buildRetryPrompt } from "./prompts";
import type { AgentAction } from "./parseAction";

// ============================================================
// TYPES
// ============================================================

export interface AgentContext {
  mode: "chat"; // v3 akan tambah "ide"
  userId: number;
  conversationId: number;
}

/** Event yang di-stream ke client per langkah */
export type AgentEvent =
  | { type: "thought"; step: number; content: string }
  | { type: "action"; step: number; tool: string; input: Record<string, unknown> }
  | { type: "observation"; step: number; content: string }
  | { type: "done"; answer: string; totalSteps: number }
  | { type: "error"; message: string };

// ============================================================
// CONSTANTS
// ============================================================

const MAX_STEPS = 10;

// ============================================================
// TOOL EXECUTION — stub untuk Build #7
// ============================================================

/**
 * Eksekusi tool berdasarkan nama.
 *
 * v1: web_search belum diimplementasi — melempar error jelas.
 * Build #8 akan mengisi implementasi nyata.
 *
 * final_answer tidak dipanggil via callTool — loop handle sendiri sebelum sampai ke sini.
 */
async function callTool(
  toolName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input: Record<string, any>,
  _ctx: AgentContext
): Promise<string> {
  const tool = getTool(toolName);

  if (!tool) {
    throw new Error(
      `Tool "${toolName}" tidak dikenal atau tidak tersedia di mode ini (v1 chat: web_search, final_answer).`
    );
  }

  return tool(input);
}

// ============================================================
// DB HELPERS
// ============================================================

async function updateTaskStatus(
  taskId: number,
  status: string,
  result?: string
): Promise<void> {
  await db
    .update(agentTasks)
    .set({
      status,
      ...(result !== undefined ? { result } : {}),
      ...(status === "done" || status === "failed"
        ? { completedAt: new Date() }
        : {}),
    })
    .where(eq(agentTasks.id, taskId));
}

async function logToolCall(
  taskId: number,
  toolName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input: Record<string, any>,
  output: string,
  isError: boolean
): Promise<void> {
  await db.insert(toolCalls).values({
    agentTaskId: taskId,
    toolName,
    input: JSON.stringify(input),
    output,
    isError,
  });
}

async function incrementStepsTaken(taskId: number, steps: number): Promise<void> {
  await db
    .update(agentTasks)
    .set({ stepsTaken: steps })
    .where(eq(agentTasks.id, taskId));
}

// ============================================================
// MAIN: runAgentLoop
// ============================================================

/**
 * Jalankan ReAct loop untuk satu agent task.
 *
 * @param taskId     — ID baris di tabel agent_tasks
 * @param agentMsgId — ID message yang memicu task (role=agent_task)
 * @param userMessage — Pesan asli dari user
 * @param ctx        — Context (userId, conversationId, mode)
 * @param emit       — Callback untuk stream event ke client
 */
export async function runAgentLoop(
  taskId: number,
  agentMsgId: number,
  userMessage: string,
  ctx: AgentContext,
  emit: (event: AgentEvent) => void
): Promise<void> {
  const systemPrompt = buildPlannerSystemPrompt(MAX_STEPS);

  // Context messages yang di-build secara bertahap (ReAct: append setiap observation)
  const context: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];

  await updateTaskStatus(taskId, "planning");

  let steps = 0;
  let finalAnswer: string | null = null;

  while (steps < MAX_STEPS) {
    // ——————————————————————————————————————
    // 1. Minta model untuk berpikir + pilih action
    // ——————————————————————————————————————
    let modelOutput: string;
    try {
      const result = await routeRequest(context, {
        complexity: "berat",
        source: "internal_chat",
        sourceId: String(ctx.userId),
        maxTokens: 1024,
      });
      modelOutput = result.content;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      emit({ type: "error", message: `Semua provider AI gagal: ${errMsg}` });
      await updateTaskStatus(taskId, "failed", `Provider gagal: ${errMsg}`);
      return;
    }

    // ——————————————————————————————————————
    // 2. Parse action dari output model
    // ——————————————————————————————————————
    let parseResult = parseAgentAction(modelOutput);

    if (!parseResult.isValid) {
      // Retry sekali dengan instruksi lebih tegas
      const retryContext: ChatMessage[] = [
        ...context,
        { role: "assistant", content: modelOutput },
        { role: "user", content: buildRetryPrompt(modelOutput) },
      ];

      try {
        const retryResult = await routeRequest(retryContext, {
          complexity: "berat",
          source: "internal_chat",
          sourceId: String(ctx.userId),
          maxTokens: 512,
        });
        parseResult = parseAgentAction(retryResult.content);
      } catch {
        // Retry juga gagal provider-side — tetap lanjut dengan parseResult invalid
      }

      if (!parseResult.isValid) {
        const reason = parseResult.reason;
        emit({ type: "error", message: `Model tidak menghasilkan JSON valid: ${reason}` });
        await updateTaskStatus(taskId, "failed", `Parse gagal: ${reason}`);
        return;
      }
    }

    const action = (parseResult as { isValid: true; action: AgentAction }).action;

    // Emit thought ke client
    emit({ type: "thought", step: steps + 1, content: action.thought });

    // ——————————————————————————————————————
    // 3. Cek apakah final_answer
    // ——————————————————————————————————————
    if (action.action === "final_answer") {
      finalAnswer = String(action.action_input.answer ?? "");
      await incrementStepsTaken(taskId, steps + 1);
      await updateTaskStatus(taskId, "done", finalAnswer);
      emit({ type: "done", answer: finalAnswer, totalSteps: steps + 1 });
      break;
    }

    // ——————————————————————————————————————
    // 4. Eksekusi tool
    // ——————————————————————————————————————
    await updateTaskStatus(taskId, "acting");
    emit({
      type: "action",
      step: steps + 1,
      tool: action.action,
      input: action.action_input,
    });

    let toolOutput: string;
    let toolError = false;

    try {
      toolOutput = await callTool(action.action, action.action_input, ctx);
    } catch (err) {
      toolOutput = err instanceof Error ? err.message : String(err);
      toolError = true;
    }

    // Simpan tool call ke DB
    await logToolCall(taskId, action.action, action.action_input, toolOutput, toolError);

    // ——————————————————————————————————————
    // 5. Append observation ke context (ReAct)
    // ——————————————————————————————————————
    const observation = toolError
      ? `ERROR dari tool ${action.action}: ${toolOutput}`
      : `Hasil dari ${action.action}: ${toolOutput}`;

    context.push({ role: "assistant", content: JSON.stringify(action) });
    context.push({ role: "user", content: `Observation: ${observation}` });

    await updateTaskStatus(taskId, "observing");
    emit({ type: "observation", step: steps + 1, content: observation });

    steps++;
    await incrementStepsTaken(taskId, steps);

    // Kalau tool error, langsung final_answer di next loop (jangan retry tool yang sama)
    if (toolError) {
      context.push({
        role: "user",
        content: "Tool gagal dieksekusi. Berikan final_answer berdasarkan informasi yang sudah kamu kumpulkan sejauh ini.",
      });
    }
  }

  // ——————————————————————————————————————
  // 6. Melebihi maxSteps tanpa final_answer
  // ——————————————————————————————————————
  if (!finalAnswer) {
    const msg = `Melebihi batas ${MAX_STEPS} langkah tanpa memberi jawaban akhir.`;
    await updateTaskStatus(taskId, "failed", msg);
    emit({ type: "error", message: msg });
  }

  // ——————————————————————————————————————
  // 7. Simpan hasil sebagai pesan assistant di conversation
  // ——————————————————————————————————————
  const assistantContent = finalAnswer
    ?? `[Agent tidak berhasil menyelesaikan tugas dalam ${MAX_STEPS} langkah]`;

  try {
    await db.insert(messages).values({
      conversationId: ctx.conversationId,
      role: "assistant",
      content: assistantContent,
    });

    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, ctx.conversationId));
  } catch (dbErr) {
    console.error("[agent-loop] Gagal simpan hasil ke DB:", dbErr);
  }
}
