import { NextRequest, NextResponse } from 'next/server';
import { withAuth, apiResponse, apiError } from '@/lib/api';
import * as adjustments from '@/lib/services/adjustments';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(req, ['adjust_stock'], async (req, session) => {
    try {
      const data = await adjustments.submitAdjustment(params.id, session.id);
      return apiResponse(data);
    } catch (e) {
      return apiError((e as Error).message, 400);
    }
  });
}
