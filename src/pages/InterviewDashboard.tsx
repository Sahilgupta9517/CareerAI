import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, Award, Target, Trash2, Eye, Play, AlertCircle, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/components/common/Toast'
import { getInterviewHistory, deleteInterview, type InterviewSetup } from '@/lib/interviewWorkflow'
import { getCurrentProfile } from '@/lib/persistenceService'
import type { MockInterview } from '@/lib/interviewService'

interface DashboardStats {
  totalInterviews: number
  completedInterviews: number
  averageScore: number
  bestScore: number
  currentTargetRole: string | null
  scoreProgress: Array<{ date: string; score: number }>
  topicsPerformed: Map<string, number>
}

export function InterviewDashboard({ onStartNewInterview }: { onStartNewInterview: (setup: Partial<InterviewSetup>) => void }) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [history, setHistory] = useState<MockInterview[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalInterviews: 0,
    completedInterviews: 0,
    averageScore: 0,
    bestScore: 0,
    currentTargetRole: null,
    scoreProgress: [],
    topicsPerformed: new Map(),
  })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'completed' | 'in-progress'>('all')
  const [deleting, setDeleting] = useState<number | null>(null)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [profile, interviews] = await Promise.all([
          getCurrentProfile(),
          getInterviewHistory(),
        ])

        setHistory(interviews)

        // Calculate stats
        const completed = interviews.filter((i) => i.status === 'completed' || i.overall_score !== null)
        const scores = completed.map((i) => i.overall_score || 0).filter((s) => s > 0)
        const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b) / scores.length) : 0
        const bestScore = scores.length > 0 ? Math.max(...scores) : 0

        // Score progress over time
        const scoreProgress = interviews
          .filter((i) => i.overall_score !== null && i.completed_at)
          .sort((a, b) => new Date(a.completed_at || 0).getTime() - new Date(b.completed_at || 0).getTime())
          .map((i) => ({
            date: new Date(i.completed_at || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            score: i.overall_score || 0,
          }))

        // Topics performed
        const topicsMap = new Map<string, number[]>()
        interviews.forEach((i) => {
          if (i.target_role) {
            const current = topicsMap.get(i.target_role) || []
            current.push(i.overall_score || 0)
            topicsMap.set(i.target_role, current)
          }
        })

        const topicsPerformed = new Map(
          Array.from(topicsMap.entries()).map(([role, scores]) => [
            role,
            Math.round(scores.reduce((a, b) => a + b) / scores.length),
          ])
        )

        setStats({
          totalInterviews: interviews.length,
          completedInterviews: completed.length,
          averageScore: avgScore,
          bestScore,
          currentTargetRole: profile.name || null,
          scoreProgress,
          topicsPerformed,
        })
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load interview history',
          tone: 'error',
        })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [toast])

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this interview? This action cannot be undone.')) {
      return
    }

    setDeleting(id)
    try {
      await deleteInterview(id)
      setHistory((prev) => prev.filter((i) => i.id !== id))
      toast({
        title: 'Success',
        description: 'Interview deleted successfully',
        tone: 'success',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete interview',
        tone: 'error',
      })
    } finally {
      setDeleting(null)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600'
    if (score >= 70) return 'text-blue-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'abandoned':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredHistory = history.filter((i) => {
    if (filter === 'completed') return i.status === 'completed'
    if (filter === 'in-progress') return i.status === 'in_progress'
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-400" />
          <p className="text-gray-600">Loading your interview history...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      {history.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Total Interviews</p>
                  <p className="text-3xl font-bold mt-1">{stats.totalInterviews}</p>
                </div>
                <Target className="w-8 h-8 text-blue-500 opacity-20" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Completed</p>
                  <p className="text-3xl font-bold mt-1">{stats.completedInterviews}</p>
                </div>
                <Award className="w-8 h-8 text-green-500 opacity-20" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Average Score</p>
                  <p className={`text-3xl font-bold mt-1 ${getScoreColor(stats.averageScore)}`}>
                    {stats.averageScore}%
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-yellow-500 opacity-20" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Best Score</p>
                  <p className={`text-3xl font-bold mt-1 ${getScoreColor(stats.bestScore)}`}>
                    {stats.bestScore}%
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-500 opacity-20" />
              </div>
            </Card>
          </div>

          {/* Score Progress Chart */}
          {stats.scoreProgress.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Performance Trend</h3>
              <div className="space-y-3">
                {stats.scoreProgress.map((point, i) => (
                  <div key={i}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-600">{point.date}</span>
                      <span className="text-sm font-bold">{point.score}%</span>
                    </div>
                    <Progress value={point.score} className="h-2" />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Topic Performance */}
          {stats.topicsPerformed.size > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Performance by Role</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from(stats.topicsPerformed.entries()).map(([topic, score]) => (
                  <div key={topic}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-sm">{topic}</span>
                      <span className={`text-sm font-bold ${getScoreColor(score)}`}>{score}%</span>
                    </div>
                    <Progress value={score} className="h-2" />
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {/* Interview History */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Interview History</h3>
          <div className="flex flex-wrap justify-end gap-2">
            <Button onClick={() => onStartNewInterview({})} size="sm">
              <Play className="mr-2 h-4 w-4" />
              Start Interview
            </Button>
            <div className="flex gap-2">
              {['all', 'completed', 'in-progress'].map((status) => (
                <Button
                  key={status}
                  variant={filter === (status as any) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(status as any)}
                  className="capitalize"
                >
                  {status === 'all' ? 'All' : status === 'completed' ? 'Completed' : 'In Progress'}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600 mb-4">No interviews yet. Start your first interview to see results here.</p>
            <Button onClick={() => onStartNewInterview({})}>Start Interview</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold">Role</th>
                  <th className="text-left py-3 px-4 font-semibold">Type</th>
                  <th className="text-left py-3 px-4 font-semibold">Difficulty</th>
                  <th className="text-center py-3 px-4 font-semibold">Score</th>
                  <th className="text-left py-3 px-4 font-semibold">Status</th>
                  <th className="text-left py-3 px-4 font-semibold">Date</th>
                  <th className="text-right py-3 px-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((interview) => (
                  <tr key={interview.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{interview.target_role}</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="outline">{interview.interview_type}</Badge>
                        <Badge variant={interview.personalized ? 'success' : 'secondary'}>{interview.personalized ? 'Personalized' : 'Standard'}</Badge>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="secondary" className="text-xs">
                        {interview.difficulty}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {interview.overall_score !== null ? (
                        <span className={`font-bold ${getScoreColor(interview.overall_score)}`}>
                          {interview.overall_score}%
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={getStatusColor(interview.status || 'in-progress')}>
                        {interview.status === 'completed' || interview.overall_score !== null ? 'Completed' : 'In Progress'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {new Date(interview.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex gap-2 justify-end">
                        {interview.status === 'in_progress' && interview.overall_score === null && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="px-2"
                            title="Continue Interview"
                            onClick={() => navigate(`/interview/${interview.id}`)}
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                        )}

                        {interview.overall_score !== null && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="px-2"
                            title="View Report"
                            onClick={() => navigate(`/interview/${interview.id}`)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          className="px-2 text-red-600 hover:bg-red-50"
                          onClick={() => handleDelete(interview.id)}
                          disabled={deleting === interview.id}
                          title="Delete Interview"
                        >
                          {deleting === interview.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

export default InterviewDashboard
