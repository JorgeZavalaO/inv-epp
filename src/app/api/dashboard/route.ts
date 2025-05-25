// src/app/api/dashboard/route.ts
import { NextResponse } from "next/server";
import { fetchDashboardData } from "@/lib/dashboard";

export async function GET() {
  const data = await fetchDashboardData();
  return NextResponse.json(data);
}
