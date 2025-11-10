from __future__ import annotations

from django.db import models, transaction
from django.utils import timezone


class Conversation(models.Model):
    title = models.CharField(max_length=200, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at", "id"]

    def __str__(self) -> str:  # pragma: no cover
        return self.title or f"Conversation {self.pk}"


class Message(models.Model):
    ROLE_USER = "user"
    ROLE_AI = "ai"
    ROLE_CHOICES = (
        (ROLE_USER, "User"),
        (ROLE_AI, "AI"),
    )

    conversation = models.ForeignKey(Conversation, related_name="messages", on_delete=models.CASCADE)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    sequence = models.PositiveIntegerField()

    class Meta:
        ordering = ["sequence", "id"]
        unique_together = ("conversation", "sequence")
        indexes = [
            models.Index(fields=["conversation", "sequence"]),
        ]

    def save(self, *args, **kwargs):
        if self.sequence is None:
            with transaction.atomic():
                last = (
                    Message.objects.select_for_update()
                    .filter(conversation=self.conversation)
                    .order_by("-sequence")
                    .first()
                )
                self.sequence = 1 if last is None else last.sequence + 1
                super().save(*args, **kwargs)
        else:
            super().save(*args, **kwargs)
        Conversation.objects.filter(pk=self.conversation_id).update(updated_at=timezone.now())

    def __str__(self) -> str:  # pragma: no cover
        return f"{self.conversation_id}#{self.sequence}:{self.role}"


class MessageFeedback(models.Model):
    RATING_CHOICES = (
        (1, "Very Poor"),
        (2, "Poor"),
        (3, "Fair"),
        (4, "Good"),
        (5, "Excellent"),
    )
    
    message = models.OneToOneField(Message, related_name="feedback", on_delete=models.CASCADE)
    rating = models.PositiveIntegerField(choices=RATING_CHOICES)
    comment = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ["-created_at"]
    
    def __str__(self) -> str:  # pragma: no cover
        return f"Feedback for {self.message}: {self.rating}/5"


class ConversationFeedback(models.Model):
    RATING_CHOICES = (
        (1, "Very Poor"),
        (2, "Poor"),
        (3, "Fair"),
        (4, "Good"),
        (5, "Excellent"),
    )
    
    conversation = models.OneToOneField(Conversation, related_name="feedback", on_delete=models.CASCADE)
    overall_rating = models.PositiveIntegerField(choices=RATING_CHOICES)
    helpfulness_rating = models.PositiveIntegerField(choices=RATING_CHOICES)
    accuracy_rating = models.PositiveIntegerField(choices=RATING_CHOICES)
    comment = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ["-created_at"]
    
    def __str__(self) -> str:  # pragma: no cover
        return f"Feedback for {self.conversation}: {self.overall_rating}/5"

