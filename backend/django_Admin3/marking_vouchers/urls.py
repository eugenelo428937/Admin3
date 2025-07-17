from django.urls import path
from . import views

urlpatterns = [
    # Marking voucher endpoints
    path('', views.MarkingVoucherListView.as_view(), name='marking-voucher-list'),
    path('<int:pk>/', views.MarkingVoucherDetailView.as_view(), name='marking-voucher-detail'),
    
    # Cart operations
    path('add-to-cart/', views.add_voucher_to_cart, name='add-voucher-to-cart'),
]