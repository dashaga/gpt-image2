import { respData, respErr } from '@/shared/lib/resp';
import { getAITasks } from '@/shared/models/ai_task';
import { getUserInfo } from '@/shared/models/user';

function extractFirstImageUrl(taskInfo: string | null): string | undefined {
  if (!taskInfo) return undefined;
  try {
    const parsed = JSON.parse(taskInfo);
    const output = parsed.output ?? parsed.images ?? parsed.data;
    if (!output) return undefined;
    if (typeof output === 'string') return output;
    if (Array.isArray(output)) {
      const first = output[0];
      if (!first) return undefined;
      if (typeof first === 'string') return first;
      if (typeof first === 'object') {
        return first.url ?? first.uri ?? first.image ?? first.src ?? undefined;
      }
    }
    if (typeof output === 'object') {
      return output.url ?? output.uri ?? output.image ?? output.src ?? undefined;
    }
  } catch {
    // ignore parse errors
  }
  return undefined;
}

export async function GET(request: Request) {
  try {
    const user = await getUserInfo();
    if (!user) return respErr('no auth, please sign in');

    const { searchParams } = new URL(request.url);
    const page  = Math.max(1, parseInt(searchParams.get('page')  ?? '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));

    const tasks = await getAITasks({ userId: user.id, page, limit });

    const records = tasks.map((task) => ({
      id:         task.id,
      type:       task.mediaType === 'video' ? 'video' : 'image',
      model:      task.model,
      prompt:     task.prompt,
      status:     task.status,
      createdAt:  task.createdAt,
      costCredits: task.costCredits,
      imageUrl:   extractFirstImageUrl(task.taskInfo),
    }));

    return respData({ records, page, limit });
  } catch (e: any) {
    console.error('history failed', e);
    return respErr(e.message);
  }
}
