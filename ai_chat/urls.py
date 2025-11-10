from django.contrib import admin
from django.urls import path, include
from django.views.generic import TemplateView
from chat.views import insights_view


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("chat.urls")),
    path("insights/", insights_view, name="insights"),
    path("", TemplateView.as_view(template_name="index.html"), name="index"),
]
