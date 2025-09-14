import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Shield, 
  Lock, 
  Key, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye,
  EyeOff,
  RefreshCw,
  Settings,
  Zap,
  FileText,
  Users,
  Server
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

const Security = ({ websocket, realTimeData }) => {
  const [securityEvents, setSecurityEvents] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [securityConfig, setSecurityConfig] = useState({
    mtls_enabled: true,
    rbac_enabled: true,
    container_isolation: true,
    audit_logging: true,
    intrusion_detection: true,
    encryption_at_rest: true
  });

  // New security event form
  const [newEvent, setNewEvent] = useState({
    node_id: '',
    event_type: '',
    severity: 'medium',
    description: ''
  });

  useEffect(() => {
    fetchSecurityData();
    const interval = setInterval(fetchSecurityData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Handle real-time security events
    if (realTimeData.security_event) {
      const newEvent = realTimeData.security_event.data;
      setSecurityEvents(prev => [newEvent, ...prev]);
      
      // Show toast notification for high/critical events
      if (newEvent.severity === 'high' || newEvent.severity === 'critical') {
        toast.error(`Security Alert: ${newEvent.description}`, {
          duration: 10000,
        });
      }
    }
  }, [realTimeData]);

  const fetchSecurityData = async () => {
    try {
      const [eventsRes, nodesRes] = await Promise.all([
        axios.get(`${API}/security-events?limit=50`),
        axios.get(`${API}/edge-nodes`)
      ]);
      
      setSecurityEvents(eventsRes.data);
      setNodes(nodesRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching security data:', error);
      toast.error('Failed to fetch security data');
      setLoading(false);
    }
  };

  const createSecurityEvent = async () => {
    try {
      await axios.post(`${API}/security-events`, newEvent);
      toast.success('Security event created successfully');
      setNewEvent({
        node_id: '',
        event_type: '',
        severity: 'medium',
        description: ''
      });
      fetchSecurityData();
    } catch (error) {
      console.error('Error creating security event:', error);
      toast.error('Failed to create security event');
    }
  };

  const generateDemoSecurityEvents = async () => {
    const demoEvents = [
      {
        node_id: nodes[0]?.id || '',
        event_type: 'mtls_handshake_failure',
        severity: 'high',
        description: 'Failed mTLS handshake detected from unknown certificate'
      },
      {
        node_id: nodes[1]?.id || '',
        event_type: 'rbac_violation',
        severity: 'medium',
        description: 'Unauthorized access attempt to restricted Kubernetes resources'
      },
      {
        node_id: nodes[2]?.id || '',
        event_type: 'container_isolation_breach',
        severity: 'critical',
        description: 'Container attempted to access restricted host resources'
      },
      {
        node_id: nodes[0]?.id || '',
        event_type: 'suspicious_network_activity',
        severity: 'medium',
        description: 'Unusual network traffic patterns detected'
      }
    ];

    try {
      for (const event of demoEvents) {
        if (event.node_id) {
          await axios.post(`${API}/security-events`, event);
        }
      }
      toast.success(`Generated ${demoEvents.length} demo security events`);
      fetchSecurityData();
    } catch (error) {
      console.error('Error generating demo events:', error);
      toast.error('Failed to generate demo security events');
    }
  };

  const runSecurityScan = async () => {
    toast.success('Security scan initiated...');
    
    // Simulate security scan
    setTimeout(async () => {
      const scanResults = [
        {
          node_id: nodes[Math.floor(Math.random() * nodes.length)]?.id || '',
          event_type: 'security_scan_completed',
          severity: 'low',
          description: 'Automated security scan completed - no critical vulnerabilities found'
        }
      ];
      
      try {
        for (const result of scanResults) {
          if (result.node_id) {
            await axios.post(`${API}/security-events`, result);
          }
        }
        toast.success('Security scan completed successfully');
        fetchSecurityData();
      } catch (error) {
        console.error('Error recording scan results:', error);
      }
    }, 3000);
  };

  const filteredEvents = securityEvents.filter(event => {
    const matchesSeverity = severityFilter === 'all' || event.severity === severityFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'resolved' && event.resolved) ||
      (statusFilter === 'unresolved' && !event.resolved);
    
    return matchesSeverity && matchesStatus;
  });

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'high': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'medium': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'low': return <CheckCircle className="w-4 h-4 text-blue-500" />;
      default: return <AlertTriangle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEventTypeColor = (eventType) => {
    switch (eventType) {
      case 'mtls_handshake_failure': return 'bg-red-50 text-red-700';
      case 'rbac_violation': return 'bg-orange-50 text-orange-700';
      case 'container_isolation_breach': return 'bg-red-50 text-red-700';
      case 'suspicious_network_activity': return 'bg-yellow-50 text-yellow-700';
      case 'security_scan_completed': return 'bg-green-50 text-green-700';
      default: return 'bg-gray-50 text-gray-700';
    }
  };

  const formatEventType = (eventType) => {
    return eventType.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getNodeName = (nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    return node ? node.name : 'Unknown Node';
  };

  const getSecurityScore = () => {
    const totalEvents = securityEvents.length;
    const criticalEvents = securityEvents.filter(e => e.severity === 'critical' && !e.resolved).length;
    const highEvents = securityEvents.filter(e => e.severity === 'high' && !e.resolved).length;
    
    let score = 100;
    score -= criticalEvents * 20;
    score -= highEvents * 10;
    score -= (totalEvents - criticalEvents - highEvents) * 2;
    
    return Math.max(score, 0);
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

  const securityScore = getSecurityScore();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Security Center</h3>
          <p className="text-sm text-gray-500">Monitor security events, configure policies, and maintain edge infrastructure security</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button onClick={generateDemoSecurityEvents} variant="outline" size="sm">
            <Zap className="w-4 h-4 mr-2" />
            Generate Demo Events
          </Button>
          
          <Button onClick={runSecurityScan} variant="outline" size="sm">
            <Eye className="w-4 h-4 mr-2" />
            Security Scan
          </Button>
          
          <Button onClick={fetchSecurityData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          
          <Dialog open={isConfigModalOpen} onOpenChange={setIsConfigModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Settings className="w-4 h-4 mr-2" />
                Security Config
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Security Configuration</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {Object.entries(securityConfig).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">
                        {key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                      </p>
                      <p className="text-sm text-gray-500">
                        {key === 'mtls_enabled' && 'Mutual TLS authentication between nodes'}
                        {key === 'rbac_enabled' && 'Role-based access control for Kubernetes resources'}
                        {key === 'container_isolation' && 'AppArmor/SELinux container isolation'}
                        {key === 'audit_logging' && 'Comprehensive security event logging'}
                        {key === 'intrusion_detection' && 'Real-time intrusion detection system'}
                        {key === 'encryption_at_rest' && 'Data encryption at rest'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {value ? 'Enabled' : 'Disabled'}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSecurityConfig(prev => ({...prev, [key]: !value}))}
                      >
                        {value ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-end pt-4">
                  <Button onClick={() => {
                    toast.success('Security configuration updated');
                    setIsConfigModalOpen(false);
                  }}>
                    Save Configuration
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Security Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Security Score</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{securityScore}/100</p>
                <p className={`text-xs mt-1 flex items-center ${
                  securityScore >= 90 ? 'text-green-600' : 
                  securityScore >= 70 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  <Shield className="w-3 h-3 mr-1" />
                  {securityScore >= 90 ? 'Excellent' : securityScore >= 70 ? 'Good' : 'Needs Attention'}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${
                securityScore >= 90 ? 'bg-green-50' : 
                securityScore >= 70 ? 'bg-yellow-50' : 'bg-red-50'
              }`}>
                <Shield className={`w-6 h-6 ${
                  securityScore >= 90 ? 'text-green-600' : 
                  securityScore >= 70 ? 'text-yellow-600' : 'text-red-600'
                }`} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Threats</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {securityEvents.filter(e => ['critical', 'high'].includes(e.severity) && !e.resolved).length}
                </p>
                <p className="text-xs text-red-600 mt-1">
                  Require immediate attention
                </p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">mTLS Status</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {nodes.filter(n => n.security_status === 'secure').length}/{nodes.length}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Nodes with valid certificates
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <Lock className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Events (24h)</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{securityEvents.length}</p>
                <p className="text-xs text-blue-600 mt-1">
                  Security events logged
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security Configuration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>Security Policies Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(securityConfig).map(([key, enabled]) => (
              <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${enabled ? 'bg-green-100' : 'bg-red-100'}`}>
                    {key === 'mtls_enabled' && <Lock className={`w-4 h-4 ${enabled ? 'text-green-600' : 'text-red-600'}`} />}
                    {key === 'rbac_enabled' && <Users className={`w-4 h-4 ${enabled ? 'text-green-600' : 'text-red-600'}`} />}
                    {key === 'container_isolation' && <Shield className={`w-4 h-4 ${enabled ? 'text-green-600' : 'text-red-600'}`} />}
                    {key === 'audit_logging' && <FileText className={`w-4 h-4 ${enabled ? 'text-green-600' : 'text-red-600'}`} />}
                    {key === 'intrusion_detection' && <Eye className={`w-4 h-4 ${enabled ? 'text-green-600' : 'text-red-600'}`} />}
                    {key === 'encryption_at_rest' && <Key className={`w-4 h-4 ${enabled ? 'text-green-600' : 'text-red-600'}`} />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </p>
                  </div>
                </div>
                <Badge className={enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  {enabled ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">Filters:</span>
        </div>
        
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="unresolved">Unresolved</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            {filteredEvents.length} of {securityEvents.length} events
          </span>
        </div>
      </div>

      {/* Security Events */}
      <Card>
        <CardHeader>
          <CardTitle>Security Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredEvents.map((event) => (
              <div 
                key={event.id} 
                className="flex items-start justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => {
                  setSelectedEvent(event);
                  setIsEventModalOpen(true);
                }}
              >
                <div className="flex items-start space-x-3 flex-1">
                  <div className="mt-1">
                    {getSeverityIcon(event.severity)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge className={`${getSeverityColor(event.severity)} text-xs`}>
                        {event.severity.toUpperCase()}
                      </Badge>
                      <Badge className={`${getEventTypeColor(event.event_type)} text-xs`}>
                        {formatEventType(event.event_type)}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {getNodeName(event.node_id)}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 mb-1">{event.description}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(event.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {event.resolved ? (
                    <Badge className="bg-green-100 text-green-800 text-xs">
                      Resolved
                    </Badge>
                  ) : (
                    <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                      Active
                    </Badge>
                  )}
                  <Button size="sm" variant="outline">
                    <Eye className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Event Details Modal */}
      <Dialog open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Security Event Details</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Event Type</label>
                  <p className="text-gray-900 font-medium">{formatEventType(selectedEvent.event_type)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Severity</label>
                  <Badge className={`${getSeverityColor(selectedEvent.severity)} inline-flex mt-1`}>
                    {selectedEvent.severity.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Affected Node</label>
                  <p className="text-gray-900">{getNodeName(selectedEvent.node_id)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Status</label>
                  <Badge className={selectedEvent.resolved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                    {selectedEvent.resolved ? 'Resolved' : 'Active'}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-500">Timestamp</label>
                  <p className="text-gray-900">{new Date(selectedEvent.timestamp).toLocaleString()}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Description</label>
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedEvent.description}</p>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">Recommended Actions</h4>
                <div className="space-y-2">
                  {selectedEvent.event_type === 'mtls_handshake_failure' && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800">
                        • Verify certificate validity and renewal dates<br/>
                        • Check certificate authority chain<br/>
                        • Review network connectivity between nodes
                      </p>
                    </div>
                  )}
                  {selectedEvent.event_type === 'rbac_violation' && (
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        • Review user permissions and role assignments<br/>
                        • Audit recent access patterns<br/>
                        • Update RBAC policies if necessary
                      </p>
                    </div>
                  )}
                  {selectedEvent.event_type === 'container_isolation_breach' && (
                    <div className="p-3 bg-red-50 rounded-lg">
                      <p className="text-sm text-red-800">
                        • Immediately isolate affected container<br/>
                        • Review AppArmor/SELinux policies<br/>
                        • Perform security scan of container image
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsEventModalOpen(false)}>
                  Close
                </Button>
                {!selectedEvent.resolved && (
                  <Button onClick={() => {
                    toast.success('Security event marked as resolved');
                    setIsEventModalOpen(false);
                  }}>
                    Mark as Resolved
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Empty State */}
      {filteredEvents.length === 0 && !loading && (
        <div className="text-center py-12">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No security events found</h3>
          <p className="text-gray-500 mb-6">
            {severityFilter !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Your edge infrastructure is secure. No security events detected.'
            }
          </p>
          {severityFilter === 'all' && statusFilter === 'all' && (
            <Button onClick={generateDemoSecurityEvents} variant="outline">
              <Zap className="w-4 h-4 mr-2" />
              Generate Demo Events
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default Security;