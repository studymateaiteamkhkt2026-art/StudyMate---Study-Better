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

// CẤU HÌNH FIREBASE VÀ ĐÁM MÂY
const firebaseConfig = {
    apiKey: "AIzaSyB4QNiATSNKFcTzEmqPOsqbsV9KH4p0-iM",
    authDomain: "studymate-209b6.firebaseapp.com",
    projectId: "studymate-209b6",
    storageBucket: "studymate-209b6.firebasestorage.app",
    messagingSenderId: "458359250086",
    appId: "1:458359250086:web:1cd45ef64c6948532ba867",
    measurementId: "G-DREJY2E46W"
};

var auth = null;
var db = null;
let currentUser = null; 

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then(() => {
        if(Notification.permission !== "granted") Notification.requestPermission(); 
    });
}

function toggleVis(id) { const el=document.getElementById(id); el.type=el.type==='password'?'text':'password'; el.nextElementSibling.innerText = el.type==='password'?'HIỆN':'ẨN';}
function pushNotify(title, bodyMsg, soundType = 'ting') {
    try {
        if (soundType === 'ring') document.getElementById('snd-ring').play().catch(()=>{});
        else document.getElementById('snd-ting').play().catch(()=>{});
    } catch(e) {}
    if ("Notification" in window && Notification.permission === "granted") {
        try { new Notification(title, { body: bodyMsg }); } catch(e){}
    }
}

const EMAILJS_SERVICE_ID = "service_k5w9gqn";
const EMAILJS_TEMPLATE_ID = "template_8v5iu9f";
let isEmailReady = false;
try { if (typeof emailjs !== 'undefined') { emailjs.init("KDB1p6acCE9CdHZhk"); isEmailReady = true; } } catch(err) {}

async function forgotPassword() {
    const e = prompt("Nhập email cậu đã dùng để đăng ký:"); if (!e) return;
    auth.sendPasswordResetEmail(e).then(() => { alert("✅ Đã gửi một link đặt lại mật khẩu đến Email của cậu.");
    }).catch(err => { alert("❌ Lỗi: Có thể email này chưa được đăng ký hoặc sai định dạng."); });
}

const ALL_SUBJECTS = ["Toán", "Văn", "NgoaiNgu", "Sinh", "Lý", "Hóa", "Sử", "Địa", "Tin", "KinhTe"];
const SUBJ_LABELS = {"Toán":"Toán", "Văn":"Văn", "NgoaiNgu":"Ng.Ngữ", "Sinh":"Sinh", "Lý":"Lý", "Hóa":"Hóa", "Sử":"Sử", "Địa":"Địa", "Tin":"Tin", "KinhTe":"KT&PL"};
const SUBJ_COLORS = {"Toán":"#f87171", "Văn":"#60a5fa", "NgoaiNgu":"#fbbf24", "Sinh":"#34d399", "Lý":"#a78bfa", "Hóa":"#f472b6", "Sử":"#fb923c", "Địa":"#2dd4bf", "Tin":"#94a3b8", "KinhTe":"#fcd34d"};

// DỮ LIỆU ĐÁM MÂY (Thêm biến lastLoginDate)
let state = { em:"", nm:"", scl:"", cls:"", coins:50, en:50, hp:50, curPet:"pet_white", eq:{neck:"", aura:"", eyes:"", head:"", hair:""}, myPets:["pet_white"], myItems:[], inventory:{}, savedLib:[], todos:[], tkb:[], studyHours:{}, weeklyGoals:{}, activeGoals:["Toán", "Văn", "NgoaiNgu"], exams:[], lastLoginDate:"" };
ALL_SUBJECTS.forEach(s => state.weeklyGoals[s] = 1);
let authM = 'LOGIN';

window.onload = function() {
    // 🚨 BẢN CỨU CÁNH: Đã tắt tự động quét tài khoản Firebase để tránh treo app
}

function loadUserDataFromCloud(uid, email) {
    // 🚨 BẢN CỨU CÁNH: Bỏ qua tải dữ liệu đám mây
    document.getElementById('step-auth').classList.add('hidden');
    startMain();
}

// THUẬT TOÁN KỶ LUẬT: KIỂM TRA NGÀY MỚI
function checkNewDayAlgorithm() {
    const todayStr = new Date().toLocaleDateString('vi-VN'); 
    if (state.lastLoginDate !== todayStr && state.lastLoginDate !== "") {
        state.en = 10; state.hp = 10; // Ép về 10%
        alert("🚨 NGÀY MỚI!\nNăng lượng và Hạnh phúc của Pet đã giảm xuống 10%.\nHãy học tập để kiếm Xu mua đồ ăn nhé!");
    }
    state.lastLoginDate = todayStr;
    saveState();
}

function switchAuthTab(m) {
    authM = m; document.getElementById('auth-btn-submit').innerText = m==='LOGIN'?'Đăng Nhập':'Đăng Ký';
    document.getElementById('auth-repass-field').classList[m==='LOGIN'?'add':'remove']('hidden');
    document.getElementById('tab-login').className = m==='LOGIN'?"flex-1 py-2 text-xs font-bold rounded-xl bg-white text-slate-800 shadow-sm border border-slate-200":"flex-1 py-2 text-xs font-bold rounded-xl text-slate-500 border border-transparent";
    document.getElementById('tab-register').className = m==='REGISTER'?"flex-1 py-2 text-xs font-bold rounded-xl bg-white text-slate-800 shadow-sm border border-slate-200":"flex-1 py-2 text-xs font-bold rounded-xl text-slate-500 border border-transparent";
}

