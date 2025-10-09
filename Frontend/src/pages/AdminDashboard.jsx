import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import {
  BusIcon,
  UserCogIcon,
  MapIcon,
  BellIcon,
  LogOutIcon,
  Menu,
  X,
} from 'lucide-react'
import BusesManagement from "../Components/admin/BusesManagement";
import DriversManagement from "../Components/admin/DriversManagement";
import RoutesManagement from "../Components/admin/RoutesManagement";
import NotificationSender from "../Components/admin/NotificationSender";

const AdminDashboard = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('buses');


  const [user, setUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);

  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchUserDetails();

  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  
  const fetchUserDetails = async () => {
    try {
      setUserLoading(true);
      const response = await axiosInstance.get('/auth/me');
      setUser(response.data);

     
      if (response.data.role !== 'admin') {
        showMessage('Access denied. Admin privileges required.', true);
        setTimeout(() => navigate('/student-login'), 2000);
        return;
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
      showMessage('Failed to load user details', true);
      // If token is invalid, redirect to login
      if (error.response?.status === 401) {
        handleLogout();
      }
    } finally {
      setUserLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token'); 
    navigate('/student-login');
  };

  const showMessage = (msg, isError = false) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  if (userLoading) {
    return (
      <div className="admin-dashboard">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className={`${isSidebarOpen ? 'w-64' : 'w-0 md:w-20'} transition-all duration-300 bg-white shadow-lg overflow-hidden`}
      >
        <div className="p-4 flex flex-col h-full">
          <div className="mb-8 flex items-center justify-between">
            <h2
              className={`text-xl font-bold text-indigo-700 ${!isSidebarOpen && 'md:hidden'}`}
            >
              Transport Admin
            </h2>
            <button
              onClick={toggleSidebar}
              className="text-gray-500 hover:text-indigo-600"
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
          <nav className="flex-1">
            <button
              className={`w-full flex items-center p-3 mb-2 rounded-lg transition-colors ${activeTab === 'buses' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}
              onClick={() => setActiveTab('buses')}
            >
              <BusIcon size={20} />
              <span className={`ml-3 ${!isSidebarOpen && 'md:hidden'}`}>
                Buses Management
              </span>
            </button>
            <button
              className={`w-full flex items-center p-3 mb-2 rounded-lg transition-colors ${activeTab === 'drivers' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}
              onClick={() => setActiveTab('drivers')}
            >
              <UserCogIcon size={20} />
              <span className={`ml-3 ${!isSidebarOpen && 'md:hidden'}`}>
                Drivers Management
              </span>
            </button>
            <button
              className={`w-full flex items-center p-3 mb-2 rounded-lg transition-colors ${activeTab === 'routes' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}
              onClick={() => setActiveTab('routes')}
            >
              <MapIcon size={20} />
              <span className={`ml-3 ${!isSidebarOpen && 'md:hidden'}`}>
                Routes Management
              </span>
            </button>
            <button
              className={`w-full flex items-center p-3 mb-2 rounded-lg transition-colors ${activeTab === 'notifications' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}
              onClick={() => setActiveTab('notifications')}
            >
              <BellIcon size={20} />
              <span className={`ml-3 ${!isSidebarOpen && 'md:hidden'}`}>
                Notifications
              </span>
            </button>
          </nav>
          <div className="mt-auto pt-4 border-t border-gray-200">
            <div
              className={`flex items-center mb-4 ${!isSidebarOpen && 'md:hidden'}`}
            >
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                {user.name.charAt(0)}
              </div>
              <div className="ml-3">
                <p className="font-medium text-gray-800">{user.name}</p>
                <p className="text-sm text-gray-500">{user.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center p-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOutIcon size={20} />
              <span className={`ml-3 ${!isSidebarOpen && 'md:hidden'}`}>
                Logout
              </span>
            </button>
          </div>
        </div>
      </div>
 
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm py-4 px-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">
              {activeTab === 'buses' && 'Buses Management'}
              {activeTab === 'drivers' && 'Drivers Management'}
              {activeTab === 'routes' && 'Routes Management'}
              {activeTab === 'notifications' && 'Notifications'}
            </h1>
            <div className="md:hidden">
              <button onClick={toggleSidebar} className="text-gray-500">
                <Menu size={24} />
              </button>
            </div>
          </div>
        </header>

        {message && (
          <div
            className={`px-6 py-3 m-4 rounded-lg ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}
          >
            {message}
          </div>
        )}
        <main className="flex-1 overflow-y-auto p-6">
          {activeTab === 'buses' && (
            <BusesManagement showMessage={showMessage} />
          )}
          {activeTab === 'drivers' && (
            <DriversManagement showMessage={showMessage} />
          )}
          {activeTab === 'routes' && (
            <RoutesManagement showMessage={showMessage} />
          )}
          {activeTab === 'notifications' && (
            <NotificationSender showMessage={showMessage} />
          )}
        </main>
      </div>
    </div>
  )
};

export default AdminDashboard;
