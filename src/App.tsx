import { useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatPanel, type ChatMessage } from './components/ChatPanel';
import { WorkflowPanel } from './components/WorkflowPanel';
import { QuickActions } from './components/QuickActions';
import { AuthDialog } from './components/AuthDialog';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Code2, MessageSquare, Workflow, LogOut, User, CheckCircle, XCircle } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs';
import { Button } from './components/ui/button';
import { Toaster } from './components/ui/sonner';
import { conversationsService, Message as ApiMessage } from './services';
import { toast } from 'sonner';
import { ExecutionInfo } from './types';

function AppContent() {
  const { user, isAuthenticated, logout } = useAuth();
  const [activeView, setActiveView] = useState<'chat' | 'workflow'>('chat');
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [totalExecutions, setTotalExecutions] = useState(0);
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
  const [showCode, setShowCode] = useState(false);
  const [showExecution, setShowExecution] = useState(false);
  const [selectedMessageIndex, setSelectedMessageIndex] = useState<number | null>(null);

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
    setShowCode(false);
    setShowExecution(false);
  };

  const handleConversationSelect = async (conversationId: string) => {
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
      setActiveView('chat');

      const latestWithCodeIndex = [...formattedMessages].reverse().findIndex((msg) => msg.code);
      if (latestWithCodeIndex !== -1) {
        const actualIndex = formattedMessages.length - 1 - latestWithCodeIndex;
        const latestWithCode = formattedMessages[actualIndex];
        setCodeResult({
          code: latestWithCode.code!,
          execution: latestWithCode.execution || null
        });
        setSelectedMessageIndex(actualIndex);
        setShowCode(true);
        setShowExecution(false);
      } else {
        setCodeResult(null);
        setSelectedMessageIndex(null);
        setShowCode(false);
        setShowExecution(false);
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
      setShowCode(false);
      setShowExecution(false);
    }
  }, [isAuthenticated]);

  // Auto-select latest message with code when messages change
  useEffect(() => {
    if (chatMessages.length > 0 && codeResult) {
      // Find the latest message with code
      for (let i = chatMessages.length - 1; i >= 0; i--) {
        if (chatMessages[i].code === codeResult.code) {
          setSelectedMessageIndex(i);
          setShowCode(true);
          setShowExecution(false);
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
            <WorkflowPanel onGenerateWorkflow={handleGenerateWorkflow} workflows={workflows} />
          ) : (
            <div className="h-full flex overflow-hidden">
              {isAuthenticated ? (
                <>
                  <ChatPanel
                    className="flex-[0_0_55%] max-w-[55%] min-w-[420px]"
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
                  <div className="w-1/2 min-w-0 border-l border-slate-800 bg-slate-950 flex flex-col">
                    <div className="border-b border-slate-800 px-6 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Code2 className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-300">Code Viewer</span>
                        </div>
                        {selectedMessageIndex !== null && (
                          <div className="flex items-center gap-2 text-xs text-slate-400 border-l border-slate-700 pl-3">
                            <span>Viewing Message #{selectedMessageIndex + 1}</span>
                          </div>
                        )}
                      </div>
                      {codeResult && (
                        <div className="flex items-center gap-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowCode(!showCode)}
                            className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 text-xs"
                          >
                            {showCode ? 'Hide Code' : 'Review Code'}
                          </Button>
                          {codeResult.execution && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setShowExecution(!showExecution)}
                              className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 text-xs"
                            >
                              {showExecution ? 'Hide Execution' : 'Execute'}
                            </Button>
                          )}
                          <div className="flex items-center gap-2 text-xs">
                            {codeResult.execution?.success ? (
                              <>
                                <CheckCircle className="w-3 h-3 text-green-500" />
                                <span className="text-green-500">Execution successful</span>
                              </>
                            ) : codeResult.execution ? (
                              <>
                                <XCircle className="w-3 h-3 text-red-500" />
                                <span className="text-red-500">Execution failed</span>
                              </>
                            ) : null}
                          </div>
                        </div>
                      )}
                    </div>
                    {codeResult ? (
                      <div className="flex-1 overflow-y-auto p-6">
                        {showCode ? (
                          <div>
                            <h4 className="text-xs uppercase tracking-wide text-slate-400 mb-2">
                              Generated Code
                            </h4>
                            <pre className="bg-slate-900 border border-slate-800 rounded-lg p-4 text-sm text-slate-200 whitespace-pre-wrap break-all overflow-auto">
                              <code>{codeResult.code}</code>
                            </pre>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
                            Click "Review Code" to view the generated code
                          </div>
                        )}

                        {showExecution && codeResult.execution && (
                          <>
                            {codeResult.execution.stdout && (
                              <div className="mt-4">
                                <h4 className="text-xs uppercase tracking-wide text-slate-400 mb-2">
                                  Execution Output
                                </h4>
                                <pre className="bg-slate-900 border border-slate-800 rounded-lg p-4 text-xs text-slate-300 whitespace-pre-wrap break-all overflow-auto">
                                  <code>{codeResult.execution.stdout}</code>
                                </pre>
                              </div>
                            )}
                            {codeResult.execution.error && (
                              <div className="mt-4">
                                <h4 className="text-xs uppercase tracking-wide text-slate-400 mb-2">
                                  Execution Error
                                </h4>
                                <pre className="bg-slate-900 border border-slate-800 rounded-lg p-4 text-xs text-red-300 whitespace-pre-wrap break-all overflow-auto">
                                  <code>{codeResult.execution.error}</code>
                                </pre>
                              </div>
                            )}
                          </>
                        )}

                        {!showExecution && codeResult.execution && (
                          <div className="flex items-center justify-center h-32 mt-4 text-slate-500 text-sm">
                            Click "Execute" to view the execution results
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-slate-500">
                        <div className="text-center">
                          <Code2 className="w-16 h-16 mx-auto mb-4 text-slate-700" />
                          <h3 className="mb-2">No Code Blocks Yet</h3>
                          <p className="text-sm">
                            Ask BioBuild to generate some code to see it here
                          </p>
                        </div>
                      </div>
                    )}
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

        {/* Quick Actions - shown in workflow view */}
        {activeView === 'workflow' && (
          <div className="border-t border-slate-800 bg-slate-900 px-6 py-4">
            <QuickActions onActionClick={(action) => handleGenerateWorkflow(action)} />
          </div>
        )}
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
