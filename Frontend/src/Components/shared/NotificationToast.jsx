import React, { useState, useEffect } from 'react';

const NotificationToast = ({ notification, onClose, onMarkAsRead }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  // Auto-hide after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(notification.id), 300); // Wait for fade out animation
    }, 5000);

    return () => clearTimeout(timer);
  }, [notification.id, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(notification.id), 300);
  };

  const handleMarkAsRead = () => {
    onMarkAsRead(notification.id);
    handleClose();
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
      case 'delay': return '⏰';
      case 'cancellation': return '❌';
      case 'update': return '🔄';
      case 'general': return 'ℹ️';
      default: return '📢';
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  if (!isVisible) return null;

  return (
    <div 
      className={`notification-toast ${isExpanded ? 'expanded' : ''}`}
      style={{ borderLeftColor: getPriorityColor(notification.priority) }}
    >
      <div className="notification-header">
        <div className="notification-icon">
          {getTypeIcon(notification.notificationType)}
        </div>
        <div className="notification-title">
          <h4>{notification.title}</h4>
          <span className="notification-time">
            {formatTime(notification.timestamp)}
          </span>
        </div>
        <div className="notification-actions">
          <button 
            className="btn-expand"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? '−' : '+'}
          </button>
          <button 
            className="btn-close"
            onClick={handleClose}
            title="Close"
          >
            ×
          </button>
        </div>
      </div>

      <div className="notification-content">
        <p className="notification-message">{notification.message}</p>
        
        {isExpanded && (
          <div className="notification-details">
            <div className="detail-item">
              <span className="detail-label">Type:</span>
              <span className="detail-value">{notification.notificationType}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Priority:</span>
              <span className="detail-value priority-badge" style={{ backgroundColor: getPriorityColor(notification.priority) }}>
                {notification.priority}
              </span>
            </div>
            {notification.relatedRoute && (
              <div className="detail-item">
                <span className="detail-label">Route:</span>
                <span className="detail-value">{notification.relatedRoute}</span>
              </div>
            )}
            {notification.relatedBus && (
              <div className="detail-item">
                <span className="detail-label">Bus:</span>
                <span className="detail-value">{notification.relatedBus}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="notification-footer">
        <button 
          className="btn-mark-read"
          onClick={handleMarkAsRead}
        >
          Mark as Read
        </button>
      </div>
    </div>
  );
};

export default NotificationToast;
