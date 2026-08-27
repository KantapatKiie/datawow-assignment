import { NextRequest } from 'next/server';
import { proxyAuth } from '../_handler';

export async function POST(request: NextRequest) {
  return proxyAuth(request, 'login');
}
