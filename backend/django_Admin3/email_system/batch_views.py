from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from email_system.authentication import ExternalApiKeyAuthentication
from email_system.batch_serializers import SendBatchRequestSerializer
from email_system.services.batch_service import email_batch_service


class ApiKeyIsAuthenticated(IsAuthenticated):
    """Permission that checks the request was authenticated via API key."""
    def has_permission(self, request, view):
        return request.auth is not None and hasattr(request.auth, 'key_hash')


@api_view(['POST'])
@authentication_classes([ExternalApiKeyAuthentication])
@permission_classes([ApiKeyIsAuthenticated])
def send_batch(request):
    serializer = SendBatchRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    api_key = request.auth
    user = api_key.user

    # Use authenticated user's ID for requested_by
    if user:
        requested_by = str(user.id)
    else:
        requested_by = api_key.name

    try:
        result = email_batch_service.send_batch(
            template_id=data['template_id'],
            requested_by=requested_by,
            notify_emails=data.get('notify_emails', []),
            items=data['items'],
            api_key=api_key,
            user=user,
        )
    except ValueError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    return Response({'batch': result}, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@authentication_classes([ExternalApiKeyAuthentication])
@permission_classes([ApiKeyIsAuthenticated])
def query_batch(request, batch_id):
    api_key = request.auth
    result = email_batch_service.query_batch(str(batch_id), api_key)

    if result is None:
        return Response({'error': 'Batch not found'}, status=status.HTTP_404_NOT_FOUND)

    return Response(result, status=status.HTTP_200_OK)
