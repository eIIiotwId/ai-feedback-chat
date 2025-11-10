"""
Unit tests for API endpoints
"""

import json
import pytest
from unittest.mock import patch, MagicMock
from django.urls import reverse

from chat.models import Conversation, Message, MessageFeedback, ConversationFeedback
from chat.services import gemini


@pytest.mark.django_db
class TestConversationAPI:
    """Tests for conversation API endpoints"""
    
    def test_create_conversation(self, client):
        """Test creating a conversation via API"""
        url = "/api/conversations/"
        resp = client.post(url, data=json.dumps({"title": "My Chat"}), content_type="application/json")
        
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "My Chat"
        assert "id" in data
        assert "created_at" in data
    
    def test_create_conversation_without_title(self, client):
        """Test creating a conversation without a title"""
        url = "/api/conversations/"
        resp = client.post(url, data=json.dumps({}), content_type="application/json")
        
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] is None
    
    def test_list_conversations(self, client):
        """Test listing conversations"""
        # Create some conversations
        Conversation.objects.create(title="First")
        Conversation.objects.create(title="Second")
        
        url = "/api/conversations/"
        resp = client.get(url)
        
        assert resp.status_code == 200
        data = resp.json()
        assert "results" in data
        assert "count" in data
        assert len(data["results"]) == 2
    
    def test_list_conversations_with_pagination(self, client):
        """Test listing conversations with pagination"""
        # Create multiple conversations
        for i in range(5):
            Conversation.objects.create(title=f"Chat {i}")
        
        url = "/api/conversations/?limit=2&offset=0"
        resp = client.get(url)
        
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["results"]) == 2
        assert data["count"] == 5
    
    def test_get_conversation_detail(self, client):
        """Test getting a single conversation"""
        conv = Conversation.objects.create(title="Test Chat")
        
        url = f"/api/conversations/{conv.id}/"
        resp = client.get(url)
        
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == conv.id
        assert data["title"] == "Test Chat"
    
    def test_update_conversation(self, client):
        """Test updating a conversation"""
        conv = Conversation.objects.create(title="Old Title")
        
        url = f"/api/conversations/{conv.id}/"
        resp = client.patch(
            url,
            data=json.dumps({"title": "New Title"}),
            content_type="application/json"
        )
        
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "New Title"
        
        conv.refresh_from_db()
        assert conv.title == "New Title"
    
    def test_delete_conversation(self, client):
        """Test deleting a conversation"""
        conv = Conversation.objects.create(title="To Delete")
        
        url = f"/api/conversations/{conv.id}/"
        resp = client.delete(url)
        
        assert resp.status_code == 204
        assert not Conversation.objects.filter(id=conv.id).exists()
    
    def test_get_nonexistent_conversation(self, client):
        """Test getting a conversation that doesn't exist"""
        url = "/api/conversations/99999/"
        resp = client.get(url)
        
        assert resp.status_code == 404


