/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from "react";
import axiosInstance from "../api/axiosInstance";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../contexts/NotificationContext";
import {
  BellIcon,
  LogOutIcon,
  MapIcon,
  HelpCircleIcon,
  CalendarIcon,
  UserIcon,
} from 'lucide-react'




const StudentDashboard = () => {
  const [userData, setUserData] = useState(null);
  const [routeData, setRouteData] = useState(null);
  const [busData, setBusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Notification context
  const {
    subscribeToRoute,
    notifications,
    unreadCount,
    loadHistoricalNotifications,
    socketConnected,
    on,
    off,
    logout: clearNotifications
  } = useNotifications();

  // Real-time bus tracking state
  const [busLocation, setBusLocation] = useState(null);
  const [busUpdateMessage, setBusUpdateMessage] = useState("");
  const [liveUpdates, setLiveUpdates] = useState([]); // running list of driver updates
  const [lastLiveEvent, setLastLiveEvent] = useState(null); // debug: timestamp of last live event
  // Listen for real-time notifications removed - handled globally in NotificationContext

  const hasSubscribed = React.useRef(false);
  const fetchedOnce = React.useRef(false);

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      const userRole = localStorage.getItem('userRole');

      if (!token || userRole !== 'student') {
        navigate('/student-login');
        return;
      }

      if (!fetchedOnce.current) {
        fetchUserData();
        fetchedOnce.current = true;
      }
    };

    checkAuth();
  }, [navigate]);

  // Subscribe to route when socket connects
  useEffect(() => {
    if (hasSubscribed.current || !userData?.selectedRoute) return;
    if (socketConnected) {
      subscribeToRoute(userData.selectedRoute);
      hasSubscribed.current = true;
    }
  }, [socketConnected, userData?.selectedRoute, subscribeToRoute]);

  // Handle route changes
  useEffect(() => {
    if (userData?._id) {
      hasSubscribed.current = false;
    }
  }, [userData?._id, userData?.selectedRoute]);

  // Initialize Socket.IO listeners for real-time bus tracking using centralized connection
  useEffect(() => {
    if (userData && userData.selectedRoute) {
      const handleBusLocationUpdate = (data) => {
        console.log('[StudentDashboard] busLocationUpdate received:', data);
        setBusLocation(data);
        setBusUpdateMessage(`🚌 Bus ${data.busNumber} has reached: ${data.stopName}`);
        setLiveUpdates(prev => [{
          id: `${data.busId}_${data.currentStopIndex}_${Date.now()}`,
          busNumber: data.busNumber,
          stopName: data.stopName,
          currentStopIndex: data.currentStopIndex,
          timestamp: data.timestamp || new Date().toISOString()
        }, ...prev].slice(0, 50));
        setLastLiveEvent(new Date().toISOString());
      };

      const handleDriverUpdatesClear = (data) => {
        console.log('[StudentDashboard] driverUpdatesClear received:', data);
        setLiveUpdates([]);
        setBusLocation(null);
        setBusUpdateMessage('✅ Trip completed. All live updates cleared.');
      };

      on('busLocationUpdate', handleBusLocationUpdate);
      on('driverUpdatesClear', handleDriverUpdatesClear);

      return () => {
        off('busLocationUpdate', handleBusLocationUpdate);
        off('driverUpdatesClear', handleDriverUpdatesClear);
      };
    }
  }, [userData, on, off]);





  const fetchUserData = async () => {
    try {
      setLoading(true);

      // Fetch user data
      const userResponse = await axiosInstance.get(`/auth/me`);
      console.log('User data received:', userResponse.data);
      setUserData(userResponse.data);

      // If user has a selected route, fetch route details
      if (userResponse.data.selectedRoute) {
        console.log('Fetching route data for ID:', userResponse.data.selectedRoute);
        try {
          const routeResponse = await axiosInstance.get(`/routes/${userResponse.data.selectedRoute}`);
          console.log('Route data received:', routeResponse.data);
          setRouteData(routeResponse.data);



          // Route subscription is handled in useEffect above
          // No need to call subscribeToRoute here

          // If route has assigned bus, fetch bus details
          if (routeResponse.data.assignedBus) {
            try {
              // Check if assignedBus is already populated or just an ID
              let busId;
              if (typeof routeResponse.data.assignedBus === 'string') {
                busId = routeResponse.data.assignedBus;
              } else if (routeResponse.data.assignedBus._id) {
                busId = routeResponse.data.assignedBus._id;
              } else {
                console.error('Unexpected assignedBus format:', routeResponse.data.assignedBus);
                return;
              }

              const busResponse = await axiosInstance.get(`/buses/${busId}`);
              setBusData(busResponse.data);
            } catch (busError) {
              console.warn('Could not fetch bus data:', busError);
              if (busError.response?.status === 404) {
                console.warn('Bus not found - this might be a data inconsistency');
                // You could show a specific message about data inconsistency
              }
              // Don't set error state for bus data, just show "no bus assigned" message
            }
          }
        } catch (routeError) {
          console.warn('Could not fetch route data:', routeError);
          // Don't set error state for route data, just show "no route assigned" message
        }
      } else {
        console.log('No selected route found for user');
      }

    } catch (error) {
      console.error('Error fetching user data:', error);
      if (error.response?.status === 401) {
        // Unauthorized - redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userId');
        clearNotifications();
        navigate('/student-login');
        return;
      }
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
    clearNotifications();
    navigate('/student-login');
  };

  if (loading && !userData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-600 border-opacity-75 mb-4"></div>
        <p className="text-gray-600 font-medium">Synchronizing Dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={fetchUserData} className="retry-button">Try Again</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 relative">
      {/* Background with Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 opacity-50 z-0"></div>
      {/* Header */}
      <header className="sticky top-0 z-100 bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-indigo-700">
            Student Dashboard
          </h1>
          <div className="flex items-center gap-4">
            <span className="font-medium">{userData?.name}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
            >
              <LogOutIcon size={16} />
              Logout
            </button>
          </div>
        </div>
      </header>
      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 relative z-10">
        {/* Redesigned bus update alert */}
        {busUpdateMessage && (
          <div className="mb-6 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg shadow-md overflow-hidden">
            <div className="px-5 py-4 flex items-center">
              <div className="flex-shrink-0 mr-4">
                <div className="h-10 w-10 bg-black/30 rounded-full flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">
                    Bus Update
                  </h3>
                  <span className="px-2 py-1 bg-black/30 rounded-full text-xs font-medium text-white">
                    Just now
                  </span>
                </div>
                <p className="text-white mt-1 font-medium">
                  {busUpdateMessage}
                </p>
              </div>
            </div>
          </div>
        )}
        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Live Bus Updates Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all hover:shadow-md">
            <div className="border-b border-gray-100 px-5 py-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                  Live Bus Updates
                </h2>
                <div className="text-xs text-gray-500">
                  Socket: {socketConnected ? 'connected' : 'disconnected'}
                  {lastLiveEvent
                    ? ` • Last event: ${new Date(lastLiveEvent).toLocaleTimeString()}`
                    : ''}
                </div>
              </div>
            </div>
            <div className="p-5">
              {liveUpdates.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  <p>
                    No live updates yet. Updates will appear here as the bus
                    reaches stops.
                  </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {liveUpdates.map((update) => (
                    <li
                      key={update.id}
                      className="bg-gray-50 p-3 rounded-lg flex justify-between items-center"
                    >
                      <div>
                        <span className="font-medium text-indigo-600">
                          Bus {update.busNumber}
                        </span>
                        <span className="mx-1 text-gray-500">
                          reached Stop {update.currentStopIndex}:
                        </span>
                        <span className="font-medium">{update.stopName}</span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(update.timestamp).toLocaleTimeString()}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          {/* Route Details Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all hover:shadow-md">
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <MapIcon size={18} className="text-indigo-600" />
                Route Details
              </h2>
            </div>
            <div className="p-5">
              {routeData ? (
                <div>
                  <div className="mb-5 flex items-center justify-center bg-gray-50 p-4 rounded-lg">
                    <div className="text-center px-3">
                      <div className="text-xs text-gray-500 mb-1">From</div>
                      <div className="font-medium">
                        {routeData.startLocation?.name}
                      </div>
                    </div>
                    <div className="text-indigo-400 mx-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M14 5l7 7m0 0l-7 7m7-7H3"
                        />
                      </svg>
                    </div>
                    <div className="text-center px-3">
                      <div className="text-xs text-gray-500 mb-1">To</div>
                      <div className="font-medium">
                        {routeData.endLocation?.name}
                      </div>
                    </div>
                  </div>
                  {routeData.stops && routeData.stops.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Intermediate Stops:
                      </h4>
                      <ul className="space-y-2">
                        {routeData.stops.map((stop, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <span className="h-5 w-5 rounded-full bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-medium">
                              {index + 1}
                            </span>
                            <span>{stop.name}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-gray-50 p-2 rounded">
                      <span className="text-gray-500">Route Name:</span>
                      <div className="font-medium">
                        {routeData.routeName || 'Not set'}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <span className="text-gray-500">Status:</span>
                      <div className="font-medium text-green-600">
                        {routeData.assignedBus
                          ? 'Bus Assigned'
                          : 'No Bus Assigned'}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-gray-500">
                  <p>No route assigned yet.</p>
                  <p>Please contact your administrator.</p>
                </div>
              )}
            </div>
          </div>
          {/* Bus Details Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all hover:shadow-md">
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-indigo-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Bus Details
              </h2>
            </div>
            <div className="p-5">
              {busData ? (
                <div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-xs text-gray-500 mb-1">
                        Bus Number
                      </div>
                      <div className="text-xl font-semibold text-indigo-600">
                        {busData.busNumber}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-xs text-gray-500 mb-1">Capacity</div>
                      <div className="text-xl font-semibold">
                        {busData.capacity}{' '}
                        <span className="text-sm font-normal text-gray-500">
                          passengers
                        </span>
                      </div>
                    </div>
                  </div>
                  {busData.driver && (
                    <div className="mb-4 bg-gray-50 p-3 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Assigned Driver:
                      </h4>
                      <div className="flex justify-between items-center">
                        <div className="font-medium">{busData.driver.name}</div>
                        <div className="text-sm text-gray-500">
                          {busData.driver.email || 'Contact not available'}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Status:</span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${busData.driver ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}
                      >
                        {busData.driver ? 'Active' : 'No Driver Assigned'}
                      </span>
                    </div>
                  </div>
                  {busLocation && (
                    <div className="bg-indigo-50 p-3 rounded-lg">
                      <h4 className="text-sm font-medium text-indigo-700 mb-2 flex items-center gap-1">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        Current Location:
                      </h4>
                      <div className="flex justify-between items-center">
                        <span>
                          Stop {busLocation.currentStopIndex}:{' '}
                          {busLocation.stopName}
                        </span>
                        <span className="text-sm text-gray-600">
                          {new Date(busLocation.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-8 text-center text-gray-500">
                  <p>No bus assigned to this route.</p>
                  <p>Please wait for bus assignment.</p>
                </div>
              )}
            </div>
          </div>
          {/* Quick Actions Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all hover:shadow-md">
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-indigo-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                Quick Actions
              </h2>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-4">
                <button className="flex flex-col items-center justify-center bg-gray-50 hover:bg-indigo-50 p-4 rounded-lg transition-colors">
                  <UserIcon size={24} className="text-indigo-600 mb-2" />
                  <span className="text-sm font-medium">Update Profile</span>
                </button>
                <button className="flex flex-col items-center justify-center bg-gray-50 hover:bg-indigo-50 p-4 rounded-lg transition-colors">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-indigo-600 mb-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  <span className="text-sm font-medium">Contact Support</span>
                </button>
                <button className="flex flex-col items-center justify-center bg-gray-50 hover:bg-indigo-50 p-4 rounded-lg transition-colors">
                  <CalendarIcon size={24} className="text-indigo-600 mb-2" />
                  <span className="text-sm font-medium">View Schedule</span>
                </button>
                <button className="flex flex-col items-center justify-center bg-gray-50 hover:bg-indigo-50 p-4 rounded-lg transition-colors">
                  <HelpCircleIcon size={24} className="text-indigo-600 mb-2" />
                  <span className="text-sm font-medium">Help & FAQ</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
      {/* Global Toast is now handled in NotificationContext */}
      {/* Notification Icon - kept as requested */}
      <div className="fixed bottom-4 left-4 z-50">
        <div
          className={`bg-white p-3 rounded-full shadow-lg cursor-pointer hover:bg-indigo-50 transition-colors ${notifications.length > 0 ? 'ring-2 ring-indigo-500' : ''}`}
          onClick={() => navigate('/notifications')}
          title="View Notifications"
        >
          <BellIcon size={20} className="text-indigo-600" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </div>
        {/* Notification Toast */}
        {unreadCount > 0 && (
          <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-md border border-gray-200 p-2 px-3 text-sm whitespace-nowrap animate-fade-in">
            <span>You have {unreadCount} unread!</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
