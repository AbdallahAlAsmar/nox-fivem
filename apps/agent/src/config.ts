export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  orchestratorWsUrl: process.env.ORCHESTRATOR_WS_URL ?? 'ws://localhost:3001/ws/agent',
  serverDataPath: process.env.SERVER_DATA_PATH ?? './server-data',
};
