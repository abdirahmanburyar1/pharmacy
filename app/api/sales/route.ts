import { NextRequest, NextResponse } from 'next/server';
import { withAuth, apiResponse, apiError } from '@/lib/api';
import * as sales from '@/lib/services/sales';

export async function GET(req: NextRequest) {
  return withAuth(req, ['view_sales', 'view_reports'], async (req) => {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined;
    const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined;
    const data = await sales.findSales(from, to);
    return apiResponse(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, ['sell_medicine'], async (req, session) => {
    try {
      const body = await req.json();
      const data = await sales.createSale(session.id, body);
      return apiResponse(data, 201);
    } catch (e) {
      return apiError((e as Error).message, 400);
    }
  });
}
