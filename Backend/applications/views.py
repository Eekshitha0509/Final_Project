from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework.parsers import JSONParser
from .models import HostelApplication
from .serializers import HostelApplicationSerializer


class HostelApplicationViewSet(viewsets.ModelViewSet):
    queryset = HostelApplication.objects.all()
    serializer_class = HostelApplicationSerializer


@api_view(['POST'])
def submit_profile(request):

    serializer = HostelApplicationSerializer(
        data=request.data,
        partial=True  # ⭐ MOST IMPORTANT FIX
    )

    if serializer.is_valid():
        serializer.save()
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED
        )

    print(serializer.errors)
    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST
    )

@api_view(['GET'])
def test_api(request):
    return Response({"message": "Backend connected"})

@api_view(['GET'])
def hostel_list(request):
    data = {"message": "Hostel list API working"}
    return Response(data)