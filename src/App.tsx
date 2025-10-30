import { useCallback, useEffect, useRef, useState } from 'react';
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

// Template definitions
const TEMPLATES = [
  { value: 'none', label: 'None', prompt: '' },
  { value: 'count-gc', label: 'Count GC reads', prompt: 'Write Python code to count the total number of GC reads in this FASTA file' },
  { value: 'longest-sequence', label: 'Longest Sequence', prompt: 'Write Python code to print the ID and length of the longest sequence in this FASTA file' },
  { value: 'reverse-complement', label: 'Reverse Complement', prompt: 'Write Python code to reverse-complement all sequences in this FASTA file and save them to a new FASTA file' }
];

const WORKFLOW_HISTORY_PAGE_SIZE = 10;

function AppContent() {
  const { user, isAuthenticated, logout } = useAuth();
  const [activeView, setActiveView] = useState<'chat' | 'workflow'>('workflow');
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [totalExecutions, setTotalExecutions] = useState(0);
  const [allConversations, setAllConversations] = useState<Conversation[]>([]);
  const [workflowHistoryOffset, setWorkflowHistoryOffset] = useState(0);
  const [hasMoreWorkflowHistory, setHasMoreWorkflowHistory] = useState(true);
  const [isLoadingWorkflowHistory, setIsLoadingWorkflowHistory] = useState(false);
  const initialWorkflowLoadRef = useRef(false);
  const [currentConversationTitle, setCurrentConversationTitle] = useState<string | null>(null);

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
  const [workflowCodeResult, setWorkflowCodeResult] = useState<{ code: string; execution: ExecutionInfo | null; messageName?: string | null } | null>(null);
  const [workflowSelectedMessageIndex, setWorkflowSelectedMessageIndex] = useState<number | null>(null);
  const [chatCodeResult, setChatCodeResult] = useState<{ code: string; execution: ExecutionInfo | null; messageName?: string | null } | null>(null);
  const [chatSelectedMessageIndex, setChatSelectedMessageIndex] = useState<number | null>(null);

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
    setChatCodeResult(null);
    setChatSelectedMessageIndex(null);
    setCurrentConversationTitle(null);
  };

  const handleConversationSelect = async (
    conversationId: string,
    {
      focusView = 'chat',
      autoSwitch = focusView === 'chat',
      conversationTitle
    }: { focusView?: 'chat' | 'workflow'; autoSwitch?: boolean; conversationTitle?: string } = {}
  ) => {
    if (conversationTitle) {
      setCurrentConversationTitle(conversationTitle);
    }
    try {
      const response = await conversationsService.getConversationDetail(conversationId);
      setCurrentConversationId(conversationId);
      const resolvedConversationTitle = response.conversation?.title ?? conversationTitle ?? null;
      setCurrentConversationTitle(resolvedConversationTitle);

      const formattedMessages: ChatMessage[] = response.messages.map((msg: ApiMessage) => {
        const metadata = msg.metadata || {};
        const derivedName =
          metadata.name ??
          metadata.title ??
          metadata.display_name ??
          metadata.message_name ??
          metadata.label ??
          undefined;

        const cleanedName =
          typeof derivedName === 'string' && derivedName.trim().length > 0
            ? derivedName.trim()
            : undefined;

        return {
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.created_at),
          name: cleanedName ?? resolvedConversationTitle ?? undefined,
          code: msg.code || undefined,
          execution: metadata.execution || undefined
        };
      });

      setChatMessages(formattedMessages);
      if (autoSwitch) {
        setActiveView(focusView);
      }

      const latestWithCodeIndex = [...formattedMessages].reverse().findIndex((msg) => msg.code);
      if (latestWithCodeIndex !== -1) {
        const actualIndex = formattedMessages.length - 1 - latestWithCodeIndex;
        const latestWithCode = formattedMessages[actualIndex];

        const resultPayload = {
          code: latestWithCode.code!,
          execution: latestWithCode.execution || null,
          messageName: latestWithCode.name ?? resolvedConversationTitle
        };

        if (focusView === 'workflow') {
          setWorkflowCodeResult(resultPayload);
          setWorkflowSelectedMessageIndex(actualIndex);
        } else {
          setChatCodeResult(resultPayload);
          setChatSelectedMessageIndex(actualIndex);
        }
      } else {
        if (focusView === 'workflow') {
          setWorkflowCodeResult(null);
          setWorkflowSelectedMessageIndex(null);
        } else {
          setChatCodeResult(null);
          setChatSelectedMessageIndex(null);
        }
      }
    } catch (error: any) {
      toast.error('Failed to load conversation');
    }
  };

  const handleConversationCreated = async (conversationId: string) => {
    setCurrentConversationId(conversationId);
    setCurrentConversationTitle(null);

    // Fetch new conversation and add to list
    try {
      const response = await conversationsService.getConversationDetail(conversationId);
      if (response.conversation) {
        const newConversation: Conversation = response.conversation;
        // Add to front of all conversations list
        setAllConversations(prev => {
          const exists = prev.some(conv => conv.id === conversationId);
          if (exists) return prev;
          return [newConversation, ...prev];
        });
      }
    } catch (error: any) {
      console.error('Failed to fetch new conversation:', error);
    }
  };

  const handleChatMessageClick = (index: number) => {
    const message = chatMessages[index];
    if (message.code) {
      setChatSelectedMessageIndex(index);
      setChatCodeResult({
        code: message.code,
        execution: message.execution || null,
        messageName: message.name ?? currentConversationTitle
      });
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setWorkflowCodeResult(null);
      setWorkflowSelectedMessageIndex(null);
      setChatCodeResult(null);
      setChatSelectedMessageIndex(null);
      setAllConversations([]);
      setWorkflowHistoryOffset(0);
      setHasMoreWorkflowHistory(true);
      setIsLoadingWorkflowHistory(false);
      initialWorkflowLoadRef.current = false;
      setCurrentConversationTitle(null);
    }
  }, [isAuthenticated]);

  const loadWorkflowHistory = useCallback(async ({ reset = false }: { reset?: boolean } = {}) => {
    if (!isAuthenticated) {
      return;
    }

    if (!reset && (!hasMoreWorkflowHistory || isLoadingWorkflowHistory)) {
      return;
    }

    setIsLoadingWorkflowHistory(true);

    try {
      const effectiveOffset = reset ? 0 : workflowHistoryOffset;

      if (reset) {
        setWorkflowHistoryOffset(0);
        setHasMoreWorkflowHistory(true);
      }

      const response = await conversationsService.getConversations({
        limit: WORKFLOW_HISTORY_PAGE_SIZE,
        offset: effectiveOffset
      });

      // 直接使用 API 返回的對話列表，不做額外請求
      setAllConversations((prev) => {
        if (reset) {
          return response.conversations;
        }

        if (response.conversations.length === 0) {
          return prev;
        }

        const existingIds = new Set(prev.map((conv) => conv.id));
        const merged = [...prev];
        for (const conv of response.conversations) {
          if (!existingIds.has(conv.id)) {
            merged.push(conv);
          }
        }
        return merged;
      });

      const fetchedCount = response.conversations.length;
      setWorkflowHistoryOffset(effectiveOffset + fetchedCount);
      setHasMoreWorkflowHistory(fetchedCount === WORKFLOW_HISTORY_PAGE_SIZE && fetchedCount > 0);
    } catch (error: any) {
      if (!error.message?.includes('401')) {
        console.error('Failed to load conversations:', error);
      }
    } finally {
      setIsLoadingWorkflowHistory(false);
    }
  }, [
    hasMoreWorkflowHistory,
    isAuthenticated,
    isLoadingWorkflowHistory,
    workflowHistoryOffset
  ]);

  useEffect(() => {
    if (isAuthenticated && activeView === 'workflow') {
      if (!initialWorkflowLoadRef.current) {
        initialWorkflowLoadRef.current = true;
        loadWorkflowHistory({ reset: true });
      }
    } else {
      initialWorkflowLoadRef.current = false;
    }
  }, [activeView, isAuthenticated, loadWorkflowHistory]);

  const handleReloadConversations = useCallback(() => {
    loadWorkflowHistory({ reset: true });
  }, [loadWorkflowHistory]);

  // Auto-select latest message with code when messages change
  useEffect(() => {
    if (chatMessages.length > 0 && chatCodeResult) {
      // Find the latest message with code
      for (let i = chatMessages.length - 1; i >= 0; i--) {
        if (chatMessages[i].code === chatCodeResult.code) {
          setChatSelectedMessageIndex(i);
          break;
        }
      }
    }
  }, [chatMessages, chatCodeResult]);

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0
    }} className="bg-slate-950">
      <Sidebar
        workflows={workflows}
        totalExecutions={totalExecutions}
        onConversationSelect={(id, meta) =>
          handleConversationSelect(id, { conversationTitle: meta?.title })
        }
        currentConversationId={currentConversationId}
        activeView={activeView}
        selectedTemplate={selectedTemplate}
        onTemplateChange={handleTemplateChange}
        uploadedFiles={uploadedFiles}
        onFilesChange={handleFilesChange}
        onReloadConversations={handleReloadConversations}
        onNewChat={handleNewChat}
      />

      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minWidth: 0
      }}>
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
        <div style={{ flex: 1, overflow: 'hidden', width: '100%' }}>
          {activeView === 'workflow' ? (
            <div style={{ height: '100%', display: 'flex', overflow: 'hidden', width: '100%' }}>
              {isAuthenticated ? (
                <>
                  <WorkflowPanel
                    className="flex-1"
                    onGenerateWorkflow={handleGenerateWorkflow}
                    workflows={workflows}
                    allConversations={allConversations}
                    isLoadingHistory={isLoadingWorkflowHistory}
                    hasMoreHistory={hasMoreWorkflowHistory}
                    onLoadMoreHistory={loadWorkflowHistory}
                    onReloadHistory={handleReloadConversations}
                    onConversationSelect={(id, meta) =>
                      handleConversationSelect(id, {
                        focusView: 'workflow',
                        autoSwitch: false,
                        conversationTitle: meta?.title
                      })
                    }
                    selectedTemplate={selectedTemplate}
                    uploadedFiles={uploadedFiles}
                    onClearFiles={() => setUploadedFiles([])}
                    onWorkflowResult={({ code, execution, messageIndex, messageName }) => {
                      setWorkflowCodeResult({
                        code,
                        execution,
                        messageName: messageName ?? currentConversationTitle
                      });
                      setWorkflowSelectedMessageIndex(messageIndex ?? null);
                    }}
                    onConversationCreated={handleConversationCreated}
                  />
                  <div style={{ width: '45%', flexShrink: 0, height: '100%' }}>
                      <CodeViewer
                        code={workflowCodeResult?.code}
                        execution={workflowCodeResult?.execution || null}
                        messageIndex={workflowSelectedMessageIndex}
                        messageName={workflowCodeResult?.messageName ?? null}
                        viewLabel="Workflow Result"
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
          ) : (
            <div style={{ height: '100%', display: 'flex', overflow: 'hidden', width: '100%' }}>
              {isAuthenticated ? (
                <>
                  <ChatPanel
                    className="flex-1"
                    messages={chatMessages}
                    setMessages={setChatMessages}
                    conversationId={currentConversationId}
                    onConversationCreated={handleConversationCreated}
                    onCodeGenerated={({ code, execution, messageName }) => {
                      setChatCodeResult({
                        code,
                        execution: execution || null,
                        messageName: messageName ?? currentConversationTitle
                      });
                    }}
                    onMessageClick={handleChatMessageClick}
                    selectedMessageIndex={chatSelectedMessageIndex}
                  />
                  <div style={{ width: '45%', flexShrink: 0, height: '100%' }}>
                    <CodeViewer
                      code={chatCodeResult?.code}
                      execution={chatCodeResult?.execution || null}
                      messageIndex={chatSelectedMessageIndex}
                      messageName={chatCodeResult?.messageName ?? null}
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
