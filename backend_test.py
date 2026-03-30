#!/usr/bin/env python3
"""
Backend API Testing for Kinesis - AI-Native Product Discovery Platform
Tests all CRUD operations, AI features, authentication flows, and workspace features.
"""

import requests
import json
import sys
import time
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
from pymongo import MongoClient
import os

class KinesisAPITester:
    def __init__(self, base_url: str = "http://localhost:8000/api"):
        self.base_url = base_url
        self.session_token = None
        self.user_id = None
        self.workspace_id = None
        self.headers = {'Content-Type': 'application/json'}
        self.tests_run = 0
        self.tests_passed = 0
        self.test_data = {}  # Store created resources for cleanup/reference
        
        # MongoDB setup for test data
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        self.client = MongoClient(mongo_url)
        self.db = self.client['test_database']

    def log(self, message: str, level: str = "INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")

    def setup_test_user_with_workspace(self):
        """Create test user with workspace setup as per auth_testing.md"""
        self.log("🔧 Setting up test user with workspace...")
        
        timestamp = int(time.time())
        self.user_id = f"test-user-{timestamp}"
        self.session_token = f"test_session_{timestamp}"
        self.workspace_id = f"ws_{timestamp}"
        
        # Create user
        user_doc = {
            "user_id": self.user_id,
            "email": f"test.user.{timestamp}@example.com",
            "name": "Test User",
            "picture": "https://via.placeholder.com/150",
            "active_workspace_id": self.workspace_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Create workspace
        workspace_doc = {
            "workspace_id": self.workspace_id,
            "name": "Test Workspace",
            "owner_id": self.user_id,
            "is_personal": True,
            "invite_code": f"invite_{timestamp}",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Create workspace member
        member_doc = {
            "workspace_id": self.workspace_id,
            "user_id": self.user_id,
            "role": "OWNER",
            "joined_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Create session
        session_doc = {
            "user_id": self.user_id,
            "session_token": self.session_token,
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        try:
            self.db.users.insert_one(user_doc)
            self.db.workspaces.insert_one(workspace_doc)
            self.db.workspace_members.insert_one(member_doc)
            self.db.user_sessions.insert_one(session_doc)
            
            # Update headers with session token
            self.headers['Authorization'] = f'Bearer {self.session_token}'
            
            self.log(f"✅ Test user created: {self.user_id}")
            self.log(f"✅ Session token: {self.session_token}")
            self.log(f"✅ Workspace: {self.workspace_id}")
            return True
        except Exception as e:
            self.log(f"❌ Failed to create test user: {e}", "ERROR")
            return False

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, 
                 data: Optional[Dict] = None, files: Optional[Dict] = None) -> tuple[bool, Dict]:
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        self.tests_run += 1
        
        self.log(f"🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=self.headers, timeout=30)
            elif method == 'POST':
                if files:
                    # For file uploads, don't use JSON headers
                    headers = {'Authorization': f'Bearer {self.session_token}'}
                    response = requests.post(url, headers=headers, files=files, timeout=60)
                else:
                    response = requests.post(url, headers=self.headers, json=data, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, headers=self.headers, json=data, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=self.headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code}")
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                self.log(f"❌ {name} - Expected {expected_status}, got {response.status_code}", "ERROR")
                try:
                    error_detail = response.json()
                    self.log(f"   Error details: {error_detail}", "ERROR")
                except:
                    self.log(f"   Response text: {response.text[:200]}", "ERROR")
                return False, {}

        except Exception as e:
            self.log(f"❌ {name} - Exception: {str(e)}", "ERROR")
            return False, {}

    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        self.log("🔐 Testing Authentication Endpoints")
        
        # Test /auth/me with valid token
        success, user_data = self.run_test(
            "GET /auth/me (authenticated)",
            "GET", "auth/me", 200
        )
        if success:
            self.test_data['user'] = user_data
            self.log(f"   User: {user_data.get('name', 'Unknown')} ({user_data.get('email', 'No email')})")

        # Test /auth/me without token (should fail)
        headers_no_auth = {'Content-Type': 'application/json'}
        try:
            response = requests.get(f"{self.base_url}/auth/me", headers=headers_no_auth, timeout=10)
            if response.status_code == 401:
                self.tests_run += 1
                self.tests_passed += 1
                self.log("✅ GET /auth/me (unauthenticated) - Correctly returns 401")
            else:
                self.tests_run += 1
                self.log(f"❌ GET /auth/me (unauthenticated) - Expected 401, got {response.status_code}", "ERROR")
        except Exception as e:
            self.tests_run += 1
            self.log(f"❌ GET /auth/me (unauthenticated) - Exception: {e}", "ERROR")

    def test_sources_crud(self):
        """Test Sources CRUD operations"""
        self.log("📊 Testing Sources CRUD")
        
        # List sources (initially empty)
        success, sources = self.run_test(
            "GET /sources (list)",
            "GET", "sources", 200
        )
        
        # Create a source
        source_data = {
            "name": "Test Customer Interviews",
            "type": "UPLOAD",
            "config": {"description": "Test source for API testing"}
        }
        success, created_source = self.run_test(
            "POST /sources (create)",
            "POST", "sources", 200, source_data
        )
        if success:
            self.test_data['source_id'] = created_source.get('source_id')
            self.log(f"   Created source: {created_source.get('source_id')}")

        # List sources again (should have 1)
        success, sources_after = self.run_test(
            "GET /sources (after create)",
            "GET", "sources", 200
        )
        if success:
            self.log(f"   Sources count: {len(sources_after)}")

    def test_source_items(self):
        """Test source items management"""
        if 'source_id' not in self.test_data:
            self.log("⚠️ Skipping source items tests - no source created", "WARN")
            return
            
        self.log("📝 Testing Source Items")
        source_id = self.test_data['source_id']
        
        # Add text content to source
        item_data = {
            "title": "Customer Interview - John Doe",
            "raw_text": "Customer mentioned that the onboarding process is confusing and takes too long. They would like a simpler flow with fewer steps. The pricing page is also unclear.",
            "metadata": {"interview_date": "2024-01-15", "customer_segment": "enterprise"}
        }
        success, created_item = self.run_test(
            "POST /sources/{source_id}/items (add text)",
            "POST", f"sources/{source_id}/items", 200, item_data
        )
        if success:
            self.test_data['item_id'] = created_item.get('item_id')
            self.log(f"   Created item: {created_item.get('item_id')}")

        # List source items
        success, items = self.run_test(
            "GET /sources/{source_id}/items (list)",
            "GET", f"sources/{source_id}/items", 200
        )
        if success:
            self.log(f"   Items count: {len(items)}")

    def test_file_upload(self):
        """Test file upload functionality including audio transcription (NEW FEATURE)"""
        self.log("📁 Testing File Upload")
        
        # Test regular text file upload
        test_content = "This is a test file for customer feedback analysis.\nCustomer says: The app is slow and needs better performance."
        
        files = {
            'file': ('test_feedback.txt', test_content, 'text/plain')
        }
        
        success, upload_result = self.run_test(
            "POST /upload (text file upload)",
            "POST", "upload", 200, files=files
        )
        if success:
            self.test_data['file_id'] = upload_result.get('file_id')
            self.log(f"   Uploaded file: {upload_result.get('file_id')}")
            is_audio = upload_result.get('is_audio', False)
            self.log(f"   Is audio file: {is_audio}")

        # Test audio file upload (simulated - we'll create a fake audio file)
        self.log("🎵 Testing Audio File Upload & Transcription")
        
        # Create a fake audio file (just for testing the endpoint)
        fake_audio_content = b"FAKE_AUDIO_DATA_FOR_TESTING" * 100  # Make it reasonably sized
        
        audio_files = {
            'file': ('test_audio.mp3', fake_audio_content, 'audio/mpeg')
        }
        
        try:
            url = f"{self.base_url}/upload"
            headers = {'Authorization': f'Bearer {self.session_token}'}
            response = requests.post(url, headers=headers, files=audio_files, timeout=60)
            self.tests_run += 1
            
            if response.status_code == 200:
                self.tests_passed += 1
                result = response.json()
                self.log(f"✅ Audio Upload - Status: {response.status_code}")
                self.log(f"   Is audio: {result.get('is_audio', False)}")
                self.log(f"   Transcript: {bool(result.get('transcript'))}")
                if result.get('transcript'):
                    transcript_preview = result['transcript'][:100] + "..." if len(result['transcript']) > 100 else result['transcript']
                    self.log(f"   Transcript preview: {transcript_preview}")
            else:
                self.log(f"❌ Audio Upload - Expected 200, got {response.status_code}", "ERROR")
                try:
                    error_detail = response.json()
                    self.log(f"   Error details: {error_detail}", "ERROR")
                except:
                    self.log(f"   Response text: {response.text[:200]}", "ERROR")
        except Exception as e:
            self.tests_run += 1
            self.log(f"❌ Audio Upload - Exception: {e}", "ERROR")

    def test_ai_processing(self):
        """Test AI-powered insight extraction"""
        if 'source_id' not in self.test_data:
            self.log("⚠️ Skipping AI processing tests - no source created", "WARN")
            return
            
        self.log("🤖 Testing AI Processing (Insight Extraction)")
        source_id = self.test_data['source_id']
        
        # Process source items with AI
        success, process_result = self.run_test(
            "POST /sources/{source_id}/process (AI processing)",
            "POST", f"sources/{source_id}/process", 200
        )
        if success:
            processed_count = process_result.get('processed', 0)
            self.log(f"   Processed {processed_count} items with AI")
            
            # Wait a moment for processing to complete
            time.sleep(2)

    def test_insights(self):
        """Test insights listing and filtering"""
        self.log("💡 Testing Insights")
        
        # List all insights
        success, insights = self.run_test(
            "GET /insights (list all)",
            "GET", "insights", 200
        )
        if success:
            self.log(f"   Total insights: {len(insights)}")
            if insights:
                self.test_data['insights'] = insights
                # Test filtering by type
                first_insight_type = insights[0].get('type')
                if first_insight_type:
                    success, filtered = self.run_test(
                        f"GET /insights?type={first_insight_type} (filter)",
                        "GET", f"insights?type={first_insight_type}", 200
                    )
                    if success:
                        self.log(f"   Filtered insights ({first_insight_type}): {len(filtered)}")

    def test_clustering(self):
        """Test insight clustering into opportunities"""
        self.log("🎯 Testing Insight Clustering")
        
        # Cluster insights into opportunities
        success, cluster_result = self.run_test(
            "POST /insights/cluster (AI clustering)",
            "POST", "insights/cluster", 200
        )
        if success:
            opportunities_created = len(cluster_result.get('opportunities', []))
            self.log(f"   Created {opportunities_created} opportunities from clustering")
            if cluster_result.get('opportunities'):
                self.test_data['opportunity_id'] = cluster_result['opportunities'][0].get('opportunity_id')

    def test_opportunities_crud(self):
        """Test opportunities CRUD operations"""
        self.log("🎯 Testing Opportunities CRUD")
        
        # List opportunities
        success, opportunities = self.run_test(
            "GET /opportunities (list)",
            "GET", "opportunities", 200
        )
        if success:
            self.log(f"   Opportunities count: {len(opportunities)}")

        # Create manual opportunity
        opp_data = {
            "title": "Improve User Onboarding",
            "description": "Streamline the onboarding process based on customer feedback",
            "impact_score": 8.5
        }
        success, created_opp = self.run_test(
            "POST /opportunities (create)",
            "POST", "opportunities", 200, opp_data
        )
        if success:
            manual_opp_id = created_opp.get('opportunity_id')
            self.test_data['manual_opportunity_id'] = manual_opp_id
            self.log(f"   Created manual opportunity: {manual_opp_id}")

        # Get opportunity details
        if 'opportunity_id' in self.test_data:
            opp_id = self.test_data['opportunity_id']
            success, opp_detail = self.run_test(
                "GET /opportunities/{id} (detail)",
                "GET", f"opportunities/{opp_id}", 200
            )
            if success:
                insights_count = len(opp_detail.get('insights', []))
                briefs_count = len(opp_detail.get('briefs', []))
                self.log(f"   Opportunity has {insights_count} insights, {briefs_count} briefs")

        # Update opportunity status
        if 'manual_opportunity_id' in self.test_data:
            update_data = {"status": "IN_PROGRESS"}
            success, updated_opp = self.run_test(
                "PUT /opportunities/{id} (update)",
                "PUT", f"opportunities/{self.test_data['manual_opportunity_id']}", 200, update_data
            )

    def test_brief_generation(self):
        """Test AI brief generation"""
        if 'opportunity_id' not in self.test_data:
            self.log("⚠️ Skipping brief generation tests - no opportunity available", "WARN")
            return
            
        self.log("📋 Testing Brief Generation")
        opp_id = self.test_data['opportunity_id']
        
        # Generate brief from opportunity
        success, brief = self.run_test(
            "POST /opportunities/{id}/briefs (generate)",
            "POST", f"opportunities/{opp_id}/briefs", 200
        )
        if success:
            brief_id = brief.get('brief_id')
            self.test_data['brief_id'] = brief_id
            self.log(f"   Generated brief: {brief_id}")
            
            # Get brief details
            success, brief_detail = self.run_test(
                "GET /briefs/{id} (detail)",
                "GET", f"briefs/{brief_id}", 200
            )
            if success:
                content = brief_detail.get('content', {})
                self.log(f"   Brief has problem statement: {bool(content.get('problem_statement'))}")

    def test_spec_generation(self):
        """Test executable spec generation"""
        if 'brief_id' not in self.test_data:
            self.log("⚠️ Skipping spec generation tests - no brief available", "WARN")
            return
            
        self.log("⚙️ Testing Spec Generation")
        brief_id = self.test_data['brief_id']
        
        # Generate executable spec
        success, spec_result = self.run_test(
            "POST /briefs/{id}/generate-spec (AI spec)",
            "POST", f"briefs/{brief_id}/generate-spec", 200
        )
        if success:
            spec = spec_result.get('spec', {})
            user_stories = len(spec.get('user_stories', []))
            api_contracts = len(spec.get('api_contracts', []))
            tasks = len(spec.get('tasks', []))
            self.log(f"   Generated spec: {user_stories} stories, {api_contracts} APIs, {tasks} tasks")

    def test_brief_export(self):
        """Test brief export as markdown and PDF"""
        if 'brief_id' not in self.test_data:
            self.log("⚠️ Skipping export tests - no brief available", "WARN")
            return
            
        self.log("📤 Testing Brief Export")
        brief_id = self.test_data['brief_id']
        
        # Export brief as markdown
        success, export_result = self.run_test(
            "POST /briefs/{id}/export (markdown)",
            "POST", f"briefs/{brief_id}/export", 200
        )
        if success:
            markdown = export_result.get('markdown', '')
            self.log(f"   Exported markdown length: {len(markdown)} characters")

        # Test PDF export (NEW FEATURE)
        self.log("📄 Testing PDF Export")
        try:
            url = f"{self.base_url}/briefs/{brief_id}/export-pdf"
            response = requests.post(url, headers=self.headers, timeout=30)
            self.tests_run += 1
            
            if response.status_code == 200 and response.headers.get('content-type') == 'application/pdf':
                self.tests_passed += 1
                self.log(f"✅ PDF Export - Status: {response.status_code}, Size: {len(response.content)} bytes")
                self.log(f"   Content-Type: {response.headers.get('content-type')}")
            else:
                self.log(f"❌ PDF Export - Expected 200 with application/pdf, got {response.status_code}", "ERROR")
                self.log(f"   Content-Type: {response.headers.get('content-type')}", "ERROR")
        except Exception as e:
            self.tests_run += 1
            self.log(f"❌ PDF Export - Exception: {e}", "ERROR")

    def test_chat_discovery(self):
        """Test chat-based RAG discovery with vector search (ENHANCED FEATURE)"""
        self.log("💬 Testing Chat Discovery with Vector Search")
        
        # Send chat message to test vector search
        chat_data = {
            "message": "What are the main customer complaints about onboarding?"
        }
        success, chat_response = self.run_test(
            "POST /chat (discovery query with vector search)",
            "POST", "chat", 200, chat_data
        )
        if success:
            response_text = chat_response.get('response', '')
            message_id = chat_response.get('message_id', '')
            self.log(f"   Chat response length: {len(response_text)} characters")
            self.log(f"   Message ID: {message_id}")
            
        # Test another query to verify vector search is working
        chat_data2 = {
            "message": "What features do customers want most?"
        }
        success, chat_response2 = self.run_test(
            "POST /chat (second query for vector search)",
            "POST", "chat", 200, chat_data2
        )
        if success:
            response_text2 = chat_response2.get('response', '')
            self.log(f"   Second response length: {len(response_text2)} characters")
            
        # Get chat history
        success, history = self.run_test(
            "GET /chat/history (history)",
            "GET", "chat/history", 200
        )
        if success:
            self.log(f"   Chat history: {len(history)} messages")

    def test_tasks(self):
        """Test tasks management"""
        self.log("✅ Testing Tasks")
        
        # List tasks
        success, tasks = self.run_test(
            "GET /tasks (list)",
            "GET", "tasks", 200
        )
        if success:
            self.log(f"   Tasks count: {len(tasks)}")

    def test_dashboard_stats(self):
        """Test dashboard statistics endpoint"""
        self.log("📊 Testing Dashboard Stats")
        
        success, stats = self.run_test(
            "GET /dashboard/stats (statistics)",
            "GET", "dashboard/stats", 200
        )
        if success:
            self.log(f"   Stats - Sources: {stats.get('sources', 0)}, "
                    f"Insights: {stats.get('insights', 0)}, "
                    f"Opportunities: {stats.get('opportunities', 0)}")

    def test_github_integration(self):
        """Test GitHub integration endpoints (NEW FEATURE)"""
        self.log("🐙 Testing GitHub Integration")
        
        # Test GitHub repos listing
        success, repos = self.run_test(
            "GET /github/repos (list repositories)",
            "GET", "github/repos", 200
        )
        if success:
            self.log(f"   GitHub repos available: {len(repos)}")
            if repos:
                self.test_data['github_repo'] = repos[0].get('full_name')
                self.log(f"   First repo: {repos[0].get('full_name')}")

        # Test GitHub export (only if we have a brief and repo)
        if 'brief_id' in self.test_data and 'github_repo' in self.test_data:
            export_data = {
                "brief_id": self.test_data['brief_id'],
                "repo": self.test_data['github_repo']
            }
            success, export_result = self.run_test(
                "POST /github/export (create issues)",
                "POST", "github/export", 200, export_data
            )
            if success:
                issues_created = len(export_result.get('issues', []))
                self.log(f"   Created {issues_created} GitHub issues")

    def test_slack_integration(self):
        """Test Slack integration endpoints (NEW FEATURE)"""
        self.log("💬 Testing Slack Integration")
        
        # Test Slack status
        success, status = self.run_test(
            "GET /slack/status (connection status)",
            "GET", "slack/status", 200
        )
        if success:
            connected = status.get('connected', False)
            self.log(f"   Slack connected: {connected}")
            if connected:
                self.log(f"   Team: {status.get('team_name', 'Unknown')}")

        # Test Slack auth URL generation
        success, auth_data = self.run_test(
            "GET /slack/auth-url (generate auth URL)",
            "GET", "slack/auth-url", 200
        )
        if success:
            auth_url = auth_data.get('url', '')
            self.log(f"   Auth URL generated: {bool(auth_url)}")
            if auth_url:
                self.log(f"   URL starts with: {auth_url[:50]}...")

        # Note: We can't test actual Slack connection without user interaction
        # But we can test the channels endpoint (will fail if not connected, which is expected)
        try:
            url = f"{self.base_url}/slack/channels"
            response = requests.get(url, headers=self.headers, timeout=10)
            self.tests_run += 1
            
            if response.status_code == 400:  # Expected if not connected
                self.tests_passed += 1
                self.log("✅ GET /slack/channels - Correctly returns 400 when not connected")
            elif response.status_code == 200:
                self.tests_passed += 1
                channels = response.json()
                self.log(f"✅ GET /slack/channels - Connected, found {len(channels)} channels")
            else:
                self.log(f"❌ GET /slack/channels - Unexpected status: {response.status_code}", "ERROR")
        except Exception as e:
            self.tests_run += 1
            self.log(f"❌ GET /slack/channels - Exception: {e}", "ERROR")

    def test_workspace_features(self):
        """Test workspace-specific features"""
        self.log("🏢 Testing Workspace Features")
        
        # Test auth/me returns workspace info
        success, auth_data = self.run_test(
            "GET /auth/me (workspace info)",
            "GET", "auth/me", 200
        )
        
        if success and auth_data:
            has_workspace = 'workspace' in auth_data and auth_data['workspace'] is not None
            has_role = 'workspace_role' in auth_data
            
            if has_workspace:
                self.log("✅ Auth includes workspace object")
                workspace = auth_data['workspace']
                if 'name' in workspace and 'workspace_id' in workspace:
                    self.log("✅ Workspace has required fields")
                else:
                    self.log("❌ Workspace missing required fields", "ERROR")
            else:
                self.log("❌ Auth missing workspace object", "ERROR")
                
            if has_role:
                self.log(f"✅ Auth includes workspace_role: {auth_data.get('workspace_role')}")
            else:
                self.log("❌ Auth missing workspace_role", "ERROR")
        
        # Test workspace CRUD
        success, workspaces = self.run_test(
            "GET /workspaces (list)",
            "GET", "workspaces", 200
        )
        
        if success and isinstance(workspaces, list):
            self.log(f"✅ Listed {len(workspaces)} workspaces")
            if workspaces:
                ws = workspaces[0]
                if 'role' in ws and 'is_active' in ws:
                    self.log("✅ Workspace has role and is_active fields")
        
        # Test create new workspace
        success, new_ws = self.run_test(
            "POST /workspaces (create)",
            "POST", "workspaces", 200,
            data={"name": "Test Team Workspace"}
        )
        
        if success and new_ws:
            new_ws_id = new_ws.get('workspace_id')
            if new_ws_id:
                self.log(f"✅ Created workspace: {new_ws_id}")
                self.test_data['new_workspace_id'] = new_ws_id
                
                # Test switch workspace
                success, switch_result = self.run_test(
                    "POST /workspaces/{id}/switch",
                    "POST", f"workspaces/{new_ws_id}/switch", 200
                )
                
                if success:
                    self.log("✅ Switched workspace successfully")
        
        # Test workspace members
        success, members = self.run_test(
            "GET /workspaces/{id}/members",
            "GET", f"workspaces/{self.workspace_id}/members", 200
        )
        
        if success and isinstance(members, list):
            self.log(f"✅ Listed {len(members)} workspace members")
            if members:
                member = members[0]
                if 'role' in member and 'email' in member:
                    self.log("✅ Member has required fields")
        
        # Test invite member
        success, invite_result = self.run_test(
            "POST /workspaces/{id}/invite",
            "POST", f"workspaces/{self.workspace_id}/invite", 200,
            data={"email": "newmember@example.com", "role": "EDITOR"}
        )
        
        if success:
            self.log("✅ Invited member successfully")
        
        # Test invite link
        success, invite_link = self.run_test(
            "GET /workspaces/{id}/invite-link",
            "GET", f"workspaces/{self.workspace_id}/invite-link", 200
        )
        
        if success and invite_link:
            invite_code = invite_link.get('invite_code')
            if invite_code:
                self.log(f"✅ Got invite code: {invite_code[:8]}...")
        
        # Test data migration
        success, migrate_result = self.run_test(
            "POST /workspaces/{id}/migrate-data",
            "POST", f"workspaces/{self.workspace_id}/migrate-data", 200
        )
        
        if success and migrate_result:
            counts = migrate_result.get('counts', {})
            self.log(f"✅ Migration completed: {counts}")

    def test_brief_sharing(self):
        """Test brief sharing functionality"""
        self.log("📤 Testing Brief Sharing")
        
        # First need an opportunity and brief
        if 'opportunity_id' not in self.test_data:
            self.log("⚠️ No opportunity available for brief sharing test", "WARN")
            return
        
        opp_id = self.test_data['opportunity_id']
        
        # Create a brief if we don't have one
        if 'brief_id' not in self.test_data:
            success, brief = self.run_test(
                "POST /opportunities/{id}/briefs (for sharing)",
                "POST", f"opportunities/{opp_id}/briefs", 200
            )
            
            if success and brief:
                brief_id = brief.get('brief_id')
                if brief_id:
                    self.test_data['brief_id'] = brief_id
                    self.log(f"✅ Created brief for sharing: {brief_id}")
        
        if 'brief_id' in self.test_data:
            brief_id = self.test_data['brief_id']
            
            # Test sharing
            success, share_result = self.run_test(
                "POST /briefs/{id}/share",
                "POST", f"briefs/{brief_id}/share", 200
            )
            
            if success and share_result:
                share_id = share_result.get('share_id')
                if share_id:
                    self.log(f"✅ Created share link: {share_id}")
                    self.test_data['share_id'] = share_id
                    
                    # Test public access (no auth)
                    headers_no_auth = {'Content-Type': 'application/json'}
                    try:
                        url = f"{self.base_url}/shared/{share_id}"
                        response = requests.get(url, headers=headers_no_auth, timeout=30)
                        self.tests_run += 1
                        
                        if response.status_code == 200:
                            self.tests_passed += 1
                            public_data = response.json()
                            if 'brief' in public_data and 'workspace_name' in public_data:
                                self.log("✅ Public shared spec accessible without auth")
                            else:
                                self.log("❌ Public spec missing required fields", "ERROR")
                        else:
                            self.log(f"❌ Public shared spec failed: {response.status_code}", "ERROR")
                    except Exception as e:
                        self.tests_run += 1
                        self.log(f"❌ Public shared spec error: {e}", "ERROR")
                    
                    # Test revoking share
                    success, revoke_result = self.run_test(
                        "DELETE /briefs/{id}/share",
                        "DELETE", f"briefs/{brief_id}/share", 200
                    )
                    
                    if success:
                        self.log("✅ Revoked share successfully")

    def test_mcp_integration(self):
        """Test MCP (Model Context Protocol) integration features"""
        self.log("🔌 Testing MCP Integration")
        
        # Test MCP SSE endpoint accessibility
        try:
            url = f"{self.base_url}/mcp/sse"
            response = requests.get(url, headers=self.headers, timeout=10)
            self.tests_run += 1
            
            if response.status_code == 200:
                self.tests_passed += 1
                self.log("✅ MCP SSE endpoint accessible")
                # Check if it's an SSE stream
                content_type = response.headers.get('content-type', '')
                if 'text/event-stream' in content_type or 'text/plain' in content_type:
                    self.log("   SSE content type detected")
                else:
                    self.log(f"   Content-Type: {content_type}")
            else:
                self.log(f"❌ MCP SSE endpoint failed: {response.status_code}", "ERROR")
                if response.text:
                    self.log(f"   Response: {response.text[:200]}", "ERROR")
        except Exception as e:
            self.tests_run += 1
            self.log(f"❌ MCP SSE endpoint error: {e}", "ERROR")
        
        # Test MCP key generation
        success, key_result = self.run_test(
            "POST /mcp/generate-key (generate API key)",
            "POST", "mcp/generate-key", 200
        )
        
        if success and key_result:
            api_key = key_result.get('api_key')
            workspace_id = key_result.get('workspace_id')
            if api_key and api_key.startswith('sk-spec-'):
                self.log(f"✅ Generated MCP key: {api_key[:15]}...")
                self.test_data['mcp_api_key'] = api_key
            else:
                self.log("❌ Invalid MCP key format", "ERROR")
            
            if workspace_id:
                self.log(f"   Key associated with workspace: {workspace_id}")
        
        # Test MCP key retrieval
        success, key_data = self.run_test(
            "GET /mcp/key (retrieve current key)",
            "GET", "mcp/key", 200
        )
        
        if success and key_data:
            has_key = key_data.get('has_key', False)
            if has_key:
                retrieved_key = key_data.get('api_key')
                created_at = key_data.get('created_at')
                self.log(f"✅ Retrieved MCP key: {retrieved_key[:15] if retrieved_key else 'None'}...")
                if created_at:
                    self.log(f"   Created at: {created_at}")
            else:
                self.log("❌ No active MCP key found", "ERROR")
        
        # Test MCP activity log
        success, activities = self.run_test(
            "GET /mcp/activity (activity log)",
            "GET", "mcp/activity", 200
        )
        
        if success and isinstance(activities, list):
            self.log(f"✅ Retrieved {len(activities)} MCP activities")
            if activities:
                latest_activity = activities[0]
                activity_type = latest_activity.get('type', 'unknown')
                self.log(f"   Latest activity: {activity_type}")
        
        # Test MCP implementations list
        success, implementations = self.run_test(
            "GET /mcp/implementations (implementations list)",
            "GET", "mcp/implementations", 200
        )
        
        if success and isinstance(implementations, list):
            self.log(f"✅ Retrieved {len(implementations)} MCP implementations")
            if implementations:
                latest_impl = implementations[0]
                impl_status = latest_impl.get('validation_status', 'unknown')
                self.log(f"   Latest implementation status: {impl_status}")
        
        # Test MCP key revocation
        success, revoke_result = self.run_test(
            "DELETE /mcp/key (revoke key)",
            "DELETE", "mcp/key", 200
        )
        
        if success and revoke_result:
            status = revoke_result.get('status')
            if status == 'revoked':
                self.log("✅ MCP key revoked successfully")
            else:
                self.log(f"❌ Unexpected revoke status: {status}", "ERROR")
        
        # Verify key is revoked
        success, key_check = self.run_test(
            "GET /mcp/key (verify revocation)",
            "GET", "mcp/key", 200
        )
        
        if success and key_check:
            has_key_after_revoke = key_check.get('has_key', True)
            if not has_key_after_revoke:
                self.log("✅ Key successfully revoked - no active key found")
            else:
                self.log("❌ Key still active after revocation", "ERROR")

    def cleanup_test_data(self):
        """Clean up created test data"""
        self.log("🧹 Cleaning up test data")
        
        # Delete created source (this will cascade delete items)
        if 'source_id' in self.test_data:
            success, _ = self.run_test(
                "DELETE /sources/{id} (cleanup)",
                "DELETE", f"sources/{self.test_data['source_id']}", 200
            )
        
        # Clean up MongoDB test data
        try:
            self.log("🧹 Cleaning up MongoDB test data")
            # Remove test users and related data
            self.db.users.delete_many({"user_id": {"$regex": "^test-user-"}})
            self.db.user_sessions.delete_many({"session_token": {"$regex": "^test_session_"}})
            self.db.workspaces.delete_many({"workspace_id": {"$regex": "^ws_"}})
            self.db.workspace_members.delete_many({"workspace_id": {"$regex": "^ws_"}})
            self.db.workspace_invites.delete_many({"workspace_id": {"$regex": "^ws_"}})
            self.db.sources.delete_many({"source_id": {"$regex": "^src_test_"}})
            self.db.opportunities.delete_many({"title": "Test Opportunity"})
            self.db.briefs.delete_many({"opportunity_id": {"$regex": "^opp_"}})
            self.db.shared_specs.delete_many({"share_id": {"$regex": "^share_"}})
            self.log("✅ MongoDB test data cleaned up")
        except Exception as e:
            self.log(f"⚠️ MongoDB cleanup warning: {e}", "WARN")

    def run_all_tests(self):
        """Run all test suites"""
        start_time = time.time()
        self.log("🚀 Starting Kinesis Backend API Tests")
        self.log(f"   Base URL: {self.base_url}")
        
        # Setup test user with workspace
        if not self.setup_test_user_with_workspace():
            self.log("❌ Failed to setup test user. Aborting tests.", "ERROR")
            return False
        
        self.log(f"   Session Token: {self.session_token[:20]}...")
        
        try:
            # Workspace features (new)
            self.test_workspace_features()
            
            # Core functionality tests
            self.test_auth_endpoints()
            self.test_sources_crud()
            self.test_source_items()
            self.test_file_upload()
            
            # AI-powered features
            self.test_ai_processing()
            self.test_insights()
            self.test_clustering()
            
            # Opportunities and briefs
            self.test_opportunities_crud()
            self.test_brief_generation()
            self.test_spec_generation()
            self.test_brief_export()
            
            # Brief sharing (new)
            self.test_brief_sharing()
            
            # MCP Integration (new)
            self.test_mcp_integration()
            
            # Discovery and stats
            self.test_chat_discovery()
            self.test_dashboard_stats()
            self.test_tasks()
            
        except KeyboardInterrupt:
            self.log("Tests interrupted by user", "WARN")
        except Exception as e:
            self.log(f"Unexpected error during testing: {e}", "ERROR")
        finally:
            # Always try to cleanup
            try:
                self.cleanup_test_data()
            except:
                pass
        
        # Print final results
        duration = time.time() - start_time
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        
        self.log("=" * 60)
        self.log(f"📊 TEST RESULTS SUMMARY")
        self.log(f"   Tests Run: {self.tests_run}")
        self.log(f"   Tests Passed: {self.tests_passed}")
        self.log(f"   Tests Failed: {self.tests_run - self.tests_passed}")
        self.log(f"   Success Rate: {success_rate:.1f}%")
        self.log(f"   Duration: {duration:.1f}s")
        self.log("=" * 60)
        
        return self.tests_passed == self.tests_run

def main():
    """Main test execution"""
    tester = KinesisAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())