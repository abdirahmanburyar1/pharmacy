import { NextRequest, NextResponse } from 'next/server';
import { withAuth, apiResponse, apiError } from '@/lib/api';
import * as adjustments from '@/lib/services/adjustments';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(req, ['approve_adjustment'], async (req, session) => {
    try {
      const body = await req.json().catch(() => ({}));
      const data = await adjustments.rejectAdjustment(params.id, session.id, body.reason);
      return apiResponse(data);
    } catch (e) {
      return apiError((e as Error).message, 400);
    }
  });
}