function checkPass(p) { return p.length>=8 && /\d/.test(p) && /[!@#$%^&*(),.?":{}|<>]/.test(p); }

function handleAuth() {
    // 🚨 BẢN CỨU CÁNH NỘP BÀI KHKT: VÀO THẲNG APP KHÔNG CẦN CHỜ MẠNG HAY FIREBASE
    const e = document.getElementById('auth-email').value.trim() || "studymate@gmail.com";
    
    // 🌟 SIÊU TÍNH NĂNG OFFLINE: Khôi phục dữ liệu đã lưu trên trình duyệt
    const savedData = localStorage.getItem("studymate_offline_data");
    if (savedData) {
        state = Object.assign(state, JSON.parse(savedData));
    }

    state.em = e;
    if (!state.nm) state.nm = "Thu (KHKT)"; 
    
    document.getElementById('step-auth').classList.add('hidden');
    startMain();
}

function logOut() { location.reload(); }

function saveInfoAndStartTest() {
    const n=document.getElementById('input-name').value.trim(), s=document.getElementById('input-school').value.trim(), c=document.getElementById('input-class').value.trim();
    if(!n||!s||!c) return alert("Điền đủ thông tin nha!");
    state.nm=n; state.scl=s; state.cls=c;
    document.getElementById('step-info').classList.add('hidden'); document.getElementById('step-quiz').classList.remove('hidden');
    diagIdx=0; diagScore=0; loadDiag();
}

const diagQs = [ "Bồn chồn khi mất mạng?", "Sợ bỏ lỡ thông tin trên mạng (FOMO)?", "Áp lực trả lời tin nhắn ngay lập tức?", "Xem story bạn bè thấy tự ti/trống rỗng?", "Vô thức mở app MXH liên tục?", "Vừa học vừa bật video lướt ngắn?", "Nhủ 'lướt 5 phút' nhưng bị cuốn 30 phút?", "Khó tập trung học 25 phút không đụng máy?", "Lướt điện thoại khiến ngủ rất muộn?", "Mỏi mắt, đau nửa đầu do nhìn màn hình?", "Phản xạ kiểm tra máy ngay khi giật mình thức giấc?", "Sáng dậy uể oải dù ngủ đủ?" ];
let diagIdx=0, diagScore=0;
function loadDiag() {
    document.getElementById('quiz-progress-text').innerText=`${diagIdx+1}/12`;
    document.getElementById('quiz-progress-bar').style.width=`${((diagIdx+1)/12)*100}%`;
    document.getElementById('quiz-question-title').innerText=`Câu hỏi ${diagIdx+1}: ${diagQs[diagIdx]}`;
}
function handleDiagAnswer(v) {
    diagScore+=v; diagIdx++;
    if(diagIdx < 12) { loadDiag(); } else {
        const avg = diagScore/12;
        if(avg > 4) { state.en=20; state.hp=20; } else if(avg > 3) { state.en=40; state.hp=40; } else { state.en=70; state.hp=70; }
        if (currentUser) {
            db.collection('users').doc(currentUser.uid).set(state).then(() => {
                document.getElementById('step-quiz').classList.add('hidden'); startMain();
            });
        } else {
            document.getElementById('step-quiz').classList.add('hidden'); startMain();
        }
    }
}

// LOGIC CẬP NHẬT TRẠNG THÁI PET (Chấm đỏ/vàng/xanh)
function updatePetStatusColor() {
    const statusDot = document.getElementById('pet-status-dot');
    if (!statusDot) return;
    const avg = (state.en + state.hp) / 2;
    statusDot.classList.remove('bg-emerald-500', 'bg-amber-400', 'bg-rose-600', 'animate-pulse');
    if (avg >= 70) statusDot.classList.add('bg-emerald-500'); 
    else if (avg >= 30) statusDot.classList.add('bg-amber-400'); 
    else statusDot.classList.add('bg-rose-600', 'animate-pulse'); 
}

function saveState() {
    renderPet(); renderInventory(); renderSched(); updateShopCoin(); updatePetStatusColor();
    
    // 🌟 SIÊU TÍNH NĂNG OFFLINE: Lưu ngay vào trình duyệt, F5 không bao giờ mất!
    localStorage.setItem("studymate_offline_data", JSON.stringify(state));
    
    if (currentUser && db) db.collection('users').doc(currentUser.uid).set(state).catch(e => console.log("Chờ mạng đồng bộ..."));
}

function drawSvg(content) { return `<svg viewBox="0 0 100 100" class="w-full h-full object-contain pointer-events-none drop-shadow-sm">${content}</svg>`; }
function makePet(fill, stroke, isGrad=false) {
    if(isGrad) return `<defs><linearGradient id="g_${stroke.replace('#','')}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${fill}"/><stop offset="100%" stop-color="${stroke}"/></linearGradient></defs><ellipse cx="50" cy="55" rx="45" ry="40" fill="url(#g_${stroke.replace('#','')})" stroke="rgba(255,255,255,0.4)" stroke-width="3"/>`;
    return `<ellipse cx="50" cy="55" rx="45" ry="40" fill="${fill}" stroke="${stroke}" stroke-width="3"/>`;
}

// BỘ DỮ LIỆU CỦA CẬU
const PETS = [ 
    { id: "pet_white", n: "Trắng Sứ", svg: drawSvg(makePet("#FDFBF7", "#E5DDD3")), p: 0 }, 
    { id: "pet_pink", n: "Hồng Phấn", svg: drawSvg(makePet("#FFE4E1", "#FFB6C1")), p: 50 }, 
    { id: "pet_yellow", n: "Vàng Chanh", svg: drawSvg(makePet("#FFFACD", "#F0E68C")), p: 50 }, 
    { id: "pet_green", n: "Xanh Bơ", svg: drawSvg(makePet("#E0FFF0", "#98FB98")), p: 50 }, 
    { id: "pet_blue", n: "Xanh Dương", svg: drawSvg(makePet("#E0FFFF", "#AFEEEE")), p: 50 }, 
    { id: "pet_purple", n: "Tím Mộng Mơ", svg: drawSvg(makePet("#E6E6FA", "#DDA0DD")), p: 50 }, 
    { id: "pet_gray", n: "Xám Khói", svg: drawSvg(makePet("#F0F8FF", "#B0C4DE")), p: 50 }, 
    { id: "pet_red", n: "Đỏ Ruby (Hiếm)", svg: drawSvg(makePet("#FF7F50", "#FF4500")), p: 150 }, 
    { id: "pet_emerald", n: "Lục Bảo (Hiếm)", svg: drawSvg(makePet("#40E0D0", "#20B2AA")), p: 150 }, 
    { id: "pet_brown", n: "Hạt Dẻ (Hiếm)", svg: drawSvg(makePet("#DEB887", "#D2691E")), p: 150 }, 
    { id: "pet_black", n: "Đen Tuyền (Hiếm)", svg: drawSvg(makePet("#2F4F4F", "#000000")), p: 150 }, 
    { id: "pet_silver", n: "Bạc Ngọc Trai", svg: drawSvg(makePet("#FFFFFF", "#A9A9A9", true)), p: 300 }, 
    { id: "pet_gold", n: "Vàng Hoàng Kim", svg: drawSvg(makePet("#FFD700", "#FF8C00", true)), p: 500 }, 
    { id: "pet_galaxy", n: "Vũ Trụ Galaxy", svg: drawSvg(makePet("#8A2BE2", "#FF1493", true)), p: 1000 }
];
const petFace = {
    normal: drawSvg(`<circle cx="35" cy="50" r="4.5" fill="#1E293B"/><circle cx="65" cy="50" r="4.5" fill="#1E293B"/><path d="M45 60 Q50 65 55 60" fill="none" stroke="#1E293B" stroke-width="3" stroke-linecap="round"/>`),
    angry:  drawSvg(`<path d="M23 44 L38 49 L23 54" fill="none" stroke="#1E293B" stroke-width="3.5" stroke-linecap="round"/><path d="M77 44 L62 49 L77 54" fill="none" stroke="#1E293B" stroke-width="3.5" stroke-linecap="round"/><path d="M45 65 Q50 60 55 65" fill="none" stroke="#1E293B" stroke-width="3" stroke-linecap="round"/>`),
    eating: drawSvg(`<path d="M30 48 Q35 45 40 48" fill="none" stroke="#1E293B" stroke-width="3" stroke-linecap="round"/><path d="M60 48 Q65 45 70 48" fill="none" stroke="#1E293B" stroke-width="3" stroke-linecap="round"/><circle cx="50" cy="62" r="6" fill="#FDA4AF"/>`)
};
const ACCS = [ 
    { id: "kinh1", name: "Kính Cận Tròn", slot: "eyes", svg: drawSvg(`<circle cx="35" cy="50" r="12" fill="rgba(255,255,255,0.3)" stroke="#111" stroke-width="3"/><circle cx="65" cy="50" r="12" fill="rgba(255,255,255,0.3)" stroke="#111" stroke-width="3"/><path d="M47 50 L53 50" stroke="#111" stroke-width="3"/>`), price: 20 }, 
    { id: "kinh2", name: "Kính Râm Cool", slot: "eyes", svg: drawSvg(`<path d="M20 45 Q35 40 47 45 L35 55 Z" fill="#111"/><path d="M80 45 Q65 40 53 45 L65 55 Z" fill="#111"/><path d="M47 45 L53 45" stroke="#111" stroke-width="2"/>`), price: 30 }, 
    { id: "mu1", name: "Mũ Rơm Nông Dân", slot: "head", svg: drawSvg(`<path d="M10 35 Q50 15 90 35" fill="none" stroke="#DAA520" stroke-width="8" stroke-linecap="round"/><path d="M30 32 Q50 -10 70 32" fill="#F0E68C" stroke="#DAA520" stroke-width="2"/>`), price: 40 }, 
    { id: "mu2", name: "Mũ Lưỡi Trai Đỏ", slot: "head", svg: drawSvg(`<path d="M30 30 Q50 5 70 30 L70 35 L30 35 Z" fill="#EF4444"/><path d="M70 35 Q85 35 90 40 L30 40 Q25 35 30 35" fill="#DC2626"/>`), price: 45 },
    { id: "mu3", name: "Mũ Phù Thủy", slot: "head", svg: drawSvg(`<path d="M15 35 L85 35 L50 0 Z" fill="#4B0082"/><path d="M10 35 L90 35" stroke="#000" stroke-width="4"/><rect x="40" y="30" width="20" height="5" fill="#FFD700"/>`), price: 60 },
    { id: "mu4", name: "Mũ Cử Nhân", slot: "head", svg: drawSvg(`<path d="M50 10 L80 20 L50 30 L20 20 Z" fill="#111"/><path d="M35 25 L35 40 L65 40 L65 25" fill="#111"/><path d="M80 20 L80 40" stroke="#FFD700" stroke-width="2"/><circle cx="80" cy="40" r="3" fill="#FFD700"/>`), price: 70 },
    { id: "vuongmien1", name: "Vương Miện Vàng", slot: "head", svg: drawSvg(`<path d="M30 35 L35 10 L50 25 L65 10 L70 35 Z" fill="#FFD700" stroke="#DAA520" stroke-width="2"/><circle cx="35" cy="10" r="3" fill="#EF4444"/><circle cx="50" cy="25" r="3" fill="#3B82F6"/><circle cx="65" cy="10" r="3" fill="#EF4444"/>`), price: 100 }, 
    { id: "toc1", name: "Tai Mèo Nhỏ", slot: "hair", svg: drawSvg(`<path d="M25 30 L30 5 L45 25 Z" fill="#475569"/><path d="M75 30 L70 5 L55 25 Z" fill="#475569"/><path d="M28 26 L31 12 L40 23 Z" fill="#FBCFE8"/><path d="M72 26 L69 12 L60 23 Z" fill="#FBCFE8"/>`), price: 40 }, 
    { id: "toc2", name: "Tai Thỏ Trắng", slot: "hair", svg: drawSvg(`<ellipse cx="35" cy="15" rx="8" ry="25" fill="#FFF" stroke="#CBD5E1" stroke-width="2" transform="rotate(-15 35 15)"/><ellipse cx="65" cy="15" rx="8" ry="25" fill="#FFF" stroke="#CBD5E1" stroke-width="2" transform="rotate(15 65 15)"/><ellipse cx="35" cy="15" rx="4" ry="15" fill="#FBCFE8" transform="rotate(-15 35 15)"/><ellipse cx="65" cy="15" rx="4" ry="15" fill="#FBCFE8" transform="rotate(15 65 15)"/>`), price: 50 }, 
    { id: "toc3", name: "Kẹp Nơ Hồng", slot: "hair", svg: drawSvg(`<path d="M60 25 L75 15 L75 35 Z" fill="#F472B6"/><path d="M90 25 L75 15 L75 35 Z" fill="#F472B6"/><circle cx="75" cy="25" r="4" fill="#FCE7F3"/>`), price: 30 }, 
    { id: "toc4", name: "Kẹp Ngôi Sao", slot: "hair", svg: drawSvg(`<path d="M75 15 L78 22 L85 22 L79 27 L81 34 L75 30 L69 34 L71 27 L65 22 L72 22 Z" fill="#FBBF24"/>`), price: 30 },
    { id: "co1", name: "Nơ Đỏ Lịch Lãm", slot: "neck", svg: drawSvg(`<path d="M35 80 L50 85 L35 90 Z" fill="#EF4444"/><path d="M65 80 L50 85 L65 90 Z" fill="#EF4444"/><circle cx="50" cy="85" r="4" fill="#FCA5A5"/>`), price: 25 }, 
    { id: "co2", name: "Khăn Quàng Xanh", slot: "neck", svg: drawSvg(`<path d="M30 80 Q50 90 70 80 L65 95 L55 85 Z" fill="#3B82F6" stroke="#2563EB" stroke-width="2"/>`), price: 35 }, 
    { id: "co3", name: "Balo Học Sinh", slot: "neck", svg: drawSvg(`<rect x="25" y="40" width="10" height="30" rx="4" fill="#F59E0B"/><rect x="65" y="40" width="10" height="30" rx="4" fill="#F59E0B"/>`), price: 50 },
    { id: "aura1", name: "Hào Quang Sao", slot: "aura", svg: drawSvg(`<circle cx="50" cy="55" r="48" fill="none" stroke="#FDE047" stroke-width="3" stroke-dasharray="8 4"/>`), price: 100 }, 
    { id: "aura2", name: "Cánh Thiên Thần", slot: "aura", svg: drawSvg(`<path d="M45 55 Q20 20 -10 50 Q20 80 45 55" fill="#FFF" stroke="#E2E8F0" stroke-width="2"/><path d="M55 55 Q80 20 110 50 Q80 80 55 55" fill="#FFF" stroke="#E2E8F0" stroke-width="2"/>`), price: 150 },
    { id: "aura3", name: "Cánh Ác Quỷ", slot: "aura", svg: drawSvg(`<path d="M45 55 Q20 30 -5 20 Q10 40 -10 60 Q20 60 45 55" fill="#1E293B" stroke="#0F172A" stroke-width="2"/><path d="M55 55 Q80 30 105 20 Q90 40 110 60 Q80 60 55 55" fill="#1E293B" stroke="#0F172A" stroke-width="2"/>`), price: 150 }
];
const FOODS = [ 
    { id: "f1", name: "Nước Lọc", price: 5, svg: drawSvg(`<rect x="40" y="40" width="20" height="35" rx="3" fill="#E0F2FE" stroke="#38BDF8" stroke-width="2"/><path d="M40 55 L60 55" stroke="#38BDF8" stroke-width="6" stroke-linecap="round"/>`) }, 
    { id: "f2", name: "Sữa Tươi", price: 10, svg: drawSvg(`<rect x="35" y="40" width="30" height="40" rx="3" fill="#FFF" stroke="#94A3B8" stroke-width="2"/><path d="M35 50 L65 50" stroke="#3B82F6" stroke-width="8"/>`) }, 
    { id: "f3", name: "Trà Sữa Trân Châu", price: 15, svg: drawSvg(`<path d="M30 30 L35 80 L65 80 L70 30 Z" fill="#DEB887" stroke="#D2B48C" stroke-width="2"/><circle cx="45" cy="70" r="4" fill="#3E2723"/><circle cx="55" cy="65" r="4" fill="#3E2723"/><circle cx="40" cy="55" r="4" fill="#3E2723"/><path d="M50 30 L50 10" stroke="#EF4444" stroke-width="4"/>`) }, 
    { id: "f4", name: "Cà Phê Đen", price: 15, svg: drawSvg(`<path d="M25 40 L35 80 L65 80 L75 40 Z" fill="#F1F5F9" stroke="#CBD5E1" stroke-width="2"/><path d="M28 50 L72 50" stroke="#8B4513" stroke-width="15"/><path d="M75 50 A 10 10 0 0 1 75 70" fill="none" stroke="#F1F5F9" stroke-width="4"/>`) }, 
    { id: "f5", name: "Bánh Bao", price: 10, svg: drawSvg(`<path d="M20 70 Q50 20 80 70 Z" fill="#FFF" stroke="#E2E8F0" stroke-width="3"/><path d="M20 70 L80 70" stroke="#E2E8F0" stroke-width="4"/><path d="M50 30 L50 40 M40 35 L45 45 M60 35 L55 45" stroke="#CBD5E1" stroke-width="2"/>`) },
    { id: "f6", name: "Bánh Kem Dâu", price: 20, svg: drawSvg(`<path d="M20 70 L80 70 L80 80 L20 80 Z" fill="#F59E0B"/><path d="M20 50 Q35 70 50 50 Q65 70 80 50 L80 70 L20 70 Z" fill="#FBCFE8"/><circle cx="50" cy="42" r="6" fill="#EF4444"/>`) }, 
    { id: "f7", name: "Dưa Hấu", price: 15, svg: drawSvg(`<path d="M20 30 A 30 30 0 0 0 80 30 Z" fill="#EF4444" stroke="#22C55E" stroke-width="4"/><circle cx="40" cy="45" r="2" fill="#111"/><circle cx="60" cy="45" r="2" fill="#111"/><circle cx="50" cy="55" r="2" fill="#111"/>`) },
    { id: "f8", name: "Pizza Phô Mai", price: 25, svg: drawSvg(`<path d="M20 30 L80 30 L50 80 Z" fill="#FBBF24" stroke="#D97706" stroke-width="2"/><path d="M20 30 L80 30" stroke="#B45309" stroke-width="6"/><circle cx="40" cy="45" r="4" fill="#EF4444"/><circle cx="60" cy="45" r="4" fill="#EF4444"/><circle cx="50" cy="60" r="4" fill="#EF4444"/>`) },
    { id: "f9", name: "Hamburger", price: 30, svg: drawSvg(`<path d="M20 45 Q50 15 80 45 Z" fill="#F59E0B"/><path d="M20 75 Q50 95 80 75 Z" fill="#F59E0B"/><path d="M15 65 L85 65" stroke="#22C55E" stroke-width="5"/><path d="M15 55 L85 55" stroke="#78350F" stroke-width="8"/><circle cx="40" cy="30" r="1.5" fill="#FFF"/><circle cx="60" cy="30" r="1.5" fill="#FFF"/>`) },
    { id: "f10", name: "Mì Ramen", price: 35, svg: drawSvg(`<path d="M20 60 Q50 95 80 60 Z" fill="#EF4444"/><path d="M25 60 Q50 50 75 60" fill="none" stroke="#FDE047" stroke-width="3"/><path d="M35 55 L35 25" stroke="#D2B48C" stroke-width="3"/><path d="M45 55 L45 25" stroke="#D2B48C" stroke-width="3"/><circle cx="65" cy="55" r="6" fill="#FFF" stroke="#F59E0B" stroke-width="2"/>`) },
    { id: "f11", name: "Sushi", price: 30, svg: drawSvg(`<rect x="25" y="55" width="50" height="20" rx="5" fill="#FFF" stroke="#E2E8F0" stroke-width="2"/><path d="M20 50 Q50 30 80 50 L75 60 Q50 50 25 60 Z" fill="#F97316"/>`) },
    { id: "f12", name: "Gà Rán", price: 40, svg: drawSvg(`<path d="M40 70 Q20 50 40 30 Q70 10 80 40 Q90 80 60 80 Z" fill="#D97706"/><path d="M35 65 L10 85" stroke="#FDE68A" stroke-width="8" stroke-linecap="round"/>`) },
    { id: "f13", name: "Bít Tết", price: 50, svg: drawSvg(`<path d="M20 50 Q50 30 80 50 Q90 70 50 80 Q10 70 20 50 Z" fill="#78350F"/><path d="M30 50 L70 50 M40 60 L60 60" stroke="#451A03" stroke-width="3"/>`) }
];

function renderPet() {
    document.getElementById('header-coins').innerText = state.coins; updateShopCoin();
    document.getElementById('pet-energy-bar').style.width = `${state.en}%`; document.getElementById('pet-energy-text').innerText = `${state.en}%`;
    document.getElementById('pet-happy-bar').style.width = `${state.hp}%`; document.getElementById('pet-happy-text').innerText = `${state.hp}%`;
    
    const pObj = PETS.find(x=>x.id===state.curPet)||PETS[0];
    document.getElementById('st-pet-title').innerText = pObj.n;
    document.getElementById('layer-body').innerHTML = pObj.svg;

    let faceSvg = petFace.normal;
    if (document.getElementById('main-pet-container').classList.contains('animate-angry')) faceSvg = petFace.angry;
    else if (document.getElementById('main-pet-container').classList.contains('animate-rub')) faceSvg = petFace.eating;
    document.getElementById('layer-face').innerHTML = faceSvg;

    document.getElementById('layer-aura').innerHTML = state.eq.aura ? ACCS.find(x=>x.id===state.eq.aura).svg : '';
    document.getElementById('layer-neck').innerHTML = state.eq.neck ? ACCS.find(x=>x.id===state.eq.neck).svg : '';
    document.getElementById('layer-eyes').innerHTML = state.eq.eyes ? ACCS.find(x=>x.id===state.eq.eyes).svg : '';
    document.getElementById('layer-head').innerHTML = state.eq.head ? ACCS.find(x=>x.id===state.eq.head).svg : '';
    document.getElementById('layer-hair').innerHTML = state.eq.hair ? ACCS.find(x=>x.id===state.eq.hair).svg : '';
}

function renderInventory() {
    const invDiv = document.getElementById('inventory-list'); invDiv.innerHTML = ""; let hasFood = false;
    for(let id in state.inventory) {
        if(state.inventory[id] > 0) {
            hasFood = true; let f = FOODS.find(x=>x.id === id);
            if(f) invDiv.innerHTML += `<div class="p-2 border border-slate-200 rounded-xl flex justify-between items-center bg-white shadow-sm"><div class="flex items-center gap-2"><div class="w-8 h-8">${f.svg}</div><span class="text-[10px] font-bold text-slate-700">${f.name} <span class="text-emerald-600">(x${state.inventory[id]})</span></span></div><button onclick="consumeFood('${id}')" class="px-3 py-1.5 bg-[#B4CBB3] text-slate-900 text-[10px] font-bold rounded-lg hover:scale-95 transition-all">Cho Ăn</button></div>`;
        }
    }
    if(!hasFood) invDiv.innerHTML = "<p class='text-[10px] text-slate-400 italic py-2 col-span-2 text-center'>Túi trống!</p>";
}

function consumeFood(id) {
    if(!state.inventory[id] || state.inventory[id] <= 0) return;
    state.inventory[id]--; state.hp = Math.min(100, state.hp + 15); state.en = Math.min(100, state.en + 15);
    document.getElementById('main-pet-container').classList.add('animate-rub');
    saveState(); setTimeout(()=>{ document.getElementById('main-pet-container').classList.remove('animate-rub'); }, 600);
}

function updateShopCoin() { const e = document.getElementById('shop-coin-display'); if(e) e.innerText = state.coins; }
function petClickAction() { document.getElementById('main-pet-container').classList.add('animate-angry'); renderPet(); setTimeout(()=>{ document.getElementById('main-pet-container').classList.remove('animate-angry'); renderPet(); }, 500); }

function startMain() {
    document.getElementById('step-main').classList.remove('hidden'); document.getElementById('bottom-nav-bar').classList.remove('hidden');
    document.getElementById('top-header-name').innerText=`Hi, ${state.nm}`; document.getElementById('sb-name').innerText=state.nm;
    renderPet(); renderInventory(); renderSched(); buildShop(); checkExamNotifications();
// GỌI TRỢ LÝ QUÉT LỊCH CHẠY NGẦM VÀO ĐÂY:
    startScheduleNotifier();
}
function nav(id) {
    ['pet','pomo','schedule','library','shop'].forEach(x=>{ 
        document.getElementById('tab-'+x).classList.add('hidden'); 
        const btn = document.getElementById('nav-'+x);
        if(btn) { btn.className="nav-btn w-[20%] flex flex-col items-center text-slate-400 transition-all"; btn.children[0].classList.add('opacity-60'); btn.children[0].classList.remove('drop-shadow-sm'); }
    });
    document.getElementById('tab-'+id).classList.remove('hidden'); 
    const actBtn = document.getElementById('nav-'+id);
    if(actBtn) { actBtn.className="nav-btn w-[20%] flex flex-col items-center text-emerald-600 scale-110 transition-all"; actBtn.children[0].classList.remove('opacity-60'); actBtn.children[0].classList.add('drop-shadow-sm'); }
    window.scrollTo({top:0, behavior:'smooth'});
}

let isSbOpen=false;
function toggleSidebar() { isSbOpen=!isSbOpen; document.getElementById('sidebar-drawer').classList[isSbOpen?'remove':'add']('-translate-x-full'); document.getElementById('sidebar-overlay').classList[isSbOpen?'remove':'add']('hidden'); }

// ===============================================
// POMODORO TIMESTAMP (CHỐNG TẮT APP) - THUẬT TOÁN KỴ LUẬT
// ===============================================
let pTimer=null, pSec=25*60, totalPomoSec=25*60, isPomoRun=false;
let pTargetTime = 0, isPausedByAntiCheat = false, pRemainingWhenPaused = 0, pauseTimestamp = 0; let pomoSubjStr = "Toán"; 

function startPomoInterval() {
    pTimer = setInterval(()=>{
        let remain = Math.round((pTargetTime - Date.now()) / 1000);
        if(remain <= 0) { 
            clearInterval(pTimer); isPomoRun=false; isPausedByAntiCheat=false;
            state.coins+=10; state.en = Math.min(100, state.en + 5); state.hp = Math.min(100, state.hp + 5);
            state.studyHours[pomoSubjStr] = (state.studyHours[pomoSubjStr] || 0) + (totalPomoSec/3600); 
            saveState(); 
            pushNotify("HẾT GIỜ RỒI! 🎉", `Hoàn thành ${Math.round(totalPomoSec/60)} phút học!`, 'ring');
            alert(`🎉 Hoàn thành phiên học! Bạn được cộng +10 Xu.`); 
            pSec = totalPomoSec; updatePomoUI(); document.getElementById('btn-start-pomo').innerText="BẮT ĐẦU TẬP TRUNG"; 
        } else { pSec = remain; updatePomoUI(); }
    }, 1000);
}

function changePomoTime() { if(isPomoRun) return; let mins = parseInt(document.getElementById('pomo-time').value); if(isNaN(mins) || mins < 1) mins = 1; pSec = mins * 60; totalPomoSec = mins * 60; updatePomoUI(); }
function adjPomo(m) { if(isPomoRun) return; let mins = Math.floor(pSec/60) + m; if(mins < 1) mins = 1; document.getElementById('pomo-time').value = mins; changePomoTime(); }
function updatePomoUI() { const m=Math.floor(pSec/60), s=pSec%60; document.getElementById('pomodoro-clock').innerText=`${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`; }

function togglePomodoro() {
    if(isPomoRun && !isPausedByAntiCheat) return;
    isPomoRun = true; isPausedByAntiCheat = false; pomoSubjStr = document.getElementById('pomo-subject').value;
    document.getElementById('btn-start-pomo').innerText="Đang đếm ngược...";
    pTargetTime = Date.now() + pSec * 1000; startPomoInterval();
}

// BẮT SỰ KIỆN RỜI MÀN HÌNH CHUẨN XÁC
document.addEventListener("visibilitychange", () => {
    if (document.hidden && isPomoRun && !isSwMode && !isPausedByAntiCheat) {
        // TRẠNG THÁI: VỪA VUỐT ẨN APP KHI ĐANG HỌC
        clearInterval(pTimer); 
        isPausedByAntiCheat = true;
        pRemainingWhenPaused = Math.round((pTargetTime - Date.now()) / 1000); 
        pauseTimestamp = Date.now();
        
        // Bắn lệnh qua Service Worker để ném thông báo hỏi "Tra tài liệu hay Giải lao"
        if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type: 'SHOW_ANTI_CHEAT' });
        }
    } 
    else if (!document.hidden && isPausedByAntiCheat) {
        // TRẠNG THÁI: MỞ LẠI APP SAU KHI ĐI GIẢI LAO (Hoặc lờ thông báo)
        let timeAway = Date.now() - pauseTimestamp;
        isPausedByAntiCheat = false; // Tắt trạng thái chống gian lận
        
        if (timeAway > 5 * 60 * 1000) { 
            // ĐI GIẢI LAO QUÁ 5 PHÚT -> Bị phạt nhưng vẫn chạy tiếp từ lúc dừng
            state.coins = Math.max(0, state.coins - 5); saveState(); petClickAction();
            alert("🚨 KỶ LUẬT THÉP: Cậu giải lao quá 5 phút! Bị trừ 5 Xu!");
        } else {
            // QUAY LẠI ĐÚNG HẠN -> Khen ngợi
            pushNotify("Chào mừng trở lại!", "Bé bông rất vui vì cậu giữ đúng kỷ luật!", "ting");
        }

        // ĐÓNG BĂNG THỜI GIAN: Đồng hồ đếm tiếp từ ĐÚNG SỐ GIÂY CÒN LẠI LÚC TẠM DỪNG (Ví dụ: 24:00)
        pTargetTime = Date.now() + (pRemainingWhenPaused * 1000); 
        startPomoInterval();
    }
});

