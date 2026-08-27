import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BrainCircuit,
  Award,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  BarChart3,
  Calendar,
  Sparkles,
  Loader2,
  FileCheck,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { apiService, AssessmentHistoryItem } from '../../services/api';

export const StudentAssessmentsList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [history, setHistory] = useState<AssessmentHistoryItem[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAssessments();
  }, [user]);

  const loadAssessments = async () => {
    try {
      setLoading(true);
      const [histData, analData] = await Promise.all([
        apiService.getMyAssessmentsHistory().catch(() => []),
        apiService.getStudentAssessmentAnalytics().catch(() => null),
      ]);
      setHistory(histData || []);
      setAnalytics(analData);
    } catch (err) {
      console.warn('Failed to load assessment history', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (isoStr: string) => {
    if (!isoStr) return 'Recently';
    try {
      return new Date(isoStr).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="My Placement Assessments"
          subtitle="Review your historical placement test scores, coding submissions, and skill mastery."
          icon={<BrainCircuit className="w-5 h-5 text-white" />}
        />

        <Button
          variant="primary"
          onClick={() => navigate('/student/assessment')}
          className="flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Take New Assessment
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        </div>
      ) : history.length === 0 ? (
        /* ZERO STATE (No fake/dummy data) */
        <Card className="bg-slate-900/40 border-slate-800 text-center py-16 px-4">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto mb-4">
            <BrainCircuit className="w-8 h-8" />
          </div>
          <h3 className="text-white font-semibold text-lg">No assessments completed yet</h3>
          <p className="text-slate-400 text-sm max-w-md mx-auto mt-2">
            Practice coding and aptitude problems personalized to your tech stack. PrepBot generates placement-grade tests and evaluates your solutions in real time.
          </p>
          <div className="mt-6">
            <Button
              variant="primary"
              onClick={() => navigate('/student/assessment')}
              className="inline-flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Launch AI Assessment
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* KPI Analytics Cards */}
          {analytics && analytics.has_data && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-slate-900/60 border-slate-800 p-5">
                <div className="text-xs text-slate-400 font-medium">Total Assessments</div>
                <div className="text-2xl font-bold text-white mt-1 font-mono">{analytics.assessments_count}</div>
                <div className="text-[11px] text-cyan-400 mt-1">Completed Attempts</div>
              </Card>

              <Card className="bg-slate-900/60 border-slate-800 p-5">
                <div className="text-xs text-slate-400 font-medium">Average Overall Score</div>
                <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">{analytics.overall_average}%</div>
                <div className="text-[11px] text-slate-400 mt-1">Placement Benchmarked</div>
              </Card>

              <Card className="bg-slate-900/60 border-slate-800 p-5">
                <div className="text-xs text-slate-400 font-medium">Coding Accuracy</div>
                <div className="text-2xl font-bold text-cyan-400 mt-1 font-mono">
                  {analytics.coding_average !== null ? `${analytics.coding_average}%` : 'N/A'}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">DSA & Algorithms</div>
              </Card>

              <Card className="bg-slate-900/60 border-slate-800 p-5">
                <div className="text-xs text-slate-400 font-medium">Aptitude Accuracy</div>
                <div className="text-2xl font-bold text-purple-400 mt-1 font-mono">
                  {analytics.aptitude_average !== null ? `${analytics.aptitude_average}%` : 'N/A'}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Quant & Logical Reasoning</div>
              </Card>
            </div>
          )}

          {/* Assessment History Table */}
          <Card className="bg-slate-900/60 border-slate-800 overflow-hidden">
            <CardHeader className="border-b border-slate-800/80">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-cyan-400" />
                Assessment History Records
              </CardTitle>
            </CardHeader>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/80 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Assessment Title</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Topics Covered</th>
                    <th className="py-3 px-4">Score</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm">
                  {history.map((item: any) => {
                    const topicsList = Array.isArray(item.topics) ? item.topics : (item.topic ? [item.topic] : []);
                    const pct = item.percentage ?? item.total_score ?? null;
                    const dateStr = item.completed_at || item.allocated_at || item.created_at;
                    const isCompleted = item.status === 'Completed' || item.status === 'COMPLETED';

                    return (
                      <tr key={item.id || item.assessment_id} className="hover:bg-slate-800/30 transition">
                        <td className="py-4 px-4 text-slate-300 whitespace-nowrap text-xs">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            {formatDate(dateStr)}
                          </div>
                        </td>

                        <td className="py-4 px-4 font-medium text-white">
                          {item.title || (item.company ? `${item.company} - ${item.job_title || 'Role'}` : `Personalized ${item.difficulty || 'Placement'} Assessment`)}
                        </td>

                        <td className="py-4 px-4">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                            {item.round_type || item.type || 'APTITUDE'}
                          </span>
                        </td>

                        <td className="py-4 px-4 text-xs text-slate-400 max-w-xs truncate">
                          {topicsList.length > 0 ? topicsList.join(', ') : 'Quantitative Aptitude, Reasoning'}
                        </td>

                        <td className="py-4 px-4 font-mono font-bold">
                          {pct !== null ? (
                            <span
                              className={
                                pct >= 70
                                  ? 'text-emerald-400'
                                  : pct >= 50
                                  ? 'text-cyan-400'
                                  : 'text-amber-400'
                              }
                            >
                              {pct}%
                            </span>
                          ) : (
                            <span className="text-slate-500 text-xs">--</span>
                          )}
                        </td>

                        <td className="py-4 px-4">
                          {isCompleted ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" />
                              Completed
                            </span>
                          ) : (
                            <Button
                              variant="primary"
                              size="sm"
                              className="text-xs py-1 px-3 bg-cyan-600 hover:bg-cyan-500 text-white"
                              onClick={() => navigate(`/student/assessments/${item.id || item.assessment_id}`)}
                            >
                              {item.status === 'IN_PROGRESS' ? 'Continue Test' : 'Start Test'}
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
