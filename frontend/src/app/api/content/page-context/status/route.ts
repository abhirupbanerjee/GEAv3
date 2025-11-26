import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const statusPath = path.join(process.cwd(), 'public', 'page-contexts-status.json');
    const content = fs.readFileSync(statusPath, 'utf-8');
    const status = JSON.parse(content);

    return NextResponse.json(status, {
      headers: {
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Status file not found. Run build to generate.' },
      { status: 404 }
    );
  }
}
