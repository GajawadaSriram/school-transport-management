import React, { useState, useEffect } from 'react';
import { useNotifications } from '../../contexts/NotificationContext';
import axiosInstance from '../../api/axiosInstance';
import {
  InfoIcon,
  BellIcon,
  SendIcon,
  RefreshCwIcon,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  CircleDot,
  CircleSlash,
  Clock,
  XCircle,
  RefreshCcw,
} from "lucide-react";

const NotificationSender = ({ showMessage }) => {
  const { sendNotification, socketConnected, getSocketStatus } = useNotifications();
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    targetType: 'route', // 'route' or 'bus'
    relatedRoute: '',
    relatedBus: '',
    notificationType: 'general',
    priority: 'medium'
  });
  const [targets, setTargets] = useState({ routes: [], buses: [] });
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [lastSentNotification, setLastSentNotification] = useState(null);

  useEffect(() => {
    fetchTargets();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for notification sent confirmation
  useEffect(() => {
    const handleNotificationSent = (data) => {
      console.log('Notification sent:', data);
      showMessage(`✅ Notification delivered! Recipients: ${data.totalRecipients} total (${data.onlineRecipients} online, ${data.offlineRecipients} offline)`);
    };

    // Get socket service and add event listener
    const socketService = getSocketStatus();
    if (socketService && socketService.socket) {
      socketService.socket.on('notificationSent', handleNotificationSent);
    }

    return () => {
      if (socketService && socketService.socket) {
        socketService.socket.off('notificationSent', handleNotificationSent);
      }
    };
  }, [showMessage, getSocketStatus]);

  const fetchTargets = async () => {
    try {
      setLoading(true);
      const [routesRes, busesRes] = await Promise.all([
        axiosInstance.get('/routes'),
        axiosInstance.get('/buses')
      ]);
      setTargets({ routes: routesRes.data || [], buses: busesRes.data || [] });
    // eslint-disable-next-line no-unused-vars
    } catch (error) {
      showMessage('Error fetching latest routes/buses', true);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Reset target selection when switching target type
    if (name === 'targetType') {
      setFormData(prev => ({
        ...prev,
        relatedRoute: '',
        relatedBus: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!socketConnected) {
      showMessage('Not connected to notification service. Please try again.', true);
      return;
    }

    if (!formData.title.trim() || !formData.message.trim()) {
      showMessage('Title and message are required', true);
      return;
    }

    if (formData.targetType === 'route' && !formData.relatedRoute) {
      showMessage('Please select a route', true);
      return;
    }

    if (formData.targetType === 'bus' && !formData.relatedBus) {
      showMessage('Please select a bus', true);
      return;
    }

    try {
      setSending(true);
      showMessage('📤 Sending notification... Please wait.');
      
      const notificationData = {
        title: formData.title.trim(),
        message: formData.message.trim(),
        notificationType: formData.notificationType,
        priority: formData.priority,
        relatedRoute: formData.targetType === 'route' ? formData.relatedRoute : null,
        relatedBus: formData.targetType === 'bus' ? formData.relatedBus : null
      };

      // Debug: Log what we're sending
      console.log('🔍 DEBUG: Frontend sending this data:', notificationData);
      console.log('🔍 DEBUG: relatedRoute value:', notificationData.relatedRoute);
      console.log('🔍 DEBUG: relatedRoute type:', typeof notificationData.relatedRoute);

      // First, save notification to database
      try {
        const dbResponse = await axiosInstance.post('/notifications/admin/send', notificationData);
        console.log('Notification saved to database:', dbResponse.data);
        showMessage('💾 Notification saved to database successfully!');
      } catch (dbError) {
        console.error('Failed to save notification to database:', dbError);
        showMessage('⚠️ Warning: Notification sent via socket but failed to save to database', true);
      }

      // Then send real-time notification via socket
      sendNotification(notificationData);

      // Store last sent notification for display
      setLastSentNotification({
        title: formData.title,
        message: formData.message,
        timestamp: new Date().toLocaleTimeString(),
        targetType: formData.targetType,
        targetValue: formData.targetType === 'route' 
          ? targets.routes.find(r => r._id === formData.relatedRoute)?.routeName
          : `Bus #${targets.buses.find(b => b._id === formData.relatedBus)?.busNumber}`
      });

      // Reset form
      setFormData({
        title: '',
        message: '',
        targetType: 'route',
        relatedRoute: '',
        relatedBus: '',
        notificationType: 'general',
        priority: 'medium'
      });

      showMessage(`🎉 Notification "${formData.title}" sent successfully! Check the status below for delivery confirmation.`);
    // eslint-disable-next-line no-unused-vars
    } catch (error) {
      showMessage('Failed to send notification', true);
    } finally {
      setSending(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return '#dc3545';
      case 'high': return '#fd7e14';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  };

const getTypeIcon = (type) => {
  switch (type) {
    case "general":
      return <InfoIcon size={14} className="mr-1 text-gray-600" />;
    case "delay":
      return <Clock size={14} className="mr-1 text-yellow-600" />;
    case "cancellation":
      return <XCircle size={14} className="mr-1 text-red-600" />;
    case "update":
      return <RefreshCcw size={14} className="mr-1 text-blue-600" />;
    default:
      return <AlertCircle size={14} className="mr-1 text-gray-500" />;
  }
};


  if (loading) {
    return (
      <div className="notification-sender">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 bg-indigo-50 border-b border-indigo-100">
          <h3 className="text-lg font-semibold text-indigo-700 flex items-center">
            <BellIcon size={20} className="mr-2" />
            Send Notification
          </h3>
          <div
            className={`flex items-center px-3 py-1 rounded-full text-sm ${socketConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}
          >
            <span
              className={`w-2 h-2 rounded-full mr-2 ${socketConnected ? 'bg-green-500' : 'bg-red-500'}`}
            ></span>
            {socketConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter notification title"
                required
                maxLength={100}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message *
              </label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleInputChange}
                placeholder="Enter notification message"
                required
                rows={3}
                maxLength={500}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Type
              </label>
              <select
                id="targetType"
                name="targetType"
                value={formData.targetType}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="route">Specific Route</option>
                <option value="bus">All Routes for a Bus</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {formData.targetType === 'route'
                  ? 'Select Route'
                  : 'Select Bus'}
              </label>
              {formData.targetType === 'route' ? (
                <select
                  id="relatedRoute"
                  name="relatedRoute"
                  value={formData.relatedRoute}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Choose a route</option>
                  {targets.routes.map((route) => (
                    <option key={route._id} value={route._id}>
                      {route.routeName}{' '}
                      {route.assignedBus
                        ? `(Bus #${route.assignedBus.busNumber})`
                        : '(No bus)'}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  id="relatedBus"
                  name="relatedBus"
                  value={formData.relatedBus}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Choose a bus</option>
                  {targets.buses.map((bus) => (
                    <option key={bus._id} value={bus._id}>
                      Bus #{bus.busNumber} (Capacity: {bus.capacity})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                id="notificationType"
                name="notificationType"
                value={formData.notificationType}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="general">General</option>
                <option value="delay">Delay</option>
                <option value="cancellation">Cancellation</option>
                <option value="update">Update</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              type="submit"
              disabled={sending || !socketConnected}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 transition-colors flex items-center"
            >
              {sending ? (
                'Sending...'
              ) : (
                <>
                  <SendIcon size={16} className="mr-2" />
                  Send Notification
                </>
              )}
            </button>
            {!socketConnected && (
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors flex items-center"
              >
                <RefreshCwIcon size={16} className="mr-2" />
                Reconnect
              </button>
            )}
          </div>
        </form>
      </div>
      {/* Notification Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <InfoIcon size={20} className="mr-2" />
            Notification Status
          </h4>
          <div className="grid grid-cols-2 gap-4">
            {/* Connection */}
<div className="p-3 bg-gray-50 rounded-md">
  <span className="block text-sm text-gray-500 mb-1">Connection:</span>
  <span
    className={`flex items-center font-medium ${
      socketConnected ? "text-green-600" : "text-red-600"
    }`}
  >
    {socketConnected ? (
      <>
        <CircleDot size={16} className="mr-2" />
        Connected
      </>
    ) : (
      <>
        <CircleSlash size={16} className="mr-2" />
        Disconnected
      </>
    )}
  </span>
</div>

{/* Status */}
<div className="p-3 bg-gray-50 rounded-md">
  <span className="block text-sm text-gray-500 mb-1">Status:</span>
  <span className="flex items-center font-medium text-gray-800">
    {sending ? (
      <>
        <Loader2 size={16} className="mr-2 animate-spin" />
        Sending...
      </>
    ) : socketConnected ? (
      <>
        <CheckCircle2 size={16} className="mr-2 text-green-600" />
        Ready to Send
      </>
    ) : (
      <>
        <AlertTriangle size={16} className="mr-2 text-yellow-600" />
        Not Connected
      </>
    )}
  </span>
</div>

            <div className="p-3 bg-gray-50 rounded-md col-span-2">
              <span className="block text-sm text-gray-500 mb-1">Target:</span>
              <span className="font-medium text-gray-800">
                {formData.targetType === 'route'
                  ? 'Specific Route'
                  : 'All Routes for a Bus'}
                {formData.targetType === 'route' && formData.relatedRoute && (
                  <span className="ml-2 text-indigo-600">
                    (
                    {
                      targets.routes.find(
                        (r) => r._id === formData.relatedRoute,
                      )?.routeName
                    }
                    )
                  </span>
                )}
                {formData.targetType === 'bus' && formData.relatedBus && (
                  <span className="ml-2 text-indigo-600">
                    (Bus #
                    {
                      targets.buses.find((b) => b._id === formData.relatedBus)
                        ?.busNumber
                    }
                    )
                  </span>
                )}
              </span>
            </div>
            <div className="p-3 bg-gray-50 rounded-md">
  <span className="block text-sm text-gray-500 mb-1">Type:</span>
  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
    {getTypeIcon(formData.notificationType)}
    {formData.notificationType}
  </span>
</div>

            <div className="p-3 bg-gray-50 rounded-md">
              <span className="block text-sm text-gray-500 mb-1">
                Priority:
              </span>
              <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                style={{
                  backgroundColor: getPriorityColor(formData.priority),
                }}
              >
                {formData.priority}
              </span>
            </div>
          </div>
        </div>
        {/* Last Sent Notification */}
        {lastSentNotification && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <BellIcon size={20} className="mr-2" />
              Last Sent Notification
            </h4>
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-md">
                <span className="block text-sm text-gray-500 mb-1">Title:</span>
                <span className="font-medium text-gray-800">
                  {lastSentNotification.title}
                </span>
              </div>
              <div className="p-3 bg-gray-50 rounded-md">
                <span className="block text-sm text-gray-500 mb-1">
                  Message:
                </span>
                <span className="font-medium text-gray-800">
                  {lastSentNotification.message}
                </span>
              </div>
              <div className="p-3 bg-gray-50 rounded-md">
                <span className="block text-sm text-gray-500 mb-1">
                  Target:
                </span>
                <span className="font-medium text-gray-800">
                  {lastSentNotification.targetType === 'route'
                    ? 'Route: '
                    : 'Bus: '}
                  {lastSentNotification.targetValue}
                </span>
              </div>
              <div className="p-3 bg-gray-50 rounded-md">
                <span className="block text-sm text-gray-500 mb-1">
                  Sent at:
                </span>
                <span className="font-medium text-gray-800">
                  {lastSentNotification.timestamp}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
};

export default NotificationSender;
