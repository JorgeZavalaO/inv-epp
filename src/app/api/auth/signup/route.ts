import { NextResponse } from "next/server";

/**
 * Public self-registration is disabled.
 * New accounts are created by an administrator from the Users module.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "El registro público está deshabilitado. Solicita acceso desde /auth/signup.",
    },
    { status: 403 },
  );
}
