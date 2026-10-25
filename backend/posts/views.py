from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Post
from .serializers import PostSerializer


@api_view(["GET", "POST", "DELETE" , "PATCH"])
def post_detail(request, post_id=None):

    if request.method == "GET":

        if post_id is not None:
            post = get_object_or_404(Post, id=post_id)

            serializer = PostSerializer(
                post,
                context={"request": request},
            )

            return Response(serializer.data)

        posts = Post.objects.all()

        serializer = PostSerializer(
            posts,
            many=True,
            context={"request": request},
        )

        return Response(serializer.data)

    elif request.method == "POST":
        serializer = PostSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)

        return Response(serializer.errors, status=400)

    elif request.method == "PATCH":
        post = get_object_or_404(Post, id=post_id)
        serializer = PostSerializer(post, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response(serializer.errors, status=400)
