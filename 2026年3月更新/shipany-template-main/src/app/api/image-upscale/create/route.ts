import { NextRequest } from 'next/server';

import { createImageUpscaleTask } from '@/lib/kie';
import { getUuid } from '@/shared/lib/hash';
import { respData, respErr } from '@/shared/lib/resp';
import { createAITask } from '@/shared/models/ai_task';
import { consumeCredits, getRemainingCredits } from '@/shared/models/credit';
import { getUserInfo } from '@/shared/models/user';

const COST_CREDITS = 2;

export const runtime     = 'nodejs';
export const maxDuration = 10;

export async function POST(req: NextRequest) {
  try {
    const user = await getUserInfo();
    if (!user) return respErr('no auth, please sign in');

    const body = await req.json();
    const { imageUrl, upscaleFactor } = body as {
      imageUrl:      string;
      upscaleFactor?: '1' | '2' | '4' | '8';
    };

    if (!imageUrl) {
      return Response.json({ code: -1, message: 'imageUrl is required' }, { status: 400 });
    }

    // Pre-flight credit check
    const remaining = await getRemainingCredits(user.id);
    if (remaining < COST_CREDITS) {
      return Response.json({ code: -2, message: 'insufficient credits' }, { status: 200 });
    }

    const kieTaskId = await createImageUpscaleTask({ imageUrl, upscaleFactor });

    await createAITask({
      id:          getUuid(),
      userId:      user.id,
      mediaType:   'image',
      provider:    'kie',
      model:       'ai-image-upscaler',
      prompt:      '',
      scene:       'image-to-image',
      options:     JSON.stringify({ imageUrl, upscaleFactor }),
      status:      'pending',
      costCredits: COST_CREDITS,
      taskId:      kieTaskId,
      taskInfo:    null,
      taskResult:  null,
    });

    await consumeCredits({
      userId:      user.id,
      credits:     COST_CREDITS,
      scene:       'image-generation',
      description: 'Image upscale',
    });

    return respData({ taskId: kieTaskId });
  } catch (e: any) {
    console.error('[image-upscale/create]', e);
    return respErr(e.message ?? 'failed to create upscale task');
  }
}
