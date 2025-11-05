export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  code: string | null;
  metadata: any;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationsResponse {
  conversations: Conversation[];
}

export interface ConversationDetailResponse {
  conversation: Conversation;
  messages: Message[];
}

export interface NodeExecutionInfo {
  name: string;
  status: string;
  duration_ms: number;
  error: string | null;
}

export interface ExecutionInfo {
  success: boolean;
  stdout: string | null;
  error: string | null;
}

export interface OutputFileInfo {
  file_name: string;
  file_path: string;
  download_url: string;
}

export interface GenerateCodeResponse {
  success: boolean;
  user_id: string;
  conversation_id: string;
  message_id: string;
  code: string;
  execution: ExecutionInfo;
  input_files: OutputFileInfo[];
  output_files: OutputFileInfo[];
  nodes: NodeExecutionInfo[];
}
