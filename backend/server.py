from fastapi import FastAPI, APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.websockets import WebSocketState
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import json
import asyncio
import random


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="Kubernetes Edge Computing Framework", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        if websocket.client_state == WebSocketState.CONNECTED:
            await websocket.send_text(message)

    async def broadcast(self, message: str):
        disconnected = []
        for connection in self.active_connections:
            try:
                if connection.client_state == WebSocketState.CONNECTED:
                    await connection.send_text(message)
                else:
                    disconnected.append(connection)
            except:
                disconnected.append(connection)
        
        # Remove disconnected connections
        for conn in disconnected:
            self.disconnect(conn)

manager = ConnectionManager()

# Edge Node Models
class EdgeNode(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    location: str
    node_type: str  # traffic_camera, air_quality_sensor, general
    status: str = "offline"  # online, offline, maintenance
    cpu_usage: float = 0.0
    memory_usage: float = 0.0
    network_latency: float = 0.0
    kubernetes_version: str = "k3s-1.28"
    last_heartbeat: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    security_status: str = "secure"  # secure, warning, vulnerable
    workload_count: int = 0

class EdgeNodeCreate(BaseModel):
    name: str
    location: str
    node_type: str

class EdgeNodeUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = None
    cpu_usage: Optional[float] = None
    memory_usage: Optional[float] = None
    network_latency: Optional[float] = None

# Workload Models
class Workload(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    node_id: str
    workload_type: str  # ai_analytics, monitoring, data_processing
    status: str = "pending"  # pending, running, completed, failed
    cpu_request: float
    memory_request: float
    priority: str = "medium"  # low, medium, high
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deployed_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    execution_time: Optional[float] = None

class WorkloadCreate(BaseModel):
    name: str
    description: str
    node_id: str
    workload_type: str
    cpu_request: float
    memory_request: float
    priority: Optional[str] = "medium"

# Performance Metrics Models
class PerformanceMetric(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    node_id: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    cpu_usage: float
    memory_usage: float
    network_latency: float
    deployment_latency: float
    success_rate: float

class SecurityEvent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    node_id: str
    event_type: str  # mtls_handshake, rbac_violation, container_isolation
    severity: str  # low, medium, high, critical
    description: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    resolved: bool = False

# Analytics Models
class SystemAnalytics(BaseModel):
    total_nodes: int
    active_nodes: int
    total_workloads: int
    running_workloads: int
    average_cpu_usage: float
    average_memory_usage: float
    average_latency: float
    success_rate: float
    security_incidents: int

# Helper functions
def prepare_for_mongo(data):
    if isinstance(data, dict):
        for key, value in data.items():
            if isinstance(value, datetime):
                data[key] = value.isoformat()
    return data

def parse_from_mongo(item):
    if isinstance(item, dict):
        for key, value in item.items():
            if key.endswith('_at') or key == 'timestamp' or key == 'last_heartbeat':
                if isinstance(value, str):
                    try:
                        item[key] = datetime.fromisoformat(value.replace('Z', '+00:00'))
                    except:
                        pass
    return item

# Edge Node Routes
@api_router.post("/edge-nodes", response_model=EdgeNode)
async def create_edge_node(node: EdgeNodeCreate):
    node_dict = node.dict()
    edge_node = EdgeNode(**node_dict)
    node_data = prepare_for_mongo(edge_node.dict())
    await db.edge_nodes.insert_one(node_data)
    
    # Broadcast update
    await manager.broadcast(json.dumps({"type": "node_created", "data": prepare_for_mongo(edge_node.dict()), "timestamp": datetime.now(timezone.utc).isoformat()}))
    
    return edge_node

@api_router.get("/edge-nodes", response_model=List[EdgeNode])
async def get_edge_nodes():
    nodes = await db.edge_nodes.find().to_list(1000)
    return [EdgeNode(**parse_from_mongo(node)) for node in nodes]

@api_router.get("/edge-nodes/{node_id}", response_model=EdgeNode)
async def get_edge_node(node_id: str):
    node = await db.edge_nodes.find_one({"id": node_id})
    if not node:
        raise HTTPException(status_code=404, detail="Edge node not found")
    return EdgeNode(**parse_from_mongo(node))

@api_router.put("/edge-nodes/{node_id}", response_model=EdgeNode)
async def update_edge_node(node_id: str, update: EdgeNodeUpdate):
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    update_data['last_heartbeat'] = datetime.now(timezone.utc)
    
    result = await db.edge_nodes.update_one(
        {"id": node_id},
        {"$set": prepare_for_mongo(update_data)}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Edge node not found")
    
    node = await db.edge_nodes.find_one({"id": node_id})
    updated_node = EdgeNode(**parse_from_mongo(node))
    
    # Broadcast update
    await manager.broadcast(json.dumps({"type": "node_updated", "data": prepare_for_mongo(updated_node.dict()), "timestamp": datetime.now(timezone.utc).isoformat()}))
    
    return updated_node

@api_router.delete("/edge-nodes/{node_id}")
async def delete_edge_node(node_id: str):
    result = await db.edge_nodes.delete_one({"id": node_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Edge node not found")
    
    # Broadcast update
    await manager.broadcast(json.dumps({"type": "node_deleted", "node_id": node_id, "timestamp": datetime.now(timezone.utc).isoformat()}))
    
    return {"message": "Edge node deleted successfully"}

# Workload Routes
@api_router.post("/workloads", response_model=Workload)
async def create_workload(workload: WorkloadCreate):
    # Check if node exists
    node = await db.edge_nodes.find_one({"id": workload.node_id})
    if not node:
        raise HTTPException(status_code=404, detail="Edge node not found")
    
    workload_dict = workload.dict()
    new_workload = Workload(**workload_dict)
    workload_data = prepare_for_mongo(new_workload.dict())
    await db.workloads.insert_one(workload_data)
    
    # Update node workload count
    await db.edge_nodes.update_one(
        {"id": workload.node_id},
        {"$inc": {"workload_count": 1}}
    )
    
    # Broadcast update
    await manager.broadcast(json.dumps({"type": "workload_created", "data": prepare_for_mongo(new_workload.dict()), "timestamp": datetime.now(timezone.utc).isoformat()}))
    
    return new_workload

@api_router.get("/workloads", response_model=List[Workload])
async def get_workloads():
    workloads = await db.workloads.find().to_list(1000)
    return [Workload(**parse_from_mongo(workload)) for workload in workloads]

@api_router.get("/workloads/node/{node_id}", response_model=List[Workload])
async def get_node_workloads(node_id: str):
    workloads = await db.workloads.find({"node_id": node_id}).to_list(1000)
    return [Workload(**parse_from_mongo(workload)) for workload in workloads]

@api_router.put("/workloads/{workload_id}/status")
async def update_workload_status(workload_id: str, status: str, execution_time: Optional[float] = None):
    update_data = {"status": status}
    
    if status == "running":
        update_data["deployed_at"] = datetime.now(timezone.utc)
    elif status in ["completed", "failed"]:
        update_data["completed_at"] = datetime.now(timezone.utc)
        if execution_time:
            update_data["execution_time"] = execution_time
    
    result = await db.workloads.update_one(
        {"id": workload_id},
        {"$set": prepare_for_mongo(update_data)}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Workload not found")
    
    workload = await db.workloads.find_one({"id": workload_id})
    updated_workload = Workload(**parse_from_mongo(workload))
    
    # Broadcast update
    await manager.broadcast(json.dumps({"type": "workload_updated", "data": prepare_for_mongo(updated_workload.dict()), "timestamp": datetime.now(timezone.utc).isoformat()}))
    
    return {"message": "Workload status updated successfully"}

# Performance Metrics Routes
@api_router.post("/metrics", response_model=PerformanceMetric)
async def create_performance_metric(metric: PerformanceMetric):
    metric_data = prepare_for_mongo(metric.dict())
    await db.performance_metrics.insert_one(metric_data)
    return metric

@api_router.get("/metrics/node/{node_id}", response_model=List[PerformanceMetric])
async def get_node_metrics(node_id: str, limit: int = 100):
    metrics = await db.performance_metrics.find({"node_id": node_id}).sort("timestamp", -1).limit(limit).to_list(None)
    return [PerformanceMetric(**parse_from_mongo(metric)) for metric in metrics]

# Security Events Routes
@api_router.post("/security-events", response_model=SecurityEvent)
async def create_security_event(event: SecurityEvent):
    event_data = prepare_for_mongo(event.dict())
    await db.security_events.insert_one(event_data)
    
    # Broadcast security alert
    await manager.broadcast(json.dumps({"type": "security_event", "data": event.dict(), "timestamp": datetime.now(timezone.utc).isoformat()}))
    
    return event

@api_router.get("/security-events", response_model=List[SecurityEvent])
async def get_security_events(limit: int = 100):
    events = await db.security_events.find().sort("timestamp", -1).limit(limit).to_list(None)
    return [SecurityEvent(**parse_from_mongo(event)) for event in events]

# Analytics Routes
@api_router.get("/analytics", response_model=SystemAnalytics)
async def get_system_analytics():
    # Get node statistics
    total_nodes = await db.edge_nodes.count_documents({})
    active_nodes = await db.edge_nodes.count_documents({"status": "online"})
    
    # Get workload statistics
    total_workloads = await db.workloads.count_documents({})
    running_workloads = await db.workloads.count_documents({"status": "running"})
    
    # Calculate averages
    pipeline = [
        {"$match": {"status": "online"}},
        {"$group": {
            "_id": None,
            "avg_cpu": {"$avg": "$cpu_usage"},
            "avg_memory": {"$avg": "$memory_usage"},
            "avg_latency": {"$avg": "$network_latency"}
        }}
    ]
    
    result = await db.edge_nodes.aggregate(pipeline).to_list(1)
    avg_cpu = result[0]["avg_cpu"] if result and result[0]["avg_cpu"] else 0
    avg_memory = result[0]["avg_memory"] if result and result[0]["avg_memory"] else 0
    avg_latency = result[0]["avg_latency"] if result and result[0]["avg_latency"] else 0
    
    # Calculate success rate
    completed_workloads = await db.workloads.count_documents({"status": "completed"})
    failed_workloads = await db.workloads.count_documents({"status": "failed"})
    total_finished = completed_workloads + failed_workloads
    success_rate = (completed_workloads / total_finished * 100) if total_finished > 0 else 100
    
    # Security incidents
    security_incidents = await db.security_events.count_documents({"resolved": False})
    
    return SystemAnalytics(
        total_nodes=total_nodes,
        active_nodes=active_nodes,
        total_workloads=total_workloads,
        running_workloads=running_workloads,
        average_cpu_usage=avg_cpu,
        average_memory_usage=avg_memory,
        average_latency=avg_latency,
        success_rate=success_rate,
        security_incidents=security_incidents
    )

# Smart City Demo Routes
@api_router.post("/demo/setup-smart-city")
async def setup_smart_city_demo():
    """Setup demo edge nodes for smart city use case"""
    demo_nodes = [
        {
            "name": "Traffic Camera - Main St",
            "location": "Main Street & 1st Ave",
            "node_type": "traffic_camera",
            "status": "online",
            "cpu_usage": random.uniform(20, 60),
            "memory_usage": random.uniform(30, 70),
            "network_latency": random.uniform(5, 25)
        },
        {
            "name": "Air Quality Sensor - Park",
            "location": "Central Park",
            "node_type": "air_quality_sensor",
            "status": "online",
            "cpu_usage": random.uniform(10, 40),
            "memory_usage": random.uniform(20, 50),
            "network_latency": random.uniform(8, 30)
        },
        {
            "name": "Traffic Camera - Highway",
            "location": "Highway 101 Junction",
            "node_type": "traffic_camera",
            "status": "online",
            "cpu_usage": random.uniform(25, 65),
            "memory_usage": random.uniform(35, 75),
            "network_latency": random.uniform(10, 35)
        },
        {
            "name": "Smart Streetlight Controller",
            "location": "Downtown District",
            "node_type": "general",
            "status": "online",
            "cpu_usage": random.uniform(15, 45),
            "memory_usage": random.uniform(25, 55),
            "network_latency": random.uniform(5, 20)
        }
    ]
    
    created_nodes = []
    for node_data in demo_nodes:
        node = EdgeNode(**node_data)
        node_dict = prepare_for_mongo(node.dict())
        await db.edge_nodes.insert_one(node_dict)
        created_nodes.append(node)
    
    return {"message": f"Created {len(created_nodes)} demo edge nodes", "nodes": created_nodes}

# WebSocket endpoint for real-time updates
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Send periodic updates
            await asyncio.sleep(5)
            if websocket.client_state == WebSocketState.CONNECTED:
                # Send random metric updates for demo
                nodes = await db.edge_nodes.find({"status": "online"}).to_list(None)
                for node in nodes:
                    updated_metrics = {
                        "type": "metrics_update",
                        "node_id": node["id"],
                        "cpu_usage": random.uniform(10, 80),
                        "memory_usage": random.uniform(20, 90),
                        "network_latency": random.uniform(5, 50),
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    }
                    await manager.send_personal_message(json.dumps(updated_metrics), websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()