import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import { io } from "socket.io-client";
import { Bus, MapPin, LogOut, RefreshCcw, CheckCircle, AlertCircle, Signal } from "lucide-react";
import { useNotifications } from "../contexts/NotificationContext";

const DriverDashboard = () => {
  const navigate = useNavigate();
  const [driverInfo, setDriverInfo] = useState(null);
  const [busInfo, setBusInfo] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Interactive stops state
  const [completedStops, setCompletedStops] = useState([]);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);

  // Socket.IO state
  const [socket, setSocket] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [lastUpdateMessage, setLastUpdateMessage] = useState("");

  useEffect(() => {
    fetchDriverInfo();
  }, []);

  // Initialize Socket.IO
  useEffect(() => {
    if (driverInfo && busInfo && routeInfo) {
      const token = localStorage.getItem('token');
      const newSocket = io(import.meta.env.VITE_BACKEND_URL || "http://localhost:5000", {
        auth: { token },
        transports: ['websocket', 'polling']
      });

      newSocket.on("connect", () => {
        setSocketConnected(true);
        console.log("🚕 Driver socket connected via handshake");
      });

      newSocket.on("stopUpdateConfirmed", (data) => {
        setLastUpdateMessage(`✅ Reached ${data.stopName}`);
        setTimeout(() => setLastUpdateMessage(""), 3000);
      });

      newSocket.on("socketError", (error) => {
        setLastUpdateMessage(`❌ ${error.error}`);
      });

      newSocket.on("disconnect", () => {
        setSocketConnected(false);
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    }
  }, [driverInfo, busInfo, routeInfo]);

  const fetchDriverInfo = async () => {
    try {
      const userResponse = await axiosInstance.get("/auth/me");
      const userId = userResponse.data._id;

      const routeResponse = await axiosInstance.get(`/drivers/route-info/${userId}`);
      setDriverInfo(routeResponse.data.driver);
      setBusInfo(routeResponse.data.bus);
      setRouteInfo(routeResponse.data.route);

      if (routeResponse.data.message) {
        setError(routeResponse.data.message);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        setError("Please log in again.");
      } else if (error.response?.status === 403) {
        setError("Access denied. Please log in again.");
      } else if (error.response?.status === 404) {
        setError("Driver information not found.");
      } else {
        setError("Failed to load driver information");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStopClick = (stopIndex) => {
    if (stopIndex === currentStopIndex && socket && socketConnected) {
      setCompletedStops((prev) => [...prev, stopIndex]);
      setCurrentStopIndex((prev) => prev + 1);

      const updateData = {
        busId: busInfo._id,
        routeId: routeInfo._id,
        currentStopIndex: stopIndex + 1,
        stopName: routeInfo.stops[stopIndex].name,
      };

      socket.emit("driverUpdateStop", updateData);
    }
  };

  const handleResetStops = () => {
    setCompletedStops([]);
    setCurrentStopIndex(0);

    // Notify students via socket that the trip history should be cleared
    if (socket && socketConnected && busInfo && routeInfo) {
      console.log('🔄 Broadcasting trip reset to students...');
      socket.emit('driverTripCompleted', {
        busId: busInfo._id,
        routeId: routeInfo._id
      });
    }
  };

  const getStopStatusClass = (stopIndex) => {
    if (completedStops.includes(stopIndex)) return "bg-green-100 text-green-700";
    if (stopIndex === currentStopIndex) return "bg-blue-100 text-blue-700";
    return "bg-gray-100 text-gray-700";
  };

  const { logout: clearNotifications } = useNotifications();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    clearNotifications();
    navigate("/student-login");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-lg font-medium text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col">
      {/* Header */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500" />
        <div className="relative px-6 py-6">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold text-white">Driver Dashboard</h1>
              <p className="text-white/80 text-sm mt-1">
                {driverInfo?.name ? `Welcome, ${driverInfo.name}` : "Manage your route and updates"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium shadow bg-white/10 backdrop-blur text-white ${socketConnected ? "ring-1 ring-white/30" : "ring-1 ring-white/20"}`}>
                <span className={`h-2 w-2 rounded-full ${socketConnected ? "bg-emerald-400 animate-pulse" : "bg-rose-400"}`} />
                {socketConnected ? "Live updates active" : "Live updates offline"}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg backdrop-blur ring-1 ring-white/30 transition"
              >
                <LogOut size={18} /> Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 py-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-3 rounded-xl ring-1 ring-red-100">
              <AlertCircle size={18} />
              <p>{error}</p>
            </div>
          )}

          {lastUpdateMessage && (
            <div
              className={`flex items-center gap-2 px-4 py-3 rounded-xl ring-1 ${lastUpdateMessage.includes("✅")
                ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                : "bg-rose-50 text-rose-700 ring-rose-100"
                }`}
            >
              <CheckCircle size={18} />
              <p>{lastUpdateMessage}</p>
            </div>
          )}

          {/* Overview Cards */}
          {busInfo && routeInfo && (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100">
                <div className="flex items-center gap-2 text-gray-700 mb-2">
                  <Bus size={18} className="text-blue-600" />
                  <span className="font-semibold">Assigned Bus</span>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><span className="text-gray-700 font-medium">Number:</span> {busInfo.busNumber}</p>
                  <p><span className="text-gray-700 font-medium">Capacity:</span> {busInfo.capacity} students</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100">
                <div className="flex items-center gap-2 text-gray-700 mb-2">
                  <MapPin size={18} className="text-purple-600" />
                  <span className="font-semibold">Route</span>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><span className="text-gray-700 font-medium">Name:</span> {routeInfo.routeName}</p>
                  <p><span className="text-gray-700 font-medium">Stops:</span> {routeInfo.stops.length}</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100">
                <div className="flex items-center gap-2 text-gray-700 mb-2">
                  <Signal size={18} className={socketConnected ? "text-emerald-600" : "text-rose-600"} />
                  <span className="font-semibold">Connection</span>
                </div>
                <div className="text-sm text-gray-600">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${socketConnected ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100" : "bg-rose-50 text-rose-700 ring-1 ring-rose-100"}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${socketConnected ? "bg-emerald-500" : "bg-rose-500"}`} />
                    {socketConnected ? "Online" : "Offline"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Route Details & Stops */}
          {routeInfo && (
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-1 bg-white rounded-2xl p-6 shadow-sm ring-1 ring-gray-100">
                <h2 className="text-base font-semibold text-gray-800 mb-4">Route Overview</h2>

                {/* Progress */}
                <div className="mb-5">
                  {(() => {
                    const total = routeInfo.stops.length;
                    const done = completedStops.length;
                    const percent = total === 0 ? 0 : Math.round((done / total) * 100);
                    return (
                      <div>
                        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                          <span>Progress</span>
                          <span className="font-medium text-gray-700">{done}/{total} ({percent}%)</span>
                        </div>
                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full transition-all" style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-gray-500">Start</p>
                    <p className="font-medium text-gray-800">{routeInfo.startLocation.name}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-gray-500">End</p>
                    <p className="font-medium text-gray-800">{routeInfo.endLocation.name}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-gray-500">Current</p>
                    <p className="font-medium text-gray-800">{currentStopIndex < routeInfo.stops.length ? routeInfo.stops[currentStopIndex]?.name : "Complete!"}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-gray-500">Next</p>
                    <p className="font-medium text-gray-800">{currentStopIndex + 1 < routeInfo.stops.length ? routeInfo.stops[currentStopIndex + 1]?.name : "Final"}</p>
                  </div>
                </div>
              </div>

              {/* Stops */}
              <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm ring-1 ring-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-gray-800">Route Stops</h2>
                  <button
                    onClick={handleResetStops}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition disabled:opacity-50"
                    disabled={completedStops.length === 0 && currentStopIndex === 0}
                  >
                    <RefreshCcw size={16} /> Reset
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {routeInfo.stops.map((stop, index) => {
                    const isDone = completedStops.includes(index);
                    const isCurrent = index === currentStopIndex;
                    return (
                      <button
                        type="button"
                        key={index}
                        onClick={() => handleStopClick(index)}
                        className={`w-full group text-left flex items-center gap-4 p-3 rounded-xl ring-1 transition ${isDone
                          ? "bg-emerald-50 ring-emerald-100"
                          : isCurrent
                            ? "bg-indigo-50 ring-indigo-100"
                            : "bg-white ring-gray-100 hover:bg-gray-50"
                          }`}
                      >
                        <span className={`shrink-0 h-3 w-3 rounded-full ring-4 ${isDone
                          ? "bg-emerald-500 ring-emerald-100"
                          : isCurrent
                            ? "bg-indigo-500 ring-indigo-100"
                            : "bg-gray-300 ring-gray-100"
                          }`} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-800">
                              {index + 1}. {stop.name}
                            </span>
                            {stop.latitude && (
                              <span className="text-xs text-gray-500">({stop.latitude.toFixed(3)}, {stop.longitude.toFixed(3)})</span>
                            )}
                          </div>
                          <div className="mt-1">
                            {isDone && (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-700">
                                <CheckCircle size={12} /> Completed
                              </span>
                            )}
                            {isCurrent && !isDone && (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-100 text-indigo-700">
                                In progress
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {!busInfo && !error && (
            <div className="bg-amber-50 text-amber-800 px-4 py-3 rounded-xl ring-1 ring-amber-100">
              <p>You are not assigned to any bus. Contact the admin.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default DriverDashboard;
