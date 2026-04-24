export interface AgentLogEntry {
  agent: 'Orchestrator' | 'ResearchAgent' | 'SummaryAgent';
  action: string;
  result: string | string[];
}

export interface ResearchResult {
  topic: string;
  content: string;
}

export interface MultiAgentRequest {
  message: string;
}

export interface MultiAgentResponse {
  reply: string;
  agentLog: AgentLogEntry[];
}
