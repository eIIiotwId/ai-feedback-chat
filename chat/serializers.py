from rest_framework import serializers

from .models import Conversation, Message, MessageFeedback, ConversationFeedback


class ConversationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Conversation
        fields = ["id", "title", "created_at", "updated_at"]


class MessageFeedbackNestedSerializer(serializers.ModelSerializer):
    """Nested serializer for message feedback"""
    class Meta:
        model = MessageFeedback
        fields = ["id", "rating", "comment", "created_at"]
        read_only_fields = ["id", "created_at"]


class MessageSerializer(serializers.ModelSerializer):
    feedback = MessageFeedbackNestedSerializer(read_only=True, required=False, allow_null=True)
    
    class Meta:
        model = Message
        fields = ["id", "conversation", "role", "text", "created_at", "sequence", "feedback"]
        read_only_fields = ["id", "created_at", "sequence", "conversation", "role", "feedback"]


class CreateMessageSerializer(serializers.Serializer):
    text = serializers.CharField(max_length=1000, allow_blank=False, trim_whitespace=True)

    def validate_text(self, value: str) -> str:
        text = value.strip()
        if not text:
            raise serializers.ValidationError("Message text cannot be empty.")
        return text


class MessageFeedbackSerializer(serializers.ModelSerializer):
    conversation_id = serializers.IntegerField(source='message.conversation.id', read_only=True)
    conversation_title = serializers.CharField(source='message.conversation.title', read_only=True)
    
    class Meta:
        model = MessageFeedback
        fields = ["id", "message", "conversation_id", "conversation_title", "rating", "comment", "created_at", "updated_at"]
        read_only_fields = ["id", "message", "created_at", "updated_at"]

    def validate_rating(self, value: int) -> int:
        if not 1 <= value <= 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value


class ConversationFeedbackSerializer(serializers.ModelSerializer):
    conversation_title = serializers.CharField(source='conversation.title', read_only=True)
    
    class Meta:
        model = ConversationFeedback
        fields = ["id", "conversation", "conversation_title", "overall_rating", "helpfulness_rating", "accuracy_rating", "comment", "created_at", "updated_at"]
        read_only_fields = ["id", "conversation", "created_at", "updated_at"]

    def validate_overall_rating(self, value: int) -> int:
        if not 1 <= value <= 5:
            raise serializers.ValidationError("Overall rating must be between 1 and 5.")
        return value

    def validate_helpfulness_rating(self, value: int) -> int:
        if not 1 <= value <= 5:
            raise serializers.ValidationError("Helpfulness rating must be between 1 and 5.")
        return value

    def validate_accuracy_rating(self, value: int) -> int:
        if not 1 <= value <= 5:
            raise serializers.ValidationError("Accuracy rating must be between 1 and 5.")
        return value

