import prisma from "@/lib/prisma";
import SettingsClient from "./SettingsClient";

export const revalidate = 0;

export default async function SettingsPage() {
  const setting = await prisma.setting.findUnique({ where: { key: "logoUrl" } });
  const url = setting?.value || "/next.svg";
  return <SettingsClient current={url} />;
}
