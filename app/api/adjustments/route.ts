import { NextRequest, NextResponse } from 'next/server';
import { withAuth, apiResponse, apiError } from '@/lib/api';
import * as adjustments from '@/lib/services/adjustments';

export async function GET(req: NextRequest) {
  return withAuth(req, ['adjust_stock', 'approve_adjustment', 'view_reports'], async (req) => {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | null;
    const data = await adjustments.findAdjustments(status || undefined);
    return apiResponse(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, ['adjust_stock'], async (req, session) => {
    try {
      const body = await req.json();
      const data = await adjustments.createAdjustment(session.id, body);
      return apiResponse(data, 201);
    } catch (e) {
      return apiError((e as Error).message, 400);
    }
  });
}
