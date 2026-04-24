export type MessageType = 'search' | 'calculate' | 'answer';

export interface GraphState {
  messages: string[];
  messageType?: MessageType;
  searchResult?: string;
  calcResult?: string;
  finalAnswer?: string;
}

export interface GraphResponse {
  reply: string;
  graphPath: string[];
  state: Partial<GraphState>;
}
