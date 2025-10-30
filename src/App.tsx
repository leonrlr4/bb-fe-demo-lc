import { useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatPanel, type ChatMessage } from './components/ChatPanel';
import { WorkflowPanel } from './components/WorkflowPanel';
import { AuthDialog } from './components/AuthDialog';
import { CodeViewer } from './components/CodeViewer';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Code2, MessageSquare, Workflow, LogOut, User } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs';
import { Button } from './components/ui/button';
import { Toaster } from './components/ui/sonner';
import { conversationsService, Message as ApiMessage, Conversation } from './services';
import { toast } from 'sonner';
import { ExecutionInfo } from './types';

interface ConversationWithMessageCount extends Conversation {
  messageCount?: number;
}

// Template definitions
const TEMPLATES = [
  { value: 'none', label: 'None', prompt: '' },
  { value: 'count-gc', label: 'Count GC reads', prompt: 'Write Python code to count the total number of GC reads in this FASTA file' },
  { value: 'longest-sequence', label: 'Longest Sequence', prompt: 'Write Python code to print the ID and length of the longest sequence in this FASTA file' },
  { value: 'reverse-complement', label: 'Reverse Complement', prompt: 'Write Python code to reverse-complement all sequences in this FASTA file and save them to a new FASTA file' }
];

function AppContent() {
  const { user, isAuthenticated, logout } = useAuth();
  const [activeView, setActiveView] = useState<'chat' | 'workflow'>('workflow');
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [totalExecutions, setTotalExecutions] = useState(0);
  const [allConversations, setAllConversations] = useState<ConversationWithMessageCount[]>([]);

  // Sidebar state for workflow
  const [selectedTemplate, setSelectedTemplate] = useState<string>('none');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "🧬 Hi! I'm BioBuild, your genomics AI assistant. I can help you:\n\n• Analyze FASTA sequences and generate custom Python scripts\n• Create phylogenetic trees and perform evolutionary analysis\n• Predict genes and find open reading frames\n• Run BLAST searches for sequence similarity\n• Answer questions about genomics and bioinformatics\n\nUpload a FASTA file using the button above, or just ask me any genomics question to get started!",
      timestamp: new Date()
    }
  ]);
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [codeResult, setCodeResult] = useState<{ code: string; execution: ExecutionInfo | null } | null>(null);
  const [selectedMessageIndex, setSelectedMessageIndex] = useState<number | null>(null);

  const handleTemplateChange = (template: string) => {
    setSelectedTemplate(template);
    // Template will be used in WorkflowPanel to populate query
  };

  const handleFilesChange = (files: File[]) => {
    setUploadedFiles(files);
  };

  const handleGenerateWorkflow = (query: string) => {
    const newWorkflow = {
      id: Date.now(),
      query,
      timestamp: new Date(),
      status: 'generated'
    };
    setWorkflows([newWorkflow, ...workflows]);
  };

  const handleNewChat = () => {
    setCurrentConversationId(undefined);
    setChatMessages([
      {
        role: 'assistant',
        content: "🧬 Hi! I'm BioBuild, your genomics AI assistant. How can I help you today?",
        timestamp: new Date()
      }
    ]);
    setActiveView('chat');
    setCodeResult(null);
    setSelectedMessageIndex(null);
  };

  const handleConversationSelect = async (conversationId: string, switchToChat: boolean = true) => {
    try {
      const response = await conversationsService.getConversationDetail(conversationId);
      setCurrentConversationId(conversationId);

      const formattedMessages: ChatMessage[] = response.messages.map((msg: ApiMessage) => ({
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.created_at),
        code: msg.code || undefined,
        execution: msg.metadata?.execution || undefined
      }));

      setChatMessages(formattedMessages);
      if (switchToChat) {
        setActiveView('chat');
      }

      const latestWithCodeIndex = [...formattedMessages].reverse().findIndex((msg) => msg.code);
      if (latestWithCodeIndex !== -1) {
        const actualIndex = formattedMessages.length - 1 - latestWithCodeIndex;
        const latestWithCode = formattedMessages[actualIndex];
        setCodeResult({
          code: latestWithCode.code!,
          execution: latestWithCode.execution || null
        });
        setSelectedMessageIndex(actualIndex);
      } else {
        setCodeResult(null);
        setSelectedMessageIndex(null);
      }
    } catch (error: any) {
      toast.error('Failed to load conversation');
    }
  };

  const handleConversationCreated = (conversationId: string) => {
    setCurrentConversationId(conversationId);
  };

  const handleMessageClick = (index: number) => {
    const message = chatMessages[index];
    if (message.code) {
      setSelectedMessageIndex(index);
      setCodeResult({
        code: message.code,
        execution: message.execution || null
      });
      setShowCode(true);
      setShowExecution(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setCodeResult(null);
      setSelectedMessageIndex(null);
      setAllConversations([]);
    }
  }, [isAuthenticated]);

  // Load conversations with message counts when switching to workflow view
  useEffect(() => {
    if (isAuthenticated && activeView === 'workflow' && allConversations.length === 0) {
      loadAllConversations();
    }
  }, [isAuthenticated, activeView]);

  const loadAllConversations = async () => {
    try {
      const response = await conversationsService.getConversations();

      // Load details and find first 3 conversations with exactly 2 messages
      const workflowConversations: ConversationWithMessageCount[] = [];

      for (const conv of response.conversations) {
        // Stop when we have found 3 workflow conversations
        if (workflowConversations.length >= 3) {
          break;
        }

        try {
          const detail = await conversationsService.getConversationDetail(conv.id);
          const messageCount = detail.messages.length;

          // Only keep conversations with exactly 2 messages
          if (messageCount === 2) {
            workflowConversations.push({
              ...conv,
              messageCount
            });
          }
        } catch (error) {
          console.error(`Failed to load details for conversation ${conv.id}:`, error);
        }
      }

      setAllConversations(workflowConversations);
    } catch (error: any) {
      if (!error.message?.includes('401')) {
        console.error('Failed to load conversations:', error);
      }
    }
  };

  // Auto-select latest message with code when messages change
  useEffect(() => {
    if (chatMessages.length > 0 && codeResult) {
      // Find the latest message with code
      for (let i = chatMessages.length - 1; i >= 0; i--) {
        if (chatMessages[i].code === codeResult.code) {
          setSelectedMessageIndex(i);
          break;
        }
      }
    }
  }, [chatMessages, codeResult]);

  return (
    <div className="flex h-screen bg-slate-950">
      <Sidebar
        workflows={workflows}
        totalExecutions={totalExecutions}
        onConversationSelect={handleConversationSelect}
        currentConversationId={currentConversationId}
        activeView={activeView}
        selectedTemplate={selectedTemplate}
        onTemplateChange={handleTemplateChange}
        uploadedFiles={uploadedFiles}
        onFilesChange={handleFilesChange}
      />

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b border-slate-800 bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Code2 className="w-6 h-6 text-white" />
            <h1 className="text-white">BioBuild</h1>
            <span className="text-purple-200 text-sm">AI-Powered Bioinformatics Platform</span>
          </div>
          <div className="flex items-center gap-3 text-white text-sm">
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <span>{user?.username || user?.email}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="text-white hover:bg-purple-700"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAuthDialogOpen(true)}
                className="text-white hover:bg-purple-700"
              >
                Login / Register
              </Button>
            )}
          </div>
        </header>

        {/* View Toggle */}
        <div className="border-b border-slate-800 bg-slate-900 px-6 py-3">
          <Tabs value={activeView} onValueChange={(v: string) => setActiveView(v as 'chat' | 'workflow')}>
            <TabsList className="bg-slate-800">
              <TabsTrigger value="workflow" className="gap-2">
                <Workflow className="w-4 h-4" />
                Workflow Builder
              </TabsTrigger>
              <TabsTrigger value="chat" className="gap-2">
                <MessageSquare className="w-4 h-4" />
                AI Chat Assistant
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          {activeView === 'workflow' ? (
            <div className="h-full flex overflow-hidden">
              <WorkflowPanel
                className="flex-1 min-w-0"
                onGenerateWorkflow={handleGenerateWorkflow}
                workflows={workflows}
                allConversations={allConversations}
                onConversationSelect={(id) => handleConversationSelect(id, false)}
                selectedTemplate={selectedTemplate}
                uploadedFiles={uploadedFiles}
                onClearFiles={() => setUploadedFiles([])}
              />
              <div className="w-[45%] min-w-0 shrink-0">
                <CodeViewer
                  code={codeResult?.code}
                  execution={codeResult?.execution || null}
                  messageIndex={selectedMessageIndex}
                  viewLabel="Workflow Result"
                />
              </div>
            </div>
          ) : (
            <div className="h-full flex overflow-hidden">
              {isAuthenticated ? (
                <>
                  <ChatPanel
                    className="flex-1 min-w-0"
                    messages={chatMessages}
                    setMessages={setChatMessages}
                    conversationId={currentConversationId}
                    onConversationCreated={handleConversationCreated}
                    onCodeGenerated={({ code, execution }) => {
                      setCodeResult({ code, execution: execution || null });
                    }}
                    onMessageClick={handleMessageClick}
                    selectedMessageIndex={selectedMessageIndex}
                  />
                  <div className="w-[45%] min-w-0 shrink-0">
                    <CodeViewer
                      code={codeResult?.code}
                      execution={codeResult?.execution || null}
                      messageIndex={selectedMessageIndex}
                      viewLabel="Code Viewer"
                    />
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <Code2 className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                    <h2 className="text-2xl text-slate-300 mb-2">Welcome to BioBuild</h2>
                    <p className="text-slate-500 mb-6">Please login or register to start using the AI assistant</p>
                    <Button
                      onClick={() => setAuthDialogOpen(true)}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      Login / Register
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
      <Toaster />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
