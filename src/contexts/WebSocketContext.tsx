import { createContext, useContext, useEffect, useRef, ReactNode } from 'react';
import { useUnits } from './UnitContext';
import { Unit } from '../../types';

type WebSocketMessage = {
  type: 'UNIT_UPDATE' | 'STATUS_CHANGE' | 'NEW_BOOKING';
  payload: any;
};

type WebSocketContextType = {
  sendMessage: (message: WebSocketMessage) => void;
  isConnected: boolean;
};

const WebSocketContext = createContext<WebSocketContextType>({
  sendMessage: () => {},
  isConnected: false,
});

export const WebSocketProvider = ({ children }: { children: ReactNode }) => {
  const { updateUnit } = useUnits();
  const ws = useRef<WebSocket | null>(null);
  const isConnected = useRef(false);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectInterval = 3000; // 3 seconds

  const connect = useCallback(() => {
    // In production, replace with your WebSocket server URL
    const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:3001';
    
    try {
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('WebSocket connected');
        isConnected.current = true;
        reconnectAttempts.current = 0;
      };

      ws.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          switch (message.type) {
            case 'UNIT_UPDATE':
              updateUnit(message.payload.id, message.payload.updates);
              break;
            // Add more message types as needed
            default:
              console.log('Unhandled message type:', message.type);
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };

      ws.current.onclose = () => {
        console.log('WebSocket disconnected');
        isConnected.current = false;
        attemptReconnect();
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        ws.current?.close();
      };
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      attemptReconnect();
    }
  }, [updateUnit]);

  const attemptReconnect = useCallback(() => {
    if (reconnectAttempts.current < maxReconnectAttempts) {
      reconnectAttempts.current++;
      console.log(`Attempting to reconnect (${reconnectAttempts.current}/${maxReconnectAttempts})...`);
      
      setTimeout(() => {
        connect();
      }, reconnectInterval);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }, [connect]);

  useEffect(() => {
    connect();

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connect]);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
      return true;
    } else {
      console.warn('WebSocket is not connected');
      return false;
    }
  }, []);

  return (
    <WebSocketContext.Provider 
      value={{ 
        sendMessage, 
        isConnected: isConnected.current 
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export default WebSocketContext;
