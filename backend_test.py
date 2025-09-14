import requests
import sys
import json
from datetime import datetime
import time
import random

class KubernetesEdgeAPITester:
    def __init__(self, base_url="https://kube-edge-compute.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.created_nodes = []
        self.created_workloads = []

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, list):
                        print(f"   Response: List with {len(response_data)} items")
                    elif isinstance(response_data, dict):
                        print(f"   Response keys: {list(response_data.keys())}")
                except:
                    print(f"   Response: {response.text[:100]}...")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")

            return success, response.json() if response.text and response.status_code < 500 else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_edge_nodes_crud(self):
        """Test Edge Nodes CRUD operations"""
        print("\n" + "="*50)
        print("TESTING EDGE NODES CRUD OPERATIONS")
        print("="*50)

        # Test GET all nodes (initially empty)
        success, nodes = self.run_test(
            "Get All Edge Nodes",
            "GET",
            "edge-nodes",
            200
        )

        # Test CREATE edge node
        node_data = {
            "name": "Test Traffic Camera",
            "location": "Test Street & Test Ave",
            "node_type": "traffic_camera"
        }
        
        success, created_node = self.run_test(
            "Create Edge Node",
            "POST",
            "edge-nodes",
            200,
            data=node_data
        )
        
        if success and 'id' in created_node:
            node_id = created_node['id']
            self.created_nodes.append(node_id)
            
            # Test GET specific node
            success, node = self.run_test(
                "Get Specific Edge Node",
                "GET",
                f"edge-nodes/{node_id}",
                200
            )
            
            # Test UPDATE node
            update_data = {
                "status": "online",
                "cpu_usage": 45.5,
                "memory_usage": 60.2,
                "network_latency": 15.3
            }
            
            success, updated_node = self.run_test(
                "Update Edge Node",
                "PUT",
                f"edge-nodes/{node_id}",
                200,
                data=update_data
            )

    def test_workloads_crud(self):
        """Test Workloads CRUD operations"""
        print("\n" + "="*50)
        print("TESTING WORKLOADS CRUD OPERATIONS")
        print("="*50)

        if not self.created_nodes:
            print("❌ No nodes available for workload testing")
            return

        node_id = self.created_nodes[0]

        # Test CREATE workload
        workload_data = {
            "name": "AI Analytics Workload",
            "description": "Traffic analysis using computer vision",
            "node_id": node_id,
            "workload_type": "ai_analytics",
            "cpu_request": 2.0,
            "memory_request": 4.0,
            "priority": "high"
        }
        
        success, created_workload = self.run_test(
            "Create Workload",
            "POST",
            "workloads",
            200,
            data=workload_data
        )
        
        if success and 'id' in created_workload:
            workload_id = created_workload['id']
            self.created_workloads.append(workload_id)
            
            # Test GET all workloads
            success, workloads = self.run_test(
                "Get All Workloads",
                "GET",
                "workloads",
                200
            )
            
            # Test GET workloads by node
            success, node_workloads = self.run_test(
                "Get Node Workloads",
                "GET",
                f"workloads/node/{node_id}",
                200
            )
            
            # Test UPDATE workload status
            success, status_update = self.run_test(
                "Update Workload Status to Running",
                "PUT",
                f"workloads/{workload_id}/status?status=running",
                200
            )
            
            # Test UPDATE workload status to completed
            success, status_update = self.run_test(
                "Update Workload Status to Completed",
                "PUT",
                f"workloads/{workload_id}/status?status=completed&execution_time=120.5",
                200
            )

    def test_performance_metrics(self):
        """Test Performance Metrics operations"""
        print("\n" + "="*50)
        print("TESTING PERFORMANCE METRICS")
        print("="*50)

        if not self.created_nodes:
            print("❌ No nodes available for metrics testing")
            return

        node_id = self.created_nodes[0]

        # Test CREATE performance metric
        metric_data = {
            "node_id": node_id,
            "cpu_usage": 55.2,
            "memory_usage": 70.8,
            "network_latency": 12.5,
            "deployment_latency": 8.3,
            "success_rate": 98.5
        }
        
        success, created_metric = self.run_test(
            "Create Performance Metric",
            "POST",
            "metrics",
            200,
            data=metric_data
        )
        
        # Test GET node metrics
        success, metrics = self.run_test(
            "Get Node Metrics",
            "GET",
            f"metrics/node/{node_id}",
            200
        )

    def test_security_events(self):
        """Test Security Events operations"""
        print("\n" + "="*50)
        print("TESTING SECURITY EVENTS")
        print("="*50)

        if not self.created_nodes:
            print("❌ No nodes available for security testing")
            return

        node_id = self.created_nodes[0]

        # Test CREATE security event
        security_data = {
            "node_id": node_id,
            "event_type": "mtls_handshake",
            "severity": "medium",
            "description": "mTLS handshake failed for edge node connection"
        }
        
        success, created_event = self.run_test(
            "Create Security Event",
            "POST",
            "security-events",
            200,
            data=security_data
        )
        
        # Test GET all security events
        success, events = self.run_test(
            "Get All Security Events",
            "GET",
            "security-events",
            200
        )

    def test_analytics(self):
        """Test System Analytics"""
        print("\n" + "="*50)
        print("TESTING SYSTEM ANALYTICS")
        print("="*50)

        success, analytics = self.run_test(
            "Get System Analytics",
            "GET",
            "analytics",
            200
        )

    def test_smart_city_demo(self):
        """Test Smart City Demo Setup"""
        print("\n" + "="*50)
        print("TESTING SMART CITY DEMO SETUP")
        print("="*50)

        success, demo_result = self.run_test(
            "Setup Smart City Demo",
            "POST",
            "demo/setup-smart-city",
            200
        )
        
        if success and 'nodes' in demo_result:
            print(f"   Created {len(demo_result['nodes'])} demo nodes")
            for node in demo_result['nodes']:
                self.created_nodes.append(node['id'])

    def test_error_handling(self):
        """Test API error handling"""
        print("\n" + "="*50)
        print("TESTING ERROR HANDLING")
        print("="*50)

        # Test GET non-existent node
        success, error = self.run_test(
            "Get Non-existent Node (404 Expected)",
            "GET",
            "edge-nodes/non-existent-id",
            404
        )

        # Test CREATE workload with invalid node
        invalid_workload = {
            "name": "Invalid Workload",
            "description": "Test workload",
            "node_id": "invalid-node-id",
            "workload_type": "ai_analytics",
            "cpu_request": 1.0,
            "memory_request": 2.0
        }
        
        success, error = self.run_test(
            "Create Workload with Invalid Node (404 Expected)",
            "POST",
            "workloads",
            404,
            data=invalid_workload
        )

    def cleanup_test_data(self):
        """Clean up created test data"""
        print("\n" + "="*50)
        print("CLEANING UP TEST DATA")
        print("="*50)

        # Delete created nodes (this will also clean up associated workloads)
        for node_id in self.created_nodes:
            success, result = self.run_test(
                f"Delete Edge Node {node_id}",
                "DELETE",
                f"edge-nodes/{node_id}",
                200
            )

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Kubernetes Edge Computing API Tests")
        print(f"Backend URL: {self.base_url}")
        
        try:
            # Test basic connectivity
            response = requests.get(f"{self.base_url}/docs")
            if response.status_code == 200:
                print("✅ Backend server is accessible")
            else:
                print("❌ Backend server connectivity issue")
                return 1

            # Run all test suites
            self.test_smart_city_demo()  # Create demo data first
            self.test_edge_nodes_crud()
            self.test_workloads_crud()
            self.test_performance_metrics()
            self.test_security_events()
            self.test_analytics()
            self.test_error_handling()
            
            # Clean up
            self.cleanup_test_data()

        except Exception as e:
            print(f"❌ Test execution failed: {str(e)}")
            return 1

        # Print final results
        print("\n" + "="*60)
        print("FINAL TEST RESULTS")
        print("="*60)
        print(f"📊 Tests passed: {self.tests_passed}/{self.tests_run}")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return 1

def main():
    tester = KubernetesEdgeAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())