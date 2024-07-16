import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const UserStatus = ({ userId }) => {
  const [isOnline, setIsOnline] = useState(false);  // Trạng thái trực tuyến của người dùng
  const socket = io('http://localhost:8080'); // Kết nối WebSocket

  useEffect(() => {  
    socket.emit('addUser', userId);// Thông báo cho server rằng người dùng đã kết nối

    socket.on('usersUpdated', (updatedUsers) => {// Cập nhật danh sách người dùng từ server
      const user = updatedUsers.find(user => user.userId === userId);// Tìm người dùng hiện tại trong danh sách cập nhật
      setIsOnline(user !== undefined);// Cập nhật trạng thái 
    });

    return () => {
      socket.disconnect(); // Hàm disconnect để ngắt kết nối 
    };
  }, [userId, socket]);

  return (
    // Hiển thị trạng thái online/offline
    <span className={`text-sm font-light ${isOnline ? 'text-green-500' : 'text-gray-600'}`}>
      {isOnline ? 'Online' : 'Offline'}
    </span>
  );
};

export default UserStatus;