/* 
every time browser ask something to server , the server do a chain 
of processes to generate the final response .. we cant just make the user
wait till the response is generating .. we will notify each chian processes 
which here are called events , these events will be shared b/w
server and the browser so that th euser could know okay , this and
that is happening , the agent stared .. first turn happed , text delta generated
turn 2 started , result is showcased , agent stopped
*/

export type SSEEvent =
  | { type: "agent_start" }
  | { type: "turn_start"; turn: number } // turn number so UI knows which turn
  | { type: "text_delta"; delta: string } // just the fragment, nothing else
  | {
      type: "tool_start";
      name: string; // which tool
      args: Record<string, unknown>;
    } // what args the LLM passed
  | {
      type: "tool_end";
      name: string; // which tool finished
      result: string; // what it returned
      isError: boolean;
    } // did it fail
  | { type: "turn_end"; turn: number; durationMs: number }
  | { type: "agent_end" }
  | {
      type: "error";
      message: string;
      errorType: string; //from where the error came from like ky ftt gya
    };
