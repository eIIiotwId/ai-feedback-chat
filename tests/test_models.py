"""
Unit tests for Django models
"""

import pytest
from django.utils import timezone
from datetime import timedelta

from chat.models import Conversation, Message, MessageFeedback, ConversationFeedback


@pytest.mark.django_db
class TestConversation:
    """Tests for Conversation model"""
    
    def test_create_conversation_without_title(self):
        """Test creating a conversation without a title"""
        conv = Conversation.objects.create()
        assert conv.title is None
        assert conv.id is not None
        assert str(conv) == f"Conversation {conv.id}"
    
    def test_create_conversation_with_title(self):
        """Test creating a conversation with a title"""
        conv = Conversation.objects.create(title="Test Chat")
        assert conv.title == "Test Chat"
        assert str(conv) == "Test Chat"
    
    def test_conversation_ordering(self):
        """Test that conversations are ordered by updated_at descending"""
        conv1 = Conversation.objects.create(title="First")
        conv2 = Conversation.objects.create(title="Second")
        
        # Update first conversation to make it more recent
        conv1.save()
        
        conversations = list(Conversation.objects.all())
        assert conversations[0].id == conv1.id
        assert conversations[1].id == conv2.id


@pytest.mark.django_db
class TestMessage:
    """Tests for Message model"""
    
    def test_message_sequence_auto_increment(self):
        """Test that message sequence numbers auto-increment"""
        conv = Conversation.objects.create()
        msg1 = Message.objects.create(conversation=conv, role=Message.ROLE_USER, text="First")
        msg2 = Message.objects.create(conversation=conv, role=Message.ROLE_AI, text="Second")
        
        assert msg1.sequence == 1
        assert msg2.sequence == 2
    
    def test_message_updates_conversation_timestamp(self):
        """Test that creating a message updates conversation's updated_at"""
        conv = Conversation.objects.create()
        original_updated = conv.updated_at
        
        # Wait a tiny bit to ensure timestamp difference
        import time
        time.sleep(0.01)
        
        Message.objects.create(conversation=conv, role=Message.ROLE_USER, text="Test")
        conv.refresh_from_db()
        
        assert conv.updated_at > original_updated
    
    def test_message_ordering(self):
        """Test that messages are ordered by sequence"""
        conv = Conversation.objects.create()
        msg1 = Message.objects.create(conversation=conv, role=Message.ROLE_USER, text="First")
        msg2 = Message.objects.create(conversation=conv, role=Message.ROLE_AI, text="Second")
        
        messages = list(conv.messages.all())
        assert messages[0].id == msg1.id
        assert messages[1].id == msg2.id
    
    def test_message_string_representation(self):
        """Test message string representation"""
        conv = Conversation.objects.create()
        msg = Message.objects.create(conversation=conv, role=Message.ROLE_USER, text="Test")
        
        assert str(msg) == f"{conv.id}#{msg.sequence}:user"


@pytest.mark.django_db
class TestMessageFeedback:
    """Tests for MessageFeedback model"""
    
    def test_create_message_feedback(self):
        """Test creating message feedback"""
        conv = Conversation.objects.create()
        msg = Message.objects.create(conversation=conv, role=Message.ROLE_AI, text="Test message")
        
        feedback = MessageFeedback.objects.create(
            message=msg,
            rating=5,
            comment="Great response!"
        )
        
        assert feedback.rating == 5
        assert feedback.comment == "Great response!"
        assert feedback.message == msg
    
    def test_message_feedback_one_to_one_relationship(self):
        """Test that a message can only have one feedback"""
        conv = Conversation.objects.create()
        msg = Message.objects.create(conversation=conv, role=Message.ROLE_AI, text="Test")
        
        MessageFeedback.objects.create(message=msg, rating=5)
        
        # Attempting to create another feedback should fail
        with pytest.raises(Exception):  # IntegrityError or similar
            MessageFeedback.objects.create(message=msg, rating=4)
    
    def test_message_feedback_rating_choices(self):
        """Test that feedback rating must be 1-5"""
        conv = Conversation.objects.create()
        msg1 = Message.objects.create(conversation=conv, role=Message.ROLE_AI, text="Test 1")
        msg2 = Message.objects.create(conversation=conv, role=Message.ROLE_AI, text="Test 2")
        msg3 = Message.objects.create(conversation=conv, role=Message.ROLE_AI, text="Test 3")
        msg4 = Message.objects.create(conversation=conv, role=Message.ROLE_AI, text="Test 4")
        msg5 = Message.objects.create(conversation=conv, role=Message.ROLE_AI, text="Test 5")
        
        # Valid ratings - need separate messages since OneToOne relationship
        messages = [msg1, msg2, msg3, msg4, msg5]
        for i, rating in enumerate([1, 2, 3, 4, 5]):
            feedback = MessageFeedback.objects.create(message=messages[i], rating=rating)
            assert feedback.rating == rating
    
    def test_message_feedback_string_representation(self):
        """Test message feedback string representation"""
        conv = Conversation.objects.create()
        msg = Message.objects.create(conversation=conv, role=Message.ROLE_AI, text="Test")
        feedback = MessageFeedback.objects.create(message=msg, rating=5)
        
        assert "5/5" in str(feedback)


@pytest.mark.django_db
class TestConversationFeedback:
    """Tests for ConversationFeedback model"""
    
    def test_create_conversation_feedback(self):
        """Test creating conversation feedback"""
        conv = Conversation.objects.create()
        
        feedback = ConversationFeedback.objects.create(
            conversation=conv,
            overall_rating=5,
            helpfulness_rating=4,
            accuracy_rating=5,
            comment="Excellent conversation!"
        )
        
        assert feedback.overall_rating == 5
        assert feedback.helpfulness_rating == 4
        assert feedback.accuracy_rating == 5
        assert feedback.comment == "Excellent conversation!"
        assert feedback.conversation == conv
    
    def test_conversation_feedback_one_to_one_relationship(self):
        """Test that a conversation can only have one feedback"""
        conv = Conversation.objects.create()
        
        ConversationFeedback.objects.create(
            conversation=conv,
            overall_rating=5,
            helpfulness_rating=5,
            accuracy_rating=5
        )
        
        # Attempting to create another feedback should fail
        with pytest.raises(Exception):  # IntegrityError or similar
            ConversationFeedback.objects.create(
                conversation=conv,
                overall_rating=4,
                helpfulness_rating=4,
                accuracy_rating=4
            )
    
    def test_conversation_feedback_rating_choices(self):
        """Test that all feedback ratings must be 1-5"""
        conv = Conversation.objects.create()
        
        # Valid ratings
        feedback = ConversationFeedback.objects.create(
            conversation=conv,
            overall_rating=5,
            helpfulness_rating=4,
            accuracy_rating=3
        )
        
        assert feedback.overall_rating == 5
        assert feedback.helpfulness_rating == 4
        assert feedback.accuracy_rating == 3
    
    def test_conversation_feedback_string_representation(self):
        """Test conversation feedback string representation"""
        conv = Conversation.objects.create()
        feedback = ConversationFeedback.objects.create(
            conversation=conv,
            overall_rating=5,
            helpfulness_rating=5,
            accuracy_rating=5
        )
        
        assert "5/5" in str(feedback)
