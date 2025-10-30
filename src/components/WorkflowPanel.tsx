import { useState, useMemo, useEffect } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Clock, CheckCircle2, Code2 } from 'lucide-react';
import { Conversation } from '../services';
import { chatService } from '../services';
import { toast } from 'sonner';

interface ConversationWithMessageCount extends Conversation {
  messageCount?: number;
}

interface WorkflowPanelProps {
  className?: string;
  onGenerateWorkflow: (query: string) => void;
  workflows: any[];
  allConversations: ConversationWithMessageCount[];
  onConversationSelect?: (conversationId: string) => void;
  selectedTemplate?: string;
  uploadedFiles?: File[];
  onClearFiles?: () => void;
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
  selectedTemplate = 'none',
  uploadedFiles = [],
  onClearFiles
}: WorkflowPanelProps) {
  const [query, setQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Filter conversations with exactly 2 messages (1 user + 1 assistant)
  const workflowHistory = useMemo(() => {
    return allConversations.filter(conv => conv.messageCount === 2);
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

  const handleGenerate = async () => {
    if (!query.trim()) {
      toast.error('Please enter a query');
      return;
    }

    setIsGenerating(true);
    try {
      // Call chat service to generate code (same as chat, but without conversationId)
      const response = await chatService.generateCode(query, undefined, uploadedFiles);

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

  const handleClearHistory = () => {
    // This would clear history in the parent component
    console.log('Clear history');
  };

  return (
    <div className={`h-full overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 ${className || ''}`}>
      <div className="max-w-6xl mx-auto px-8 py-12">
        {/* Main Content Grid */}
        <div className="grid grid-cols-2 gap-8">
          {/* Natural Language Query */}
          <div>
            <h2 className="text-slate-200 mb-4">Natural Language Query</h2>
            <div className="space-y-4">
              {/* Info about uploaded files */}
              {uploadedFiles.length > 0 && (
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
                  <div className="text-xs text-slate-400 mb-2">Uploaded files ({uploadedFiles.length}):</div>
                  <div className="space-y-1">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="text-xs text-slate-300">
                        • {file.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                  className="bg-blue-600 hover:bg-blue-700 flex-1"
                >
                  {isGenerating ? 'Generating...' : 'Generate Workflow'}
                </Button>
                <Button
                  onClick={handleClearHistory}
                  variant="outline"
                  className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                >
                  Clear History
                </Button>
              </div>
            </div>
          </div>

          {/* Generated Workflow */}
          <div>
            <h2 className="text-slate-200 mb-4">Generated Workflow</h2>
            {workflows.length === 0 ? (
              <Card className="bg-slate-800 border-slate-700 p-8 text-center">
                <Code2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-blue-400 text-sm">
                  Enter a natural language query to generate a workflow
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {workflows.slice(0, 3).map((workflow) => (
                  <Card key={workflow.id} className="bg-slate-800 border-slate-700 p-4">
                    <div className="flex items-start justify-between mb-2">
                      <Badge className="bg-green-600/20 text-green-400 border-green-600/30">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Generated
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="w-3 h-3" />
                        {workflow.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                    <p className="text-sm text-slate-300">{workflow.query}</p>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="outline" className="bg-slate-700 border-slate-600 text-slate-300 text-xs">
                        View Code
                      </Button>
                      <Button size="sm" variant="outline" className="bg-slate-700 border-slate-600 text-slate-300 text-xs">
                        Execute
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Workflow History */}
        {workflowHistory.length > 0 && (
          <div className="mt-8">
            <h3 className="text-slate-300 mb-4">Workflow History</h3>
            <div className="grid grid-cols-3 gap-4">
              {workflowHistory.map((conversation) => (
                <Card
                  key={conversation.id}
                  onClick={() => onConversationSelect?.(conversation.id)}
                  className="bg-slate-800 border-slate-700 p-4 cursor-pointer hover:bg-slate-750 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                      {new Date(conversation.created_at).toLocaleDateString()}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-400 line-clamp-2">{conversation.title}</p>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
