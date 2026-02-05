import { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import socketService from '../services/socketService';
import axiosInstance from '../api/axiosInstance';

const notificationReducer = (state, action) => {
  switch (action.type) {
    case 'SET_NOTIFICATIONS':
      return {
        ...state,
        notifications: action.payload,
        loading: false
      };
    case 'ADD_NOTIFICATION':
      // Prevent duplicate notifications in state
      const exists = state.notifications.some(n => n._id === action.payload._id);
      if (exists) return state;

      return {
        ...state,
        notifications: [action.payload, ...state.notifications],
        unreadCount: state.unreadCount + 1
      };
    case 'MARK_AS_READ':
      return {
        ...state,
        notifications: state.notifications.filter(notif => notif._id !== action.payload.notificationId),
        unreadCount: Math.max(0, state.unreadCount - 1)
      };
    case 'MARK_ALL_AS_READ':
      return {
        ...state,
        notifications: [],
        unreadCount: 0
      };
    case 'DELETE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(notif => notif._id !== action.payload.notificationId),
        unreadCount: Math.max(0, state.unreadCount - (action.payload.wasUnread ? 1 : 0))
      };
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        loading: false
      };
    case 'SET_SOCKET_STATUS':
      return {
        ...state,
        socketConnected: action.payload
      };
    case 'SHOW_TOAST':
      return {
        ...state,
        toast: { visible: true, message: action.payload }
      };
    case 'HIDE_TOAST':
      return {
        ...state,
        toast: { ...state.toast, visible: false }
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      };
    case 'SET_UNREAD_COUNT':
      return {
        ...state,
        unreadCount: action.payload
      };
    case 'CLEAR_DATA':
      return {
        ...initialState,
        socketConnected: false
      };
    default:
      return state;
  }
};

