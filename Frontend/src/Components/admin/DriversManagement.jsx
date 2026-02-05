import React, { useState, useEffect } from 'react';
import axiosInstance from '../../api/axiosInstance';
import { UserPlusIcon, RefreshCwIcon, UserMinusIcon } from 'lucide-react'

const DriversManagement = ({ showMessage }) => {
  const [drivers, setDrivers] = useState([]);
  const [driverForm, setDriverForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDrivers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDrivers = async () => {
    try {
      const response = await axiosInstance.get('/drivers/drivers');
      setDrivers(response.data);
    // eslint-disable-next-line no-unused-vars
    } catch (error) {
      showMessage('Error fetching drivers', true);
    }
  };

  const handleDriverSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axiosInstance.post('/drivers/create-driver', { ...driverForm, role: 'driver' });
      showMessage('Driver account created successfully');
      setDriverForm({ name: '', email: '', password: '' });
      fetchDrivers();
    } catch (error) {
      showMessage(error.response?.data?.message || 'Error creating driver account', true);
    }
    setLoading(false);
  };

  const handleRemoveDriver = async (driverId) => {
    if (window.confirm('Are you sure you want to remove this driver?')) {
      try {
        await axiosInstance.delete(`/drivers/drivers/${driverId}`);
        showMessage('Driver removed successfully');
        fetchDrivers();
      } catch (error) {
        showMessage(error.response?.data?.message || 'Error removing driver', true);
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Create Driver Form */}
      <div className="bg-white rounded-lg shadow-md p-6 max-w-xl mx-auto">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">
          Create Driver Account
        </h2>
        <form onSubmit={handleDriverSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              value={driverForm.name}
              onChange={(e) =>
                setDriverForm({
                  ...driverForm,
                  name: e.target.value,
                })
              }
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={driverForm.email}
              onChange={(e) =>
                setDriverForm({
                  ...driverForm,
                  email: e.target.value,
                })
              }
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={driverForm.password}
              onChange={(e) =>
                setDriverForm({
                  ...driverForm,
                  password: e.target.value,
                })
              }
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 transition-colors flex items-center justify-center"
          >
            {loading ? (
              'Creating...'
            ) : (
              <>
                <UserPlusIcon size={16} className="mr-2" />
                Create Driver Account
              </>
            )}
          </button>
        </form>
      </div>
      {/* Drivers List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">All Drivers</h2>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              Total Drivers: {drivers.length}
            </span>
            <button
              onClick={fetchDrivers}
              disabled={loading}
              className="flex items-center px-3 py-2 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 transition-colors"
            >
              <RefreshCwIcon size={16} className="mr-2" />
              Refresh Data
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {drivers.map((driver) => (
            <div
              key={driver._id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800">{driver.name}</h3>
                  <p className="text-sm text-gray-600">{driver.email}</p>
                </div>
                <div className="flex-shrink-0">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${driver.assignedBus ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}
                  >
                    {driver.assignedBus ? 'Assigned' : 'Available'}
                  </span>
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => handleRemoveDriver(driver._id)}
                  className="w-full flex items-center justify-center px-3 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50 transition-colors text-sm"
                >
                  <UserMinusIcon size={16} className="mr-2" />
                  Remove Driver
                </button>
              </div>
            </div>
          ))}
        </div>
        {drivers.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No drivers found. Create your first driver using the form above.
          </div>
        )}
      </div>
    </div>
  )
};

export default DriversManagement;
