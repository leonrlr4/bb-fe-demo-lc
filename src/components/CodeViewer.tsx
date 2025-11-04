import { useState, useRef, useEffect } from 'react';
import { Code2, CheckCircle, XCircle, Download, FileText, File, Eye } from 'lucide-react';
import { Button } from './ui/button';
import { ExecutionInfo, OutputFileInfo } from '../types';

interface CodeViewerProps {
  code?: string;
  execution?: ExecutionInfo | null;
  messageIndex?: number | null;
  viewLabel?: string;
  messageName?: string | null;
  inputFiles?: OutputFileInfo[];
  outputFiles?: OutputFileInfo[];
}

export function CodeViewer({
  code,
  execution,
  messageIndex,
  viewLabel = 'Code Viewer',
  messageName,
  inputFiles = [],
  outputFiles = []
}: CodeViewerProps) {
  const [showCode, setShowCode] = useState(true);
  const [showExecution, setShowExecution] = useState(false);
  const [showFiles, setShowFiles] = useState(false);
  const [previewFile, setPreviewFile] = useState<OutputFileInfo | null>(null);

  const codeRef = useRef<HTMLDivElement>(null);
  const executionRef = useRef<HTMLDivElement>(null);
  const filesRef = useRef<HTMLDivElement>(null);

  const hasContent = code || execution || inputFiles.length > 0 || outputFiles.length > 0;
  const headerLabel = messageName?.trim() ? messageName.trim() : null;

  // Scroll to section when tab is clicked
  useEffect(() => {
    if (showCode && codeRef.current) {
      codeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [showCode]);

  useEffect(() => {
    if (showExecution && executionRef.current) {
      executionRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [showExecution]);

  useEffect(() => {
    if (showFiles && filesRef.current) {
      filesRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [showFiles]);

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
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      overflow: 'hidden'
    }} className="border-l border-slate-800 bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800 px-6 py-3" style={{ flexShrink: 0 }}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-slate-400" />
              <span className="text-slate-300 text-sm">{viewLabel}</span>
            </div>
            {headerLabel && (
              <div className="flex items-center gap-2 text-xs text-slate-400 border-l border-slate-700 pl-3">
                <span>{headerLabel}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
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
                {showExecution ? 'Hide Execution' : 'Execute'}
              </Button>
            )}
            {(inputFiles.length > 0 || outputFiles.length > 0) && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowFiles(!showFiles)}
                className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 text-xs"
              >
                {showFiles ? 'Hide Files' : `View Files (${inputFiles.length + outputFiles.length})`}
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
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        width: '100%'
      }}>
        <div className="p-6 space-y-4" style={{ width: '100%', boxSizing: 'border-box' }}>
          {/* Generated Code */}
          {code && showCode && (
            <div ref={codeRef} style={{ width: '100%' }}>
              <h4 className="text-xs uppercase tracking-wide text-slate-400 mb-2 font-semibold">
                Generated Code
              </h4>
              <div className="bg-slate-900 border border-slate-800 rounded-lg" style={{ overflowX: 'auto', width: '100%' }}>
                <pre className="p-4 text-sm text-slate-200" style={{ margin: 0, whiteSpace: 'pre' }}>
                  <code>{code}</code>
                </pre>
              </div>
            </div>
          )}

          {/* Execution Output */}
          {execution && showExecution && (
            <div ref={executionRef}>
              {execution.stdout && (
                <div style={{ width: '100%' }}>
                  <h4 className="text-xs uppercase tracking-wide text-slate-400 mb-2 font-semibold">
                    Execution Output
                  </h4>
                  <div className="bg-slate-900 border border-slate-800 rounded-lg" style={{ overflowX: 'auto', width: '100%' }}>
                    <pre className="p-4 text-xs text-slate-300" style={{ margin: 0, whiteSpace: 'pre' }}>
                      <code>{execution.stdout}</code>
                    </pre>
                  </div>
                </div>
              )}
              {execution.error && (
                <div style={{ width: '100%' }}>
                  <h4 className="text-xs uppercase tracking-wide text-slate-400 mb-2 font-semibold">
                    Execution Error
                  </h4>
                  <div className="bg-red-950/20 border border-red-900/50 rounded-lg" style={{ overflowX: 'auto', width: '100%' }}>
                    <pre className="p-4 text-xs text-red-300" style={{ margin: 0, whiteSpace: 'pre' }}>
                      <code>{execution.error}</code>
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Files Section */}
          {showFiles && (inputFiles.length > 0 || outputFiles.length > 0) && (
            <div ref={filesRef} style={{ width: '100%' }} className="space-y-4">
              {/* Input Files */}
              {inputFiles.length > 0 && (
                <div>
                  <h4 className="text-xs uppercase tracking-wide text-slate-400 mb-2 font-semibold">
                    Input Files ({inputFiles.length})
                  </h4>
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-2">
                    {inputFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-slate-800 rounded hover:bg-slate-750 transition-colors">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
                          <span className="text-sm text-slate-300 truncate">{file.file_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setPreviewFile(file)}
                            className="flex items-center gap-1 px-2 py-1 text-xs text-blue-400 hover:text-blue-300 hover:bg-slate-700 rounded transition-colors flex-shrink-0"
                          >
                            <Eye className="w-3 h-3" />
                            Preview
                          </button>
                          <a
                            href={file.download_url}
                            download={file.file_name}
                            className="flex items-center gap-1 px-2 py-1 text-xs text-blue-400 hover:text-blue-300 hover:bg-slate-700 rounded transition-colors flex-shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Download className="w-3 h-3" />
                            Download
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Output Files */}
              {outputFiles.length > 0 && (
                <div>
                  <h4 className="text-xs uppercase tracking-wide text-slate-400 mb-2 font-semibold">
                    Output Files ({outputFiles.length})
                  </h4>
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-2">
                    {outputFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-slate-800 rounded hover:bg-slate-750 transition-colors">
                        <div className="flex items-center gap-2 min-w-0">
                          <File className="w-4 h-4 text-green-400 flex-shrink-0" />
                          <span className="text-sm text-slate-300 truncate">{file.file_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setPreviewFile(file)}
                            className="flex items-center gap-1 px-2 py-1 text-xs text-green-400 hover:text-green-300 hover:bg-slate-700 rounded transition-colors flex-shrink-0"
                          >
                            <Eye className="w-3 h-3" />
                            Preview
                          </button>
                          <a
                            href={file.download_url}
                            download={file.file_name}
                            className="flex items-center gap-1 px-2 py-1 text-xs text-green-400 hover:text-green-300 hover:bg-slate-700 rounded transition-colors flex-shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Download className="w-3 h-3" />
                            Download
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty state when sections are hidden */}
          {!showCode && !showExecution && !showFiles && (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <Code2 className="w-12 h-12 mx-auto mb-3 text-slate-700" />
                <p className="text-sm text-slate-500">
                  {code && !showCode && 'Click "Review Code" to view the generated code'}
                  {execution && !showExecution && '\nClick "View Result" to see execution results'}
                  {(inputFiles.length > 0 || outputFiles.length > 0) && !showFiles && '\nClick "View Files" to see input/output files'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* File Preview Modal */}
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
}

// File Preview Modal Component
function FilePreviewModal({ file, onClose }: { file: OutputFileInfo; onClose: () => void }) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(file.download_url);
        if (!response.ok) throw new Error('Failed to fetch file');
        const text = await response.text();
        setContent(text);
      } catch (err) {
        setError('Failed to load file content');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [file.download_url]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onClose}
      style={{ overflow: 'hidden' }}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-lg flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '90%',
          height: '90%',
          maxWidth: '1200px',
          maxHeight: '900px',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <h3 className="text-slate-200 font-medium truncate">{file.file_name}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors flex-shrink-0 ml-4"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div
          className="flex-1 p-4"
          style={{
            overflow: 'auto',
            overflowY: 'auto',
            overflowX: 'auto'
          }}
        >
          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-slate-400">Loading...</div>
            </div>
          )}
          {error && (
            <div className="flex items-center justify-center h-full">
              <div className="text-red-400">{error}</div>
            </div>
          )}
          {!loading && !error && (
            <pre className="text-xs text-slate-300 font-mono" style={{ margin: 0, whiteSpace: 'pre', wordWrap: 'normal' }}>
              {content}
            </pre>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-700 flex-shrink-0">
          <a
            href={file.download_url}
            download={file.file_name}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors text-sm"
          >
            <Download className="w-4 h-4" />
            Download
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition-colors text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
