import prisma from "@/lib/prisma";
import ReturnClient, { ReturnRow } from "@/components/return/ReturnClient";

export const revalidate = 0;

export default async function ReturnsPage() {
  const list = await prisma.return.findMany({
    include: {
      epp:  { select: { code: true, name: true } },
      user: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const data: ReturnRow[] = list.map((r) => ({
    id:         r.id,
    date:       r.createdAt.toISOString(),
    eppCode:    r.epp.code,
    eppName:    r.epp.name,
    employee:   r.employee,
    quantity:   r.quantity,
    condition:  r.condition,
    operator:   r.user.name ?? r.user.email,
  }));

  return <ReturnClient initialData={data} />;
}
