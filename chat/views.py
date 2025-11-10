from __future__ import annotations

from typing import Any

from django.shortcuts import get_object_or_404, render
from django.db.models import QuerySet
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Conversation, Message, MessageFeedback, ConversationFeedback
from .serializers import (
    ConversationSerializer,
    MessageSerializer,
    CreateMessageSerializer,
    MessageFeedbackSerializer,
    ConversationFeedbackSerializer,
)
from .services import gemini


class ConversationListCreateView(APIView):
    def get(self, request: Request) -> Response:
        qs: QuerySet[Conversation] = Conversation.objects.all().order_by("-updated_at")
        try:
            limit = min(int(request.query_params.get("limit", 20)), 100)
        except ValueError:
            limit = 20
        try:
            offset = int(request.query_params.get("offset", 0))
        except ValueError:
            offset = 0
        items = qs[offset : offset + limit]
        data = ConversationSerializer(items, many=True).data
        return Response({"results": data, "count": qs.count(), "offset": offset, "limit": limit})

    def post(self, request: Request) -> Response:
        title = (request.data or {}).get("title")
        conv = Conversation.objects.create(title=title or None)
        return Response(ConversationSerializer(conv).data, status=status.HTTP_201_CREATED)


class ConversationDetailView(APIView):
    def get(self, request: Request, pk: int) -> Response:
        conv = get_object_or_404(Conversation, pk=pk)
        return Response(ConversationSerializer(conv).data)

    def patch(self, request: Request, pk: int) -> Response:
        conv = get_object_or_404(Conversation, pk=pk)
        serializer = ConversationSerializer(conv, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request: Request, pk: int) -> Response:
        conv = get_object_or_404(Conversation, pk=pk)
        conv.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MessageListCreateView(APIView):
    def get(self, request: Request, pk: int) -> Response:
        conv = get_object_or_404(Conversation, pk=pk)
        try:
            since = int(request.query_params.get("since", 0))
        except ValueError:
            since = 0
        try:
            limit = min(int(request.query_params.get("limit", 50)), 200)
        except ValueError:
            limit = 50
        qs = conv.messages.all()
        if since:
            qs = qs.filter(sequence__gt=since)
        qs = qs.order_by("sequence")[:limit]
        results = list(qs)
        return Response({
            "results": MessageSerializer(results, many=True).data,
            "lastSeq": (results[-1].sequence if results else since),
        })

    def post(self, request: Request, pk: int) -> Response:
        conv = get_object_or_404(Conversation, pk=pk)
        serializer = CreateMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        text: str = serializer.validated_data["text"].strip()

        # Persist user message
        user_msg = Message.objects.create(conversation=conv, role=Message.ROLE_USER, text=text)

        # Build short history context (last 10 messages)
        history = list(
            conv.messages.order_by("-sequence").values("role", "text")[:10]
        )[::-1]

        try:
            reply = gemini.generate_reply(history=history, prompt=text, timeout_s=30)
        except gemini.GeminiServiceError as e:
            # Remove user message to keep integrity if AI fails? We keep it and surface 502.
            return Response({"detail": str(e)}, status=status.HTTP_502_BAD_GATEWAY)

        ai_msg = Message.objects.create(conversation=conv, role=Message.ROLE_AI, text=reply)
        return Response({
            "user_message": MessageSerializer(user_msg).data,
            "ai_message": MessageSerializer(ai_msg).data,
        }, status=status.HTTP_201_CREATED)


class MessageFeedbackView(APIView):
    def post(self, request: Request, message_id: int) -> Response:
        message = get_object_or_404(Message, pk=message_id)
        
        try:
            feedback = MessageFeedback.objects.get(message=message)
            serializer = MessageFeedbackSerializer(feedback, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        except MessageFeedback.DoesNotExist:
            serializer = MessageFeedbackSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save(message=message)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    def get(self, request: Request, message_id: int) -> Response:
        message = get_object_or_404(Message, pk=message_id)
        try:
            feedback = MessageFeedback.objects.get(message=message)
            serializer = MessageFeedbackSerializer(feedback)
            return Response(serializer.data)
        except MessageFeedback.DoesNotExist:
            return Response({"detail": "No feedback found for this message"}, status=status.HTTP_404_NOT_FOUND)


class ConversationFeedbackView(APIView):
    def post(self, request: Request, conversation_id: int) -> Response:
        conversation = get_object_or_404(Conversation, pk=conversation_id)
        
        try:
            feedback = ConversationFeedback.objects.get(conversation=conversation)
            serializer = ConversationFeedbackSerializer(feedback, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        except ConversationFeedback.DoesNotExist:
            serializer = ConversationFeedbackSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save(conversation=conversation)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    def get(self, request: Request, conversation_id: int) -> Response:
        conversation = get_object_or_404(Conversation, pk=conversation_id)
        try:
            feedback = ConversationFeedback.objects.get(conversation=conversation)
            serializer = ConversationFeedbackSerializer(feedback)
            return Response(serializer.data)
        except ConversationFeedback.DoesNotExist:
            return Response({"detail": "No feedback found for this conversation"}, status=status.HTTP_404_NOT_FOUND)


class FeedbackInsightsView(APIView):
    def get(self, request: Request) -> Response:
        from .utils.insights import get_insights_data
        from .serializers import MessageFeedbackSerializer, ConversationFeedbackSerializer
        
        # Get date range from query params (default to last 30 days)
        days = int(request.query_params.get('days', 30))
        insights_data = get_insights_data(days)
        
        return Response({
            'period_days': insights_data['period_days'],
            'message_feedback': {
                **insights_data['message_feedback'],
                'recent_feedback': MessageFeedbackSerializer(insights_data['recent_message_feedback'], many=True).data
            },
            'conversation_feedback': {
                **insights_data['conversation_feedback'],
                'recent_feedback': ConversationFeedbackSerializer(insights_data['recent_conversation_feedback'], many=True).data
            }
        })


@api_view(['POST'])
def generate_conversation_title(request):
    """Generate a conversation title based on the first user message."""
    from .utils.title_generation import generate_title_with_gemini, generate_fallback_title
    
    try:
        message = request.data.get('message', '')
        
        if not message:
            return Response({'error': 'Message is required'}, status=400)
        
        title = generate_title_with_gemini(message)
        
        if title:
            return Response({'title': title})
        else:
            # Fallback to simple title
            title = generate_fallback_title(message)
            return Response({'title': title})
        
    except Exception as e:
        print(f"Error generating title: {e}")
        return Response({'error': f'Failed to generate title: {str(e)}'}, status=500)


def insights_view(request):
    """Simple view to serve the insights dashboard page."""
    return render(request, 'insights.html')
