# School Transport Management System - Notification System

## Overview

This document describes the implementation of a real-time notification system using Socket.IO for the School Transport Management System. The system allows admins to send notifications to students based on routes or buses, and students receive real-time updates about their transportation.

## Features

### 🔔 Real-time Notifications
- **Instant Delivery**: Notifications are delivered in real-time using WebSocket connections
- **Route-based Targeting**: Send notifications to students on specific routes
- **Bus-based Targeting**: Send notifications to all students on routes assigned to a specific bus
- **Priority Levels**: Urgent, High, Medium, and Low priority notifications
- **Notification Types**: Delay, Cancellation, Update, and General notifications

### 👨‍💼 Admin Features
- **Notification Sender**: Dedicated interface for composing and sending notifications
- **Target Selection**: Choose between specific routes or all routes for a bus
- **Real-time Status**: Connection status indicator
- **Notification History**: View all sent notifications with statistics

### 👨‍🎓 Student Features
- **Automatic Subscription**: Students are automatically subscribed to their assigned route
- **Real-time Updates**: Receive notifications instantly without page refresh
- **Notification History**: View past notifications
- **Read Status**: Mark notifications as read

## Architecture

### Backend Components

#### 1. Socket.IO Service (`Backend/services/socket/socketService.js`)
- Manages WebSocket connections and rooms
- Handles authentication and authorization
- Routes notifications to appropriate users
- Manages connection state and reconnection

#### 2. Notification Model (`Backend/models/Notification.js`)
- Stores notification data with metadata
- Tracks recipients and read status
- Supports different notification types and priorities

#### 3. Notification Controller (`Backend/controllers/notificationController.js`)
- REST API endpoints for notification management
- Handles CRUD operations for notifications
- Provides notification statistics and history

#### 4. Notification Routes (`Backend/routes/notificationRoutes.js`)
- API endpoints for notification operations
- Role-based access control (admin/student)

### Frontend Components

#### 1. Socket Service (`Frontend/src/services/socketService.js`)
- Manages WebSocket connection lifecycle
- Handles reconnection and error recovery
- Provides event-driven interface for notifications

#### 2. Notification Context (`Frontend/src/contexts/NotificationContext.jsx`)
- React context for managing notification state
- Handles real-time updates and user interactions
- Manages notification history and read status

#### 3. Notification Toast (`Frontend/src/Components/shared/NotificationToast.jsx`)
- Reusable component for displaying notifications
- Supports expandable view with additional details
- Auto-hide functionality with manual controls

#### 4. Notification Sender (`Frontend/src/Components/admin/NotificationSender.jsx`)
- Admin interface for composing and sending notifications
- Target selection (route or bus)
- Real-time connection status

## Installation & Setup

### Backend Dependencies
```bash
cd Backend
npm install socket.io
```

### Frontend Dependencies
```bash
cd Frontend
npm install socket.io-client
```

### Environment Variables
Add to your `.env` file:
```env
JWT_SECRET=your_jwt_secret_here
FRONTEND_URL=http://localhost:5173
```

## Usage

### For Admins

1. **Access Notification Panel**
   - Navigate to Admin Dashboard
   - Click on "📢 Notifications" tab

2. **Send a Notification**
   - Fill in title and message
   - Choose target type (Route or Bus)
   - Select specific route or bus
   - Choose notification type and priority
   - Click "Send Notification"

3. **Monitor Connection Status**
   - Green dot indicates connected
   - Red dot indicates disconnected
   - Use reconnect button if needed

### For Students

1. **Automatic Subscription**
   - Students are automatically subscribed to their assigned route
   - No manual configuration required

2. **Receive Notifications**
   - Notifications appear in real-time on the dashboard
   - Click to expand for more details
   - Mark as read when appropriate

3. **Connection Status**
   - Check connection status in the notifications card
   - Refresh page if disconnected

## API Endpoints

### Student Endpoints
- `GET /api/notifications/user` - Get user's notifications
- `PATCH /api/notifications/:id/read` - Mark notification as read
- `PATCH /api/notifications/mark-all-read` - Mark all notifications as read

### Admin Endpoints
- `GET /api/notifications/all` - Get all notifications
- `GET /api/notifications/stats` - Get notification statistics
- `GET /api/notifications/targets` - Get available routes and buses
- `DELETE /api/notifications/:id` - Delete a notification

## Socket.IO Events

### Client to Server
- `subscribeToRoute` - Subscribe to route notifications
- `sendNotification` - Send notification (admin only)
- `markNotificationRead` - Mark notification as read

### Server to Client
- `notification` - New notification received
- `subscriptionConfirmed` - Route subscription confirmed
- `notificationSent` - Notification sent successfully
- `notificationRead` - Notification marked as read
- `adminConnected` - Admin dashboard connected

## Security Features

- **JWT Authentication**: All socket connections require valid JWT tokens
- **Role-based Access**: Different permissions for admin and student users
- **Route Validation**: Students can only subscribe to their assigned routes
- **Input Validation**: Server-side validation of all notification data

## Error Handling

### Connection Issues
- Automatic reconnection with exponential backoff
- User-friendly error messages
- Manual reconnect option

### Notification Failures
- Validation errors with specific messages
- Graceful degradation when services are unavailable
- Logging for debugging and monitoring

## Performance Considerations

- **Room-based Broadcasting**: Uses Socket.IO rooms for efficient message delivery
- **Connection Pooling**: Manages multiple concurrent connections
- **Memory Management**: Efficient cleanup of disconnected users
- **Scalability**: Designed to handle multiple routes and users

## Troubleshooting

### Common Issues

1. **Socket Connection Failed**
   - Check JWT token validity
   - Verify backend server is running
   - Check CORS configuration

2. **Notifications Not Received**
   - Verify user has assigned route
   - Check socket connection status
   - Ensure admin selected correct target

3. **Admin Cannot Send Notifications**
   - Verify admin role permissions
   - Check socket connection status
   - Ensure routes/buses are properly assigned

### Debug Mode
Enable debug logging by setting environment variable:
```env
DEBUG=socket.io:*
```

## Future Enhancements

- **Push Notifications**: Browser push notifications for offline users
- **Email Integration**: Fallback email notifications
- **SMS Integration**: Critical notifications via SMS
- **Notification Templates**: Predefined notification templates
- **Scheduled Notifications**: Send notifications at specific times
- **Notification Analytics**: Detailed reporting and insights

## Support

For technical support or questions about the notification system, please refer to the main project documentation or contact the development team.
