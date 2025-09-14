import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Layers, 
  Plus, 
  Play, 
  Pause, 
  Square, 
  Clock, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Filter,
  Server,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Workloads = ({ websocket, realTimeData }) => {
  const [workloads, setWorkloads] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Form state for adding new workloads
  const [newWorkload, setNewWorkload] = useState({
    name: '',
    description: '',
    node_id: '',
    workload_type: '',
    cpu_request: 0.5,
    memory_request: 512,
    priority: 'medium'
  });

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchWorkloads, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Handle real-time workload updates
    if (realTimeData.workload_created) {
      const newWorkload = realTimeData.workload_created.data;
      setWorkloads(prev => [...prev, newWorkload]);
    }

    if (realTimeData.workload_updated) {
      const updatedWorkload = realTimeData.workload_updated.data;
      setWorkloads(prev => prev.map(workload => 
        workload.id === updatedWorkload.id ? updatedWorkload : workload
      ));
    }
  }, [realTimeData]);

  const fetchData = async () => {
    try {
      const [workloadsRes, nodesRes] = await Promise.all([
        axios.get(`${API}/workloads`),
        axios.get(`${API}/edge-nodes`)
      ]);
      
      setWorkloads(workloadsRes.data);
      setNodes(nodesRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch workloads data');
      setLoading(false);
    }
  };

  const fetchWorkloads = async () => {
    try {
      const response = await axios.get(`${API}/workloads`);
      setWorkloads(response.data);
    } catch (error) {
      console.error('Error fetching workloads:', error);
    }
  };

  const createWorkload = async () => {
    try {
      await axios.post(`${API}/workloads`, newWorkload);
      toast.success('Workload created successfully');
      setIsAddModalOpen(false);
      setNewWorkload({
        name: '',
        description: '',
        node_id: '',
        workload_type: '',
        cpu_request: 0.5,
        memory_request: 512,
        priority: 'medium'
      });
      fetchWorkloads();
    } catch (error) {
      console.error('Error creating workload:', error);
      toast.error('Failed to create workload');
    }
  };

  const updateWorkloadStatus = async (workloadId, status) => {
    try {
      const executionTime = status === 'completed' ? Math.random() * 120 + 30 : null;
      
      await axios.put(`${API}/workloads/${workloadId}/status?status=${status}${
        executionTime ? `&execution_time=${executionTime}` : ''
      }`);
      
      toast.success(`Workload ${status}`);
      fetchWorkloads();
    } catch (error) {
      console.error('Error updating workload status:', error);
      toast.error('Failed to update workload status');
    }
  };

  const simulateWorkloadExecution = async (workload) => {
    try {
      // Start the workload
      await updateWorkloadStatus(workload.id, 'running');
      
      // Simulate execution time (3-8 seconds for demo)
      setTimeout(async () => {
        const success = Math.random() > 0.1; // 90% success rate
        const finalStatus = success ? 'completed' : 'failed';
        await updateWorkloadStatus(workload.id, finalStatus);
      }, Math.random() * 5000 + 3000);
      
    } catch (error) {
      console.error('Error simulating workload:', error);
      toast.error('Failed to simulate workload execution');
    }
  };

  const createDemoWorkloads = async () => {
    const availableNodes = nodes.filter(node => node.status === 'online');
    if (availableNodes.length === 0) {
      toast.error('No online nodes available for workload deployment');
      return;
    }

    const demoWorkloads = [
      {
        name: 'Traffic Analysis AI',
        description: 'Real-time traffic pattern analysis using computer vision',
        workload_type: 'ai_analytics',
        cpu_request: 2.0,
        memory_request: 1024,
        priority: 'high'
      },
      {
        name: 'Air Quality Monitoring',
        description: 'Continuous air quality data collection and processing',
        workload_type: 'monitoring',
        cpu_request: 0.5,
        memory_request: 256,
        priority: 'medium'
      },
      {
        name: 'Data Aggregation Service',
        description: 'Aggregate sensor data for cloud transmission',
        workload_type: 'data_processing',
        cpu_request: 1.0,
        memory_request: 512,
        priority: 'low'
      }
    ];

    try {
      for (const workload of demoWorkloads) {
        const randomNode = availableNodes[Math.floor(Math.random() * availableNodes.length)];
        await axios.post(`${API}/workloads`, {
          ...workload,
          node_id: randomNode.id
        });
      }
      
      toast.success(`Created ${demoWorkloads.length} demo workloads`);
      fetchWorkloads();
    } catch (error) {
      console.error('Error creating demo workloads:', error);
      toast.error('Failed to create demo workloads');
    }
  };

  const filteredWorkloads = workloads.filter(workload => {
    const matchesSearch = workload.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         workload.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || workload.status === statusFilter;
    const matchesType = typeFilter === 'all' || workload.workload_type === typeFilter;
    const matchesPriority = priorityFilter === 'all' || workload.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesType && matchesPriority;
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'running': return <Play className="w-4 h-4 text-green-600" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-blue-600" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'running': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-50 text-red-700 border-red-200';
      case 'medium': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'low': return 'bg-gray-50 text-gray-700 border-gray-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  const getNodeName = (nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    return node ? node.name : 'Unknown Node';
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
          <h3 className="text-lg font-semibold text-gray-900">Workload Orchestration</h3>
          <p className="text-sm text-gray-500">Deploy and manage containerized applications across edge nodes</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button onClick={createDemoWorkloads} variant="outline" size="sm">
            <Activity className="w-4 h-4 mr-2" />
            Demo Workloads
          </Button>
          
          <Button onClick={fetchWorkloads} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Deploy Workload
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Deploy New Workload</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Workload Name</label>
                  <Input
                    value={newWorkload.name}
                    onChange={(e) => setNewWorkload({...newWorkload, name: e.target.value})}
                    placeholder="e.g., Traffic Analysis AI"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <Textarea
                    value={newWorkload.description}
                    onChange={(e) => setNewWorkload({...newWorkload, description: e.target.value})}
                    placeholder="Describe the workload purpose and functionality"
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Node</label>
                  <Select value={newWorkload.node_id} onValueChange={(value) => setNewWorkload({...newWorkload, node_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select target edge node" />
                    </SelectTrigger>
                    <SelectContent>
                      {nodes.filter(node => node.status === 'online').map(node => (
                        <SelectItem key={node.id} value={node.id}>
                          {node.name} ({node.location})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Workload Type</label>
                    <Select value={newWorkload.workload_type} onValueChange={(value) => setNewWorkload({...newWorkload, workload_type: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ai_analytics">AI Analytics</SelectItem>
                        <SelectItem value="monitoring">Monitoring</SelectItem>
                        <SelectItem value="data_processing">Data Processing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <Select value={newWorkload.priority} onValueChange={(value) => setNewWorkload({...newWorkload, priority: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CPU Request (cores)</label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="4"
                      value={newWorkload.cpu_request}
                      onChange={(e) => setNewWorkload({...newWorkload, cpu_request: parseFloat(e.target.value)})}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Memory (MB)</label>
                    <Input
                      type="number"
                      step="64"
                      min="64"
                      max="4096"
                      value={newWorkload.memory_request}
                      onChange={(e) => setNewWorkload({...newWorkload, memory_request: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={createWorkload} 
                    disabled={!newWorkload.name || !newWorkload.node_id || !newWorkload.workload_type}
                  >
                    Deploy Workload
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
            placeholder="Search workloads by name or description..."
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
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="running">Running</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="ai_analytics">AI Analytics</SelectItem>
            <SelectItem value="monitoring">Monitoring</SelectItem>
            <SelectItem value="data_processing">Data Processing</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {['pending', 'running', 'completed', 'failed'].map(status => (
          <Card key={status}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                {getStatusIcon(status)}
                <span className="text-sm text-gray-600 capitalize">{status}</span>
                <span className={`font-semibold ml-auto ${
                  status === 'running' ? 'text-green-600' :
                  status === 'completed' ? 'text-blue-600' :
                  status === 'failed' ? 'text-red-600' :
                  'text-yellow-600'
                }`}>
                  {workloads.filter(w => w.status === status).length}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">Total</span>
              <span className="font-semibold text-gray-900 ml-auto">{workloads.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workloads Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredWorkloads.map((workload) => (
          <Card key={workload.id} className="hover-lift">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{workload.name}</CardTitle>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{workload.description}</p>
                </div>
                <div className="flex items-center space-x-1">
                  {getStatusIcon(workload.status)}
                  <Badge className={`${getStatusColor(workload.status)} text-xs px-2 py-1`}>
                    {workload.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Node and Type */}
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Server className="w-3 h-3" />
                  <span className="truncate">{getNodeName(workload.node_id)}</span>
                </div>
                <Badge className={`workload-${workload.workload_type} text-xs`}>
                  {workload.workload_type.replace('_', ' ')}
                </Badge>
              </div>

              {/* Resource Requirements */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">CPU:</span>
                  <span className="font-medium ml-1">{workload.cpu_request} cores</span>
                </div>
                <div>
                  <span className="text-gray-500">Memory:</span>
                  <span className="font-medium ml-1">{workload.memory_request}MB</span>
                </div>
              </div>

              {/* Priority and Timing */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Priority:</span>
                  <Badge className={`${getPriorityColor(workload.priority)} text-xs`}>
                    {workload.priority}
                  </Badge>
                </div>

                {workload.execution_time && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Duration:</span>
                    <span className="font-medium">{formatDuration(workload.execution_time)}</span>
                  </div>
                )}

                <div className="text-xs text-gray-400">
                  <div>Created: {formatTimestamp(workload.created_at)}</div>
                  {workload.deployed_at && (
                    <div>Deployed: {formatTimestamp(workload.deployed_at)}</div>
                  )}
                  {workload.completed_at && (
                    <div>Completed: {formatTimestamp(workload.completed_at)}</div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between space-x-2 pt-2 border-t">
                {workload.status === 'pending' && (
                  <>
                    <Button 
                      size="sm" 
                      className="bg-green-600 hover:bg-green-700 text-xs px-3"
                      onClick={() => simulateWorkloadExecution(workload)}
                    >
                      <Play className="w-3 h-3 mr-1" />
                      Start
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="text-red-600 hover:text-red-700 text-xs px-3"
                      onClick={() => updateWorkloadStatus(workload.id, 'failed')}
                    >
                      <Square className="w-3 h-3 mr-1" />
                      Cancel
                    </Button>
                  </>
                )}
                
                {workload.status === 'running' && (
                  <>
                    <Button 
                      size="sm" 
                      className="bg-blue-600 hover:bg-blue-700 text-xs px-3"
                      onClick={() => updateWorkloadStatus(workload.id, 'completed')}
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Complete
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="text-red-600 hover:text-red-700 text-xs px-3"
                      onClick={() => updateWorkloadStatus(workload.id, 'failed')}
                    >
                      <XCircle className="w-3 h-3 mr-1" />
                      Stop
                    </Button>
                  </>
                )}
                
                {(workload.status === 'completed' || workload.status === 'failed') && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="text-blue-600 hover:text-blue-700 text-xs px-3"
                    onClick={() => updateWorkloadStatus(workload.id, 'pending')}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Restart
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredWorkloads.length === 0 && !loading && (
        <div className="text-center py-12">
          <Layers className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No workloads found</h3>
          <p className="text-gray-500 mb-6">
            {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' || priorityFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Deploy your first workload to an edge node'
            }
          </p>
          {!searchTerm && statusFilter === 'all' && typeFilter === 'all' && priorityFilter === 'all' && (
            <div className="space-x-2">
              <Button onClick={() => setIsAddModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Deploy Workload
              </Button>
              <Button onClick={createDemoWorkloads} variant="outline">
                <Activity className="w-4 h-4 mr-2" />
                Try Demo Workloads
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Workloads;