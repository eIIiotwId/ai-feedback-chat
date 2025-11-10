from django.urls import path

from . import views


urlpatterns = [
    path("conversations/", views.ConversationListCreateView.as_view(), name="conversation-list-create"),
    path("conversations/<int:pk>/", views.ConversationDetailView.as_view(), name="conversation-detail"),
    path("conversations/<int:pk>/messages/", views.MessageListCreateView.as_view(), name="message-list-create"),
    path("messages/<int:message_id>/feedback/", views.MessageFeedbackView.as_view(), name="message-feedback"),
    path("conversations/<int:conversation_id>/feedback/", views.ConversationFeedbackView.as_view(), name="conversation-feedback"),
    path("feedback/insights/", views.FeedbackInsightsView.as_view(), name="feedback-insights"),
    path("conversations/generate-title/", views.generate_conversation_title, name="generate-title"),
    path("insights/", views.insights_view, name="insights"),
]

