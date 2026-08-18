'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, 
  Bot, 
  Send, 
  Sparkles, 
  RefreshCw,
  Loader2,
  AlertCircle,
  FileText,
  Package,
  Settings,
  Car,
  Bug,
  Palette,
  User,
  Zap,
  Lock,
  RotateCcw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { sendChatMessage } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';

const SKILL_ICONS: Record<string, React.ElementType> = {
  'Settings': Settings,
  'Car': Car,
  'Bug': Bug,
  'Palette': Palette,
  'User': User,
  'Package': Package,
  'Zap': Zap,
  'Lock': Lock,
  'RotateCcw': RotateCcw,
  'FileText': FileText,
};

const SKILLS = [
  { id: 'config-editor', name: 'Config Editor', icon: 'Settings', description: 'Edit config files' },
  { id: 'vehicle-handler', name: 'Vehicle Handler', icon: 'Car', description: 'Modify vehicles' },
  { id: 'error-fixer', name: 'Error Fixer', icon: 'Bug', description: 'Fix errors' },
  { id: 'ui-customizer', name: 'UI Customizer', icon: 'Palette', description: 'Customize UI' },
  { id: 'npc-spawner', name: 'NPC Spawner', icon: 'User', description: 'Add NPCs' },
  { id: 'resource-installer', name: 'Resource Installer', icon: 'Package', description: 'Install resources' },
  { id: 'dependency-checker', name: 'Dependency Checker', icon: 'Zap', description: 'Check dependencies' },
  { id: 'performance-analyzer', name: 'Performance Analyzer', icon: 'Zap', description: 'Optimize performance' },
];

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  skillUsed?: string;
}

interface ChatPanelProps {
  serverId: string;
  threadId: string;
  framework: string;
  resources: Array<{ name: string; path: string }>;
}

export default function ChatPanel({ serverId, threadId, framework }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [showSkillPicker, setShowSkillPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleSkill = (skillId: string) => {
    setSelectedSkills(prev => 
      prev.includes(skillId) 
        ? prev.filter(id => id !== skillId)
        : [...prev, skillId]
    );
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await sendChatMessage(threadId, input);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.response || 'Response received',
        timestamp: Date.now(),
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Sorry, there was an error processing your message. Please try again.',
        timestamp: Date.now(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = () => {
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="font-medium text-sm">AI Assistant</span>
          <span className="text-xs text-muted-foreground">• {framework.toUpperCase()}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={clearHistory}
            className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground rounded hover:bg-accent transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Clear
          </button>
        </div>
      </div>

      {/* Skill Selector */}
      <div className="border-b border-border px-4 py-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Skills:</span>
          <button
            onClick={() => setShowSkillPicker(!showSkillPicker)}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-accent rounded hover:bg-accent/80 transition-colors"
          >
            <Sparkles className="w-3 h-3" />
            {selectedSkills.length > 0 ? `${selectedSkills.length} selected` : 'Select'}
          </button>
          
          {selectedSkills.map(skillId => {
            const skill = SKILLS.find(s => s.id === skillId);
            const IconComponent = skill ? SKILL_ICONS[skill.icon] : null;
            return skill && IconComponent ? (
              <button
                key={skillId}
                onClick={() => toggleSkill(skillId)}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
              >
                <IconComponent className="w-3 h-3" />
                {skill.name}
                <span className="ml-1">×</span>
              </button>
            ) : null;
          })}
        </div>

        {/* Skill Picker Dropdown */}
        <AnimatePresence>
          {showSkillPicker && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 mt-2 w-64 bg-card border border-border rounded-lg shadow-lg p-3 z-10"
            >
              <div className="grid grid-cols-2 gap-2">
                {SKILLS.map(skill => {
                  const IconComponent = SKILL_ICONS[skill.icon];
                  return (
                    <button
                      key={skill.id}
                      onClick={() => {
                        toggleSkill(skill.id);
                        setShowSkillPicker(false);
                      }}
                      className={`p-2 rounded-lg text-left transition-colors ${
                        selectedSkills.includes(skill.id)
                          ? 'bg-primary/10 border border-primary/30'
                          : 'hover:bg-accent border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {IconComponent && <IconComponent className="w-4 h-4 text-primary" />}
                        <span className="text-xs font-medium">{skill.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{skill.description}</p>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Start a Conversation</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Select skills above, then ask about your server configuration.
            </p>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Try: "Change my HUD color to blue"</p>
              <p>Try: "Fix this error: attempt to index a nil value"</p>
              <p>Try: "Add a ped spawn point"</p>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-primary" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-xl px-4 py-2.5 ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-accent text-foreground'
              }`}
            >
              {message.skillUsed && message.role === 'assistant' && (
                <div className="text-xs text-primary/70 mb-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Using: {message.skillUsed}
                </div>
              )}
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
          </motion.div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="bg-accent rounded-xl px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-4">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Ask about your server... (Ctrl+K for commands)"
            className="flex-1 px-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all disabled:opacity-50"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
