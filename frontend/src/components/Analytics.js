import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Clock, 
  Server, 
  Layers, 
  Cpu, 
  MemoryStick, 
  Wifi,
  RefreshCw,
  Download,
  Filter,
  Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Analytics = ({ websocket, realTimeData }) => {
  const [analytics, setAnalytics] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [workloads, setWorkloads] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('24h');
  const [selectedMetric, setSelectedMetric] = useState('cpu');
  const [metricsHistory, setMetricsHistory] = useState({});

  useEffect(() => {
    fetchAnalyticsData();
    const interval = setInterval(fetchAnalyticsData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Handle real-time metrics updates for analytics
    if (realTimeData.metrics_update) {
      const update = realTimeData.metrics_update;
      const timestamp = new Date().toISOString();
      
      setMetricsHistory(prev => ({
        ...prev,
        [update.node_id]: [
          ...(prev[update.node_id] || []).slice(-19), // Keep last 20 points
          {
            timestamp,
            cpu_usage: update.cpu_usage,
            memory_usage: update.memory_usage,
            network_latency: update.network_latency
          }
        ]
      }));
    }
  }, [realTimeData]);

  const fetchAnalyticsData = async () => {
    try {
      const [analyticsRes, nodesRes, workloadsRes] = await Promise.all([
        axios.get(`${API}/analytics`),
        axios.get(`${API}/edge-nodes`),
        axios.get(`${API}/workloads`)
      ]);

      setAnalytics(analyticsRes.data);
      setNodes(nodesRes.data);
      setWorkloads(workloadsRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      toast.error('Failed to fetch analytics data');
      setLoading(false);
    }
  };

  const generatePerformanceReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      summary: analytics,
      nodes: nodes.length,
      activeNodes: nodes.filter(n => n.status === 'online').length,
      workloads: workloads.length,
      runningWorkloads: workloads.filter(w => w.status === 'running').length,
      completedWorkloads: workloads.filter(w => w.status === 'completed').length,
      failedWorkloads: workloads.filter(w => w.status === 'failed').length,
      recommendations: generateRecommendations()
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `edge-computing-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Performance report downloaded');
  };

  const generateRecommendations = () => {
    const recommendations = [];
    
    if (analytics) {
      if (analytics.average_cpu_usage > 80) {
        recommendations.push({
          type: 'performance',
          level: 'high',
          message: 'High CPU usage detected across edge nodes. Consider load balancing or scaling.',
          action: 'Scale edge infrastructure or optimize workload distribution'
        });
      }
      
      if (analytics.average_memory_usage > 85) {
        recommendations.push({
          type: 'performance',
          level: 'high',
          message: 'Memory usage is critically high. Immediate action required.',
          action: 'Add more edge nodes or reduce memory-intensive workloads'
        });
      }
      
      if (analytics.average_latency > 50) {
        recommendations.push({
          type: 'network',
          level: 'medium',
          message: 'Network latency is above optimal thresholds.',
          action: 'Check network connectivity and consider edge node placement'
        });
      }
      
      if (analytics.success_rate < 95) {
        recommendations.push({
          type: 'reliability',
          level: 'medium',
          message: 'Workload success rate is below target (95%).',
          action: 'Review failed workloads and improve error handling'
        });
      }
    }

    return recommendations;
  };

  const getNodeTypeDistribution = () => {
    const distribution = nodes.reduce((acc, node) => {
      acc[node.node_type] = (acc[node.node_type] || 0) + 1;
      return acc;
    }, {});
    
    return Object.entries(distribution).map(([type, count]) => ({
      type: type.replace('_', ' '),
      count,
      percentage: ((count / nodes.length) * 100).toFixed(1)
    }));
  };

  const getWorkloadTypeDistribution = () => {
    const distribution = workloads.reduce((acc, workload) => {
      acc[workload.workload_type] = (acc[workload.workload_type] || 0) + 1;
      return acc;
    }, {});
    
    return Object.entries(distribution).map(([type, count]) => ({
      type: type.replace('_', ' '),
      count,
      percentage: ((count / workloads.length) * 100).toFixed(1)
    }));
  };

  const getTopPerformingNodes = () => {
    return nodes
      .filter(node => node.status === 'online')
      .sort((a, b) => {
        const scoreA = (100 - a.cpu_usage) + (100 - a.memory_usage) - a.network_latency;
        const scoreB = (100 - b.cpu_usage) + (100 - b.memory_usage) - b.network_latency;
        return scoreB - scoreA;
      })
      .slice(0, 5);
  };

  const getWorstPerformingNodes = () => {
    return nodes
      .filter(node => node.status === 'online')
      .sort((a, b) => {
        const scoreA = a.cpu_usage + a.memory_usage + a.network_latency;
        const scoreB = b.cpu_usage + b.memory_usage + b.network_latency;
        return scoreB - scoreA;
      })
      .slice(0, 3);
  };

  const getMetricTrend = (current, historical) => {
    if (!historical || historical.length < 2) return 'stable';
    const recent = historical.slice(-5).reduce((sum, item) => sum + item, 0) / 5;
    const older = historical.slice(-10, -5).reduce((sum, item) => sum + item, 0) / 5;
    
    if (recent > older + 5) return 'up';
    if (recent < older - 5) return 'down';
    return 'stable';
  };

  const renderSimpleChart = (data, metric) => {
    if (!data || data.length === 0) return null;
    
    const maxValue = Math.max(...data.map(d => d[metric] || 0));
    const minValue = Math.min(...data.map(d => d[metric] || 0));
    const range = maxValue - minValue || 1;
    
    return (
      <div className="flex items-end space-x-1 h-16">
        {data.slice(-20).map((point, index) => {
          const height = ((point[metric] - minValue) / range) * 60 + 4;
          return (
            <div
              key={index}
              className="bg-blue-500 rounded-t"
              style={{ 
                height: `${height}px`,
                width: '3px',
                opacity: 0.7 + (index / data.length) * 0.3
              }}
            />
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
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

  const recommendations = generateRecommendations();
  const nodeTypeDistribution = getNodeTypeDistribution();
  const workloadTypeDistribution = getWorkloadTypeDistribution();
  const topNodes = getTopPerformingNodes();
  const worstNodes = getWorstPerformingNodes();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Performance Analytics</h3>
          <p className="text-sm text-gray-500">Real-time insights and performance metrics for your edge computing infrastructure</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={fetchAnalyticsData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          
          <Button onClick={generatePerformanceReport} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">System Uptime</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {analytics?.active_nodes && analytics?.total_nodes 
                    ? ((analytics.active_nodes / analytics.total_nodes) * 100).toFixed(1) 
                    : 0}%
                </p>
                <p className="text-xs text-green-600 mt-1 flex items-center">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Optimal
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <Activity className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Response Time</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {analytics?.average_latency?.toFixed(1) || 0}ms
                </p>
                <p className={`text-xs mt-1 flex items-center ${
                  analytics?.average_latency < 25 ? 'text-green-600' : 
                  analytics?.average_latency < 50 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {analytics?.average_latency < 25 ? <TrendingDown className="w-3 h-3 mr-1" /> : <TrendingUp className="w-3 h-3 mr-1" />}
                  {analytics?.average_latency < 25 ? 'Excellent' : 
                   analytics?.average_latency < 50 ? 'Good' : 'Needs Attention'}
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Resource Efficiency</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {analytics ? (200 - analytics.average_cpu_usage - analytics.average_memory_usage).toFixed(0) : 0}%
                </p>
                <p className="text-xs text-blue-600 mt-1 flex items-center">
                  <BarChart3 className="w-3 h-3 mr-1" />
                  Optimized
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <Cpu className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Deployment Success</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {analytics?.success_rate?.toFixed(1) || 0}%
                </p>
                <p className={`text-xs mt-1 flex items-center ${
                  analytics?.success_rate > 95 ? 'text-green-600' : 
                  analytics?.success_rate > 90 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {analytics?.success_rate > 95 ? 'Excellent' : 
                   analytics?.success_rate > 90 ? 'Good' : 'Needs Attention'}
                </p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <Layers className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resource Utilization Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Cpu className="w-5 h-5" />
              <span>CPU Utilization</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {analytics?.average_cpu_usage?.toFixed(1) || 0}%
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
              <div 
                className={`h-3 rounded-full transition-all duration-500 ${
                  analytics?.average_cpu_usage > 80 ? 'bg-red-500' : 
                  analytics?.average_cpu_usage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(analytics?.average_cpu_usage || 0, 100)}%` }}
              ></div>
            </div>
            <div className="text-sm text-gray-500">
              Across {analytics?.active_nodes || 0} active nodes
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MemoryStick className="w-5 h-5" />
              <span>Memory Usage</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {analytics?.average_memory_usage?.toFixed(1) || 0}%
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
              <div 
                className={`h-3 rounded-full transition-all duration-500 ${
                  analytics?.average_memory_usage > 80 ? 'bg-red-500' : 
                  analytics?.average_memory_usage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(analytics?.average_memory_usage || 0, 100)}%` }}
              ></div>
            </div>
            <div className="text-sm text-gray-500">
              Peak usage monitoring
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Wifi className="w-5 h-5" />
              <span>Network Performance</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {analytics?.average_latency?.toFixed(1) || 0}ms
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
              <div 
                className={`h-3 rounded-full transition-all duration-500 ${
                  analytics?.average_latency > 50 ? 'bg-red-500' : 
                  analytics?.average_latency > 25 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min((analytics?.average_latency || 0) * 2, 100)}%` }}
              ></div>
            </div>
            <div className="text-sm text-gray-500">
              Average response latency
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribution Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Node Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {nodeTypeDistribution.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      index === 0 ? 'bg-blue-500' : 
                      index === 1 ? 'bg-green-500' : 'bg-purple-500'
                    }`}></div>
                    <span className="text-sm font-medium text-gray-900 capitalize">{item.type}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">{item.count}</span>
                    <Badge variant="outline" className="text-xs">
                      {item.percentage}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workload Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {workloadTypeDistribution.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      index === 0 ? 'bg-orange-500' : 
                      index === 1 ? 'bg-teal-500' : 'bg-pink-500'
                    }`}></div>
                    <span className="text-sm font-medium text-gray-900 capitalize">{item.type}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">{item.count}</span>
                    <Badge variant="outline" className="text-xs">
                      {item.percentage}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Node Performance Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-green-700">Top Performing Nodes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topNodes.map((node, index) => (
                <div key={node.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-6 h-6 bg-green-600 text-white text-xs font-bold rounded-full">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{node.name}</p>
                      <p className="text-sm text-gray-500">{node.location}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-green-600">
                      {(200 - node.cpu_usage - node.memory_usage - node.network_latency).toFixed(0)} pts
                    </p>
                    <p className="text-xs text-gray-500">Performance Score</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-orange-700">Needs Attention</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {worstNodes.map((node, index) => (
                <div key={node.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-6 h-6 bg-orange-600 text-white text-xs font-bold rounded-full">
                      !
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{node.name}</p>
                      <p className="text-sm text-gray-500">{node.location}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-orange-600">
                      {(node.cpu_usage + node.memory_usage + node.network_latency).toFixed(0)} load
                    </p>
                    <p className="text-xs text-gray-500">High Resource Usage</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5" />
              <span>AI-Powered Recommendations</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recommendations.map((rec, index) => (
                <div key={index} className={`p-4 rounded-lg border-l-4 ${
                  rec.level === 'high' ? 'bg-red-50 border-red-400' :
                  rec.level === 'medium' ? 'bg-yellow-50 border-yellow-400' :
                  'bg-blue-50 border-blue-400'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge className={`text-xs ${
                          rec.level === 'high' ? 'bg-red-100 text-red-800' :
                          rec.level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {rec.type.toUpperCase()}
                        </Badge>
                        <Badge className={`text-xs ${
                          rec.level === 'high' ? 'bg-red-500 text-white' :
                          rec.level === 'medium' ? 'bg-yellow-500 text-white' :
                          'bg-blue-500 text-white'
                        }`}>
                          {rec.level.toUpperCase()} PRIORITY
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-800 font-medium mb-1">{rec.message}</p>
                      <p className="text-xs text-gray-600">{rec.action}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Real-time Metrics Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Real-time Metrics Trends</span>
            <Select value={selectedMetric} onValueChange={setSelectedMetric}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cpu_usage">CPU Usage</SelectItem>
                <SelectItem value="memory_usage">Memory Usage</SelectItem>
                <SelectItem value="network_latency">Network Latency</SelectItem>
              </SelectContent>
            </Select>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(metricsHistory).slice(0, 6).map(([nodeId, history]) => {
              const node = nodes.find(n => n.id === nodeId);
              if (!node || history.length === 0) return null;
              
              return (
                <div key={nodeId} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{node.name}</p>
                      <p className="text-xs text-gray-500">{node.location}</p>
                    </div>
                    <Badge className={`text-xs ${
                      selectedMetric === 'cpu_usage' ? 'bg-blue-100 text-blue-800' :
                      selectedMetric === 'memory_usage' ? 'bg-green-100 text-green-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {history[history.length - 1]?.[selectedMetric]?.toFixed(1) || 0}
                      {selectedMetric === 'network_latency' ? 'ms' : '%'}
                    </Badge>
                  </div>
                  <div className="h-16 flex items-end justify-center">
                    {renderSimpleChart(history, selectedMetric)}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;