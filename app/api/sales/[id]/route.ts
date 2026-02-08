import { NextRequest, NextResponse } from 'next/server';
import { withAuth, apiResponse, apiError } from '@/lib/api';
import * as sales from '@/lib/services/sales';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(req, ['view_sales'], async () => {
    try {
      const data = await sales.findSaleById(params.id);
      return apiResponse(data);
    } catch {
      return apiError('Not found', 404);
    }
  });
}
