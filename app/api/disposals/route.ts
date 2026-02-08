import { NextRequest, NextResponse } from 'next/server';
import { withAuth, apiResponse, apiError } from '@/lib/api';
import * as disposals from '@/lib/services/disposals';

export async function GET(req: NextRequest) {
  return withAuth(req, ['dispose_stock', 'approve_disposal', 'view_reports'], async (req) => {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | null;
    const data = await disposals.findDisposals(status || undefined);
    return apiResponse(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, ['dispose_stock'], async (req, session) => {
    try {
      const body = await req.json();
      const data = await disposals.createDisposal(session.id, body);
      return apiResponse(data, 201);
    } catch (e) {
      return apiError((e as Error).message, 400);
    }
  });
}
