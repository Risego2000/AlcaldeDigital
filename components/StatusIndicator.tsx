
import React from 'react';
import { AgentStatus } from '../types';

interface StatusIndicatorProps {
  status: AgentStatus;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => {
  const getStatusConfig = () => {
    switch (status) {
      case AgentStatus.IDLE:
        return { color: 'bg-gray-400', text: 'Desconectado', icon: 'fa-phone-slash' };
      case AgentStatus.CONNECTING:
        return { color: 'bg-yellow-500', text: 'Conectando...', icon: 'fa-spinner fa-spin' };
      case AgentStatus.LISTENING:
        return { color: 'bg-green-500', text: 'Escuchando', icon: 'fa-microphone' };
      case AgentStatus.SPEAKING:
        return { color: 'bg-blue-500', text: 'Hablando', icon: 'fa-volume-high' };
      case AgentStatus.ERROR:
        return { color: 'bg-red-500', text: 'Error de conexión', icon: 'fa-triangle-exclamation' };
      default:
        return { color: 'bg-gray-400', text: 'IDLE', icon: 'fa-circle' };
    }
  };

  const config = getStatusConfig();

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border shadow-sm">
      <div className={`w-2.5 h-2.5 rounded-full ${config.color} ${status !== AgentStatus.IDLE && status !== AgentStatus.ERROR ? 'animate-pulse' : ''}`} />
      <i className={`fa-solid ${config.icon} text-xs text-gray-500`}></i>
      <span className="text-xs font-medium text-gray-700">{config.text}</span>
    </div>
  );
};

export default StatusIndicator;