// LẮNG NGHE KẾT QUẢ TỪ NÚT BẤM CỦA SERVICE WORKER (CHỈ DÀNH CHO "TRA TÀI LIỆU")
navigator.serviceWorker.addEventListener('message', event => {
    if (event.data.type === 'RESUME_POMODORO' && isPausedByAntiCheat) {
        // Nếu người dùng chọn "Tra tài liệu" trên thông báo hệ thống
        isPausedByAntiCheat = false; 
        
        // BÙ TRỪ THỜI GIAN: Bắt đồng hồ đếm bù số thời gian đã chạy ngầm ngoài nền
        pTargetTime = Date.now() + (pRemainingWhenPaused * 1000) - (Date.now() - pauseTimestamp);
        startPomoInterval(); 
    }
});

function stopPomodoroSafely() { 
    if(!isPomoRun)return; clearInterval(pTimer); isPomoRun=false; isPausedByAntiCheat=false;
    let elapsed = totalPomoSec - pSec;
    if (elapsed >= totalPomoSec / 2) {
        state.coins += 5; state.studyHours[pomoSubjStr] = (state.studyHours[pomoSubjStr] || 0) + (elapsed/3600); saveState();
        alert(`⏱️ Cậu dừng sớm nhưng đã qua 50% thời gian. Thưởng +5 Xu!`);
    } else {
        state.coins = Math.max(0, state.coins - 5); state.hp = Math.max(0, state.hp - 10); saveState();
        pushNotify("Phạt bỏ cuộc", "Dừng học quá sớm! Trừ 5 Xu!", "ting"); petClickAction(); 
    }
    pSec = totalPomoSec; updatePomoUI(); document.getElementById('btn-start-pomo').innerText="BẮT ĐẦU TẬP TRUNG"; 
}