const initialState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  socketConnected: false,
  toast: { visible: false, message: '' }
};

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [state, dispatch] = useReducer(notificationReducer, initialState);
  const hasLoadedNotifications = useRef(false);

  useEffect(() => {
    const handleSocketConnected = () => {
      console.log('🔗 [NotificationContext] Socket connection confirmed');
      dispatch({ type: 'SET_SOCKET_STATUS', payload: true });
    };
    const handleSocketDisconnected = () => {
      console.log('❌ [NotificationContext] Socket disconnected');
      dispatch({ type: 'SET_SOCKET_STATUS', payload: false });
    };
    const handleSocketError = (data) => {
      console.error('⚠️ [NotificationContext] Socket error:', data.error);
      dispatch({ type: 'SET_ERROR', payload: data.error });
    };
    const handleNotification = (notification) => {
      console.log('📬 [NotificationContext] Incoming real-time notification:', notification.title);
      dispatch({ type: 'ADD_NOTIFICATION', payload: notification });
      dispatch({ type: 'SHOW_TOAST', payload: notification.title });

      // Auto-hide toast after 5 seconds
      setTimeout(() => {
        dispatch({ type: 'HIDE_TOAST' });
      }, 5000);
    };
    const handleSubscriptionConfirmed = () => { };
    const handleNotificationRead = (data) => {
      dispatch({ type: 'MARK_AS_READ', payload: { notificationId: data.notificationId } });
    };

    // Register listeners immediately on mount
    socketService.on('socketConnected', handleSocketConnected);
    socketService.on('socketDisconnected', handleSocketDisconnected);
    socketService.on('socketError', handleSocketError);
    socketService.on('notification', handleNotification);
    socketService.on('subscriptionConfirmed', handleSubscriptionConfirmed);
    socketService.on('notificationRead', handleNotificationRead);

    // If token exists, connect now
    const token = localStorage.getItem('token');
    if (token) {
      console.log('🔑 [NotificationContext] Token found on mount, connecting...');
      try {
        socketService.connect(token);
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: 'Failed to connect' });
      }
    }

    return () => {
      console.log('🧹 [NotificationContext] Unmounting, cleaning up listeners...');
      socketService.off('socketConnected', handleSocketConnected);
      socketService.off('socketDisconnected', handleSocketDisconnected);
      socketService.off('socketError', handleSocketError);
      socketService.off('notification', handleNotification);
      socketService.off('subscriptionConfirmed', handleSubscriptionConfirmed);
      socketService.off('notificationRead', handleNotificationRead);
      socketService.disconnect();
    };
  }, []);

  const loadHistoricalNotifications = useCallback(async () => {
    console.log('📥 [NotificationContext] Attempting to load historical notifications...');
    try {
      if (state.loading) {
        console.log('📥 [NotificationContext] Already loading, skipping...');
        return;
      }
      dispatch({ type: 'SET_LOADING', payload: true });
      const token = localStorage.getItem('token');
      if (!token) {
        return;
      }
      const response = await axiosInstance.get('/notifications');
      if (response.data) {
        const notifications = Array.isArray(response.data) ? response.data : (response.data.notifications || []);
        console.log(`📥 [NotificationContext] Loaded ${notifications.length} notifications`);
        dispatch({ type: 'SET_NOTIFICATIONS', payload: notifications });
        // Calculate unread count from notifications
        const unreadCount = notifications.filter(n => !n.isRead).length || 0;
        dispatch({ type: 'SET_UNREAD_COUNT', payload: unreadCount });
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      if (error.response?.status === 401) {
        // Handle unauthorized
      } else if (error.response?.status === 404) {
        dispatch({ type: 'SET_NOTIFICATIONS', payload: [] });
        dispatch({ type: 'SET_UNREAD_COUNT', payload: 0 });
      }
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [dispatch]);

  useEffect(() => {
    if (state.socketConnected && !hasLoadedNotifications.current) {
      loadHistoricalNotifications();
      hasLoadedNotifications.current = true;
    }
  }, [state.socketConnected, loadHistoricalNotifications]);

  const subscribeToRoute = useCallback((routeId) => {
    if (state.socketConnected) {
      socketService.subscribeToRoute(routeId);
    }
  }, [state.socketConnected]);

  const sendNotification = useCallback((notificationData) => {
    if (state.socketConnected) {
      socketService.sendNotification(notificationData);
    } else {
      dispatch({ type: 'SET_ERROR', payload: 'Not connected to notification service' });
    }
  }, [state.socketConnected]);

  const markAsRead = useCallback(async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axiosInstance.patch(`/notifications/${notificationId}/read`);
      if (response.status === 200) {
        // Update local state to mark as read
        dispatch({ type: 'MARK_AS_READ', payload: { notificationId } });

        if (state.socketConnected) {
          socketService.markNotificationRead(notificationId);
        }
        return { success: true };
      } else {
        return { success: false, message: 'Failed to mark notification as read' };
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return { success: false, message: 'Network error occurred' };
    }
  }, [state.socketConnected, dispatch]);

  const markAllAsRead = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axiosInstance.patch('/notifications/mark-all-read');
      if (response.status === 200) {
        const data = response.data;
        console.log('Marked all notifications as read:', data);

        // Update local state to mark all as read
        dispatch({ type: 'MARK_ALL_AS_READ' });

        return { success: true, message: data.message };
      } else {
        const errorData = await response.json();
        console.error('Failed to mark all notifications as read:', errorData);
        return { success: false, message: errorData.message || 'Failed to mark notifications as read' };
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return { success: false, message: 'Network error occurred' };
    }
  }, [dispatch]);

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const getSocketStatus = () => {
    return socketService.getConnectionStatus();
  };

  const on = (event, callback) => {
    socketService.on(event, callback);
  };

  const off = (event, callback) => {
    socketService.off(event, callback);
  };

  const reconnectSocket = () => {
    socketService.reconnect();
  };

  const reconnectWithToken = (token) => {
    if (token) {
      console.log('🔄 [NotificationContext] Reconnecting with new token...');
      socketService.reconnectWithToken(token);
      // Immediately trigger a fetch since we now have a token
      loadHistoricalNotifications();
      hasLoadedNotifications.current = true;
    }
  };

  const logout = useCallback(() => {
    socketService.disconnect();
    dispatch({ type: 'CLEAR_DATA' });
    hasLoadedNotifications.current = false;
  }, [dispatch]);

  const value = {
    ...state,
    subscribeToRoute,
    sendNotification,
    markAsRead,
    markAllAsRead,
    clearError,
    on,
    off,
    reconnectSocket,
    reconnectWithToken,
    loadHistoricalNotifications,
    logout
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}

      {/* Global Toast Notification */}
      {state.toast.visible && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-gray-900 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center space-x-4 border border-gray-700 min-w-[320px]">
            <div className={`p-2 rounded-lg ${state.notifications[0]?.priority === 'urgent' ? 'bg-red-600 animate-pulse' : 'bg-indigo-500'
              }`}>
              {state.notifications[0]?.notificationType === 'delay' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : state.notifications[0]?.notificationType === 'cancellation' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                {state.notifications[0]?.notificationType || 'New Update'} • {state.notifications[0]?.priority || 'Medium'}
              </p>
              <p className="text-gray-100 font-medium">{state.toast.message}</p>
            </div>
            <button
              onClick={() => dispatch({ type: 'HIDE_TOAST' })}
              className="text-gray-500 hover:text-white transition-colors p-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
