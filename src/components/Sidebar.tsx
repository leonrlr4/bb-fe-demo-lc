import { useState, useCallback, useEffect } from 'react';
import { Upload, Info, MessageSquare, Clock } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { conversationsService, Conversation } from '../services';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  workflows: any[];
  totalExecutions: number;
  onConversationSelect?: (conversationId: string) => void;
  currentConversationId?: string;
  activeView?: 'chat' | 'workflow';
}

export function Sidebar({ workflows, totalExecutions, onConversationSelect, currentConversationId, activeView }: SidebarProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('none');
  const [isDragging, setIsDragging] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      loadConversations();
    } else {
      setConversations([]);
    }
  }, [isAuthenticated]);

  const loadConversations = async () => {
    setIsLoadingConversations(true);
    try {
      const response = await conversationsService.getConversations();
      setConversations(response.conversations);
    } catch (error: any) {
      if (!error.message?.includes('401')) {
        toast.error('Failed to load conversations');
      }
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  };

  const handleFiles = (files: File[]) => {
    const validExtensions = ['.csv', '.tsv', '.fasta', '.fa', '.fna'];
    const maxSize = 200 * 1024 * 1024; // 200MB

    files.forEach(file => {
      const fileExt = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

      if (!validExtensions.includes(fileExt)) {
        toast.error(`Invalid file type: ${file.name}. Only CSV, TSV, FASTA files are allowed.`);
        return;
      }

      if (file.size > maxSize) {
        toast.error(`File too large: ${file.name}. Maximum size is 200MB.`);
        return;
      }

      toast.success(`File uploaded: ${file.name}`);
      // TODO: upload logic
    });
  };

  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
      {/* Data Management - only show in workflow view */}
      {activeView === 'workflow' && (
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-slate-200 text-sm font-medium">Data Management</h3>
            <Info className="w-4 h-4 text-slate-500" />
          </div>

          <p className="text-xs text-slate-400 mb-3">Upload multi-omics data files</p>

          {/* Drag and Drop Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              isDragging
                ? 'border-purple-500 bg-purple-500/10'
                : 'border-slate-700 bg-slate-800/50'
            }`}
          >
            <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <p className="text-xs text-slate-400 mb-1">Drag and drop files here</p>
            <p className="text-xs text-slate-500">
              Limit 200MB per file • CSV, TSV, FASTA
            </p>
          </div>

          {/* Browse Files Button */}
          <div className="mt-3">
            <input
              type="file"
              id="file-upload"
              className="hidden"
              multiple
              accept=".csv,.tsv,.fasta,.fa,.fna"
              onChange={handleFileInput}
            />
            <label htmlFor="file-upload">
              <Button
                asChild
                variant="outline"
                className="w-full bg-slate-800 border-slate-700 hover:bg-slate-750 text-slate-300"
              >
                <span className="cursor-pointer flex items-center justify-center gap-2">
                  <Upload className="w-4 h-4" />
                  Browse files
                </span>
              </Button>
            </label>
          </div>
        </div>
      )}

      {/* Quick Templates - only show in workflow view */}
      {activeView === 'workflow' && (
        <div className="p-4 border-b border-slate-800 shrink-0">
          <h3 className="text-slate-200 text-sm font-medium mb-3">Quick Templates</h3>
          <p className="text-xs text-slate-400 mb-2">Choose a template:</p>

          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="none">None</option>
            <option value="count-gc">Count GC reads: Write Python code to count the total number of GC reads in this FASTA file</option>
            <option value="longest-sequence">Longest Sequence: Write Python code to print the ID and length of the longest sequence in this FASTA file</option>
            <option value="reverse-complement">Reverse Complement: Write Python code to reverse-complement all sequences in this FASTA file and save them to a new FASTA file</option>
          </select>
        </div>
      )}

      {/* Conversation History - only show in chat view */}
      {activeView === 'chat' && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4 text-slate-400" />
            <h3 className="text-slate-200 text-sm font-medium">Recent Chats</h3>
          </div>

          {!isAuthenticated ? (
            <p className="text-xs text-slate-500 text-center py-4">
              Login to view your chat history
            </p>
          ) : isLoadingConversations ? (
            <p className="text-xs text-slate-500 text-center py-4">Loading...</p>
          ) : conversations.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">
              No conversations yet
            </p>
          ) : (
            <div className="space-y-2">
              {conversations.slice(0, 5).map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => onConversationSelect?.(conversation.id)}
                  className={`px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                    currentConversationId === conversation.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <p className="text-sm font-medium truncate mb-1.5 leading-tight">
                    {conversation.title}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs opacity-75">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(conversation.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