@pytest.mark.django_db
class TestMessageAPI:
    """Tests for message API endpoints"""
    
    def test_message_flow_with_mocked_gemini(self, client, monkeypatch):
        """Test complete message flow with mocked Gemini"""
        # Create conversation
        resp = client.post("/api/conversations/", data=json.dumps({}), content_type="application/json")
        conv = resp.json()
        
        # Mock gemini
        def fake_generate_reply(history, prompt, timeout_s=10):
            assert prompt == "Hello"
            return "Hi there!"
        
        monkeypatch.setattr(gemini, "generate_reply", fake_generate_reply)
        
        # Send message
        url = f"/api/conversations/{conv['id']}/messages/"
        send = client.post(url, data=json.dumps({"text": "Hello"}), content_type="application/json")
        
        assert send.status_code == 201
        payload = send.json()
        assert payload["user_message"]["role"] == "user"
        assert payload["user_message"]["text"] == "Hello"
        assert payload["ai_message"]["role"] == "ai"
        assert payload["ai_message"]["text"] == "Hi there!"
    
    def test_list_messages(self, client):
        """Test listing messages"""
        conv = Conversation.objects.create()
        msg1 = Message.objects.create(conversation=conv, role=Message.ROLE_USER, text="First")
        msg2 = Message.objects.create(conversation=conv, role=Message.ROLE_AI, text="Second")
        
        url = f"/api/conversations/{conv.id}/messages/"
        resp = client.get(url)
        
        assert resp.status_code == 200
        data = resp.json()
        assert "results" in data
        assert len(data["results"]) == 2
    
    def test_list_messages_with_since(self, client):
        """Test listing messages with since parameter"""
        conv = Conversation.objects.create()
        msg1 = Message.objects.create(conversation=conv, role=Message.ROLE_USER, text="First")
        msg2 = Message.objects.create(conversation=conv, role=Message.ROLE_AI, text="Second")
        
        url = f"/api/conversations/{conv.id}/messages/?since=1"
        resp = client.get(url)
        
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["results"]) == 1
        assert data["results"][0]["id"] == msg2.id
    
    def test_send_message_without_gemini_key(self, client, monkeypatch):
        """Test sending message when Gemini API key is missing"""
        conv = Conversation.objects.create()
        
        # Mock missing API key
        def fake_generate_reply(history, prompt, timeout_s=10):
            raise gemini.GeminiServiceError("Gemini API key is missing")
        
        monkeypatch.setattr(gemini, "generate_reply", fake_generate_reply)
        
        url = f"/api/conversations/{conv.id}/messages/"
        resp = client.post(url, data=json.dumps({"text": "Hello"}), content_type="application/json")
        
        assert resp.status_code == 502
        data = resp.json()
        assert "detail" in data
    
    def test_send_empty_message(self, client):
        """Test sending an empty message"""
        conv = Conversation.objects.create()
        
        url = f"/api/conversations/{conv.id}/messages/"
        resp = client.post(url, data=json.dumps({"text": "   "}), content_type="application/json")
        
        assert resp.status_code == 400


@pytest.mark.django_db
class TestMessageFeedbackAPI:
    """Tests for message feedback API endpoints"""
    
    def test_create_message_feedback(self, client):
        """Test creating message feedback"""
        conv = Conversation.objects.create()
        msg = Message.objects.create(conversation=conv, role=Message.ROLE_AI, text="Test message")
        
        url = f"/api/messages/{msg.id}/feedback/"
        resp = client.post(
            url,
            data=json.dumps({"rating": 5, "comment": "Great!"}),
            content_type="application/json"
        )
        
        assert resp.status_code == 201
        data = resp.json()
        assert data["rating"] == 5
        assert data["comment"] == "Great!"
    
    def test_update_message_feedback(self, client):
        """Test updating existing message feedback"""
        conv = Conversation.objects.create()
        msg = Message.objects.create(conversation=conv, role=Message.ROLE_AI, text="Test")
        feedback = MessageFeedback.objects.create(message=msg, rating=3, comment="OK")
        
        url = f"/api/messages/{msg.id}/feedback/"
        resp = client.post(
            url,
            data=json.dumps({"rating": 5, "comment": "Actually great!"}),
            content_type="application/json"
        )
        
        assert resp.status_code == 200
        data = resp.json()
        assert data["rating"] == 5
        assert data["comment"] == "Actually great!"
    
    def test_get_message_feedback(self, client):
        """Test getting message feedback"""
        conv = Conversation.objects.create()
        msg = Message.objects.create(conversation=conv, role=Message.ROLE_AI, text="Test")
        feedback = MessageFeedback.objects.create(message=msg, rating=5, comment="Great!")
        
        url = f"/api/messages/{msg.id}/feedback/"
        resp = client.get(url)
        
        assert resp.status_code == 200
        data = resp.json()
        assert data["rating"] == 5
        assert data["comment"] == "Great!"
    
    def test_get_nonexistent_message_feedback(self, client):
        """Test getting feedback for message without feedback"""
        conv = Conversation.objects.create()
        msg = Message.objects.create(conversation=conv, role=Message.ROLE_AI, text="Test")
        
        url = f"/api/messages/{msg.id}/feedback/"
        resp = client.get(url)
        
        assert resp.status_code == 404
    
    def test_invalid_rating(self, client):
        """Test submitting feedback with invalid rating"""
        conv = Conversation.objects.create()
        msg = Message.objects.create(conversation=conv, role=Message.ROLE_AI, text="Test")
        
        url = f"/api/messages/{msg.id}/feedback/"
        resp = client.post(
            url,
            data=json.dumps({"rating": 10}),
            content_type="application/json"
        )
        
        assert resp.status_code == 400


