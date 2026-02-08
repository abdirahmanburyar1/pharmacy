import { NextRequest, NextResponse } from 'next/server';
import { withAuth, apiResponse, apiError } from '@/lib/api';
import * as adjustments from '@/lib/services/adjustments';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(req, ['adjust_stock', 'approve_adjustment', 'view_reports'], async () => {
    try {
      const data = await adjustments.findAdjustmentById(params.id);
      return apiResponse(data);
    } catch {
      return apiError('Not found', 404);
    }
  });
}
