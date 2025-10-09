# Notification System Test Guide

## 🧪 **Testing the Enhanced Notification System**

This guide will help you test all the implemented features to ensure the notification system works correctly for both online and offline students.

## **Prerequisites**
1. Backend server running on port 5000
2. Frontend running on port 5173
3. MongoDB database connected
4. At least one admin user and one student user created
5. At least one route and bus assigned

## **Test 1: Admin Sending Notifications**

### **Step 1: Admin Login**
1. Navigate to `/admin-dashboard`
2. Login with admin credentials
3. Verify you can see the "📢 Notifications" tab

### **Step 2: Send Route-Specific Notification**
1. Click on "📢 Notifications" tab
2. Fill in the form:
   - **Title**: "Test Route Notification"
   - **Message**: "This is a test notification for a specific route"
   - **Target Type**: "Specific Route"
   - **Select Route**: Choose an existing route
   - **Type**: "General"
   - **Priority**: "Medium"
3. Click "Send Notification"
4. **Expected Result**: 
   - Success message showing total recipients
   - Breakdown of online vs offline recipients
   - Form resets

### **Step 3: Send Bus-Wide Notification**
1. Change **Target Type** to "All Routes for a Bus"
2. **Select Bus**: Choose an existing bus
3. Fill in different title/message
4. Click "Send Notification"
5. **Expected Result**: 
   - Success message
   - Notification sent to all routes assigned to that bus

## **Test 2: Student Receiving Real-Time Notifications**

### **Step 1: Student Login (Online)**
1. Open a new browser tab/window
2. Navigate to `/student-dashboard`
3. Login with student credentials
4. Verify socket connection status shows "Connected" (green dot)

### **Step 2: Test Real-Time Delivery**
1. Go back to admin dashboard
2. Send a new notification targeting the student's route
3. **Expected Result**: 
   - Student receives notification instantly (within 1-2 seconds)
   - Notification appears as a toast
   - Can expand to see details
   - Can mark as read

## **Test 3: Offline Student Functionality**

### **Step 1: Simulate Offline Student**
1. Close the student dashboard tab/window
2. Or disconnect internet temporarily

### **Step 2: Send Notification to Offline Student**
1. From admin dashboard, send another notification
2. **Expected Result**: 
   - Admin gets success message
   - Shows offline recipients count > 0
   - Notification stored in database

### **Step 3: Student Returns Online**
1. Reopen student dashboard or reconnect internet
2. Login with student credentials
3. **Expected Result**: 
   - Historical notifications load automatically
   - Shows all notifications sent while offline
   - Unread count is accurate

## **Test 4: Notification History & Persistence**

### **Step 1: Check Database Storage**
1. In MongoDB, check the `notifications` collection
2. **Expected Result**: 
   - All sent notifications are stored
   - `recipients` array contains student IDs
   - `readBy` array tracks read status

### **Step 2: Test Manual History Loading**
1. In student dashboard, click "View All Notifications" or "Check for Updates"
2. **Expected Result**: 
   - Loads all historical notifications
   - Shows proper pagination if many notifications
   - Unread count updates correctly

## **Test 5: Connection Handling**

### **Step 1: Test Disconnection**
1. In student dashboard, temporarily disconnect internet
2. **Expected Result**: 
   - Connection status shows "Disconnected" (red dot)
   - Can still load notification history
   - "Load Notification History" button appears

### **Step 2: Test Reconnection**
1. Reconnect internet
2. **Expected Result**: 
   - Connection status returns to "Connected" (green dot)
   - Historical notifications load automatically
   - Real-time notifications resume

## **Test 6: Error Handling**

### **Step 1: Test Invalid Data**
1. Try to send notification without title/message
2. **Expected Result**: 
   - Form validation prevents submission
   - Error message displayed

### **Step 2: Test No Target Selection**
1. Try to send without selecting route or bus
2. **Expected Result**: 
   - Form validation prevents submission
   - Error message displayed

## **Expected Database Schema**

### **Notification Document Structure**
```json
{
  "_id": "ObjectId",
  "title": "String",
  "message": "String",
  "relatedRoute": "ObjectId (ref: Route)",
  "relatedBus": "ObjectId (ref: Bus)",
  "notificationType": "enum: ['delay', 'cancellation', 'update', 'general']",
  "priority": "enum: ['low', 'medium', 'high', 'urgent']",
  "sentBy": "ObjectId (ref: User)",
  "recipients": ["ObjectId (ref: User)"],
  "readBy": [{
    "user": "ObjectId (ref: User)",
    "readAt": "Date"
  }],
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

## **Console Logs to Monitor**

### **Backend (Server Console)**
- Socket connection/disconnection messages
- "Notification stored in DB for X total recipients"
- "Online recipients: X (real-time delivery)"
- "Offline recipients: X (stored for later viewing)"

### **Frontend (Browser Console)**
- Socket connection status
- "Notification sent:" messages
- "Route subscription confirmed:" messages
- Historical notification loading

## **Troubleshooting Common Issues**

### **Issue 1: Notifications Not Storing in DB**
- Check MongoDB connection
- Verify Notification model is properly imported
- Check server logs for errors

### **Issue 2: Students Not Receiving Historical Notifications**
- Verify user has `selectedRoute` set
- Check if user is in `recipients` array
- Verify API endpoint `/api/notifications/user` works

### **Issue 3: Socket Connection Issues**
- Check JWT token validity
- Verify CORS configuration
- Check if backend server is running

### **Issue 4: Admin Cannot Send Notifications**
- Verify user has admin role
- Check socket connection status
- Ensure routes/buses are properly assigned

## **Performance Testing**

### **Test with Multiple Students**
1. Create 10+ student users
2. Assign them to different routes
3. Send notifications to different targets
4. **Expected Result**: 
   - Notifications delivered in reasonable time
   - Database queries perform well
   - Memory usage remains stable

### **Test with Many Notifications**
1. Send 50+ notifications
2. Test pagination in student dashboard
3. **Expected Result**: 
   - Pagination works correctly
   - Performance remains good
   - No memory leaks

## **Success Criteria**

✅ **All tests pass**
✅ **Real-time notifications work for online students**
✅ **Notifications stored in DB for offline students**
✅ **Historical notifications load correctly**
✅ **Connection handling works properly**
✅ **Error handling is robust**
✅ **Performance is acceptable**

## **Next Steps After Testing**

1. **Fix any issues** found during testing
2. **Optimize performance** if needed
3. **Add monitoring** for production use
4. **Document any additional features** needed
5. **Plan deployment** strategy

---

**Note**: This test guide covers the core functionality. Additional testing may be needed based on specific requirements or edge cases.
