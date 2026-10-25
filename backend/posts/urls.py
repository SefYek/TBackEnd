from django.urls import path
from .views import post_detail

urlpatterns = [
    path("posts/", post_detail, name="post-list"),
    path("posts/<int:post_id>/", post_detail, name="post-detail"),
]