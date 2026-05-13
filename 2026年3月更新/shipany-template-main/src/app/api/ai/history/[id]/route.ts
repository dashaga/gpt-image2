import { NextRequest } from 'next/server';

import { deleteFilesFromStorage } from '@/lib/save-generation';
import { respData, respErr } from '@/shared/lib/resp';
import {
  deleteAITaskById,
  findAITaskById,
} from '@/shared/models/ai_task';
import { getUserInfo } from '@/shared/models/user';

export const runtime     = 'nodejs';
export const maxDuration = 30;

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserInfo();
    if (!user) return respErr('no auth, please sign in');

    const { id } = await params;
    if (!id) {
      return Response.json({ code: -1, message: 'id is required' }, { status: 400 });
    }

    const task = await findAITaskById(id);
    if (!task || task.userId !== user.id) {
      return Response.json({ code: -1, message: 'not found' }, { status: 404 });
    }
    if (task.deletedAt) {
      return Response.json({ code: -1, message: 'already deleted' }, { status: 410 });
    }

    // Best-effort: delete stored files from R2
    if (task.taskInfo) {
      try {
        const parsed = JSON.parse(task.taskInfo) as { output?: string[] };
        if (parsed.output?.length) {
          await deleteFilesFromStorage(parsed.output);
        }
      } catch {
        // ignore parse/delete errors
      }
    }

    // Soft-delete the DB record
    await deleteAITaskById(id);

    return respData({ success: true });
  } catch (e: any) {
    console.error('[history/delete]', e);
    return respErr(e.message ?? 'failed to delete');
  }
}
