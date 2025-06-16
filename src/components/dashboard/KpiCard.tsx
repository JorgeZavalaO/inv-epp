"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  value: string | number | null | undefined;
  icon?: React.ReactNode;
  isLoading?: boolean;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export default function KpiCard({ 
  title, 
  value, 
  icon, 
  isLoading = false,
  trend,
  className 
}: Props) {
  const displayValue = value ?? 0;

  return (
    <Card className={cn("transition-all hover:shadow-md", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && (
          <div className="flex-shrink-0">
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-1">
        {isLoading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div className="space-y-1">
            <p className="text-2xl font-bold tracking-tight">
              {displayValue}
            </p>
            {trend && (
              <p className={cn(
                "text-xs",
                trend.isPositive ? "text-green-600" : "text-red-600"
              )}>
                {trend.isPositive ? "↗" : "↘"} {Math.abs(trend.value)}%
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}