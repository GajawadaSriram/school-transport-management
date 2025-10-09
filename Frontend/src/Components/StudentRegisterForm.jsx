import React, { useState, useEffect } from "react";
import axiosInstance from "../api/axiosInstance";
import { AtSign, Lock, User, Bus, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Toaster, toast } from "sonner"; // ✅ sonner import

const StudentRegisterForm = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "student",
    selectedRoute: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [routes, setRoutes] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const res = await axiosInstance.get("/routes");
        setRoutes(res.data);
      } catch (error) {
        console.error("Error fetching routes:", error);
        toast.error("❌ Failed to fetch routes. Try again later.");
      }
    };
    fetchRoutes();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "selectedRoute") {
      if (!value) return;

      const selectedIndex = e.target.selectedIndex;
      const selectedText = e.target.options[selectedIndex].text;

      setFormData((prev) => ({
        ...prev,
        selectedRoute: value,
        selectedRouteDisplay: selectedText,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Full name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (formData.role === "student" && !formData.selectedRoute) {
      newErrors.selectedRoute = "Please select a bus route";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      await axiosInstance.post("/auth/register", {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        selectedRoute:
          formData.role === "student" ? formData.selectedRoute : undefined,
      });

      toast.success("🎉 Registration successful! Redirecting...");

      setTimeout(() => {
        navigate("/student-login");
      }, 1500);
    } catch (error) {
      console.error("Registration error:", error);

      if (error.response?.status === 400) {
        toast.error(error.response.data?.message || "Please check your input.");
      } else if (error.response?.status === 409) {
        toast.error("⚠️ An account with this email already exists.");
      } else if (error.response?.status >= 500) {
        toast.error("🚨 Server error. Please try again later.");
      } else if (!error.response) {
        toast.error("🌐 Network error. Check your connection.");
      } else {
        toast.error("❌ Registration failed. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex justify-center items-center p-4 sm:p-6">
      {/* ✅ Toaster for sonner notifications */}
      <Toaster richColors position="top-right" />

      <div className="w-full max-w-md relative">
        {/* Animated bus icons */}
        <div className="absolute -top-16 -left-8 animate-bounce-slow opacity-70">
          <Bus size={32} className="text-blue-500" />
        </div>
        <div className="absolute top-10 -right-10 animate-bounce-slow animation-delay-300 opacity-70">
          <Bus size={28} className="text-yellow-500" />
        </div>
        <div className="absolute -bottom-10 -left-12 animate-bounce-slow animation-delay-700 opacity-70">
          <Bus size={30} className="text-green-500" />
        </div>
        <div className="absolute -bottom-8 right-0 animate-bounce-slow animation-delay-1000 opacity-70">
          <Bus size={26} className="text-red-500" />
        </div>

        <div className="bg-white rounded-xl shadow-xl p-8 w-full">
          <form onSubmit={handleSubmit}>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-800">
                Student Registration
              </h2>
              <div className="mt-2 h-1 w-16 bg-blue-500 mx-auto rounded-full"></div>
            </div>

            <div className="space-y-5">
              {/* Full Name */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  name="name"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
                    errors.name ? "border-red-500" : "border-gray-300"
                  } focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-500">{errors.name}</p>
                )}
              </div>

              {/* Email */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <AtSign className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  name="email"
                  placeholder="Email Address"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
                    errors.email ? "border-red-500" : "border-gray-300"
                  } focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                )}
              </div>

              {/* Password */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
                    errors.password ? "border-red-500" : "border-gray-300"
                  } focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-500">{errors.password}</p>
                )}
              </div>

              {/* Bus Route */}
              {formData.role === "student" && (
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Bus className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    name="selectedRoute"
                    value={formData.selectedRoute}
                    onChange={handleChange}
                    required
                    className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
                      errors.selectedRoute
                        ? "border-red-500"
                        : "border-gray-300"
                    } focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none bg-white`}
                  >
                    <option value="" disabled hidden>
                      Select Bus & Route
                    </option>
                    {routes.map((route) => (
                      <option key={route._id} value={route._id}>
                        {`${route.startLocation.name} → ${route.endLocation.name} | Bus: ${
                          route.assignedBus?.busNumber ?? "No bus assigned"
                        }`}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg
                      className="h-5 w-5 text-gray-400"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  {errors.selectedRoute && (
                    <p className="mt-1 text-sm text-red-500">
                      {errors.selectedRoute}
                    </p>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="animate-spin mr-2 h-5 w-5" />
                    Registering...
                  </span>
                ) : (
                  "Register"
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Already have an account?{" "}
              <a
                href="/student-login"
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Sign in here
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentRegisterForm;
