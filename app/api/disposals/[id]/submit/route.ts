import { NextRequest, NextResponse } from 'next/server';
import { withAuth, apiResponse, apiError } from '@/lib/api';
import * as disposals from '@/lib/services/disposals';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(req, ['dispose_stock'], async (req, session) => {
    try {
      const data = await disposals.submitDisposal(params.id, session.id);
      return apiResponse(data);
    } catch (e) {
      return apiError((e as Error).message, 400);
    }
  });
}
