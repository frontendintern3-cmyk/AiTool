import { db } from "@/lib/db";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RecommendationsTable, type RecommendationRow } from "@/components/audit/recommendations-table";

export default async function RecommendationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recs = await db.recommendation.findMany({ where: { auditId: id } });

  const toRow = (r: (typeof recs)[number]): RecommendationRow => ({
    id: r.id,
    rank: r.rank,
    priority: r.priority,
    category: r.category,
    title: r.title,
    recommendedAction: r.recommendedAction,
    businessImpact: r.businessImpact,
    seoImpact: r.seoImpact,
    difficulty: r.difficulty,
    estimatedTime: r.estimatedTime,
    expectedOutcome: r.expectedOutcome,
    isQuickWin: r.isQuickWin,
  });

  const top25 = recs
    .filter((r) => r.rank !== null)
    .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
    .map(toRow);
  const critical = recs.filter((r) => r.priority === "critical").sort((a, b) => b.compositeScore - a.compositeScore).map(toRow);
  const high = recs.filter((r) => r.priority === "high").sort((a, b) => b.compositeScore - a.compositeScore).map(toRow);
  const medium = recs.filter((r) => r.priority === "medium").sort((a, b) => b.compositeScore - a.compositeScore).map(toRow);
  const low = recs.filter((r) => r.priority === "low").sort((a, b) => b.compositeScore - a.compositeScore).map(toRow);
  const quickWins = recs.filter((r) => r.isQuickWin).sort((a, b) => b.compositeScore - a.compositeScore).map(toRow);

  return (
    <div className="space-y-6 font-sans">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Recommendations</h1>
        <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-1">
          {recs.length} recommendations generated from detected issues, ranked by a documented impact/effort formula — not arbitrarily.
        </p>
      </div>

      <Tabs defaultValue="top25">
        <TabsList>
          <TabsTrigger value="top25">Top {top25.length}</TabsTrigger>
          <TabsTrigger value="quick-wins">Quick Wins ({quickWins.length})</TabsTrigger>
          <TabsTrigger value="critical">Critical ({critical.length})</TabsTrigger>
          <TabsTrigger value="high">High ({high.length})</TabsTrigger>
          <TabsTrigger value="medium">Medium ({medium.length})</TabsTrigger>
          <TabsTrigger value="low">Low ({low.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="top25">
          <RecommendationsTable rows={top25} showRank />
        </TabsContent>
        <TabsContent value="quick-wins">
          <RecommendationsTable rows={quickWins} />
        </TabsContent>
        <TabsContent value="critical">
          <RecommendationsTable rows={critical} />
        </TabsContent>
        <TabsContent value="high">
          <RecommendationsTable rows={high} />
        </TabsContent>
        <TabsContent value="medium">
          <RecommendationsTable rows={medium} />
        </TabsContent>
        <TabsContent value="low">
          <RecommendationsTable rows={low} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
