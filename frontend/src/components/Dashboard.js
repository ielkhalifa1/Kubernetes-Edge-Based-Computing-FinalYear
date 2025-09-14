import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Server, 
  Layers, 
  Activity, 
  Shield, 
  Clock, 
  Cpu, 
  MemoryStick, 
  Wifi, 
  AlertTriangle,
  CheckCircle,
  Play,
  TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = ({ websocket, realTimeData }) => {
  const [analytics, setAnalytics] = useState(null);
  const [recentNodes, setRecentNodes] = useState([]);
  const [recentWorkloads, setRecentWorkloads] = useState([]);
  const [securityEvents, setSecurityEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metricsData, setMetricsData] = useState({});

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Handle real-time updates
    if (realTimeData.metrics_update) {
      const update = realTimeData.metrics_update;
      setMetricsData(prev => ({
        ...prev,
        [update.node_id]: {
          cpu_usage: update.cpu_usage,
          memory_usage: update.memory_usage,
          network_latency: update.network_latency
        }
      }));
    }
  }, [realTimeData]);

  const fetchDashboardData = async () => {
    try {
      const [analyticsRes, nodesRes, workloadsRes, securityRes] = await Promise.all([
        axios.get(`${API}/analytics`),
        axios.get(`${API}/edge-nodes`),
        axios.get(`${API}/workloads`),
        axios.get(`${API}/security-events?limit=5`)
      ]);

      setAnalytics(analyticsRes.data);
      setRecentNodes(nodesRes.data.slice(0, 5));
      setRecentWorkloads(workloadsRes.data.slice(0, 5));
      setSecurityEvents(securityRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to fetch dashboard data');
      setLoading(false);
    }
  };

  const setupSmartCityDemo = async () => {
    try {
      const response = await axios.post(`${API}/demo/setup-smart-city`);
      toast.success(`${response.data.message}`);
      fetchDashboardData(); // Refresh data
    } catch (error) {
      console.error('Error setting up demo:', error);
      toast.error('Failed to setup smart city demo');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'offline': return 'bg-red-500';
      case 'maintenance': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getWorkloadStatusColor = (status) => {
    switch (status) {
      case 'running': return 'text-green-600 bg-green-50';
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'completed': return 'text-blue-600 bg-blue-50';
      case 'failed': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Smart City Demo</h3>
            <p className="text-sm text-gray-600 mt-1">
              Quick setup for testing edge computing with traffic cameras and IoT sensors
            </p>
          </div>
          <Button onClick={setupSmartCityDemo} className="bg-blue-600 hover:bg-blue-700">
            <Play className="w-4 h-4 mr-2" />
            Setup Demo Nodes
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Edge Nodes</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{analytics?.total_nodes || 0}</p>
                <p className="text-xs text-green-600 mt-1">
                  {analytics?.active_nodes || 0} active
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <Server className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Running Workloads</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{analytics?.running_workloads || 0}</p>
                <p className="text-xs text-blue-600 mt-1">
                  {analytics?.total_workloads || 0} total
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <Layers className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {analytics?.success_rate?.toFixed(1) || 0}%
                </p>
                <p className="text-xs text-green-600 mt-1 flex items-center">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Optimal
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <Activity className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Security Events</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{analytics?.security_incidents || 0}</p>
                <p className="text-xs text-gray-500 mt-1">Unresolved</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <Shield className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Cpu className="w-5 h-5" />
              <span>Average CPU Usage</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {analytics?.average_cpu_usage?.toFixed(1) || 0}%
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${analytics?.average_cpu_usage || 0}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MemoryStick className="w-5 h-5" />
              <span>Average Memory</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {analytics?.average_memory_usage?.toFixed(1) || 0}%
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${analytics?.average_memory_usage || 0}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Wifi className="w-5 h-5" />
              <span>Network Latency</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {analytics?.average_latency?.toFixed(1) || 0}ms
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {analytics?.average_latency < 20 ? 'Excellent' : 
               analytics?.average_latency < 50 ? 'Good' : 'Needs Attention'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Edge Nodes */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Edge Nodes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentNodes.map((node) => (
                <div key={node.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(node.status)}`}></div>
                    <div>
                      <p className="font-medium text-gray-900">{node.name}</p>
                      <p className="text-sm text-gray-500">{node.location}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={`node-${node.node_type} text-xs`}>
                      {node.node_type.replace('_', ' ')}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">
                      {metricsData[node.id]?.cpu_usage?.toFixed(1) || node.cpu_usage?.toFixed(1) || 0}% CPU
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Workloads */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Workloads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentWorkloads.map((workload) => (
                <div key={workload.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{workload.name}</p>
                    <p className="text-sm text-gray-500">{workload.description}</p>
                  </div>
                  <div className="text-right">
                    <Badge className={`${getWorkloadStatusColor(workload.status)} text-xs`}>
                      {workload.status}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">
                      {workload.priority} priority
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security Events */}
      {securityEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5" />
              <span>Recent Security Events</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {securityEvents.map((event) => (
                <div key={event.id} className="flex items-start justify-between p-3 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge className={`${getSeverityColor(event.severity)} text-xs`}>
                        {event.severity.toUpperCase()}
                      </Badge>
                      <span className="text-sm font-medium text-gray-900">{event.event_type}</span>
                    </div>
                    <p className="text-sm text-gray-600">{event.description}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(event.timestamp).toLocaleString()}
                    </p>
                  </div>
                  {event.resolved ? (
                    <CheckCircle className="w-5 h-5 text-green-500 mt-1" />
                  ) : (
                    <Clock className="w-5 h-5 text-yellow-500 mt-1" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;