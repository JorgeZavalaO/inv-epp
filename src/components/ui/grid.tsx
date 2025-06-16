// src/components/ui/grid.tsx
import React from "react";

export function Grid({
  cols,
  gap = "4",
  children,
}: {
  cols: number;
  gap?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-${cols} gap-${gap}`}>
      {children}
    </div>
  );
}