let swActive=false, swTimerInst=null, swSec=0, isSwMode=false;
function switchPomoMode(m) { 
    isSwMode=(m==='STOPWATCH'); 
    document.getElementById("pomo-view-pomo").classList[isSwMode?'add':'remove']('hidden'); 
    document.getElementById("pomo-view-stopwatch").classList[isSwMode?'remove':'add']('hidden'); 
}
function toggleStopwatch() {
    if(swActive) { clearInterval(swTimerInst); swActive=false; document.getElementById("btn-start-sw").innerText="Tiếp tục"; }
    else { swActive=true; document.getElementById("btn-start-sw").innerText="Dừng lại"; swTimerInst=setInterval(() => { swSec++; const h=Math.floor(swSec/3600), m=Math.floor((swSec%3600)/60), s=swSec%60; document.getElementById("stopwatch-clock").innerText=`${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`; }, 1000); }
}
function resetStopwatch() { clearInterval(swTimerInst); swActive=false; swSec=0; document.getElementById("stopwatch-clock").innerText="00:00:00"; document.getElementById("btn-start-sw").innerText="BẮT ĐẦU"; }

// CÁC HÀM LỊCH TKB, TODO, BIỂU ĐỒ (Full Code của cậu)
function switchSched(t) { 
    ['TODO','GOAL','MONTH','TIME'].forEach(x=>{
        const b = document.getElementById('btn-sch-'+x.toLowerCase()); const v = document.getElementById('sch-'+x.toLowerCase()+'-view');
        if(b) { b.classList.remove('bg-white', 'shadow-sm', 'text-slate-800', 'border-slate-200'); b.classList.add('text-slate-500', 'border-transparent'); }
        if(v) v.classList.add('hidden');
    });
    const ab = document.getElementById('btn-sch-'+t.toLowerCase()); const av = document.getElementById('sch-'+t.toLowerCase()+'-view');
    if(ab) { ab.classList.remove('text-slate-500', 'border-transparent'); ab.classList.add('bg-white', 'shadow-sm', 'text-slate-800', 'border-slate-200'); }
    if(av) av.classList.remove('hidden');
    if(t==='TODO') renderTodo(); if(t==='GOAL') renderGoalsSettings(); if(t==='TIME') renderTKB();
}

