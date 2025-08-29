import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, CheckCircle, FileText, ShoppingCart, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface Notification {
  id: number;
  type: 'guest_assessment' | 'guest_quote';
  title: string;
  message: string;
  relatedId: number;
  clientName: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationPopup() {
  const [showPopup, setShowPopup] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  // Fetch unread notifications only if authenticated
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    refetchInterval: 30000, // Refresh every 30 seconds
    enabled: !!isAuthenticated, // Only run query when user is authenticated
  });

  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to mark as read');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to mark all as read');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      setShowPopup(false);
      toast({
        title: "Sukces",
        description: "Wszystkie powiadomienia zostały oznaczone jako przeczytane",
      });
    },
  });

  // Show popup when there are new notifications
  useEffect(() => {
    if (notifications.length > 0 && !showPopup) {
      setShowPopup(true);
    }
  }, [notifications.length, showPopup]);

  const handleMarkAsRead = (notificationId: number) => {
    markAsReadMutation.mutate(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'guest_assessment':
        return <FileText className="w-5 h-5 text-blue-600" />;
      case 'guest_quote':
        return <ShoppingCart className="w-5 h-5 text-green-600" />;
      default:
        return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  const getNotificationBadgeColor = (type: string) => {
    switch (type) {
      case 'guest_assessment':
        return 'bg-blue-100 text-blue-800';
      case 'guest_quote':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isAuthenticated || isLoading || notifications.length === 0) {
    return null;
  }

  return (
    <Dialog open={showPopup} onOpenChange={setShowPopup}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-yellow-500" />
            Nowe powiadomienia ({notifications.length})
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-96 pr-4">
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <div className="flex-shrink-0 mt-1">
                  {getNotificationIcon(notification.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-medium text-gray-900 text-sm">
                      {notification.title}
                    </h4>
                    <Badge 
                      variant="secondary" 
                      className={`text-xs flex-shrink-0 ${getNotificationBadgeColor(notification.type)}`}
                    >
                      {notification.type === 'guest_assessment' ? 'Badanie' : 'Wycena'}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-gray-700 mb-2">
                    {notification.message}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      <span className="font-medium">Klient:</span> {notification.clientName}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(notification.createdAt).toLocaleDateString('pl-PL')} {' '}
                      {new Date(notification.createdAt).toLocaleTimeString('pl-PL', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleMarkAsRead(notification.id)}
                  disabled={markAsReadMutation.isPending}
                  className="flex-shrink-0"
                >
                  <CheckCircle className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => setShowPopup(false)}
            className="flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Zamknij
          </Button>
          <Button
            onClick={handleMarkAllAsRead}
            disabled={markAllAsReadMutation.isPending}
            className="flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Oznacz wszystkie jako przeczytane
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}