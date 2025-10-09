import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../contexts/NotificationContext";
import axiosInstance from "../api/axiosInstance";

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { socketConnected } = useNotifications();

  // eslint-disable-next-line no-unused-vars
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const hasLoadedNotifications = useRef(false);

  const [localNotifications, setLocalNotifications] = useState([]);

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

  useEffect(() => {
    if (!hasLoadedNotifications.current) {
      fetchNotifications();
      hasLoadedNotifications.current = true;
    }
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await axiosInstance.get("/notifications");
      setLocalNotifications(response.data);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      const response = await axiosInstance.delete(
        `/notifications/${notificationId}`
      );
      if (response.data.success) {
        setMessage({ type: "success", text: "Notification marked as read" });
        setLocalNotifications((prev) =>
          prev.filter((n) => n._id !== notificationId)
        );
      } else {
        setMessage({ type: "error", text: "Failed to mark as read" });
      }
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Error marking as read:", error);
      setMessage({ type: "error", text: "Failed to mark as read" });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-gray-600">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-600 border-opacity-75 mb-4"></div>
        <p>Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <button
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            onClick={() => navigate("/student-dashboard")}
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-lg font-semibold text-gray-800">
            📢 Notifications
          </h1>
          <div className="flex items-center space-x-2 text-sm">
            <span
              className={`h-2 w-2 rounded-full ${
                socketConnected ? "bg-green-500" : "bg-red-500"
              }`}
            ></span>
            <span className="text-gray-600">
              {socketConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {message && (
          <div
            className={`mb-6 p-3 rounded-md text-sm ${
              message.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-800">
              Notifications
            </h2>
            <span className="text-sm text-gray-500">
              {localNotifications.length > 0
                ? `${localNotifications.length} notification${
                    localNotifications.length === 1 ? "" : "s"
                  }`
                : "No notifications"}
            </span>
          </div>

          <div className="space-y-4">
            {localNotifications && localNotifications.length > 0 ? (
              localNotifications.map((notification, index) => (
                <div
                  key={notification._id || index}
                  className={`p-4 rounded-md border ${
                    notification.isRead
                      ? "bg-gray-50 border-gray-200"
                      : "bg-indigo-50 border-indigo-200"
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-800">
                        {notification.title}
                      </span>
                      {!notification.isRead && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-indigo-600 text-white rounded-full">
                          New
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {notification.createdAt
                        ? new Date(notification.createdAt).toLocaleString()
                        : "Time not available"}
                    </span>
                  </div>

                  {/* Message */}
                  <p className="text-sm text-gray-600 mb-3">
                    {notification.message}
                  </p>

                  {/* Meta + Actions */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                        {notification.notificationType || "general"}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-white ${
                          notification.priority === "high"
                            ? "bg-red-500"
                            : notification.priority === "low"
                            ? "bg-green-500"
                            : "bg-yellow-500"
                        }`}
                      >
                        {notification.priority || "medium"}
                      </span>
                    </div>
                    {!notification.isRead && (
                      <button
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                        onClick={() => handleMarkAsRead(notification._id)}
                      >
                        Mark as Read
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <span className="text-3xl mb-2">📭</span>
                <h3 className="text-lg font-medium">No notifications yet</h3>
                <p className="text-sm">
                  You'll see notifications here when they're sent for your route.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default NotificationsPage;
