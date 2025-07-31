from django.shortcuts import render
from rest_framework import viewsets, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Expense
from .serializers import ExpenseSerializer
from .filters import ExpenseFilter

class IsOwnerOrReadOnly(permissions.BasePermission):
    """Permite que apenas o dono edite/deletar, staff pode tudo."""
    def has_object_permission(self, request, view, obj):
        if request.user and request.user.is_staff:
            return True
        if request.method in permissions.SAFE_METHODS:
            return obj.user == request.user
        return obj.user == request.user

class ExpenseViewSet(viewsets.ModelViewSet):
    """ViewSet para gerenciar despesas."""
    serializer_class = ExpenseSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = ExpenseFilter
    search_fields = ['description', 'category']
    ordering_fields = ['date', 'value', 'category']
    ordering = ['-date']
    
    def get_object(self):
        obj = Expense.objects.get(pk=self.kwargs["pk"])
        self.check_object_permissions(self.request, obj)
        return obj

    def get_queryset(self):
        return Expense.objects.for_user(self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

