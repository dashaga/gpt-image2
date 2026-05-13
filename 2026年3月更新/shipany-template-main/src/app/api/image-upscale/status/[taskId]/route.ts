import { NextRequest } from 'next/server';

import { getTaskStatus } from '@/lib/kie';
import { saveResultsToR2 } from '@/lib/save-generation';
import { respData, respErr } from '@/shared/lib/resp';
import {
  findAITaskByProviderTaskId,
  updateAITaskById,
} from '@/shared/models/ai_task';
import { getUserInfo } from '@/shared/models/user';

export const runtime     = 'nodejs';
export const maxDuration = 30;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const user = await getUserInfo();
    if (!user) return respErr('no auth, please sign in');

    const { taskId } = await params;
    if (!taskId) {
      return Response.json({ code: -1, message: 'taskId is required' }, { status: 400 });
    }

    const task = await findAITaskByProviderTaskId(taskId);

    if (task && task.userId === user.id && task.status === 'success' && task.taskInfo) {
      const { output } = JSON.parse(task.taskInfo) as { output: string[] };
      return respData({
        status: 'success', resultUrl: output[0] ?? null,
        resultUrls: output, progress: null, failMsg: null,
      });
    }

    const result = await getTaskStatus(taskId);

    if (result.state === 'success' && result.resultUrls.length > 0) {
      const savedUrls = await saveResultsToR2({
        userId:    task?.userId ?? user.id,
        mediaType: 'image',
        kieUrls:   result.resultUrls,
      });
      if (task && task.userId === user.id && task.status !== 'success') {
        await updateAITaskById(task.id, {
          status:   'success',
          taskInfo: JSON.stringify({ output: savedUrls }),
        });
      }
      return respData({
        status: 'success', resultUrl: savedUrls[0] ?? null,
        resultUrls: savedUrls, progress: null, failMsg: null,
      });
    }

    if (result.state === 'fail') {
      if (task && task.userId === user.id && task.status !== 'failed') {
        await updateAITaskById(task.id, { status: 'failed' });
      }
    }

    return respData({
      status: result.state, resultUrl: result.resultUrls[0] ?? null,
      resultUrls: result.resultUrls, progress: result.progress ?? null,
      failMsg: result.failMsg ?? null,
    });
  } catch (e: any) {
    console.error('[image-upscale/status]', e);
    return respErr(e.message ?? 'failed to query upscale task status');
  }
}
