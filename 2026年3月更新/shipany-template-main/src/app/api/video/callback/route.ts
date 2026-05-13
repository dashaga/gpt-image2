import { NextRequest } from 'next/server';

import { saveResultsToR2 } from '@/lib/save-generation';
import { respData, respErr } from '@/shared/lib/resp';
import {
  findAITaskByProviderTaskId,
  updateAITaskById,
} from '@/shared/models/ai_task';

export const runtime     = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/video/callback
 *
 * kie.ai calls this endpoint when a video task finishes (success or fail).
 * Body shape (kie.ai webhook):
 *   { taskId, state, resultJson, failMsg? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { taskId, state, resultJson, failMsg } = body as {
      taskId:      string;
      state:       string;
      resultJson?: string;
      failMsg?:    string;
    };

    if (!taskId || !state) {
      return Response.json({ code: -1, message: 'taskId and state are required' }, { status: 400 });
    }

    const task = await findAITaskByProviderTaskId(taskId);
    if (!task) return respData({ ok: true }); // unknown task, ignore

    if (task.status === 'success' || task.status === 'failed') {
      return respData({ ok: true }); // already processed
    }

    if (state === 'success' && resultJson) {
      let kieUrls: string[] = [];
      try {
        const parsed = JSON.parse(resultJson) as { resultUrls?: string[] };
        kieUrls = parsed.resultUrls ?? [];
      } catch {
        // malformed resultJson — fall through to mark failed
      }

      if (kieUrls.length > 0) {
        const savedUrls = await saveResultsToR2({
          userId:    task.userId,
          mediaType: 'video',
          kieUrls,
        });

        await updateAITaskById(task.id, {
          status:   'success',
          taskInfo: JSON.stringify({ output: savedUrls }),
        });

        return respData({ ok: true });
      }
    }

    // Failure or no URLs
    await updateAITaskById(task.id, {
      status:     'failed',
      taskResult: failMsg ? JSON.stringify({ failMsg }) : null,
    });

    return respData({ ok: true });
  } catch (e: any) {
    console.error('[video/callback]', e);
    return respErr(e.message ?? 'callback processing failed');
  }
}
