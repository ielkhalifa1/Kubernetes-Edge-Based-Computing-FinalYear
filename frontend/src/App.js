import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Dashboard from './components/Dashboard';
import EdgeNodes from './components/EdgeNodes';
import Workloads from './components/Workloads';
import Analytics from './components/Analytics';
import Security from './components/Security';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { Toaster } from './components/ui/sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [websocket, setWebsocket] = useState(null);
  const [realTimeData, setRealTimeData] = useState({});

  useEffect(() => {
    // Initialize WebSocket connection for real-time updates
    const wsUrl = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');
    const ws = new WebSocket(`${wsUrl}/ws`);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      setWebsocket(ws);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setRealTimeData(prevData => ({
          ...prevData,
          [data.type]: data
        }));
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setWebsocket(null);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  const renderActiveComponent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard websocket={websocket} realTimeData={realTimeData} />;
      case 'nodes':
        return <EdgeNodes websocket={websocket} realTimeData={realTimeData} />;
      case 'workloads':
        return <Workloads websocket={websocket} realTimeData={realTimeData} />;
      case 'analytics':
        return <Analytics websocket={websocket} realTimeData={realTimeData} />;
      case 'security':
        return <Security websocket={websocket} realTimeData={realTimeData} />;
      default:
        return <Dashboard websocket={websocket} realTimeData={realTimeData} />;
    }
  };

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/*" element={
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
              <div className="flex">
                <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
                <div className="flex-1 ml-64">
                  <Header activeTab={activeTab} websocket={websocket} />
                  <main className="p-6">
                    {renderActiveComponent()}
                  </main>
                </div>
              </div>
              <Toaster position="top-right" />
            </div>
          } />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;