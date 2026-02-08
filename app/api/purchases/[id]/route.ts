import { NextRequest, NextResponse } from 'next/server';
import { withAuth, apiResponse, apiError } from '@/lib/api';
import * as purchases from '@/lib/services/purchases';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(req, ['create_purchase', 'view_purchases', 'approve_purchase'], async () => {
    try {
      const data = await purchases.findPurchaseById(params.id);
      return apiResponse(data);
    } catch {
      return apiError('Not found', 404);
    }
  });
}
