import { NextRequest, NextResponse } from 'next/server';
import { withAuth, apiResponse, apiError } from '@/lib/api';
import * as disposals from '@/lib/services/disposals';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(req, ['dispose_stock', 'approve_disposal', 'view_reports'], async () => {
    try {
      const data = await disposals.findDisposalById(params.id);
      return apiResponse(data);
    } catch {
      return apiError('Not found', 404);
    }
  });
}
