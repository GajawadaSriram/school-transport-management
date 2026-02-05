import React, { useState, useEffect } from 'react';
import axiosInstance from '../../api/axiosInstance';
import {
  PencilIcon,
  PlusCircleIcon,
  XCircleIcon,
  UserPlusIcon,
  UserMinusIcon,
} from 'lucide-react'

const BusesManagement = ({ showMessage }) => {
  const [buses, setBuses] = useState([]);
  const [drivers, setDrivers] = useState([]);
  
  const [busForm, setBusForm] = useState({ busNumber: '', capacity: '' });
  const [editingBus, setEditingBus] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBuses();
    fetchDrivers();
  },[]);

  const fetchBuses = async () => {
    try {
      const response = await axiosInstance.get('/buses');
      setBuses(response.data);
    } catch (error) {
      showMessage('Error fetching buses', true);
    }
  };

  const fetchDrivers = async () => {
    try {
      const response = await axiosInstance.get('/drivers/drivers');
      setDrivers(response.data);
   
    } catch (error) {
      showMessage('Error fetching drivers', true);
    }
  };

  const handleBusSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingBus) {
        await axiosInstance.put(`/buses/${editingBus._id}`, busForm);
        showMessage('Bus updated successfully');
        setEditingBus(null);
      } else {
        await axiosInstance.post('/buses', busForm);
        showMessage('Bus added successfully');
      }
      setBusForm({ busNumber: '', capacity: '' });
      fetchBuses();
    } catch (error) {
      showMessage(error.response?.data?.message || 'Error saving bus', true);
    }
    setLoading(false);
  };

  const handleEditBus = (bus) => {
    setEditingBus(bus);
    setBusForm({ busNumber: bus.busNumber, capacity: bus.capacity });
  };

  const [selectedDriver, setSelectedDriver] = useState({});

  const handleAssignDriver = async (busId, driverId) => {
    try {
      await axiosInstance.post('/buses/assign-driver', { busId, driverId });
      showMessage('Driver assigned successfully');
      setSelectedDriver({}); 
      fetchBuses();
      fetchDrivers(); 
    } catch (error) {
      showMessage(error.response?.data?.message || 'Error assigning driver', true);
    }
  };

  const handleRemoveDriver = async (busId) => {
    try {
      await axiosInstance.post('/buses/remove-driver', { busId });
      showMessage('Driver removed successfully');
      fetchBuses();
      fetchDrivers(); 
    } catch (error) {
      showMessage(error.response?.data?.message || 'Error removing driver', true);
    }
  };

  
  const getAvailableDrivers = () => {
    return drivers.filter(driver => {
    
      return !driver.assignedBus;
    });
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">
          {editingBus ? 'Edit Bus' : 'Add New Bus'}
        </h2>
        <form onSubmit={handleBusSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bus Number
              </label>
              <input
                type="text"
                value={busForm.busNumber}
                onChange={(e) =>
                  setBusForm({
                    ...busForm,
                    busNumber: e.target.value,
                  })
                }
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Capacity
              </label>
              <input
                type="number"
                value={busForm.capacity}
                onChange={(e) =>
                  setBusForm({
                    ...busForm,
                    capacity: e.target.value,
                  })
                }
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 transition-colors flex items-center"
            >
              {loading ? (
                'Saving...'
              ) : editingBus ? (
                <>
                  <PencilIcon size={16} className="mr-2" />
                  Update Bus
                </>
              ) : (
                <>
                  <PlusCircleIcon size={16} className="mr-2" />
                  Add Bus
                </>
              )}
            </button>
            {editingBus && (
              <button
                type="button"
                onClick={() => {
                  setEditingBus(null)
                  setBusForm({
                    busNumber: '',
                    capacity: '',
                  })
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
  
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">All Buses</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {buses.map((bus) => (
            <div
              key={bus._id}
              className="border border-gray-200 rounded-lg overflow-hidden bg-white hover:shadow-md transition-shadow"
            >
              <div className="bg-indigo-50 px-4 py-3 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-indigo-700">
                    Bus #{bus.busNumber}
                  </h3>
                  <span className="text-sm bg-indigo-100 text-indigo-800 py-1 px-2 rounded-full">
                    Capacity: {bus.capacity}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">
                    Driver Information
                  </h4>
                  {bus.driver ? (
                    <div className="bg-gray-50 p-3 rounded-md">
                      <p className="font-medium text-gray-800">
                        {bus.driver.name}
                      </p>
                      <p className="text-sm text-gray-600 mb-3">
                        {bus.driver.email}
                      </p>
                      <button
                        onClick={() => handleRemoveDriver(bus._id)}
                        className="w-full flex items-center justify-center px-3 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50 transition-colors text-sm"
                      >
                        <UserMinusIcon size={16} className="mr-2" />
                        Remove Driver
                      </button>
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-3 rounded-md">
                      <p className="text-gray-600 mb-1">No driver assigned</p>
                      <p className="text-xs text-gray-500 mb-2">
                        Available drivers: {getAvailableDrivers().length}
                      </p>
                      <div className="space-y-2">
                        <select
                          onChange={(e) =>
                            setSelectedDriver({
                              ...selectedDriver,
                              [bus._id]: e.target.value,
                            })
                          }
                          value={selectedDriver[bus._id] || ''}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        >
                          <option value="">Select Driver</option>
                          {getAvailableDrivers().map((driver) => (
                            <option key={driver._id} value={driver._id}>
                              {driver.name}
                            </option>
                          ))}
                        </select>
                        {selectedDriver[bus._id] && (
                          <button
                            onClick={() =>
                              handleAssignDriver(
                                bus._id,
                                selectedDriver[bus._id],
                              )
                            }
                            className="w-full flex items-center justify-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
                          >
                            <UserPlusIcon size={16} className="mr-2" />
                            Assign Driver
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleEditBus(bus)}
                  className="w-full flex items-center justify-center px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm"
                >
                  <PencilIcon size={16} className="mr-2" />
                  Edit Bus
                </button>
              </div>
            </div>
          ))}
        </div>
        {buses.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No buses found. Add your first bus using the form above.
          </div>
        )}
      </div>
    </div>
  )
};

export default BusesManagement;
