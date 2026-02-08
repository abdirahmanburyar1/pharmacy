import { NextRequest, NextResponse } from 'next/server';
import { withAuth, apiResponse, apiError } from '@/lib/api';
import * as purchases from '@/lib/services/purchases';

export async function GET(req: NextRequest) {
  return withAuth(req, ['create_purchase', 'view_purchases', 'approve_purchase'], async (req) => {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | null;
    const data = await purchases.findPurchases(status || undefined);
    return apiResponse(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, ['create_purchase'], async (req, session) => {
    try {
      const body = await req.json();
      const data = await purchases.createPurchase(session.id, body);
      return apiResponse(data, 201);
    } catch (e) {
      return apiError((e as Error).message, 400);
    }
  });
}
