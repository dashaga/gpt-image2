import { NextRequest } from 'next/server';

import { createNanoBananaTask } from '@/lib/kie';
import { getUuid } from '@/shared/lib/hash';
import { respData, respErr } from '@/shared/lib/resp';
import { createAITask } from '@/shared/models/ai_task';
import { getUserInfo } from '@/shared/models/user';

export const runtime = 'nodejs';
export const maxDuration = 10;

export async function POST(req: NextRequest) {
  try {
    const user = await getUserInfo();
    if (!user) return respErr('no auth, please sign in');

    const body = await req.json();
    const { prompt, imageUrls, aspectRatio } = body as {
      prompt?: string;
      imageUrls?: string[];
      aspectRatio?: string;
    };

    if (!prompt?.trim()) {
      return Response.json({ code: -1, message: 'prompt is required' }, { status: 400 });
    }

    const isI2I = (imageUrls?.length ?? 0) > 0;
    const scene = isI2I ? 'image-to-image' : 'text-to-image';

    const kieTaskId = await createNanoBananaTask({
      prompt:      prompt.trim(),
      imageInput:  imageUrls?.length ? imageUrls : undefined,
      aspectRatio: aspectRatio || '1:1',
      resolution:  '1K',
      outputFormat: 'jpg',
    });

    const taskRecord = await createAITask({
      id:          getUuid(),
      userId:      user.id,
      mediaType:   'image',
      provider:    'kie',
      model:       'nano-banana-pro',
      prompt:      prompt.trim(),
      scene,
      options:     imageUrls?.length ? JSON.stringify({ imageUrls }) : null,
      status:      'pending',
      costCredits: 0,
      taskId:      kieTaskId,
      taskInfo:    null,
      taskResult:  null,
    });

    return respData({ taskId: kieTaskId, id: taskRecord.id });
  } catch (e: any) {
    console.error('[nano-banana/create]', e);
    return respErr(e.message ?? 'failed to create task');
  }
}
