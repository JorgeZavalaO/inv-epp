import { useCallback } from "react";

function buildFilename() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `entregas-${year}-${month}-${day}.xlsx`;
}

export function useDeliveriesXlsx() {
  return useCallback(async () => {
    const query = typeof window !== "undefined" ? window.location.search : "";
    const url = `/api/deliveries/export${query}`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error("No se pudo generar el Excel de entregas");
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
