"""
Unit tests for DRF serializers
"""

import pytest
from rest_framework.exceptions import ValidationError

from chat.models import Conversation, Message, MessageFeedback, ConversationFeedback
from chat.serializers import (
    ConversationSerializer,
    MessageSerializer,
    CreateMessageSerializer,
    MessageFeedbackSerializer,
    ConversationFeedbackSerializer
)


@pytest.mark.django_db
class TestConversationSerializer:
    """Tests for ConversationSerializer"""
    
    def test_serialize_conversation(self):
        """Test serializing a conversation"""
        conv = Conversation.objects.create(title="Test Chat")
        serializer = ConversationSerializer(conv)
        
        data = serializer.data
        assert data["id"] == conv.id
        assert data["title"] == "Test Chat"
        assert "created_at" in data
        assert "updated_at" in data
    
    def test_deserialize_conversation(self):
        """Test deserializing conversation data"""
        data = {"title": "New Chat"}
        serializer = ConversationSerializer(data=data)
        
        assert serializer.is_valid()
        conv = serializer.save()
        assert conv.title == "New Chat"


@pytest.mark.django_db
class TestCreateMessageSerializer:
    """Tests for CreateMessageSerializer"""
    
    def test_valid_message_text(self):
        """Test valid message text"""
        serializer = CreateMessageSerializer(data={"text": "Hello, world!"})
        assert serializer.is_valid()
        assert serializer.validated_data["text"] == "Hello, world!"
    
    def test_empty_message_text(self):
        """Test that empty message text is rejected"""
        serializer = CreateMessageSerializer(data={"text": "   "})
        assert not serializer.is_valid()
        assert "text" in serializer.errors
    
    def test_whitespace_trimming(self):
        """Test that whitespace is trimmed"""
        serializer = CreateMessageSerializer(data={"text": "  Hello  "})
        assert serializer.is_valid()
        assert serializer.validated_data["text"] == "Hello"


@pytest.mark.django_db
class TestMessageSerializer:
    """Tests for MessageSerializer"""
    
    def test_serialize_message_with_feedback(self):
        """Test serializing a message with feedback"""
        conv = Conversation.objects.create()
        msg = Message.objects.create(conversation=conv, role=Message.ROLE_AI, text="Test")
        feedback = MessageFeedback.objects.create(message=msg, rating=5, comment="Great!")
        
        serializer = MessageSerializer(msg)
        data = serializer.data
        
        assert data["id"] == msg.id
        assert data["text"] == "Test"
        assert data["feedback"] is not None
        assert data["feedback"]["rating"] == 5
        assert data["feedback"]["comment"] == "Great!"
    
    def test_serialize_message_without_feedback(self):
        """Test serializing a message without feedback"""
        conv = Conversation.objects.create()
        msg = Message.objects.create(conversation=conv, role=Message.ROLE_AI, text="Test")
        
        serializer = MessageSerializer(msg)
        data = serializer.data
        
        assert data["id"] == msg.id
        assert data["feedback"] is None


@pytest.mark.django_db
class TestMessageFeedbackSerializer:
    """Tests for MessageFeedbackSerializer"""
    
    def test_valid_rating(self):
        """Test valid rating values"""
        conv = Conversation.objects.create()
        msg = Message.objects.create(conversation=conv, role=Message.ROLE_AI, text="Test")
        
        for rating in [1, 2, 3, 4, 5]:
            serializer = MessageFeedbackSerializer(data={"rating": rating})
            assert serializer.is_valid(), f"Rating {rating} should be valid"
    
    def test_invalid_rating_too_low(self):
        """Test that rating below 1 is rejected"""
        serializer = MessageFeedbackSerializer(data={"rating": 0})
        assert not serializer.is_valid()
        assert "rating" in serializer.errors
    
    def test_invalid_rating_too_high(self):
        """Test that rating above 5 is rejected"""
        serializer = MessageFeedbackSerializer(data={"rating": 6})
        assert not serializer.is_valid()
        assert "rating" in serializer.errors
    
    def test_serialize_message_feedback(self):
        """Test serializing message feedback"""
        conv = Conversation.objects.create(title="Test Chat")
        msg = Message.objects.create(conversation=conv, role=Message.ROLE_AI, text="Test")
        feedback = MessageFeedback.objects.create(message=msg, rating=5, comment="Great!")
        
        serializer = MessageFeedbackSerializer(feedback)
        data = serializer.data
        
        assert data["rating"] == 5
        assert data["comment"] == "Great!"
        assert data["conversation_id"] == conv.id
        assert data["conversation_title"] == "Test Chat"


@pytest.mark.django_db
class TestConversationFeedbackSerializer:
    """Tests for ConversationFeedbackSerializer"""
    
    def test_valid_ratings(self):
        """Test valid rating values for all fields"""
        conv = Conversation.objects.create()
        
        data = {
            "overall_rating": 5,
            "helpfulness_rating": 4,
            "accuracy_rating": 3
        }
        serializer = ConversationFeedbackSerializer(data=data)
        assert serializer.is_valid()
    
    def test_invalid_overall_rating(self):
        """Test that invalid overall rating is rejected"""
        serializer = ConversationFeedbackSerializer(data={
            "overall_rating": 10,
            "helpfulness_rating": 5,
            "accuracy_rating": 5
        })
        assert not serializer.is_valid()
        assert "overall_rating" in serializer.errors
    
    def test_invalid_helpfulness_rating(self):
        """Test that invalid helpfulness rating is rejected"""
        serializer = ConversationFeedbackSerializer(data={
            "overall_rating": 5,
            "helpfulness_rating": 0,
            "accuracy_rating": 5
        })
        assert not serializer.is_valid()
        assert "helpfulness_rating" in serializer.errors
    
    def test_invalid_accuracy_rating(self):
        """Test that invalid accuracy rating is rejected"""
        serializer = ConversationFeedbackSerializer(data={
            "overall_rating": 5,
            "helpfulness_rating": 5,
            "accuracy_rating": 6
        })
        assert not serializer.is_valid()
        assert "accuracy_rating" in serializer.errors
    
    def test_serialize_conversation_feedback(self):
        """Test serializing conversation feedback"""
        conv = Conversation.objects.create(title="Test Chat")
        feedback = ConversationFeedback.objects.create(
            conversation=conv,
            overall_rating=5,
            helpfulness_rating=4,
            accuracy_rating=5,
            comment="Excellent!"
        )
        
        serializer = ConversationFeedbackSerializer(feedback)
        data = serializer.data
        
        assert data["overall_rating"] == 5
        assert data["helpfulness_rating"] == 4
        assert data["accuracy_rating"] == 5
        assert data["comment"] == "Excellent!"
        assert data["conversation_title"] == "Test Chat"

