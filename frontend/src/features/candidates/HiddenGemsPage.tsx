import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Star, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { candidateService } from "@/services";

export default function HiddenGemsPage() {
  const navigate = useNavigate();
  const { data = [], isLoading } = useQuery({
    queryKey: ["candidates"],
    queryFn: () => candidateService.getCandidates(),
  });

  const gems = data.filter((c) => c.isHiddenGem);

  return (
    <div className="px-6 py-6 pb-12 max-w-7xl mx-auto space-y-5">
      <div>
        <h1 className="text-3xl font-bold text-on-surface tracking-tight flex items-center gap-2">
          <Star className="w-7 h-7 text-primary" /> Hidden Gems
        </h1>
        <p className="text-on-surface-variant mt-1 max-w-2xl">
          Candidates who lack traditional keywords or pedigree, but whose actual experience strongly correlates with success in your roles.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2].map((i) => (
            <div key={i} className="glass-card rounded-2xl p-5 h-56 animate-pulse">
              <div className="h-4 bg-surface-container rounded w-1/2 mb-3" />
              <div className="h-2 bg-surface-container rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : gems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Star className="w-12 h-12 text-outline-variant mb-3" />
          <h3 className="font-bold text-on-surface mb-1">No Hidden Gems Yet</h3>
          <p className="text-sm text-on-surface-variant">The AI is still scanning candidates with non-traditional backgrounds.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {gems.map((gem, i) => (
            <motion.div
              key={gem.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="glass-card rounded-2xl border border-outline-variant/50 p-5 hover:shadow-xl transition-all group ai-glow-border flex flex-col"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-surface-container-highest text-on-surface flex items-center justify-center font-bold">
                    {gem.initials}
                  </div>
                  <div>
                    <h3 className="font-bold text-on-surface">{gem.name}</h3>
                    <p className="text-[11px] text-on-surface-variant">{gem.jobTitle}</p>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm shadow">
                  {gem.aiScore}%
                </div>
              </div>

              <div className="flex-1 mb-4">
                <div className="text-[10px] font-bold text-primary mb-1 uppercase tracking-wider">Why AI flagged them</div>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  {gem.aiSummary}
                </p>
              </div>

              <div className="pt-4 border-t border-outline-variant/30">
                <p className="text-[11px] text-on-surface-variant mb-3">Matches: {gem.appliedFor}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/app/candidates/${gem.id}`)}
                    className="flex-1 bg-surface border border-outline-variant py-2 rounded-xl font-bold text-on-surface hover:bg-surface-container transition-all text-sm flex items-center justify-center gap-1"
                  >
                    Review <ArrowRight className="w-3 h-3" />
                  </button>
                  <button className="flex-1 bg-primary text-white py-2 rounded-xl font-bold shadow hover:bg-primary-container transition-all text-sm">
                    Reach Out
                  </button>
                </div>
              </div>
            </motion.div>
          ))}

          {/* Info card */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 flex flex-col justify-center items-center text-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
              <Star className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-primary mb-2">How Gems Work</h3>
            <p className="text-sm text-on-surface-variant max-w-xs">
              HireIntel's neural networks look past pedigree. It correlates public work, code quality, and career trajectory to predict success.
            </p>
            <button className="mt-4 text-primary font-bold text-xs hover:underline">Learn More</button>
          </div>
        </div>
      )}
    </div>
  );
}
