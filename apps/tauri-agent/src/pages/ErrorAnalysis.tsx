import { useState } from 'react'
import { FileDiff, Check, RotateCcw, Code2, Terminal, Play, XCircle, AlertTriangle, Info, CheckCircle } from 'lucide-react'

interface ErrorPattern {
  id: string
  pattern: RegExp
  message: string
  severity: 'error' | 'warning' | 'info'
  category: string
  suggestedFix: string
  fixCommand?: string
}

const ERROR_PATTERNS: ErrorPattern[] = [
  {
    id: 'nil-index',
    pattern: /attempt to index a nil value \(global '([^']+)'\)/,
    message: 'Nil value error — variable or export not found',
    severity: 'error',
    category: 'lua',
    suggestedFix: 'Check if the resource is loaded and the export/function exists',
    fixCommand: 'ensure [resource-name]',
  },
  {
    id: 'nil-function',
    pattern: /attempt to call a nil value \(global '([^']+)'\)/,
    message: 'Function or export not found',
    severity: 'error',
    category: 'lua',
    suggestedFix: 'Check if the resource providing this function is loaded',
    fixCommand: 'ensure [resource-name]',
  },
  {
    id: 'timeout',
    pattern: /timeout/,
    message: 'Operation timed out',
    severity: 'warning',
    category: 'performance',
    suggestedFix: 'Check for slow database queries or infinite loops',
  },
  {
    id: 'sql-error',
    pattern: /SQL ERROR: (.+)/,
    message: 'Database error',
    severity: 'error',
    category: 'database',
    suggestedFix: 'Check database connection and query syntax',
  },
  {
    id: 'out-of-memory',
    pattern: /out of memory|memory allocation failed/i,
    message: 'Out of memory',
    severity: 'error',
    category: 'performance',
    suggestedFix: 'Reduce resource usage or increase server memory',
  },
]

function analyzeError(log: string): ErrorPattern[] {
  const matches: ErrorPattern[] = []
  for (const pattern of ERROR_PATTERNS) {
    if (pattern.pattern.test(log)) {
      matches.push(pattern)
    }
  }
  return matches
}

interface ErrorAnalysisProps {
  serverId: string
}

export default function ErrorAnalysis({ serverId }: ErrorAnalysisProps) {
  const [consoleLog, setConsoleLog] = useState('')
  const [errors, setErrors] = useState<ErrorPattern[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const handleAnalyze = () => {
    setIsAnalyzing(true)
    setTimeout(() => {
      const foundErrors = analyzeError(consoleLog)
      setErrors(foundErrors)
      setIsAnalyzing(false)
    }, 500)
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error': return <XCircle className="w-4 h-4 text-[#ef4444]" />
      case 'warning': return <AlertTriangle className="w-4 h-4 text-[#f59e0b]" />
      default: return <Info className="w-4 h-4 text-[#5E6AD2]" />
    }
  }

  const getSeverityBorder = (severity: string) => {
    switch (severity) {
      case 'error': return 'border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.05)]'
      case 'warning': return 'border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.05)]'
      default: return 'border-[rgba(94,106,210,0.3)] bg-[rgba(94,106,210,0.05)]'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-mono text-sm uppercase tracking-[0.2em] text-white">Error Analysis</h2>
          <p className="font-sans text-xs text-[rgba(255,255,255,0.4)] mt-1">Paste console logs to detect and fix errors</p>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing || !consoleLog.trim()}
          className="font-mono text-xs uppercase tracking-[1.4px] px-4 py-2.5 bg-white text-[#0F0F14] font-medium hover:opacity-85 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity duration-100 flex items-center gap-2"
        >
          <Play className="w-3.5 h-3.5" />
          {isAnalyzing ? 'Analyzing…' : 'Analyze'}
        </button>
      </div>

      {/* Input */}
      <div className="bg-nox-surface border border-[rgba(255,255,255,0.08)] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Terminal className="w-4 h-4 text-[rgba(255,255,255,0.4)]" />
          <span className="font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.6)]">Console Log</span>
        </div>
        <textarea
          value={consoleLog}
          onChange={(e) => setConsoleLog(e.target.value)}
          placeholder="Paste your FiveM console output here…"
          className="w-full h-48 bg-[#0A0A0F] border border-[rgba(255,255,255,0.08)] p-3 font-mono text-xs text-[rgba(255,255,255,0.7)] resize-none focus:outline-none focus:border-[#5E6AD2] transition-colors duration-100"
        />
      </div>

      {/* Results */}
      {errors.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-[#5E6AD2]" />
            <span className="font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.6)]">
              {errors.length} error{errors.length > 1 ? 's' : ''} found
            </span>
          </div>

          {errors.map((error, index) => (
            <div
              key={index}
              className={`border p-4 ${getSeverityBorder(error.severity)}`}
            >
              <div className="flex items-start gap-3">
                {getSeverityIcon(error.severity)}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs uppercase tracking-wider text-white">{error.message}</span>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.1)] px-2 py-0.5">
                      {error.category}
                    </span>
                  </div>
                  <p className="font-sans text-xs text-[rgba(255,255,255,0.5)] mb-2">{error.suggestedFix}</p>
                  {error.fixCommand && (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.3)]">Try:</span>
                      <code className="font-mono text-xs text-[#5E6AD2] bg-[rgba(94,106,210,0.1)] px-2 py-1">
                        {error.fixCommand}
                      </code>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {errors.length === 0 && consoleLog && !isAnalyzing && (
        <div className="bg-nox-surface border border-[rgba(255,255,255,0.08)] p-6 text-center">
          <CheckCircle className="w-10 h-10 text-[#22c55e] mx-auto mb-3" />
          <h3 className="font-mono text-sm uppercase tracking-[0.15em] text-white mb-1">No Errors Found</h3>
          <p className="font-sans text-xs text-[rgba(255,255,255,0.4)]">The console log looks clean!</p>
        </div>
      )}

      {/* Quick Tips */}
      <div className="bg-nox-surface border border-[rgba(255,255,255,0.08)] p-4">
        <h3 className="font-mono text-xs uppercase tracking-[0.15em] text-white mb-4">Common Error Patterns</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { pattern: 'attempt to index a nil value', desc: 'Missing resource or export', color: 'text-[#ef4444]' },
            { pattern: 'timeout', desc: 'Slow operation or infinite loop', color: 'text-[#f59e0b]' },
            { pattern: 'SQL ERROR', desc: 'Database query failed', color: 'text-[#ef4444]' },
            { pattern: 'out of memory', desc: 'Memory allocation failure', color: 'text-[#ef4444]' },
          ].map((item) => (
            <div key={item.pattern} className="p-3 bg-[#0A0A0F] border border-[rgba(255,255,255,0.06)]">
              <code className={`font-mono text-xs ${item.color}`}>{item.pattern}</code>
              <p className="font-sans text-[11px] text-[rgba(255,255,255,0.4)] mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
