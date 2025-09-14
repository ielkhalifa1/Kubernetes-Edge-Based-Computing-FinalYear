import React, { useState, useEffect } from 'react';
import { Bell, Settings, User, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { Badge } from './ui/badge';

const Header = ({ activeTab, websocket }) => {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [notifications, setNotifications] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (websocket) {
      setConnectionStatus('connected');
      
      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'security_event') {
            setNotifications(prev => [
              ...prev.slice(0, 4), // Keep only last 4 notifications
              {
                id: Date.now(),
                type: 'security',
                message: `Security event: ${data.data.description}`,
                timestamp: new Date(),
                severity: data.data.severity
              }
            ]);
          }
        } catch (error) {
          console.error('Header websocket message error:', error);
        }
      };

      websocket.onclose = () => setConnectionStatus('disconnected');
      websocket.onerror = () => setConnectionStatus('error');
    } else {
      setConnectionStatus('disconnected');
    }
  }, [websocket]);

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Dashboard Overview';
      case 'nodes': return 'Edge Nodes Management';
      case 'workloads': return 'Workload Orchestration';
      case 'analytics': return 'Performance Analytics';
      case 'security': return 'Security Center';
      default: return 'Dashboard';
    }
  };

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="w-4 h-4 text-green-600" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return <WifiOff className="w-4 h-4 text-gray-400" />;
    }
  };

  const getConnectionText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Real-time Connected';
      case 'error':
        return 'Connection Error';
      default:
        return 'Disconnected';
    }
  };

  const getConnectionStyle = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'error':
        return 'text-red-700 bg-red-50 border-red-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{getPageTitle()}</h2>
          <p className="text-sm text-gray-500 mt-1">
            {currentTime.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })} • {currentTime.toLocaleTimeString()}
          </p>
        </div>

        <div className="flex items-center space-x-4">
          {/* Connection Status */}
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium border ${getConnectionStyle()}`}>
            {getConnectionIcon()}
            <span>{getConnectionText()}</span>
          </div>

          {/* Notifications */}
          <div className="relative">
            <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200">
              <Bell className="w-5 h-5" />
              {notifications.length > 0 && (
                <Badge className="absolute -top-1 -right-1 bg-red-500 text-white text-xs min-w-[1.2rem] h-5 flex items-center justify-center rounded-full">
                  {notifications.length}
                </Badge>
              )}
            </button>
          </div>

          {/* Settings */}
          <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200">
            <Settings className="w-5 h-5" />
          </button>

          {/* User Profile */}
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">Ishaq Elkhalifa</p>
              <p className="text-xs text-gray-500">System Administrator</p>
            </div>
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Notifications Banner */}
      {notifications.length > 0 && (
        <div className="mt-4 space-y-2">
          {notifications.slice(-2).map((notification) => (
            <div
              key={notification.id}
              className={`p-3 rounded-lg border-l-4 text-sm animate-slide-in ${
                notification.severity === 'high' || notification.severity === 'critical'
                  ? 'bg-red-50 border-red-400 text-red-800'
                  : notification.severity === 'medium'
                  ? 'bg-yellow-50 border-yellow-400 text-yellow-800'
                  : 'bg-blue-50 border-blue-400 text-blue-800'
              }`}
            >
              <div className="flex justify-between items-start">
                <span>{notification.message}</span>
                <span className="text-xs opacity-75">
                  {notification.timestamp.toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </header>
  );
};

export default Header;