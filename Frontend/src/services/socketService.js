import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.eventListeners = new Map();
    this.currentRouteId = null; // Track current route subscription
  }

  // Initialize socket connection
  connect(token) {
    if (this.socket && this.isConnected) {
      return this.socket;
    }

    if (!token) {
      console.error('No token provided for socket connection');
      throw new Error('Authentication token is required');
    }

    try {
      console.log('Attempting socket connection with token:', token.substring(0, 20) + '...');
      
      this.socket = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000', {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        timeout: 20000,
        forceNew: true
      });

      this.setupEventHandlers();
      return this.socket;
    } catch (error) {
      console.error('Failed to create socket connection:', error);
      throw error;
    }
  }

  // Setup socket event handlers
  setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('socketConnected', { connected: true });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.isConnected = false;
      this.emit('socketDisconnected', { connected: false, reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.isConnected = false;
      
      // If it's an auth error, clear token and redirect
      if (error.message.includes('Authentication error')) {
        localStorage.removeItem('token');
        window.location.href = '/student-login';
      } else {
        this.emit('socketError', { error: error.message });
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      this.isConnected = true;
      this.emit('socketReconnected', { connected: true, attemptNumber });
    });

    this.socket.on('reconnect_failed', () => {
      console.error('Socket reconnection failed after', this.maxReconnectAttempts, 'attempts');
      this.emit('socketReconnectFailed', { connected: false });
    });

    // Handle specific application events
    this.socket.on('subscriptionConfirmed', (data) => {
      this.emit('subscriptionConfirmed', data);
    });

    this.socket.on('notification', (data) => {
      this.emit('notification', data);
    });

    this.socket.on('notificationSent', (data) => {
      this.emit('notificationSent', data);
    });

    this.socket.on('notificationRead', (data) => {
      this.emit('notificationRead', data);
    });

    this.socket.on('adminConnected', (data) => {
      this.emit('adminConnected', data);
    });

    this.socket.on('error', (data) => {
      this.emit('socketError', data);
    });
  }

  // Subscribe to a route (for students)
  subscribeToRoute(routeId) {
    // Prevent duplicate subscriptions
    if (this.currentRouteId === routeId) {
      console.log('🛡️  Already subscribed to route:', routeId, 'skipping duplicate');
      return;
    }
    
    if (this.socket && this.isConnected) {
      console.log('🔄 Subscribing to route:', routeId);
      
      // First authenticate the socket with user ID
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // Decode JWT to get user ID
          const payload = JSON.parse(atob(token.split('.')[1]));
          const userId = payload.id;
          
          console.log('🔐 Authenticating socket for user:', userId);
          this.socket.emit('authenticate', { userId });
          
          // Then subscribe to route
          this.socket.emit('subscribeToRoute', routeId);
          this.currentRouteId = routeId;
          
        } catch (error) {
          console.error('Failed to decode token for authentication:', error);
        }
      } else {
        console.warn('No token found for authentication');
      }
    } else {
      console.warn('Socket not connected, cannot subscribe to route');
    }
  }

  // Send notification (for admins)
  sendNotification(notificationData) {
    if (this.socket && this.isConnected) {
      this.socket.emit('sendNotification', notificationData);
    } else {
      console.warn('Socket not connected, cannot send notification');
    }
  }

  // Mark notification as read
  markNotificationRead(notificationId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('markNotificationRead', { notificationId });
    } else {
      console.warn('Socket not connected, cannot mark notification as read');
    }
  }

  // Reset route subscription (useful when user changes)
  resetRouteSubscription() {
    this.currentRouteId = null;
    console.log('🔄 Route subscription reset');
  }

  // Add event listener
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  // Remove event listener
  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // Emit event to local listeners
  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Disconnect socket
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.eventListeners.clear();
    }
  }

  // Get connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      socketId: this.socket?.id || null
    };
  }

  // Reconnect manually
  reconnect() {
    if (this.socket) {
      this.socket.connect();
    }
  }

  // Reconnect with new token
  reconnectWithToken(token) {
    if (this.socket) {
      this.disconnect();
    }
    
    if (token) {
      try {
        this.connect(token);
      } catch (error) {
        console.error('Failed to reconnect with new token:', error);
      }
    }
  }
}

// Create singleton instance
const socketService = new SocketService();
export default socketService;
