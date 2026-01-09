import { useCallback } from "react";

function buildFilename() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `catalogo-epps-${year}-${month}-${day}.xlsx`;
}

export function useEppsCatalogXlsx() {
  return useCallback(async () => {
    const url = "/api/epps/export";
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error("No se pudo generar el Excel del catálogo de EPPs");
    }

    const blob = await res.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = buildFilename();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }, []);
}
