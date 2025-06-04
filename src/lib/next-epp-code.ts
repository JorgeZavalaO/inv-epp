import prisma from "@/lib/prisma";

/**
 * Devuelve el próximo código disponible con el formato EPP-0001, EPP-0002…
 */
export async function getNextEppCode() {
  const last = await prisma.ePP.findFirst({
    where:   { code: { startsWith: "EPP-" } },
    orderBy: { code: "desc" },
    select:  { code: true },
  });
  const num = last
    ? Number(last.code.replace("EPP-", "")) + 1
    : 1;
  return `EPP-${num.toString().padStart(4, "0")}`;
}
