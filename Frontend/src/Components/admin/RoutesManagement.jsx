import React, { useState, useEffect } from 'react';
import axiosInstance from '../../api/axiosInstance';
import {
  PlusCircleIcon,
  PencilIcon,
  TrashIcon,
  XCircleIcon,
} from 'lucide-react'


const RoutesManagement = ({ showMessage }) => {
  const [routes, setRoutes] = useState([]);
  const [buses, setBuses] = useState([]);
  const [routeForm, setRouteForm] = useState({
    routeName: '',
    startLocation: { name: '', latitude: '', longitude: '' },
    endLocation: { name: '', latitude: '', longitude: '' },
    stops: [{ name: '', latitude: '', longitude: '' }]
  });
  const [editingRoute, setEditingRoute] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRoutes();
    fetchBuses();
  }, []);

  const fetchRoutes = async () => {
    try {
      const response = await axiosInstance.get('/routes');
      setRoutes(response.data);
    // eslint-disable-next-line no-unused-vars
    } catch (error) {
      showMessage('Error fetching routes', true);
    }
  };

  const fetchBuses = async () => {
    try {
      const response = await axiosInstance.get('/buses');
      setBuses(response.data);
    // eslint-disable-next-line no-unused-vars
    } catch (error) {
      showMessage('Error fetching buses', true);
    }
  };

  const handleRouteSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingRoute) {
        await axiosInstance.put(`/routes/${editingRoute._id}`, routeForm);
        showMessage('Route updated successfully');
        setEditingRoute(null);
      } else {
        await axiosInstance.post('/routes', routeForm);
        showMessage('Route added successfully');
      }
      setRouteForm({
        routeName: '',
        startLocation: { name: '', latitude: '', longitude: '' },
        endLocation: { name: '', latitude: '', longitude: '' },
        stops: [{ name: '', latitude: '', longitude: '' }]
      });
      fetchRoutes();
    } catch (error) {
      showMessage(error.response?.data?.message || 'Error saving route', true);
    }
    setLoading(false);
  };

  const handleEditRoute = (route) => {
    setEditingRoute(route);
    setRouteForm({
      routeName: route.routeName,
      startLocation: route.startLocation,
      endLocation: route.endLocation,
      stops: route.stops.length > 0 ? route.stops : [{ name: '', latitude: '', longitude: '' }]
    });
  };

  const handleAssignBusToRoute = async (routeId, busId) => {
    try {
      await axiosInstance.post('/routes/assign-bus', { routeId, busId });
      showMessage('Bus assigned to route successfully');
      fetchRoutes();
    } catch (error) {
      showMessage(error.response?.data?.message || 'Error assigning bus to route', true);
    }
  };

  const handleDeleteRoute = async (routeId) => {
    if (window.confirm('Are you sure you want to delete this route?')) {
      try {
        await axiosInstance.delete(`/routes/${routeId}`);
        showMessage('Route deleted successfully');
        fetchRoutes();
      } catch (error) {
        showMessage(error.response?.data?.message || 'Error deleting route', true);
      }
    }
  };

  const addStop = () => {
    setRouteForm({
      ...routeForm,
      stops: [...routeForm.stops, { name: '', latitude: '', longitude: '' }]
    });
  };

  const removeStop = (index) => {
    const newStops = routeForm.stops.filter((_, i) => i !== index);
    setRouteForm({ ...routeForm, stops: newStops });
  };

  const updateStop = (index, field, value) => {
    const newStops = [...routeForm.stops];
    newStops[index][field] = value;
    setRouteForm({ ...routeForm, stops: newStops });
  };

  return (
    <div className="space-y-8">
      {/* Add/Edit Route Form */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">
          {editingRoute ? 'Edit Route' : 'Add New Route'}
        </h2>
        <form onSubmit={handleRouteSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Route Name
            </label>
            <input
              type="text"
              value={routeForm.routeName}
              onChange={(e) =>
                setRouteForm({
                  ...routeForm,
                  routeName: e.target.value,
                })
              }
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {/* Start Location */}
          <div className="p-4 border border-gray-200 rounded-md bg-gray-50">
            <h3 className="font-medium text-gray-700 mb-3">Start Location</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location Name
                </label>
                <input
                  type="text"
                  value={routeForm.startLocation.name}
                  onChange={(e) =>
                    setRouteForm({
                      ...routeForm,
                      startLocation: {
                        ...routeForm.startLocation,
                        name: e.target.value,
                      },
                    })
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={routeForm.startLocation.latitude}
                  onChange={(e) =>
                    setRouteForm({
                      ...routeForm,
                      startLocation: {
                        ...routeForm.startLocation,
                        latitude: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={routeForm.startLocation.longitude}
                  onChange={(e) =>
                    setRouteForm({
                      ...routeForm,
                      startLocation: {
                        ...routeForm.startLocation,
                        longitude: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
          {/* End Location */}
          <div className="p-4 border border-gray-200 rounded-md bg-gray-50">
            <h3 className="font-medium text-gray-700 mb-3">End Location</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location Name
                </label>
                <input
                  type="text"
                  value={routeForm.endLocation.name}
                  onChange={(e) =>
                    setRouteForm({
                      ...routeForm,
                      endLocation: {
                        ...routeForm.endLocation,
                        name: e.target.value,
                      },
                    })
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={routeForm.endLocation.latitude}
                  onChange={(e) =>
                    setRouteForm({
                      ...routeForm,
                      endLocation: {
                        ...routeForm.endLocation,
                        latitude: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={routeForm.endLocation.longitude}
                  onChange={(e) =>
                    setRouteForm({
                      ...routeForm,
                      endLocation: {
                        ...routeForm.endLocation,
                        longitude: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
          {/* Stops */}
          <div className="p-4 border border-gray-200 rounded-md bg-gray-50">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-medium text-gray-700">Stops</h3>
              <button
                type="button"
                onClick={addStop}
                className="flex items-center text-sm text-indigo-600 hover:text-indigo-800"
              >
                <PlusCircleIcon size={16} className="mr-1" />
                Add Stop
              </button>
            </div>
            {routeForm.stops.map((stop, index) => (
              <div
                key={index}
                className="mb-4 p-3 border border-gray-200 rounded-md bg-white"
              >
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-gray-700">
                    Stop {index + 1}
                  </h4>
                  {routeForm.stops.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeStop(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <XCircleIcon size={16} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stop Name
                    </label>
                    <input
                      type="text"
                      value={stop.name}
                      onChange={(e) =>
                        updateStop(index, 'name', e.target.value)
                      }
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Latitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={stop.latitude}
                      onChange={(e) =>
                        updateStop(index, 'latitude', e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Longitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={stop.longitude}
                      onChange={(e) =>
                        updateStop(index, 'longitude', e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center space-x-3">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 transition-colors flex items-center"
            >
              {loading ? (
                'Saving...'
              ) : editingRoute ? (
                <>
                  <PencilIcon size={16} className="mr-2" />
                  Update Route
                </>
              ) : (
                <>
                  <PlusCircleIcon size={16} className="mr-2" />
                  Add Route
                </>
              )}
            </button>
            {editingRoute && (
              <button
                type="button"
                onClick={() => {
                  setEditingRoute(null)
                  setRouteForm({
                    routeName: '',
                    startLocation: {
                      name: '',
                      latitude: '',
                      longitude: '',
                    },
                    endLocation: {
                      name: '',
                      latitude: '',
                      longitude: '',
                    },
                    stops: [
                      {
                        name: '',
                        latitude: '',
                        longitude: '',
                      },
                    ],
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
      {/* Routes List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">All Routes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {routes.map((route) => (
            <div
              key={route._id}
              className="border border-gray-200 rounded-lg overflow-hidden bg-white hover:shadow-md transition-shadow"
            >
              <div className="bg-indigo-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                <h3 className="font-semibold text-indigo-700">
                  {route.routeName}
                </h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEditRoute(route)}
                    className="p-1 text-indigo-600 hover:text-indigo-800"
                  >
                    <PencilIcon size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteRoute(route._id)}
                    className="p-1 text-red-500 hover:text-red-700"
                  >
                    <TrashIcon size={16} />
                  </button>
                </div>
              </div>
              <div className="p-4">
                <div className="mb-4 space-y-2">
                  <div className="flex">
                    <span className="font-medium text-gray-700 w-20">
                      Start:
                    </span>
                    <span className="text-gray-600">
                      {route.startLocation.name}
                    </span>
                  </div>
                  <div className="flex">
                    <span className="font-medium text-gray-700 w-20">End:</span>
                    <span className="text-gray-600">
                      {route.endLocation.name}
                    </span>
                  </div>
                  <div className="flex">
                    <span className="font-medium text-gray-700 w-20">
                      Stops:
                    </span>
                    <span className="text-gray-600">
                      {route.stops.map((stop) => stop.name).join(', ')}
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded-md">
                  <h4 className="font-medium text-gray-700 mb-2">
                    Bus Assignment
                  </h4>
                  {route.assignedBus ? (
                    <div className="space-y-1">
                      <div className="flex">
                        <span className="font-medium text-gray-700 w-24">
                          Bus Number:
                        </span>
                        <span className="text-gray-600">
                          #{route.assignedBus.busNumber}
                        </span>
                      </div>
                      <div className="flex">
                        <span className="font-medium text-gray-700 w-24">
                          Capacity:
                        </span>
                        <span className="text-gray-600">
                          {route.assignedBus.capacity}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-gray-600 mb-2">No bus assigned</p>
                      <select
                        onChange={(e) =>
                          e.target.value &&
                          handleAssignBusToRoute(route._id, e.target.value)
                        }
                        defaultValue=""
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      >
                        <option value="">Select Bus</option>
                        {buses
                          .filter(
                            (bus) =>
                              !routes.some(
                                (r) => r.assignedBus?._id === bus._id,
                              ),
                          )
                          .map((bus) => (
                            <option key={bus._id} value={bus._id}>
                              Bus #{bus.busNumber} (Capacity: {bus.capacity})
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        {routes.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No routes found. Add your first route using the form above.
          </div>
        )}
      </div>
    </div>
  )
};

export default RoutesManagement;