@pytest.mark.django_db
class TestConversationFeedbackAPI:
    """Tests for conversation feedback API endpoints"""
    
    def test_create_conversation_feedback(self, client):
        """Test creating conversation feedback"""
        conv = Conversation.objects.create()
        
        url = f"/api/conversations/{conv.id}/feedback/"
        resp = client.post(
            url,
            data=json.dumps({
                "overall_rating": 5,
                "helpfulness_rating": 4,
                "accuracy_rating": 5,
                "comment": "Excellent!"
            }),
            content_type="application/json"
        )
        
        assert resp.status_code == 201
        data = resp.json()
        assert data["overall_rating"] == 5
        assert data["helpfulness_rating"] == 4
        assert data["accuracy_rating"] == 5
        assert data["comment"] == "Excellent!"
    
    def test_update_conversation_feedback(self, client):
        """Test updating existing conversation feedback"""
        conv = Conversation.objects.create()
        feedback = ConversationFeedback.objects.create(
            conversation=conv,
            overall_rating=3,
            helpfulness_rating=3,
            accuracy_rating=3
        )
        
        url = f"/api/conversations/{conv.id}/feedback/"
        resp = client.post(
            url,
            data=json.dumps({
                "overall_rating": 5,
                "helpfulness_rating": 5,
                "accuracy_rating": 5
            }),
            content_type="application/json"
        )
        
        assert resp.status_code == 200
        data = resp.json()
        assert data["overall_rating"] == 5
    
    def test_get_conversation_feedback(self, client):
        """Test getting conversation feedback"""
        conv = Conversation.objects.create()
        feedback = ConversationFeedback.objects.create(
            conversation=conv,
            overall_rating=5,
            helpfulness_rating=4,
            accuracy_rating=5,
            comment="Great!"
        )
        
        url = f"/api/conversations/{conv.id}/feedback/"
        resp = client.get(url)
        
        assert resp.status_code == 200
        data = resp.json()
        assert data["overall_rating"] == 5
        assert data["comment"] == "Great!"
    
    def test_get_nonexistent_conversation_feedback(self, client):
        """Test getting feedback for conversation without feedback"""
        conv = Conversation.objects.create()
        
        url = f"/api/conversations/{conv.id}/feedback/"
        resp = client.get(url)
        
        assert resp.status_code == 404
    
    def test_invalid_ratings(self, client):
        """Test submitting feedback with invalid ratings"""
        conv = Conversation.objects.create()
        
        url = f"/api/conversations/{conv.id}/feedback/"
        resp = client.post(
            url,
            data=json.dumps({
                "overall_rating": 10,
                "helpfulness_rating": 4,
                "accuracy_rating": 5
            }),
            content_type="application/json"
        )
        
        assert resp.status_code == 400


@pytest.mark.django_db
class TestInsightsAPI:
    """Tests for insights API endpoint"""
    
    def test_get_insights(self, client):
        """Test getting insights data"""
        # Create some feedback
        conv = Conversation.objects.create()
        msg = Message.objects.create(conversation=conv, role=Message.ROLE_AI, text="Test")
        MessageFeedback.objects.create(message=msg, rating=5)
        ConversationFeedback.objects.create(
            conversation=conv,
            overall_rating=5,
            helpfulness_rating=5,
            accuracy_rating=5
        )
        
        url = "/api/feedback/insights/"
        resp = client.get(url)
        
        assert resp.status_code == 200
        data = resp.json()
        assert "message_feedback" in data
        assert "conversation_feedback" in data
        assert "period_days" in data
    
    def test_get_insights_with_custom_days(self, client):
        """Test getting insights with custom time period"""
        url = "/api/feedback/insights/?days=7"
        resp = client.get(url)
        
        assert resp.status_code == 200
        data = resp.json()
        assert data["period_days"] == 7
