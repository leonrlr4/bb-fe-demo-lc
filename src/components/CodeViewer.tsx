import { useState } from 'react';
import { Code2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from './ui/button';
import { ExecutionInfo } from '../types';

interface CodeViewerProps {
  code?: string;
  execution?: ExecutionInfo | null;
  messageIndex?: number | null;
  viewLabel?: string;
}

export function CodeViewer({ code, execution, messageIndex, viewLabel = 'Code Viewer' }: CodeViewerProps) {
  const [showCode, setShowCode] = useState(true);
  const [showExecution, setShowExecution] = useState(false);

  const hasContent = code || execution;

  if (!hasContent) {
    return (
      <div className="flex flex-col h-full border-l border-slate-800 bg-slate-950">
        {/* Header */}
        <div className="border-b border-slate-800 px-6 py-3 shrink-0">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-slate-400" />
            <span className="text-slate-300 text-sm">{viewLabel}</span>
          </div>
        </div>

        {/* Empty State */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <Code2 className="w-16 h-16 mx-auto mb-4 text-slate-700" />
            <h3 className="text-slate-300 mb-2">No Code Selected</h3>
            <p className="text-sm text-slate-500">
              Click on a workflow from history to view its code
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full border-l border-slate-800 bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800 px-6 py-3 shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-slate-300 text-sm">{viewLabel}</span>
            </div>
            {messageIndex !== null && messageIndex !== undefined && (
              <div className="flex items-center gap-2 text-xs text-slate-400 border-l border-slate-700 pl-3">
                <span>Message #{messageIndex + 1}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {code && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowCode(!showCode)}
                className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 text-xs"
              >
                {showCode ? 'Hide Code' : 'Review Code'}
              </Button>
            )}
            {execution && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowExecution(!showExecution)}
                className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 text-xs"
              >
                {showExecution ? 'Hide Result' : 'View Result'}
              </Button>
            )}
            {execution && (
              <div className="flex items-center gap-2 text-xs">
                {execution.success ? (
                  <>
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    <span className="text-green-500">Success</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3 h-3 text-red-500" />
                    <span className="text-red-500">Failed</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-6 space-y-4">
          {/* Generated Code */}
          {code && showCode && (
            <div>
              <h4 className="text-xs uppercase tracking-wide text-slate-400 mb-2 font-semibold">
                Generated Code
              </h4>
              <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                <pre className="p-4 text-sm text-slate-200 overflow-x-auto">
                  <code>{code}</code>
                </pre>
              </div>
            </div>
          )}

          {/* Execution Output */}
          {execution && showExecution && (
            <>
              {execution.stdout && (
                <div>
                  <h4 className="text-xs uppercase tracking-wide text-slate-400 mb-2 font-semibold">
                    Execution Output
                  </h4>
                  <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                    <pre className="p-4 text-xs text-slate-300 whitespace-pre-wrap break-words">
                      <code>{execution.stdout}</code>
                    </pre>
                  </div>
                </div>
              )}
              {execution.error && (
                <div>
                  <h4 className="text-xs uppercase tracking-wide text-slate-400 mb-2 font-semibold">
                    Execution Error
                  </h4>
                  <div className="bg-red-950/20 border border-red-900/50 rounded-lg overflow-hidden">
                    <pre className="p-4 text-xs text-red-300 whitespace-pre-wrap break-words">
                      <code>{execution.error}</code>
                    </pre>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Empty state when sections are hidden */}
          {!showCode && !showExecution && (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <Code2 className="w-12 h-12 mx-auto mb-3 text-slate-700" />
                <p className="text-sm text-slate-500">
                  {code && !showCode && 'Click "Review Code" to view the generated code'}
                  {execution && !showExecution && '\nClick "View Result" to see execution results'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
