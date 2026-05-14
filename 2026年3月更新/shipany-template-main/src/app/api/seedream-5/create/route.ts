import { NextRequest } from 'next/server';

import { createSeedream5Task } from '@/lib/kie';
import { getUuid } from '@/shared/lib/hash';
import { respData, respErr } from '@/shared/lib/resp';
import { createAITask } from '@/shared/models/ai_task';
import { getRemainingCredits } from '@/shared/models/credit';
import { getUserInfo } from '@/shared/models/user';

const COST_CREDITS = 3;

export const runtime     = 'nodejs';
export const maxDuration = 10;

export async function POST(req: NextRequest) {
  try {
    const user = await getUserInfo();
    if (!user) return respErr('no auth, please sign in');

    const body = await req.json();
    const { mode, prompt, imageUrls, aspectRatio, quality, nsfwChecker } = body as {
      mode?:         string;
      prompt?:       string;
      imageUrls?:    string[];
      aspectRatio?:  string;
      quality?:      'basic' | 'high';
      nsfwChecker?:  boolean;
    };

    if (!prompt?.trim()) {
      return Response.json({ code: -1, message: 'prompt is required' }, { status: 400 });
    }

    const scene = (mode ?? 'text-to-image') as 'text-to-image' | 'image-to-image';

    // Pre-flight credit check
    const remaining = await getRemainingCredits(user.id);
    if (remaining < COST_CREDITS) {
      return Response.json({ code: -2, message: 'insufficient credits' }, { status: 200 });
    }

    const kieTaskId = await createSeedream5Task({
      mode:         scene,
      prompt:       prompt.trim(),
      imageUrls,
      aspectRatio,
      quality:      quality ?? 'basic',
      nsfwChecker,
    });

    await createAITask({
      id:          getUuid(),
      userId:      user.id,
      mediaType:   'image',
      provider:    'kie',
      model:       'seedream5',
      prompt:      prompt.trim(),
      scene,
      options:     imageUrls?.length ? JSON.stringify({ imageUrls }) : null,
      status:      'pending',
      costCredits: COST_CREDITS,
      taskId:      kieTaskId,
      taskInfo:    null,
      taskResult:  null,
    });

    return respData({ taskId: kieTaskId });
  } catch (e: any) {
    console.error('[seedream-5/create]', e);
    return respErr(e.message ?? 'failed to create Seedream 5 task');
  }
}
