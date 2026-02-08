import { NextRequest, NextResponse } from 'next/server';
import { withAuth, apiResponse, apiError } from '@/lib/api';
import * as purchases from '@/lib/services/purchases';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(req, ['approve_purchase'], async (req, session) => {
    try {
      const body = await req.json().catch(() => ({}));
      const data = await purchases.rejectPurchase(params.id, session.id, body.reason);
      return apiResponse(data);
    } catch (e) {
      return apiError((e as Error).message, 400);
    }
  });
}
