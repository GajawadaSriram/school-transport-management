import { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import socketService from '../services/socketService';

const notificationReducer = (state, action) => {
  switch (action.type) {
    case 'SET_NOTIFICATIONS':
      return {
        ...state,
        notifications: action.payload,
        loading: false
      };
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [action.payload, ...state.notifications],
        unreadCount: state.unreadCount + 1
      };
    case 'MARK_AS_READ':
      return {
        ...state,
        notifications: state.notifications.map(notif =>
          notif._id === action.payload.notificationId 
            ? { ...notif, isRead: true, readAt: new Date() }
            : notif
        ),
        unreadCount: Math.max(0, state.unreadCount - 1)
      };
    case 'MARK_ALL_AS_READ':
      return {
        ...state,
        notifications: state.notifications.map(notif => ({ ...notif, isRead: true })),
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
    default:
      return state;
  }
};

const initialState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  socketConnected: false
};

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [state, dispatch] = useReducer(notificationReducer, initialState);
  const hasLoadedNotifications = useRef(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const socket = socketService.connect(token);
        socketService.on('socketConnected', () => {
          dispatch({ type: 'SET_SOCKET_STATUS', payload: true });
        });
        socketService.on('socketDisconnected', () => {
          dispatch({ type: 'SET_SOCKET_STATUS', payload: false });
        });
        socketService.on('socketError', (data) => {
          dispatch({ type: 'SET_ERROR', payload: data.error });
        });
        socketService.on('notification', (notification) => {
          dispatch({ type: 'ADD_NOTIFICATION', payload: notification });
        });
        socketService.on('subscriptionConfirmed', () => {});
        socketService.on('notificationRead', (data) => {
          dispatch({ type: 'MARK_AS_READ', payload: { notificationId: data.notificationId } });
        });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: 'Failed to connect to notification service' });
      }
    }
    return () => {
      socketService.disconnect();
    };
  }, []);

  useEffect(() => {
    if (state.socketConnected) {}
  }, [state.socketConnected]);

  const loadHistoricalNotifications = useCallback(async () => {
    try {
      if (state.loading) {
        return;
      }
      dispatch({ type: 'SET_LOADING', payload: true });
      const token = localStorage.getItem('token');
      if (!token) {
        return;
      }
      // Use the user endpoint to get all notifications for the user's route
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/notifications/user`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': `application/json`
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.message === 'No route selected') {
          dispatch({ type: 'SET_NOTIFICATIONS', payload: [] });
          dispatch({ type: 'SET_UNREAD_COUNT', payload: 0 });
        } else {
          dispatch({ type: 'SET_NOTIFICATIONS', payload: data.notifications || [] });
          // Calculate unread count from notifications
          const unreadCount = data.notifications?.filter(n => !n.isRead).length || 0;
          dispatch({ type: 'SET_UNREAD_COUNT', payload: unreadCount });
        }
      } else if (response.status === 401) {
        // Handle unauthorized
      } else if (response.status === 404) {
        dispatch({ type: 'SET_NOTIFICATIONS', payload: [] });
        dispatch({ type: 'SET_UNREAD_COUNT', payload: 0 });
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [dispatch]);

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
      
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': `application/json`
        }
      });
      
      if (response.ok) {
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
      
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/notifications/mark-all-read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': `application/json`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
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

  const reconnectSocket = () => {
    socketService.reconnect();
  };

  const reconnectWithToken = (token) => {
    if (token) {
      socketService.reconnectWithToken(token);
    }
  };

  const value = {
    ...state,
    subscribeToRoute,
    sendNotification,
    markAsRead,
    markAllAsRead,
    clearError,
    getSocketStatus,
    reconnectSocket,
    reconnectWithToken,
    loadHistoricalNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
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
