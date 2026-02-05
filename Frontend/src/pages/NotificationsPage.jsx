import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../contexts/NotificationContext";
import axiosInstance from "../api/axiosInstance";
import {
  Info,
  Clock,
  XCircle,
  RefreshCcw,
  AlertCircle,
  AlertTriangle,
  Bell,
  CheckCircle2
} from "lucide-react";

const NotificationsPage = () => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    socketConnected
  } = useNotifications();

  // eslint-disable-next-line no-unused-vars
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  const getTypeIcon = (type) => {
    switch (type) {
      case "delay": return <Clock size={16} className="text-amber-600" />;
      case "cancellation": return <XCircle size={16} className="text-red-600" />;
      case "update": return <RefreshCcw size={16} className="text-blue-600" />;
      case "general": return <Info size={16} className="text-gray-600" />;
      default: return <Bell size={16} className="text-blue-600" />;
    }
  };

  const getPriorityClasses = (priority) => {
    switch (priority) {
      case "urgent": return "bg-red-600 text-white border-red-700 shadow-sm animate-pulse";
      case "high": return "bg-red-100 text-red-700 border-red-200";
      case "medium": return "bg-amber-100 text-amber-700 border-amber-200";
      case "low": return "bg-green-100 text-green-700 border-green-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      const userRole = localStorage.getItem("userRole");

      if (!token || userRole !== "student") {
        navigate("/student-login");
        return;
      }

      try {
        const response = await axiosInstance.get("/auth/me");
        setUserData(response.data);
      } catch (error) {
        console.error("Error fetching user data:", error);
        if (error.response?.status === 401) {
          navigate("/student-login");
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  const handleMarkAsRead = async (notificationId) => {
    try {
      await markAsRead(notificationId);
      setMessage({ type: "success", text: "Notification marked as read" });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Error marking as read:", error);
      setMessage({ type: "error", text: "Failed to mark as read" });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
      setMessage({ type: "success", text: "All notifications marked as read" });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Error marking all as read:", error);
      setMessage({ type: "error", text: "Failed to mark all as read" });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-gray-600">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-600 border-opacity-75 mb-4"></div>
        <p>Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-blue-100 shadow-sm font-sans">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-6 py-4">
          <button
            className="text-sm text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-2 transition-all hover:-translate-x-1"
            onClick={() => navigate("/student-dashboard")}
          >
            <span>←</span> Back to Dashboard
          </button>
          <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg shadow-blue-200 shadow-lg">
              <Bell size={20} className="text-white" />
            </div>
            Notifications
          </h1>
          <div className="flex items-center space-x-3 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
            <span
              className={`h-2 w-2 rounded-full ${socketConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
                }`}
            ></span>
            <span className="text-xs font-bold text-blue-700 uppercase tracking-tight">
              {socketConnected ? "Live" : "Offline"}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {message && (
          <div
            className={`mb-8 p-4 rounded-xl flex items-center gap-3 text-sm font-medium shadow-lg animate-in fade-in slide-in-from-top-4 duration-300 ${message.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
              : "bg-red-50 text-red-700 border border-red-100"
              }`}
          >
            {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            {message.text}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl shadow-blue-500/5 border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-8 py-6 border-b border-slate-50 bg-slate-50/50">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-bold text-slate-800">
                Recent Alerts
              </h2>
              {notifications.length > 0 && (
                <span className="px-3 py-1 text-xs font-extrabold bg-blue-600 text-white rounded-full shadow-md shadow-blue-200">
                  {notifications.length}
                </span>
              )}
            </div>
            {notifications.length > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-2 group"
              >
                Clear all
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">✨</span>
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-50">
            {notifications && notifications.length > 0 ? (
              notifications.map((notification, index) => (
                <div
                  key={notification._id || index}
                  className="p-8 transition-all hover:bg-blue-50/30 group relative"
                >
                  {/* Status Indicator */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />

                  {/* Header */}
                  <div className="flex items-start justify-between gap-6 mb-4">
                    <div className="flex items-start gap-5">
                      <div className="p-3 rounded-2xl bg-white border border-slate-100 shadow-sm group-hover:shadow-md transition-shadow">
                        {getTypeIcon(notification.notificationType)}
                      </div>
                      <div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="font-bold text-slate-800 text-lg leading-tight">
                            {notification.title}
                          </h3>
                        </div>
                        <span className="text-[11px] uppercase tracking-widest font-bold text-slate-400 mt-2 block">
                          {notification.createdAt
                            ? new Date(notification.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                            : "Sent Just Now"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Message */}
                  <div className="ml-16">
                    <p className="text-slate-600 mb-6 leading-relaxed font-medium">
                      {notification.message}
                    </p>

                    {/* Footer Stats/Tags */}
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-4">
                        <span className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg bg-slate-100 text-slate-500 border border-slate-200">
                          {notification.notificationType || "general"}
                        </span>
                        <span
                          className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg border ${getPriorityClasses(notification.priority)}`}
                        >
                          {notification.priority || "medium"}
                        </span>
                      </div>
                      <button
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors uppercase tracking-widest px-2 py-1 hover:bg-blue-50 rounded-md"
                        onClick={() => handleMarkAsRead(notification._id)}
                      >
                        Mark read
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-slate-50/20">
                <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-100 mb-6 text-4xl">
                  🚀
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Notifications Cleared</h3>
                <p className="text-slate-500 font-medium text-center px-10">
                  New notifications and important updates from the administration will be displayed here as they arrive.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="py-10 text-center">
        <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">
          Safe Journey Transport System
        </p>
      </footer>
    </div>
  );
};

export default NotificationsPage;