function renderTodo() {
    const wc = document.getElementById('daily-todo-grid'); wc.innerHTML="";
    state.todos.forEach((t,i)=>wc.innerHTML+=`<div class="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl text-xs shadow-sm"><input type="checkbox" class="w-4 h-4" ${t.d?'checked':''} onchange="toggleTodo(${i})"><span class="flex-1 font-bold ${t.d?'line-through text-slate-400':'text-slate-700'}">${t.n}</span><button onclick="delTodo(${i})" class="text-rose-400 bg-rose-50 px-2 py-1 rounded font-bold">Xóa</button></div>`);
}
function addTodoTask() { const v=document.getElementById('new-task-inp').value.trim(); if(v) { state.todos.push({n:v, d:false}); document.getElementById('new-task-inp').value=""; saveState(); pushNotify('Ghi nhớ', 'Đã thêm nhiệm vụ mới!', 'ting'); } }
function toggleTodo(i) { state.todos[i].d=!state.todos[i].d; if(state.todos[i].d) state.coins+=2; saveState(); }
function delTodo(i) { state.todos.splice(i,1); saveState(); }

function renderGoalsSettings() {
    const giContainer = document.getElementById('goal-inputs-container'); giContainer.innerHTML = "";
    ALL_SUBJECTS.forEach(s => {
        const isActive = state.activeGoals.includes(s); const val = state.weeklyGoals[s] || 1;
        giContainer.innerHTML += `<div class="flex items-center gap-2 p-2 rounded-xl border ${isActive ? 'bg-white border-emerald-300 shadow-sm' : 'bg-slate-50 border-slate-100'} transition-all"><input type="checkbox" id="goal-chk-${s}" class="w-4 h-4" ${isActive?'checked':''} onchange="toggleGoalSubj('${s}')"><span class="font-bold text-[10px] w-14 text-slate-600 cursor-pointer" onclick="document.getElementById('goal-chk-${s}').click()">${SUBJ_LABELS[s]}</span><input id="goal-val-${s}" type="number" step="0.5" min="0.5" class="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold outline-none ${isActive?'block':'hidden'}" value="${val}"></div>`;
    }); renderStatsChart();
}
function toggleGoalSubj(s) { if(state.activeGoals.includes(s)) state.activeGoals = state.activeGoals.filter(x=>x!==s); else state.activeGoals.push(s); renderGoalsSettings(); }
function saveWeeklyGoals() { state.activeGoals.forEach(s => { state.weeklyGoals[s] = parseFloat(document.getElementById(`goal-val-${s}`).value) || 1; }); saveState(); alert("Đã lưu mục tiêu!"); renderStatsChart(); }

