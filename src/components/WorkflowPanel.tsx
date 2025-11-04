import { useState, useMemo, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { RefreshCw, Plus } from 'lucide-react';
import { Conversation } from '../services';
import { chatService } from '../services';
import { toast } from 'sonner';
import { ExecutionInfo } from '../types';
import { formatConversationDate, formatFullDateTime } from '../utils/dateFormat';

interface WorkflowPanelProps {
  className?: string;
  onGenerateWorkflow: (query: string) => void;
  workflows: any[];
  allConversations: Conversation[];
  onConversationSelect?: (conversationId: string, meta?: { title?: string }) => void;
  currentConversationId?: string;
  selectedTemplate?: string;
  uploadedFiles?: File[];
  onClearFiles?: () => void;
  onWorkflowResult?: (payload: { code: string; execution: ExecutionInfo | null; messageIndex?: number; messageName?: string | null; inputFiles?: any[]; outputFiles?: any[] }) => void;
  isLoadingHistory?: boolean;
  hasMoreHistory?: boolean;
  onLoadMoreHistory?: () => void | Promise<void>;
  onReloadHistory?: () => void;
  onConversationCreated?: (conversationId: string) => void | Promise<void>;
}

// Template definitions
const TEMPLATES = [
  { value: 'none', label: 'None', prompt: '' },
  { value: 'count-gc', label: 'Count GC reads', prompt: 'Write Python code to count the total number of GC reads in this FASTA file' },
  { value: 'longest-sequence', label: 'Longest Sequence', prompt: 'Write Python code to print the ID and length of the longest sequence in this FASTA file' },
  { value: 'reverse-complement', label: 'Reverse Complement', prompt: 'Write Python code to reverse-complement all sequences in this FASTA file and save them to a new FASTA file' }
];

export function WorkflowPanel({
  className,
  onGenerateWorkflow,
  workflows,
  allConversations,
  onConversationSelect,
  currentConversationId,
  selectedTemplate = 'none',
  uploadedFiles = [],
  onClearFiles,
  onWorkflowResult,
  isLoadingHistory = false,
  hasMoreHistory = false,
  onLoadMoreHistory,
  onReloadHistory,
  onConversationCreated
}: WorkflowPanelProps) {
  const [query, setQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);
  const isRequestingMoreRef = useRef(false);
  const hasMoreRef = useRef(hasMoreHistory);
  const isLoadingRef = useRef(isLoadingHistory);
  const loadMoreFnRef = useRef<WorkflowPanelProps['onLoadMoreHistory']>(onLoadMoreHistory);

  // 直接使用所有對話，不再過濾 messageCount
  const workflowHistory = useMemo(() => {
    return allConversations;
  }, [allConversations]);

  // Update query when template changes
  useEffect(() => {
    const template = TEMPLATES.find(t => t.value === selectedTemplate);
    if (template && template.prompt) {
      setQuery(template.prompt);
    } else if (selectedTemplate === 'none') {
      setQuery('');
    }
  }, [selectedTemplate]);

  useEffect(() => {
    hasMoreRef.current = hasMoreHistory;
  }, [hasMoreHistory]);

  useEffect(() => {
    isLoadingRef.current = isLoadingHistory;
  }, [isLoadingHistory]);

  useEffect(() => {
    loadMoreFnRef.current = onLoadMoreHistory;
  }, [onLoadMoreHistory]);

  useEffect(() => {
    const target = loadMoreTriggerRef.current;
    const scrollContainer = scrollContainerRef.current;

    if (!target || !scrollContainer) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (
          loadMoreFnRef.current &&
          entry.isIntersecting &&
          hasMoreRef.current &&
          !isLoadingRef.current &&
          !isRequestingMoreRef.current
        ) {
          isRequestingMoreRef.current = true;
          Promise.resolve(loadMoreFnRef.current())
            .catch(() => {
              // Error handling is managed by parent; just reset the flag.
            })
            .finally(() => {
              isRequestingMoreRef.current = false;
            });
        }
      },
      {
        root: scrollContainer,
        rootMargin: '0px 0px 200px 0px'
      }
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleGenerate = async () => {
    if (!query.trim()) {
      toast.error('Please enter a query');
      return;
    }

    setIsGenerating(true);
    try {
      // Call chat service to generate code (same as chat, but without conversationId)
      const response = await chatService.generateCode(query, undefined, uploadedFiles);

      // Notify parent about new conversation
      if (onConversationCreated && response.conversation_id) {
        await Promise.resolve(onConversationCreated(response.conversation_id));
      }

      // Create workflow entry
      const newWorkflow = {
        id: Date.now(),
        query,
        timestamp: new Date(),
        status: 'generated',
        code: response.code,
        execution: response.execution,
        conversationId: response.conversation_id
      };

      onGenerateWorkflow(query);
      onWorkflowResult?.({
        code: response.code,
        execution: response.execution || null,
        messageIndex: 1,
        messageName: response.nodes?.[0]?.name ?? null,
        inputFiles: response.input_files || [],
        outputFiles: response.output_files || []
      });

      // Clear form
      setQuery('');
      if (onClearFiles) {
        onClearFiles();
      }

      toast.success('Workflow generated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate workflow');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNewWorkflow = () => {
    setQuery('');
    if (onClearFiles) {
      onClearFiles();
    }
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div
      ref={scrollContainerRef}
      style={{
      height: '100%',
      overflowY: 'auto',
      overflowX: 'hidden',
      minWidth: 0
    }} className={`bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 ${className || ''}`}>
      <div style={{ width: '100%', boxSizing: 'border-box' }} className="px-8 py-12">
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-8">
          {/* Natural Language Query */}
          <div className="max-w-4xl">
            <h2 className="text-slate-200 mb-4">Natural Language Query</h2>
            <div className="space-y-4">
              {/* Query Input */}
              <div>
                <div className="text-sm text-slate-400 mb-2">Ask your bioinformatics question:</div>
                <Textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g., 'Find differentially expressed genes between treated and control samples' or 'Perform quality control analysis on my RNA-seq data'"
                  className="bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500 min-h-[200px]"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="bg-blue-600 hover:bg-blue-700 flex-1 relative overflow-hidden"
                >
                  {isGenerating ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Generating workflow...</span>
                    </div>
                  ) : (
                    'Generate Workflow'
                  )}
                  {isGenerating && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                  )}
                </Button>
              </div>
            </div>
          </div>


        </div>

        {/* Workflow History */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-300">Workflow History</h3>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  handleNewWorkflow();
                }}
                className="h-8 px-3 text-blue-400 hover:text-blue-300 hover:bg-slate-800 cursor-pointer relative z-10"
                title="Create new workflow"
                type="button"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                New
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  console.log('Reload clicked');
                  onReloadHistory?.();
                }}
                className="h-8 px-3 text-slate-400 hover:text-slate-200 hover:bg-slate-800 cursor-pointer relative z-10"
                title="Reload workflow history"
                type="button"
              >
                <RefreshCw className="w-4 h-4 mr-1.5" />
                Reload
              </Button>
            </div>
          </div>
          {workflowHistory.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {workflowHistory.map((conversation) => (
                <Card
                  key={conversation.id}
                  onClick={() => onConversationSelect?.(conversation.id, { title: conversation.title })}
                  className={`p-4 cursor-pointer transition-colors ${
                    currentConversationId === conversation.id
                      ? 'bg-purple-600 border-purple-500'
                      : 'bg-slate-800 border-slate-700 hover:bg-slate-750'
                  }`}
                  title={formatFullDateTime(conversation.created_at)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        currentConversationId === conversation.id
                          ? 'border-purple-300 text-purple-100'
                          : 'border-slate-600 text-slate-400'
                      }`}
                    >
                      {formatConversationDate(conversation.created_at)}
                    </Badge>
                  </div>
                  <p className={`text-sm line-clamp-2 ${
                    currentConversationId === conversation.id
                      ? 'text-white'
                      : 'text-slate-400'
                  }`}>{conversation.title}</p>
                </Card>
              ))}
            </div>
          ) : (
            !isLoadingHistory && (
              <p className="text-sm text-slate-500">No workflow history yet.</p>
            )
          )}
          <div ref={loadMoreTriggerRef} className="h-1" />
          {isLoadingHistory && (
            <div className="text-center py-4 text-slate-500 text-sm">Loading more workflows...</div>
          )}
          {!hasMoreHistory && workflowHistory.length > 0 && (
            <div className="text-center py-4 text-slate-600 text-xs">No more workflows to load.</div>
          )}
        </div>
      </div>
    </div>
  );
}
