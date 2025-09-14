import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Server, 
  Plus, 
  Edit, 
  Trash2, 
  MapPin, 
  Activity, 
  Cpu, 
  MemoryStick, 
  Wifi,
  RefreshCw,
  Eye,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const EdgeNodes = ({ websocket, realTimeData }) => {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [metricsData, setMetricsData] = useState({});

  // Form state for adding new nodes
  const [newNode, setNewNode] = useState({
    name: '',
    location: '',
    node_type: ''
  });

  useEffect(() => {
    fetchNodes();
    const interval = setInterval(fetchNodes, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Handle real-time metrics updates
    if (realTimeData.metrics_update) {
      const update = realTimeData.metrics_update;
      setMetricsData(prev => ({
        ...prev,
        [update.node_id]: {
          cpu_usage: update.cpu_usage,
          memory_usage: update.memory_usage,
          network_latency: update.network_latency,
          timestamp: update.timestamp
        }
      }));

      // Update the node in the nodes array as well
      setNodes(prev => prev.map(node => 
        node.id === update.node_id 
          ? {
              ...node,
              cpu_usage: update.cpu_usage,
              memory_usage: update.memory_usage,
              network_latency: update.network_latency,
              last_heartbeat: update.timestamp
            }
          : node
      ));
    }

    // Handle node updates from WebSocket
    if (realTimeData.node_updated) {
      const updatedNode = realTimeData.node_updated.data;
      setNodes(prev => prev.map(node => 
        node.id === updatedNode.id ? updatedNode : node
      ));
    }

    if (realTimeData.node_created) {
      const newNode = realTimeData.node_created.data;
      setNodes(prev => [...prev, newNode]);
    }

    if (realTimeData.node_deleted) {
      setNodes(prev => prev.filter(node => node.id !== realTimeData.node_deleted.node_id));
    }
  }, [realTimeData]);

  const fetchNodes = async () => {
    try {
      const response = await axios.get(`${API}/edge-nodes`);
      setNodes(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching nodes:', error);
      toast.error('Failed to fetch edge nodes');
      setLoading(false);
    }
  };

  const createNode = async () => {
    try {
      await axios.post(`${API}/edge-nodes`, newNode);
      toast.success('Edge node created successfully');
      setIsAddModalOpen(false);
      setNewNode({ name: '', location: '', node_type: '' });
      fetchNodes();
    } catch (error) {
      console.error('Error creating node:', error);
      toast.error('Failed to create edge node');
    }
  };

  const deleteNode = async (nodeId) => {
    if (window.confirm('Are you sure you want to delete this edge node?')) {
      try {
        await axios.delete(`${API}/edge-nodes/${nodeId}`);
        toast.success('Edge node deleted successfully');
        fetchNodes();
      } catch (error) {
        console.error('Error deleting node:', error);
        toast.error('Failed to delete edge node');
      }
    }
  };

  const updateNodeStatus = async (nodeId, status) => {
    try {
      await axios.put(`${API}/edge-nodes/${nodeId}`, { status });
      toast.success(`Node status updated to ${status}`);
      fetchNodes();
    } catch (error) {
      console.error('Error updating node status:', error);
      toast.error('Failed to update node status');
    }
  };

  const simulateNodeMetrics = async (nodeId) => {
    try {
      const metrics = {
        cpu_usage: Math.random() * 80 + 10,
        memory_usage: Math.random() * 70 + 20,
        network_latency: Math.random() * 40 + 5
      };
      
      await axios.put(`${API}/edge-nodes/${nodeId}`, metrics);
      toast.success('Node metrics simulated');
    } catch (error) {
      console.error('Error simulating metrics:', error);
      toast.error('Failed to simulate metrics');
    }
  };

  const filteredNodes = nodes.filter(node => {
    const matchesSearch = node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         node.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || node.status === statusFilter;
    const matchesType = typeFilter === 'all' || node.node_type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'bg-green-100 text-green-800 border-green-200';
      case 'offline': return 'bg-red-100 text-red-800 border-red-200';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getUsageColor = (usage) => {
    if (usage > 80) return 'text-red-600';
    if (usage > 60) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getLatencyColor = (latency) => {
    if (latency > 50) return 'text-red-600';
    if (latency > 25) return 'text-yellow-600';
    return 'text-green-600';
  };

  const formatLastHeartbeat = (timestamp) => {
    const now = new Date();
    const heartbeat = new Date(timestamp);
    const diff = Math.floor((now - heartbeat) / 1000);
    
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-4"></div>
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Edge Nodes Management</h3>
          <p className="text-sm text-gray-500">Monitor and manage your distributed edge computing infrastructure</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button onClick={fetchNodes} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Node
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Edge Node</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Node Name</label>
                  <Input
                    value={newNode.name}
                    onChange={(e) => setNewNode({...newNode, name: e.target.value})}
                    placeholder="e.g., Traffic Camera - Main St"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <Input
                    value={newNode.location}
                    onChange={(e) => setNewNode({...newNode, location: e.target.value})}
                    placeholder="e.g., Main Street & 1st Ave"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Node Type</label>
                  <Select value={newNode.node_type} onValueChange={(value) => setNewNode({...newNode, node_type: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select node type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="traffic_camera">Traffic Camera</SelectItem>
                      <SelectItem value="air_quality_sensor">Air Quality Sensor</SelectItem>
                      <SelectItem value="general">General Purpose</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createNode} disabled={!newNode.name || !newNode.location || !newNode.node_type}>
                    Create Node
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex-1 min-w-64">
          <Input
            placeholder="Search nodes by name or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="traffic_camera">Traffic Camera</SelectItem>
            <SelectItem value="air_quality_sensor">Air Quality Sensor</SelectItem>
            <SelectItem value="general">General</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Online</span>
              <span className="font-semibold text-green-600 ml-auto">
                {nodes.filter(n => n.status === 'online').length}
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Offline</span>
              <span className="font-semibold text-red-600 ml-auto">
                {nodes.filter(n => n.status === 'offline').length}
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Maintenance</span>
              <span className="font-semibold text-yellow-600 ml-auto">
                {nodes.filter(n => n.status === 'maintenance').length}
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Server className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">Total</span>
              <span className="font-semibold text-gray-900 ml-auto">{nodes.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Nodes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredNodes.map((node) => {
          const currentMetrics = metricsData[node.id] || {};
          const cpuUsage = currentMetrics.cpu_usage || node.cpu_usage || 0;
          const memoryUsage = currentMetrics.memory_usage || node.memory_usage || 0;
          const networkLatency = currentMetrics.network_latency || node.network_latency || 0;

          return (
            <Card key={node.id} className="hover-lift">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{node.name}</CardTitle>
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                      <MapPin className="w-3 h-3 mr-1" />
                      {node.location}
                    </div>
                  </div>
                  <Badge className={`${getStatusColor(node.status)} text-xs px-2 py-1`}>
                    {node.status}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Node Type and Kubernetes Version */}
                <div className="flex justify-between items-center">
                  <Badge className={`node-${node.node_type} text-xs`}>
                    {node.node_type.replace('_', ' ')}
                  </Badge>
                  <span className="text-xs text-gray-500 font-mono">
                    {node.kubernetes_version}
                  </span>
                </div>

                {/* Metrics */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Cpu className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">CPU</span>
                    </div>
                    <span className={`text-sm font-medium ${getUsageColor(cpuUsage)}`}>
                      {cpuUsage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        cpuUsage > 80 ? 'bg-red-500' : cpuUsage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(cpuUsage, 100)}%` }}
                    ></div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <MemoryStick className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Memory</span>
                    </div>
                    <span className={`text-sm font-medium ${getUsageColor(memoryUsage)}`}>
                      {memoryUsage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        memoryUsage > 80 ? 'bg-red-500' : memoryUsage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(memoryUsage, 100)}%` }}
                    ></div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Wifi className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Latency</span>
                    </div>
                    <span className={`text-sm font-medium ${getLatencyColor(networkLatency)}`}>
                      {networkLatency.toFixed(1)}ms
                    </span>
                  </div>
                </div>

                {/* Last Heartbeat */}
                <div className="flex items-center justify-between text-xs text-gray-500 border-t pt-3">
                  <span>Last heartbeat:</span>
                  <span>{formatLastHeartbeat(node.last_heartbeat)}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between space-x-2 pt-2">
                  <div className="flex space-x-1">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setSelectedNode(node);
                        setIsDetailsModalOpen(true);
                      }}
                    >
                      <Eye className="w-3 h-3" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => simulateNodeMetrics(node.id)}
                    >
                      <Activity className="w-3 h-3" />
                    </Button>
                  </div>
                  
                  <div className="flex space-x-1">
                    {node.status === 'offline' && (
                      <Button 
                        size="sm" 
                        className="bg-green-600 hover:bg-green-700 text-xs px-2 py-1"
                        onClick={() => updateNodeStatus(node.id, 'online')}
                      >
                        Start
                      </Button>
                    )}
                    {node.status === 'online' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="text-xs px-2 py-1"
                        onClick={() => updateNodeStatus(node.id, 'maintenance')}
                      >
                        Maintain
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="text-red-600 hover:text-red-700 text-xs px-2 py-1"
                      onClick={() => deleteNode(node.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Node Details Modal */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Node Details</DialogTitle>
          </DialogHeader>
          {selectedNode && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Name</label>
                  <p className="text-gray-900 font-medium">{selectedNode.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Status</label>
                  <Badge className={`${getStatusColor(selectedNode.status)} inline-flex mt-1`}>
                    {selectedNode.status}
                  </Badge>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Location</label>
                  <p className="text-gray-900">{selectedNode.location}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Type</label>
                  <p className="text-gray-900">{selectedNode.node_type.replace('_', ' ')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Kubernetes Version</label>
                  <p className="text-gray-900 font-mono">{selectedNode.kubernetes_version}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Workloads</label>
                  <p className="text-gray-900">{selectedNode.workload_count}</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">Current Metrics</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Cpu className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium">CPU Usage</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {(metricsData[selectedNode.id]?.cpu_usage || selectedNode.cpu_usage || 0).toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <MemoryStick className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-medium">Memory Usage</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {(metricsData[selectedNode.id]?.memory_usage || selectedNode.memory_usage || 0).toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Wifi className="w-4 h-4 text-purple-500" />
                      <span className="text-sm font-medium">Network Latency</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {(metricsData[selectedNode.id]?.network_latency || selectedNode.network_latency || 0).toFixed(1)}ms
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsDetailsModalOpen(false)}>
                  Close
                </Button>
                <Button onClick={() => simulateNodeMetrics(selectedNode.id)}>
                  <Activity className="w-4 h-4 mr-2" />
                  Simulate Metrics
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Empty State */}
      {filteredNodes.length === 0 && !loading && (
        <div className="text-center py-12">
          <Server className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No edge nodes found</h3>
          <p className="text-gray-500 mb-6">
            {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Get started by adding your first edge node'
            }
          </p>
          {!searchTerm && statusFilter === 'all' && typeFilter === 'all' && (
            <Button onClick={() => setIsAddModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Node
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default EdgeNodes;