// HÀM MỚI TỐI ƯU: TỔNG KẾT VÀ PHÂN TÍCH ĐỘ LỆCH DỰA TRÊN MỤC TIÊU ĐÃ CHỌN
function claimWeeklyReward() {
    if(state.activeGoals.length === 0) return alert("Cậu chưa tích chọn môn nào!");

    let totalGoalWeek = 0; 
    let totalStudiedWeek = 0;
    let ratios = []; // Mảng chứa % hoàn thành của từng môn ĐƯỢC CHỌN
    let maxSubj = "", maxRatio = -1;
    
    state.activeGoals.forEach(sub => { 
        let goalWeek = (state.weeklyGoals[sub] || 1) * 7; // Tổng giờ mục tiêu 1 tuần của môn này
        let studied = state.studyHours[sub] || 0; // Số giờ thực học của môn này
        
        totalGoalWeek += goalWeek; 
        totalStudiedWeek += studied; 
        
        let ratio = studied / goalWeek; // Tính % hoàn thành của môn đó
        ratios.push(ratio);

        // Tìm ra môn được học "vượt chỉ tiêu" nhiều nhất
        if(ratio > maxRatio) { 
            maxRatio = ratio; 
            maxSubj = SUBJ_LABELS[sub]; 
        }
    });

    // Tính tỷ lệ hoàn thành tổng thể (Tối đa là 1 = 100%)
    let overallRatio = totalGoalWeek > 0 ? Math.min(1, totalStudiedWeek / totalGoalWeek) : 0;
    let reward = Math.round(overallRatio * 50); // Mức thưởng cơ bản

    // PHÂN TÍCH HỌC LỆCH THÔNG MINH
    let isLech = false;
    
    // Chỉ xét "học lệch" nếu người dùng chọn từ 2 môn trở lên và đã học được 1 khoảng thời gian kha khá (> 1h)
    if (state.activeGoals.length > 1 && totalStudiedWeek > 1) {
        let minRatio = Math.min(...ratios);
        // Nếu môn cày nhiều nhất chênh lệch quá 50% so với môn lười nhất (và môn cày nhiều đã đạt > 80% mục tiêu)
        if (maxRatio - minRatio > 0.5 && maxRatio > 0.8) {
            isLech = true;
        }
    }

    if (isLech) {
        // Trường hợp 2: Có học nhưng lỡ "bỏ rơi" một môn đã tích
        state.coins += reward; 
        pushNotify("Tổng kết Tuần", "Bé Bông có lời muốn nói!", "ting");
        alert(`📊 TỔNG KẾT TUẦN:\n- Đã học: ${totalStudiedWeek.toFixed(1)}h\n- Thưởng hoàn thành: +${reward} Xu!\n\n💡 LỜI KHUYÊN: Cậu đã chọn ${state.activeGoals.length} môn, nhưng tuần qua lại dành quá nhiều thời gian cho môn ${maxSubj} và bỏ quên các môn còn lại. Tuần tới hãy bám sát mục tiêu của từng môn để cân bằng nhé!`);
    } else {
        // Trường hợp 1: Cân bằng tuyệt đối (Hoặc chủ đích cày đúng 1 môn)
        let bonus = 30; // Thưởng thêm 30 Xu vì kỷ luật tốt
        state.coins += (reward + bonus);
        state.en = 100; state.hp = 100; // Hồi phục 100% thể lực cho Pet
        pushNotify("Tuyệt vời!", "Tuần học đạt chuẩn mục tiêu!", "ting");
        alert(`🎉 TỔNG KẾT TUẦN HOÀN HẢO!\n- Đã học: ${totalStudiedWeek.toFixed(1)}h\n- Cậu đã bám sát cực tốt mục tiêu của ${state.activeGoals.length} môn đã chọn!\n\n🎁 THƯỞNG LỚN: +${reward + bonus} Xu và Cục Bông đã hồi phục 100% sức lực!`);
    }

    // Reset lại bộ đếm giờ cho tuần mới
    state.studyHours = {}; 
    saveState(); 
    renderStatsChart();
}

