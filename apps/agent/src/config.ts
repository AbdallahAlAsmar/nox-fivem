export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  orchestratorWsUrl: process.env.ORCHESTRATOR_WS_URL ?? 'ws://89.168.96.147:3001/ws/agent',
  serverDataPath: process.env.SERVER_DATA_PATH ?? './server-data',
};
