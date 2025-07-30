import prisma from "./prisma";
import path from "path";

export async function getLogoFilePath() {
  const setting = await prisma.setting.findUnique({ where: { key: "logoUrl" } });
  const rel = setting?.value || "assets/company-logo.png";
  return path.resolve(process.cwd(), "public", rel);
}