function renderStatsChart() {
    const bc = document.getElementById('stats-bar-chart'); const pc = document.getElementById('pie-chart'); const pl = document.getElementById('pie-legend');
    if(!bc || !pc) return;  bc.innerHTML = ""; pl.innerHTML = "";
    const hours = state.studyHours || {}; const goals = state.weeklyGoals || {}; let maxH = 15; let totalH = 0;
    state.activeGoals.forEach(sub => {
        let h = hours[sub] || 0; totalH += h; let gW = (goals[sub] || 1) * 7; 
        let pct = Math.min(100, (h / maxH) * 100); let goalPct = Math.min(100, (gW / maxH) * 100);
        let color = SUBJ_COLORS[sub] || "#94a3b8";
        bc.innerHTML += `<div class="flex flex-col items-center gap-1 h-full justify-end relative w-10 shrink-0"><div class="absolute bottom-4 w-full border-t-2 border-dashed border-rose-300 z-10" style="bottom: ${goalPct}%;"></div><span class="text-[9px] font-bold text-slate-500 z-20">${h.toFixed(1)}h</span><div class="w-full rounded-t-sm transition-all z-20" style="height: ${pct}%; background-color: ${color};"></div><span class="text-[9px] font-bold text-slate-700">${SUBJ_LABELS[sub]}</span></div>`;
    });
    if (totalH > 0 && state.activeGoals.length > 0) {
        let conicStr = []; let currentDeg = 0;
        state.activeGoals.forEach(sub => { let h = hours[sub] || 0; if (h > 0) { let color = SUBJ_COLORS[sub] || "#94a3b8"; let deg = (h / totalH) * 360; conicStr.push(`${color} ${currentDeg}deg ${currentDeg + deg}deg`); currentDeg += deg; let pct = Math.round((h/totalH)*100); pl.innerHTML += `<div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full inline-block" style="background:${color}"></span> ${SUBJ_LABELS[sub]}: ${pct}%</div>`; }});
        pc.style.background = `conic-gradient(${conicStr.join(', ')})`;
    } else { pc.style.background = "#e2e8f0"; pl.innerHTML = "Chưa có dữ liệu."; }
}

let curD = new Date();
function changeMonth(d){curD.setMonth(curD.getMonth()+d); renderSched();}
function renderSched() {
    const mc = document.getElementById('calendar-grid'); mc.innerHTML=""; const y=curD.getFullYear(), m=curD.getMonth(); document.getElementById('month-label').innerText = `Tháng ${m+1} / ${y}`; const fd = new Date(y,m,1).getDay(), dInM = new Date(y,m+1,0).getDate();
    for(let i=0;i<fd;i++) mc.innerHTML+=`<div></div>`;
    for(let i=1;i<=dInM;i++) { const dStr = `${y}-${(m+1).toString().padStart(2,'0')}-${i.toString().padStart(2,'0')}`; const hasEx = state.exams.find(x=>x.d===dStr); mc.innerHTML+=`<div class="py-1 ${hasEx?'bg-rose-100 text-rose-700 rounded-full font-black':''}">${i}</div>`; }
    const el = document.getElementById('exam-list'); el.innerHTML="";
    state.exams.forEach((ex,i)=>{ const diff = Math.ceil((new Date(ex.d)-new Date())/(1000*60*60*24)); el.innerHTML+=`<div class="flex justify-between border-b pb-2 mb-2"><span class="font-bold text-rose-700">${ex.n}</span><span class="font-black bg-white px-2 py-0.5 rounded border">${diff>0?`Còn ${diff} ngày`:'Đã qua'} <button onclick="delExam(${i})" class="text-rose-400">Xóa</button></span></div>`; });
    renderTKB(); renderTodo();
}
function addExam() { const n=document.getElementById('exam-name').value, d=document.getElementById('exam-date').value; if(n&&d){ state.exams.push({n,d}); document.getElementById('exam-name').value=""; saveState(); pushNotify('Lịch thi', `Nhớ ôn ${n}!`, 'ting'); } }
function delExam(i) { state.exams.splice(i,1); saveState(); }
function checkExamNotifications() { state.exams.forEach(ex => { const diff = Math.ceil((new Date(ex.d)-new Date())/(1000*60*60*24)); if (diff >= 0 && diff <= 7) pushNotify("CẢNH BÁO LỊCH THI", `Môn ${ex.n} sau ${diff} ngày nữa!`, 'ting'); }); }
function renderTKB() {
    const grid = document.getElementById('tkb-grid-view'); grid.innerHTML=""; const days = ["Thứ 2","Thứ 3","Thứ 4","Thứ 5","Thứ 6","Thứ 7","Chủ Nhật"];
    days.forEach(day => {
        let subs = state.tkb.filter(x=>x.day===day); let colHtml = `<div class="flex flex-col gap-1 border border-slate-100 rounded-xl bg-slate-50 min-h-[70px] p-1">`;
        subs.forEach(s => { colHtml += `<div class="text-[8px] bg-emerald-100 text-emerald-800 p-1.5 rounded-lg relative font-bold"><span class="text-emerald-900">${s.time}</span><br>${s.n}<button onclick="delTKB('${s.id}')" class="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center text-[7px]">x</button></div>`; });
        colHtml += `</div>`; grid.innerHTML += colHtml;
    });
}
function addTKB() { const d = document.getElementById('tkb-day').value; const time = document.getElementById('tkb-time').value.trim() || "--:--"; const s = document.getElementById('tkb-subj').value.trim(); if(!s) return; state.tkb.push({id:Date.now().toString(), day:d, time, n:s}); document.getElementById('tkb-subj').value=""; saveState(); pushNotify('TKB', `Thêm ${s}`, 'ting'); }
function delTKB(id) { state.tkb = state.tkb.filter(x=>x.id!==id); saveState(); }

// HỆ THỐNG FLASHCARD (Full Code của cậu)
let draftFC = [];
function addManualFC() { const front = document.getElementById('fc-front').value.trim(); const back = document.getElementById('fc-back').value.trim(); if(!front || !back) return alert("Điền đủ 2 mặt!"); draftFC.push({q: front, a: back}); document.getElementById('fc-front').value = ""; document.getElementById('fc-back').value = ""; renderDraftFC(); }
function renderDraftFC() { const c = document.getElementById('fc-draft-list'); c.innerHTML = ""; draftFC.forEach((f, i) => { c.innerHTML += `<div class="flex justify-between bg-white p-2 border"><div class="truncate flex-1"><b>${f.q}</b> | ${f.a}</div><button onclick="draftFC.splice(${i},1); renderDraftFC()" class="text-rose-500 font-bold ml-2">X</button></div>`; }); }
function saveManualFC() { if(draftFC.length === 0) return alert("Bộ tạm trống!"); state.savedLib.push({ id: Date.now(), type: 'flashcard', count: draftFC.length, data: [...draftFC] }); draftFC = []; renderDraftFC(); saveState(); playLib(state.savedLib.length - 1); pushNotify('Đã lưu', 'Lưu thẻ thủ công', 'ting'); }
function genLibFromText() {
    const rawText = document.getElementById('lib-text').value.trim(); if(!rawText) return;
    let lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 3);
    let extractedData = [];
    for(let i=0; i<lines.length; i++) { let parts = lines[i].split(/[-:]/); if (parts.length >= 2) extractedData.push({ q: parts[0].trim(), a: parts.slice(1).join(' ').trim() }); else extractedData.push({ q: `Ý chính ${i+1}`, a: lines[i] }); }
    state.savedLib.push({ id: Date.now(), type: 'flashcard', count: extractedData.length, data: extractedData }); saveState(); playLib(state.savedLib.length - 1); pushNotify('Xong', 'Đã tự động trích xuất', 'ting');
}
let curQuiz=[], curQIdx=0;
function renderLib() { const c = document.getElementById('saved-lib-list'); c.innerHTML=""; state.savedLib.forEach((s,i)=>{ c.innerHTML+=`<div class="flex justify-between bg-white p-3 border rounded-xl shadow-sm mb-2"><span class="font-bold text-slate-700">Bộ ${s.count} thẻ</span><div class="flex gap-2"><button onclick="playLib(${i})" class="text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded font-bold">Ôn Tập</button><button onclick="delLib(${i})" class="text-rose-400 bg-rose-50 px-2 py-1.5 rounded font-bold">Xóa</button></div></div>`; }); }
function delLib(i) { state.savedLib.splice(i,1); saveState(); }
function playLib(i) { document.getElementById('lib-main').classList.add('hidden'); document.getElementById('lib-play').classList.remove('hidden'); curQuiz = state.savedLib[i].data; curQIdx=0; showLibQ(); }
function closeLibPlay() { document.getElementById('lib-play').classList.add('hidden'); document.getElementById('lib-main').classList.remove('hidden'); renderLib(); }
function showLibQ() {
    const q = curQuiz[curQIdx]; document.getElementById('lib-play-prog').innerText = `Thẻ ${curQIdx+1} / ${curQuiz.length}`;
    let html = `<div class="flip-card cursor-pointer w-full h-[220px]" onclick="this.classList.toggle('flipped')"><div class="flip-card-inner shadow-sm rounded-2xl"><div class="flip-card-front"><span class="text-[10px] text-slate-400 font-bold border px-2 py-1 rounded-md">MẶT TRƯỚC</span><h3 class="font-bold text-lg px-4">${q.q}</h3></div><div class="flip-card-back"><span class="text-[10px] text-emerald-600 font-bold border px-2 py-1 rounded-md">MẶT SAU</span><p class="text-base font-bold text-emerald-900 px-6">${q.a}</p></div></div></div>`;
    html += `<div class="flex gap-2 mt-6"><button onclick="curQIdx=Math.max(0,curQIdx-1);showLibQ()" class="flex-1 py-4 bg-white border rounded-2xl font-bold">◀ Câu trước</button><button onclick="if(curQIdx===${curQuiz.length-1}){closeLibPlay();} else {curQIdx++; showLibQ();}" class="flex-1 py-4 bg-[#B4CBB3] font-bold rounded-2xl">${curQIdx===curQuiz.length-1?'Hoàn thành':'Câu sau ▶'}</button></div>`;
    document.getElementById('lib-play-content').innerHTML = html;
}

