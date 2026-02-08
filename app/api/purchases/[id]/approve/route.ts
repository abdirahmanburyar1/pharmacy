import { NextRequest, NextResponse } from 'next/server';
import { withAuth, apiResponse, apiError } from '@/lib/api';
import * as purchases from '@/lib/services/purchases';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(req, ['approve_purchase'], async (req, session) => {
    try {
      const data = await purchases.approvePurchase(params.id, session.id);
      return apiResponse(data);
    } catch (e) {
      return apiError((e as Error).message, 400);
    }
  });
}
