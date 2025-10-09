import React, { useState, useEffect } from 'react';
import socketService from '../services/socketService';
// import '../styles/DriverLocationUpdate.css';

const DriverLocationUpdate = ({ busId, driverId, userRole }) => {
  const [location, setLocation] = useState({ latitude: null, longitude: null });
  const [status, setStatus] = useState('in_transit');
  const [message, setMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [autoUpdate, setAutoUpdate] = useState(false);
  const [updateInterval, setUpdateInterval] = useState(null);
  const [error, setError] = useState('');

  const statusOptions = [
    { value: 'departed', label: '🚌 Departed' },
    { value: 'in_transit', label: '🛣️ In Transit' },
    { value: 'at_stop', label: '🛑 At Stop' },
    { value: 'reached_school', label: '🏫 Reached School' },
    { value: 'returning', label: '🔄 Returning' },
    { value: 'completed', label: '✅ Trip Completed' }
  ];

  useEffect(() => {
    // Check if user is a driver
    if (userRole !== 'driver') {
      setError('This component is only available for drivers.');
      return;
    }

    // Get current location on component mount
    getCurrentLocation();
    
    // Check socket connection status
    const checkConnection = () => {
      setIsConnected(socketService.getConnectionStatus());
    };
    
    checkConnection();
    const interval = setInterval(checkConnection, 5000);
    
    // Listen for error messages from socket
    const handleError = (errorData) => {
      setError(errorData.message);
      setTimeout(() => setError(''), 5000);
    };

    socketService.on('error', handleError);
    
    return () => {
      clearInterval(interval);
      if (updateInterval) {
        clearInterval(updateInterval);
      }
      socketService.off('error', handleError);
    };
  }, [userRole]);

  useEffect(() => {
    if (autoUpdate && location.latitude && location.longitude) {
      // Set up automatic location updates every 2 minutes
      const interval = setInterval(() => {
        updateLocation();
      }, 120000); // 2 minutes
      
      setUpdateInterval(interval);
      
      return () => clearInterval(interval);
    } else if (updateInterval) {
      clearInterval(updateInterval);
      setUpdateInterval(null);
    }
  }, [autoUpdate, location.latitude, location.longitude]);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          setMessage('Unable to get current location. Please check location permissions.');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    } else {
      setMessage('Geolocation is not supported by this browser.');
    }
  };

  const updateLocation = () => {
    if (!location.latitude || !location.longitude) {
      setMessage('Please get your current location first.');
      return;
    }

    if (!isConnected) {
      setMessage('Not connected to server. Please check your connection.');
      return;
    }

    const statusLabel = statusOptions.find(s => s.value === status)?.label || status;
    const updateMessage = message || `Location updated: ${statusLabel}`;

    socketService.updateLocation(
      busId,
      location.latitude,
      location.longitude,
      status,
      updateMessage
    );

    setLastUpdate(new Date());
    setMessage('Location updated successfully!');
    
    // Clear message after 3 seconds
    setTimeout(() => setMessage(''), 3000);
  };

  const updateStatus = () => {
    if (!isConnected) {
      setMessage('Not connected to server. Please check your connection.');
      return;
    }

    const statusLabel = statusOptions.find(s => s.value === status)?.label || status;
    const updateMessage = message || `Status updated: ${statusLabel}`;

    socketService.updateStatus(busId, status, updateMessage);

    setLastUpdate(new Date());
    setMessage('Status updated successfully!');
    
    // Clear message after 3 seconds
    setTimeout(() => setMessage(''), 3000);
  };

  const handleAutoUpdateToggle = () => {
    setAutoUpdate(!autoUpdate);
    if (!autoUpdate) {
      setMessage('Auto-update enabled. Location will be updated every 2 minutes.');
    } else {
      setMessage('Auto-update disabled.');
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const formatTime = (date) => {
    if (!date) return 'Never';
    return date.toLocaleTimeString();
  };

  // If user is not a driver, show error message
  if (userRole !== 'driver') {
    return (
      <div className="driver-location-update">
        <div className="error-message">
          <h3>🚫 Access Restricted</h3>
          <p>This component is only available for drivers. Your current role is: <strong>{userRole}</strong></p>
          <p>Please contact an administrator if you believe this is an error.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="driver-location-update">
      <div className="location-header">
        <h3>📍 Location & Status Updates</h3>
        <div className="connection-status">
          <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? '🟢' : '🔴'}
          </span>
          <span className="status-text">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {error && (
        <div className="error-display">
          <span className="error-text">⚠️ {error}</span>
        </div>
      )}

      <div className="location-section">
        <h4>Current Location</h4>
        <div className="location-display">
          {location.latitude && location.longitude ? (
            <div className="coordinates">
              <div className="coordinate">
                <span className="label">Latitude:</span>
                <span className="value">{location.latitude.toFixed(6)}</span>
              </div>
              <div className="coordinate">
                <span className="label">Longitude:</span>
                <span className="value">{location.longitude.toFixed(6)}</span>
              </div>
            </div>
          ) : (
            <div className="no-location">
              <span>📍 No location available</span>
            </div>
          )}
        </div>
        
        <div className="location-actions">
          <button 
            className="btn btn-primary"
            onClick={getCurrentLocation}
          >
            📍 Get Current Location
          </button>
          
          <button 
            className="btn btn-secondary"
            onClick={updateLocation}
            disabled={!location.latitude || !location.longitude || !isConnected}
          >
            📤 Update Location
          </button>
        </div>
      </div>

      <div className="status-section">
        <h4>Bus Status</h4>
        <div className="status-selector">
          <select 
            value={status} 
            onChange={(e) => setStatus(e.target.value)}
            className="status-dropdown"
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        
        <div className="status-actions">
          <button 
            className="btn btn-success"
            onClick={updateStatus}
            disabled={!isConnected}
          >
            📤 Update Status
          </button>
        </div>
      </div>

      <div className="message-section">
        <h4>Custom Message (Optional)</h4>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Enter a custom message for this update..."
          className="message-input"
          rows="3"
        />
      </div>

      <div className="auto-update-section">
        <label className="auto-update-toggle">
          <input
            type="checkbox"
            checked={autoUpdate}
            onChange={handleAutoUpdateToggle}
          />
          <span className="toggle-label">
            🔄 Enable Auto-update (every 2 minutes)
          </span>
        </label>
      </div>

      <div className="last-update">
        <span className="label">Last Update:</span>
        <span className="value">{formatTime(lastUpdate)}</span>
      </div>

      {message && (
        <div className="message-display">
          <span className="message-text">{message}</span>
        </div>
      )}

      <div className="info-box">
        <h5>💡 Tips:</h5>
        <ul>
          <li>Update location when you reach each stop</li>
          <li>Change status to reflect current bus state</li>
          <li>Use custom messages for important updates</li>
          <li>Enable auto-update for continuous tracking</li>
        </ul>
      </div>
    </div>
  );
};

export default DriverLocationUpdate;