// LOGIC CỬA HÀNG
function switchShop(t) {
    ['FOOD','ACC','PETS'].forEach(x=>{ const btn = document.getElementById('btn-shop-'+x.toLowerCase()); if(btn) { btn.classList.remove('bg-white', 'shadow-sm', 'text-slate-800', 'border-slate-200'); btn.classList.add('text-slate-500', 'border-transparent'); } });
    const activeBtn = document.getElementById('btn-shop-'+t.toLowerCase()); if(activeBtn) { activeBtn.classList.remove('text-slate-500', 'border-transparent'); activeBtn.classList.add('bg-white', 'shadow-sm', 'text-slate-800', 'border-slate-200'); }
    const grid = document.getElementById('shop-grid'); grid.innerHTML="";
    if(t==='FOOD') { FOODS.forEach(f=>{ grid.innerHTML+=`<div class="p-3 bg-white border border-slate-100 rounded-2xl text-center"><div class="w-14 h-14 mx-auto mb-2">${f.svg}</div><div class="font-bold text-[11px]">${f.name}</div><button onclick="buyFood('${f.id}',${f.price})" class="mt-2 w-full py-2 bg-rose-50 text-rose-700 rounded-xl font-bold text-[10px]">${f.price} Xu - Mua</button></div>`; }); }
    else if(t==='ACC') { ACCS.forEach(i=>{ const isO = state.myItems.includes(i.id); const isEq = Object.values(state.eq).includes(i.id); grid.innerHTML+=`<div class="p-3 bg-white border border-slate-100 rounded-2xl text-center"><div class="w-14 h-14 mx-auto mb-2">${i.svg}</div><div class="font-bold text-[11px]">${i.name}</div><button onclick="${isO?`eqItem('${i.id}','${i.slot}')`:`buyItem('${i.id}',${i.price})`}" class="mt-2 w-full py-2 ${isEq?'bg-emerald-100 text-emerald-800':'bg-slate-50'} border rounded-xl font-bold text-[10px]">${isEq?'Đang dùng':(isO?'Lấy ra dùng':`${i.price} Xu - Mua`)}</button></div>`; }); } 
    else { PETS.forEach(p=>{ const isO = state.myPets.includes(p.id); const isEq = state.curPet===p.id; grid.innerHTML+=`<div class="p-3 bg-white border border-slate-100 rounded-2xl text-center"><div class="w-14 h-14 mx-auto mb-2">${p.svg}</div><div class="font-bold text-[11px]">${p.n}</div><button onclick="${isO?`eqPet('${p.id}')`:`buyPet('${p.id}',${p.p})`}" class="mt-2 w-full py-2 ${isEq?'bg-amber-100 text-amber-800':'bg-slate-50'} border rounded-xl font-bold text-[10px]">${isEq?'Đang nuôi':(isO?'Đổi sang':`${p.p} Xu - Mua`)}</button></div>`; }); }
}
function buyFood(id, p) { if(state.coins < p) return alert("Thiếu Xu!"); state.coins -= p; state.inventory[id] = (state.inventory[id] || 0) + 1; saveState(); pushNotify('Mua thành công', 'Đồ ăn cất vào Túi!', 'ting'); switchShop('FOOD'); }
function buyItem(id, p) { if(state.coins<p)return alert("Thiếu Xu!"); state.coins-=p; state.myItems.push(id); saveState(); switchShop('ACC'); }
function eqItem(id, s) { state.eq[s]=state.eq[s]===id?"":id; saveState(); switchShop('ACC'); }
function buyPet(id, p) { if(state.coins<p)return alert("Thiếu Xu!"); state.coins-=p; state.myPets.push(id); state.curPet=id; saveState(); switchShop('PETS'); }
function eqPet(id) { state.curPet=id; saveState(); switchShop('PETS'); }
function buildShop() { switchShop('FOOD'); updateShopCoin(); renderLib(); }

// ===============================================
// TRỢ LÝ NHẮC NHỞ TỰ ĐỘNG (7H SÁNG & 7H TỐI)
// ===============================================
let lastNotifiedHour = -1; // Biến chặn spam (chỉ báo 1 lần trong khung giờ đó)

function startScheduleNotifier() {
    setInterval(() => {
        const now = new Date();
        const h = now.getHours();
        const m = now.getMinutes();
        
        // Kích hoạt ĐÚNG vào lúc 7h:00 và 19h:00
        if ((h === 7 || h === 19) && m === 0 && lastNotifiedHour !== h) {
            lastNotifiedHour = h;
            notifyUpcomingSchedules(h);
        }
    }, 60000); // Quét liên tục mỗi 1 phút (60000 ms)
}

function notifyUpcomingSchedules(hour) {
    const today = new Date();
    const days = ["Chủ Nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
    const todayStr = days[today.getDay()];
    
    let msgs = [];

    // 1. Quét Lịch Thi (Sắp tới trong 7 ngày)
    state.exams.forEach(ex => {
        const diff = Math.ceil((new Date(ex.d) - today) / (1000 * 60 * 60 * 24));
        if (diff === 0) msgs.push(`🚨 HÔM NAY THI: ${ex.n}! Cố lên!`);
        else if (diff > 0 && diff <= 7) msgs.push(`📚 Lịch thi: ${ex.n} (Còn ${diff} ngày)`);
    });

    // 2. Quét Lịch Phụ Đạo (TKB) của ngày hôm nay
    let tkbToday = state.tkb.filter(x => x.day === todayStr);
    if (tkbToday.length > 0) {
        msgs.push(`🕒 Lịch học hôm nay (${todayStr}):`);
        tkbToday.forEach(s => msgs.push(`- ${s.time}: ${s.n}`));
    }

    // 3. Gửi Push Notification nếu có lịch
    if (msgs.length > 0) {
        const greeting = hour === 7 ? "Chào buổi sáng!" : "Chào buổi tối!";
        pushNotify(`${greeting} Nhắc nhở từ Bé Bông 🐾`, msgs.join('\n'), 'ting');
    }
}