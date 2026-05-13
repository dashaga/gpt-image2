import { NextRequest } from 'next/server';

import { createVideoTask, VideoModelSlug } from '@/lib/kie';
import { getUuid } from '@/shared/lib/hash';
import { respData, respErr } from '@/shared/lib/resp';
import { createAITask } from '@/shared/models/ai_task';
import { consumeCredits, getRemainingCredits } from '@/shared/models/credit';
import { getUserInfo } from '@/shared/models/user';

const VIDEO_CREDIT_COSTS: Record<string, number> = {
  'seedance2':   10,
  'hailuo':      10,
  'grok-video':  10,
};

export const runtime    = 'nodejs';
export const maxDuration = 10;

export async function POST(req: NextRequest) {
  try {
    const user = await getUserInfo();
    if (!user) return respErr('no auth, please sign in');

    const body = await req.json();
    const { model, mode, prompt, imageUrls, aspectRatio, resolution, duration, grokMode } = body as {
      model:        string;
      mode?:        string;
      prompt?:      string;
      imageUrls?:   string[];
      aspectRatio?: string;
      resolution?:  string;
      duration?:    number;
      grokMode?:    'fun' | 'normal' | 'spicy';
    };

    if (!model || !prompt?.trim()) {
      return Response.json({ code: -1, message: 'model and prompt are required' }, { status: 400 });
    }

    const scene = (mode ?? 'text-to-video') as string;

    // Pre-flight credit check
    const costCredits = VIDEO_CREDIT_COSTS[model] ?? 0;
    if (costCredits > 0) {
      const remaining = await getRemainingCredits(user.id);
      if (remaining < costCredits) {
        return Response.json({ code: -2, message: 'insufficient credits' }, { status: 200 });
      }
    }

    const kieTaskId = await createVideoTask({
      modelSlug:   model as VideoModelSlug,
      mode:        scene as 'text-to-video' | 'image-to-video',
      prompt:      prompt.trim(),
      imageUrls,
      aspectRatio,
      resolution,
      duration,
      grokMode,
    });

    await createAITask({
      id:          getUuid(),
      userId:      user.id,
      mediaType:   'video',
      provider:    'kie',
      model,
      prompt:      prompt.trim(),
      scene,
      options:     imageUrls?.length ? JSON.stringify({ imageUrls }) : null,
      status:      'pending',
      costCredits,
      taskId:      kieTaskId,
      taskInfo:    null,
      taskResult:  null,
    });

    if (costCredits > 0) {
      await consumeCredits({
        userId:      user.id,
        credits:     costCredits,
        scene:       'video-generation',
        description: `${model} video generation`,
      });
    }

    return respData({ taskId: kieTaskId });
  } catch (e: any) {
    console.error('[video/create]', e);
    return respErr(e.message ?? 'failed to create video task');
  }
}
