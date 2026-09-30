export interface RoadmapItem {
  id: string;
  title: string;
  estimatedTime: string;
}

export interface RoadmapBucket {
  window: string;
  label: string;
  items: RoadmapItem[];
}

interface RecommendationLike {
  id: string;
  title: string;
  priority: string;
  isQuickWin: boolean;
  estimatedTime: string;
  compositeScore: number;
}

/** Deterministic bucketing of real recommendations into a 30/60/90 window —
 * not a fabricated project plan, just priority/effort already computed by the
 * recommendations engine, grouped into a familiar shape. */
export function buildRoadmap(recommendations: RecommendationLike[]): RoadmapBucket[] {
  const sorted = [...recommendations].sort((a, b) => b.compositeScore - a.compositeScore);
  const used = new Set<string>();

  const take = (predicate: (r: RecommendationLike) => boolean, limit: number) => {
    const picked: RoadmapItem[] = [];
    for (const r of sorted) {
      if (used.has(r.id) || !predicate(r)) continue;
      picked.push({ id: r.id, title: r.title, estimatedTime: r.estimatedTime });
      used.add(r.id);
      if (picked.length >= limit) break;
    }
    return picked;
  };

  const first = take((r) => r.priority === "critical" || r.isQuickWin, 10);
  const second = take((r) => r.priority === "high", 10);
  const third = take((r) => r.priority === "medium" || r.priority === "low", 10);

  return [
    { window: "0–30 Days", label: "Critical fixes and quick wins", items: first },
    { window: "31–60 Days", label: "High-priority improvements", items: second },
    { window: "61–90 Days", label: "Medium/low priority and ongoing optimization", items: third },
  ];
}
