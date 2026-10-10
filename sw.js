const CACHE_NAME = 'studymate-v45';
const urlsToCache = ['./index.html', './app.js', './manifest.json'];

// 1. Lưu đệm để mất mạng app vẫn mở lên được
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
  event.respondWith(caches.match(event.request).then(res => res || fetch(event.request)));
});

// 2. NHẬN LỆNH TỪ APP KHI CẬU VUỐT THOÁT RA MÀN HÌNH CHÍNH
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SHOW_ANTI_CHEAT') {
    // Bắn thông báo rớt từ viền trên màn hình xuống (Pop-down)
    self.registration.showNotification('StudyMate - Hỏi nhỏ nè! 🐾', {
      body: 'Cậu đang thoát app để tra tài liệu hay đi chơi đó?',
      icon: 'https://cdn-icons-png.flaticon.com/512/3048/3048122.png',
      vibrate: [200, 100, 200], // Rung điện thoại
      requireInteraction: true, // Treo thông báo trên màn hình đợi người dùng bấm
      actions: [
        { action: 'research', title: '📚 Tra tài liệu' },
        { action: 'play', title: '🎮 Đi chơi' }
      ]
    });
  }
});

// 3. LẮNG NGHE LÚC CẬU BẤM NÚT TRÊN CÁI THÔNG BÁO ĐÓ
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'research') {
    // Nếu bấm "Tra tài liệu" -> Báo hiệu về App tự động đếm giờ ngầm tiếp
    self.clients.matchAll().then(clients => {
      clients.forEach(client => client.postMessage({ type: 'RESUME_POMODORO' }));
    });
    // Gửi thêm 1 thông báo ting phản hồi lại
    self.registration.showNotification('Tuyệt vời!', { 
        body: 'Tớ đã cho đồng hồ tự động chạy ngầm tiếp rồi. Cậu tra tài liệu tốt nhé!',
        icon: 'https://cdn-icons-png.flaticon.com/512/3048/3048122.png'
    });
  } else if (event.action === 'play') {
    // Nếu bấm "Đi chơi"
    self.registration.showNotification('Ân xá 5 phút', { 
        body: 'Đồng hồ tạm dừng. Nhớ quay lại app trong 5 phút nữa kẻo Cục Bông bị phạt nha!',
        icon: 'https://cdn-icons-png.flaticon.com/512/3048/3048122.png'
    });
  } else {
      // Bấm vào chỗ trống của thông báo -> Mở lại App
      event.waitUntil(clients.matchAll({ type: 'window' }).then(clientsArr => {
        const hadWindowToFocus = clientsArr.some(windowClient => windowClient.url === '/' ? (windowClient.focus(), true) : false);
        if (!hadWindowToFocus) clients.openWindow('./index.html');
      }));
  }
});