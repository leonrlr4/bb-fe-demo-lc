import { useState, useRef, useEffect, Dispatch, SetStateAction } from 'react';
import { Send, Upload, CheckCircle, XCircle, FileText } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { chatService, GenerateCodeResponse } from '../services';
import { toast } from 'sonner';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  name?: string;
  code?: string;
  execution?: {
    success: boolean;
    stdout: string | null;
    error: string | null;
  };
  inputFiles?: any[];
  outputFiles?: any[];
}

interface ChatPanelProps {
  messages: ChatMessage[];
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  conversationId?: string;
  onConversationCreated?: (conversationId: string) => void;
  onCodeGenerated?: (payload: { code: string; execution: ChatMessage['execution']; messageName?: string | null; inputFiles?: any[]; outputFiles?: any[] }) => void;
  onMessageClick?: (index: number) => void;
  selectedMessageIndex?: number | null;
  className?: string;
}

export function ChatPanel({
  messages,
  setMessages,
  conversationId,
  onConversationCreated,
  onCodeGenerated,
  onMessageClick,
  selectedMessageIndex,
  className,
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response: GenerateCodeResponse = await chatService.generateCode(
        input,
        conversationId,
        uploadedFiles.length > 0 ? uploadedFiles : undefined
      );

      if (onConversationCreated && !conversationId) {
        onConversationCreated(response.conversation_id);
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.execution.success
          ? (response.execution.stdout || 'Code executed successfully')
          : (response.execution.error || 'Code execution failed'),
        timestamp: new Date(),
        name: response.nodes?.[0]?.name || undefined,
        code: response.code,
        execution: response.execution
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setUploadedFiles([]);

      if (response.code?.trim()) {
        onCodeGenerated?.({
          code: response.code,
          execution: response.execution,
          messageName: response.nodes?.[0]?.name || null,
          inputFiles: response.input_files || [],
          outputFiles: response.output_files || []
        });
      }

      if (response.execution.success) {
        toast.success('Code generated and executed successfully!');
      } else {
        toast.error('Code execution failed');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate code');
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Error: ${error.message || 'Failed to generate code'}`,
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setUploadedFiles(prev => [...prev, ...files]);
      toast.success(`${files.length} file(s) uploaded`);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const containerClassName = [
    'bg-slate-900 flex flex-col min-w-0 w-full max-w-[520px] overflow-hidden',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClassName}>
      {/* Chat Header */}
      <div className="border-b border-slate-800 px-6 py-3">
        <h2 className="text-slate-200">Chat</h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((message, index) => {
          console.log('Message', index, 'selected:', selectedMessageIndex, 'match:', selectedMessageIndex === index);
          return (
          <div
            key={index}
            className={`flex w-full min-w-0 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              onClick={() => message.code && onMessageClick?.(index)}
              style={
                selectedMessageIndex === index && message.role === 'assistant'
                  ? { border: '3px solid #facc15' }
                  : undefined
              }
              className={
                message.role === 'user'
                  ? 'max-w-[85%] rounded-lg px-4 py-3 transition-all duration-200 bg-purple-600 text-white'
                  : message.code
                    ? 'max-w-[85%] rounded-lg px-4 py-3 transition-all duration-200 bg-slate-800 text-slate-200 cursor-pointer hover:bg-slate-700'
                    : 'max-w-[85%] rounded-lg px-4 py-3 transition-all duration-200 bg-slate-800 text-slate-200'
              }
            >
              {message.role === 'assistant' && index === 0 && (
                <div className="mb-2 text-purple-400">BioBuild</div>
              )}
              <div className="text-sm leading-5 whitespace-pre-wrap break-words">
                {message.content}
              </div>

              {message.code && (
                <div className="mt-2 text-xs text-purple-300">
                  Generated code is available in the Code Viewer panel.
                </div>
              )}

              {message.execution && (
                <div className="mt-2 flex items-center gap-2 text-xs">
                  {message.execution.success ? (
                    <CheckCircle className="w-3 h-3 text-green-500" />
                  ) : (
                    <XCircle className="w-3 h-3 text-red-500" />
                  )}
                  <span className={message.execution.success ? 'text-green-500' : 'text-red-500'}>
                    {message.execution.success ? 'Execution successful' : 'Execution failed'}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
        })}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 text-slate-200 rounded-lg px-4 py-3 border-2 border-purple-500/30 shadow-lg shadow-purple-500/20">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
                  <span className="text-sm font-medium text-purple-300">Generating code...</span>
                </div>
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-800 p-4">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileUpload}
          className="hidden"
          accept=".csv,.json,.txt,.fasta,.tsv"
        />

        {uploadedFiles.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-2 rounded-lg text-xs text-slate-300 hover:border-slate-600 transition-colors">
                <FileText className="w-3 h-3 text-blue-400 flex-shrink-0" />
                <span className="flex-1">{file.name}</span>
                <button
                  onClick={() => removeFile(index)}
                  className="ml-2 w-5 h-5 flex items-center justify-center rounded-full bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all font-bold text-sm"
                  title="Remove file"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 mb-2">
          <Button
            variant="outline"
            size="sm"
            className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Files
          </Button>
        </div>
        <div className="relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask BioBuild to generate code or explain concepts..."
            className="bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500 pr-12 resize-none"
            rows={3}
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            size="icon"
            className="absolute right-2 bottom-2 bg-purple-600 hover:bg-purple-700"
            disabled={isLoading || !input.trim()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
