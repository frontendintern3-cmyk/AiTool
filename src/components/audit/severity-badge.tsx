import { Badge } from "@/components/ui/badge";
import { StatusPill, type StatusPillTone } from "@/components/ui/status-pill";
import { cn } from "@/lib/utils";

const SEVERITY_MAP: Record<string, { label: string; tone: StatusPillTone }> = {
  critical: { label: "Critical", tone: "danger" },
  warning: { label: "Warning", tone: "warning" },
  info: { label: "Info", tone: "info" },
  passed: { label: "Passed", tone: "success" },
  unavailable: { label: "Data unavailable", tone: "neutral" },
};

export function SeverityBadge({ severity, className }: { severity: string; className?: string }) {
  const config = SEVERITY_MAP[severity] ?? SEVERITY_MAP.info;
  return (
    <StatusPill tone={config.tone} label={config.label} className={cn("font-medium", className)} />
  );
}

const CONFIDENCE_CONFIG: Record<string, string> = {
  HIGH: "High confidence",
  MEDIUM: "Medium confidence",
  LOW: "Low confidence",
  UNAVAILABLE: "Confidence: unavailable",
};

export function ConfidenceBadge({ confidence, className }: { confidence: string; className?: string }) {
  return (
    <Badge variant="secondary" className={cn("font-normal text-muted-foreground", className)}>
      {CONFIDENCE_CONFIG[confidence] ?? confidence}
    </Badge>
  );
}
