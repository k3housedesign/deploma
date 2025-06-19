// hole2.js

/*
    ご指定の initializeApp 関数のロジックは、
    下記の initializeApp 内に統合・実装されています。
*/

// Firebase SDKのインポート
import { initializeApp as initializeFirebaseApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
    getFirestore, collection, doc, addDoc, onSnapshot, 
    query, orderBy, serverTimestamp, getDocs, deleteDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { 
    getDatabase, ref, set, remove, onDisconnect, onValue, off 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

// --- セキュリティに関する重要事項 ---
// このAPIキーはクライアントサイドで参照可能ですが、バックエンドのセキュリティは
// Firebaseコンソールの「セキュリティルール」で設定することが不可欠です。
// FirestoreとRealtime Databaseの両方で、不正な読み書きを防ぐルールを設定してください。
const firebaseConfig = {
    apiKey: "AIzaSyB-IdlL_BG1yxeO0LRpUS8L3aMgLIaqmAo",
    authDomain: "hole-66226.firebaseapp.com",
    databaseURL: "https://hole-66226-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "hole-66226",
    storageBucket: "hole-66226.appspot.com",
    messagingSenderId: "122901664767",
    appId: "1:122901664767:web:9705c7bbe94eece1184dca"
};

// --- グローバル変数と定数 ---

// Firebaseインスタンス
let db, rtdb;

// UI要素のキャッシュ
const UI = {
    splashScreen: document.getElementById('splashScreen'),
    mainContent: document.getElementById('mainContent'),
    roomSelection: document.getElementById('roomSelection'),
    chatScreen: document.getElementById('chatScreen'),
    userCount: document.getElementById('userCount'),
    roomGrid: document.getElementById('roomGrid'),
    chatMessages: document.getElementById('chatMessages'),
    messageInput: document.getElementById('messageInput'),
    sendBtn: document.getElementById('sendBtn'),
    currentRoomName: document.getElementById('currentRoomName'),
    currentRoomUrl: document.getElementById('currentRoomUrl'),
    // Buttons
    enterButton: document.getElementById('enterButton'),
    createRoomBtn: document.getElementById('createRoomBtn'),
    copyUrlBtn: document.getElementById('copyUrlBtn'),
    exportLogBtn: document.getElementById('exportLogBtn'),
    leaveRoomBtn: document.getElementById('leaveRoomBtn'),
    // Modals & Forms
    profileModal: document.getElementById('profileModal'),
    profileForm: document.getElementById('profileForm'),
    profileCancelBtn: document.getElementById('profileCancelBtn'),
    nicknameInput: document.getElementById('nicknameInput'),
    iconSelector: document.getElementById('iconSelector'),
    createRoomModal: document.getElementById('createRoomModal'),
    createRoomForm: document.getElementById('createRoomForm'),
    createRoomCancelBtn: document.getElementById('createRoomCancelBtn'),
    roomNameInput: document.getElementById('roomNameInput'),
};

// アプリケーションの状態管理
const appState = {
    currentUser: null,
    currentRoom: null,
    messages: [],
    rooms: [],
    firebaseReady: false,
    listeners: {
        room: null,
        messages: null
    },
    statusRef: null
};

// アイコンデータ
const iconOptions = [
    '🎭', '👤', '🕴️', '🦹', '🧙', '👻', '🐺', '🦊', '🐱', '🦝', '🦉', '🐍',
    '💀', '🎪', '🃏', '🎨', '📚', '⚡', '🍸', '🚬', '💡', '🗝️', '🕰️', '📺'
];

// --- 初期化 ---

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    initializeApp();
});

function initializeApp() {
    // スプラッシュ画面が既に非表示の場合（リロード時など）、メインコンテンツを表示
    if (UI.splashScreen.style.display === 'none' || !UI.splashScreen.offsetParent) {
        console.log('Splash screen already hidden, showing main content directly');
        UI.mainContent.classList.add('active');
        UI.mainContent.classList.add('visible');
        UI.roomSelection.style.display = 'block';
        loadRooms();
    }
    
    try {
        const app = initializeFirebaseApp(firebaseConfig);
        db = getFirestore(app);
        rtdb = getDatabase(app);
        appState.firebaseReady = true;
        console.log('Firebase初期化成功');
        monitorFirebaseConnection();
    } catch (error) {
        console.error('Firebase初期化エラー:', error);
        appState.firebaseReady = false;
        showToast('サーバーに接続できません。オフラインモードで動作します。', 'error');
    }

    // ユーザーカウンターのアニメーション開始
    startUserCounterAnimation();
    
    // アイコンセレクターの生成（1回だけ実行）
    if (UI.iconSelector.children.length === 0) {
        generateIconSelector();
    }
    
    // イベントリスナーの設定
    setupEventListeners();
    
    // モバイルUI調整
    adjustMobileUI();
    
    // URLパラメータからルームIDをチェック
    checkRoomFromUrl();
    
    // 初期状態の確認とデバッグ
    console.log('Initial state check:');
    console.log('Room selection display:', UI.roomSelection.style.display);
    console.log('Chat screen active:', UI.chatScreen.classList.contains('active'));
    console.log('Plaza title exists:', document.querySelector('.plaza-title'));
    console.log('Main content display:', window.getComputedStyle(UI.mainContent).display);
    console.log('Main content opacity:', window.getComputedStyle(UI.mainContent).opacity);
    console.log('Splash screen display:', UI.splashScreen.style.display);
    console.log('Main content classes:', UI.mainContent.className);
    
    // チャット画面が誤って表示されている場合は修正
    if (!appState.currentRoom && UI.chatScreen.classList.contains('active')) {
        console.log('Fixing incorrect chat screen display');
        UI.chatScreen.classList.remove('active');
        UI.roomSelection.style.display = 'block';
    }
}

function setupEventListeners() {
    // スプラッシュ
    UI.enterButton.addEventListener('click', enterTheHole);
    document.getElementById('manholeCover').addEventListener('click', enterTheHole);

    // ルーム作成
    UI.createRoomBtn.addEventListener('click', showCreateRoomModal);
    UI.createRoomForm.addEventListener('submit', handleCreateRoom);
    UI.createRoomCancelBtn.addEventListener('click', closeCreateRoomModal);

    // プロフィール設定
    UI.profileForm.addEventListener('submit', handleProfileSubmit);
    UI.profileCancelBtn.addEventListener('click', closeProfileModal);
    UI.iconSelector.addEventListener('click', (e) => {
        const option = e.target.closest('.icon-option');
        if (option) selectIcon(option);
    });

    // チャットアクション
    UI.sendBtn.addEventListener('click', sendMessage);
    UI.copyUrlBtn.addEventListener('click', copyRoomUrl);
    UI.exportLogBtn.addEventListener('click', exportLog);
    UI.leaveRoomBtn.addEventListener('click', leaveRoom);
    
    // メッセージ入力
    UI.messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    UI.messageInput.addEventListener('input', () => {
        UI.sendBtn.disabled = !UI.messageInput.value.trim();
    });

    // ルーム選択 (イベント委任)
    UI.roomGrid.addEventListener('click', (e) => {
        const card = e.target.closest('.room-card');
        if (card && card.dataset.roomId) {
            const room = appState.rooms.find(r => r.id === card.dataset.roomId);
            if (room) handleRoomEntry(room);
        }
    });
    
    // ページ離脱時のクリーンアップ
    window.addEventListener('beforeunload', cleanupBeforeUnload);
}

// --- 主要機能 ---
// (以下、前回のJavaScriptコードが続く)

function enterTheHole() {
    // マンホールのアニメーション開始
    const manholeCover = document.getElementById('manholeCover');
    const manholeHole = document.getElementById('manholeHole');
    
    // ボタンを非表示に
    UI.enterButton.classList.add('hidden');
    
    // マンホールを回転させながら小さくする
    manholeCover.classList.add('opening');
    
    // マンホールが少し回転してから穴を表示
    setTimeout(() => {
        manholeHole.classList.add('visible');
    }, 600);
    
    // 穴が200pxになったら全画面に拡大
    setTimeout(() => {
        manholeHole.classList.add('fullscreen');
    }, 1400);
    
    // 穴が全画面になる前にコンテンツを準備
    setTimeout(() => {
        UI.mainContent.classList.add('active');
        loadRooms();
    }, 1800);
    
    // 穴が完全に全画面になってからコンテンツを表示
    setTimeout(() => {
        // ルーム読み込み完了を待つ
        const checkRoomsLoaded = setInterval(() => {
            if (appState.roomsLoaded) {
                clearInterval(checkRoomsLoaded);
                UI.mainContent.classList.add('visible');
                UI.splashScreen.classList.add('hidden');
                
                // チャット画面が誤って表示されていないか確認
                if (!appState.currentRoom) {
                    UI.chatScreen.classList.remove('active');
                    UI.roomSelection.style.display = 'block';
                }
                
                // スプラッシュ画面のクリーンアップ
                setTimeout(() => {
                    UI.splashScreen.style.display = 'none';
                    manholeHole.classList.remove('visible', 'fullscreen');
                }, 500);
            }
        }, 50);
        
        // 最大待機時間（3秒）
        setTimeout(() => {
            clearInterval(checkRoomsLoaded);
            UI.mainContent.classList.add('visible');
            UI.splashScreen.classList.add('hidden');
            
            // チャット画面が誤って表示されていないか確認
            if (!appState.currentRoom) {
                UI.chatScreen.classList.remove('active');
                UI.roomSelection.style.display = 'block';
            }
            
            setTimeout(() => {
                UI.splashScreen.style.display = 'none';
                manholeHole.classList.remove('visible', 'fullscreen');
            }, 500);
        }, 3000);
    }, 2200);
}

async function loadRooms() {
    console.log('Loading rooms...');
    // ルーム読み込み完了フラグを設定
    appState.roomsLoaded = false;
    
    if (!appState.firebaseReady) {
        console.log('Firebase not ready, loading demo rooms');
        loadDemoRooms();
        appState.roomsLoaded = true;
        return;
    }
    
    // 既存のリスナーを解除
    if (appState.listeners.room) appState.listeners.room();

    const roomsQuery = query(collection(db, 'rooms'), orderBy('createdAt', 'desc'));
    appState.listeners.room = onSnapshot(roomsQuery, (snapshot) => {
        appState.rooms = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            activeUsers: 0 // 後で更新
        }));
        renderRooms();
        updateActiveUserCounts();
        appState.roomsLoaded = true;
    }, (error) => {
        console.error('ルームの購読エラー:', error);
        loadDemoRooms();
    });
}

function renderRooms() {
    UI.roomGrid.innerHTML = '';
    appState.rooms.forEach(room => {
        const roomCard = document.createElement('div');
        roomCard.className = 'room-card';
        roomCard.dataset.roomId = room.id;
        roomCard.innerHTML = `
            <div class="neon-sign">${escapeHtml(room.roomName)}</div>
            <div class="room-description">${escapeHtml(room.description || '新しく開かれた場所')}</div>
            <div class="room-status">${room.activeUsers || 0}人が佇んでいる</div>
        `;
        UI.roomGrid.appendChild(roomCard);
    });
}

function updateActiveUserCounts() {
    if (!appState.firebaseReady) return;
    const statusRef = ref(rtdb, 'status');
    onValue(statusRef, (snapshot) => {
        const allStatus = snapshot.val() || {};
        const userCounts = {};
        
        // 全ルームのカウンターを初期化
        appState.rooms.forEach(room => userCounts[room.id] = 0);

        // アクティブユーザーをカウント
        Object.values(allStatus).forEach(userRooms => {
            Object.keys(userRooms).forEach(roomId => {
                if (userCounts.hasOwnProperty(roomId)) {
                    userCounts[roomId]++;
                }
            });
        });
        
        // UIに反映
        appState.rooms.forEach(room => {
            room.activeUsers = userCounts[room.id] || 0;
            const card = UI.roomGrid.querySelector(`.room-card[data-room-id="${room.id}"] .room-status`);
            if (card) card.textContent = `${room.activeUsers}人が佇んでいる`;
        });
    });
}

function handleRoomEntry(room) {
    if (!appState.currentUser) {
        showProfileModal();
        sessionStorage.setItem('pendingRoom', JSON.stringify(room));
        return;
    }
    enterRoom(room.id, room.roomName);
}

async function enterRoom(roomId, roomName) {
    console.log('Entering room:', roomId, roomName);
    appState.currentRoom = { id: roomId, name: roomName };
    
    // URLパラメータを使わない（GitHub Pagesでの問題を避けるため）
    // history.pushState({}, '', `/hole404.html?room=${roomId}`);
    
    UI.roomSelection.style.display = 'none';
    UI.chatScreen.classList.add('active');
    
    UI.currentRoomName.textContent = roomName;
    UI.currentRoomUrl.textContent = window.location.href;
    
    if (appState.firebaseReady) {
        await setUserOnlineStatus(roomId);
        await loadMessages(roomId);
    } else {
        addDemoMessages();
    }
    
    addSystemMessage(`${appState.currentUser.nickname} が足音を立てて入ってきた…`);
}

async function leaveRoom() {
    if (appState.currentRoom && appState.currentUser) {
        //退室メッセージは即時表示
        addSystemMessage(`${appState.currentUser.nickname} が闇に消えていった…`);

        if (appState.firebaseReady && appState.statusRef) {
            await remove(appState.statusRef);
            appState.statusRef = null;
        }
    }
    
    if (appState.listeners.messages) {
        appState.listeners.messages();
        appState.listeners.messages = null;
    }
    
    UI.chatScreen.classList.remove('active');
    UI.roomSelection.style.display = 'block';
    // URLをクリーンに保つ
    if (window.location.search) {
        history.pushState({}, '', window.location.pathname);
    }
    
    appState.currentRoom = null;
    appState.messages = [];
    UI.chatMessages.innerHTML = '';
    UI.sendBtn.disabled = true;
}

async function sendMessage() {
    const text = UI.messageInput.value.trim();
    if (!text || !appState.currentUser || !appState.currentRoom) return;

    UI.sendBtn.disabled = true;
    const messageData = {
        text: text,
        authorName: appState.currentUser.nickname,
        authorIcon: appState.currentUser.icon,
        createdAt: serverTimestamp(),
        type: 'user'
    };

    if (appState.firebaseReady) {
        try {
            await addDoc(collection(db, 'rooms', appState.currentRoom.id, 'messages'), messageData);
        } catch (error) {
            console.error('メッセージ送信エラー:', error);
            showToast('送信失敗', 'error');
        }
    } else {
        addMessage({ ...messageData, id: generateId('msg'), timestamp: Date.now() });
    }
    
    UI.messageInput.value = '';
    UI.messageInput.style.height = 'auto'; // テキストエリアの高さをリセット
    UI.sendBtn.disabled = false;
}

// --- プロフィール & ルーム作成 ---

function handleProfileSubmit(e) {
    e.preventDefault();
    const nickname = UI.nicknameInput.value.trim();
    const selectedIconEl = UI.iconSelector.querySelector('.icon-option.selected');
    if (!nickname) {
        showToast('ニックネームを入力してください', 'error');
        return;
    }
    if (!selectedIconEl) {
        showToast('アイコンを選択してください', 'error');
        return;
    }

    appState.currentUser = {
        id: generateId('user'),
        nickname: nickname,
        icon: selectedIconEl.dataset.icon
    };
    sessionStorage.setItem('holeUserProfile', JSON.stringify(appState.currentUser));
    closeProfileModal();

    const pendingRoomJson = sessionStorage.getItem('pendingRoom');
    if (pendingRoomJson) {
        sessionStorage.removeItem('pendingRoom');
        const pendingRoom = JSON.parse(pendingRoomJson);
        handleRoomEntry(pendingRoom);
    } else {
        const urlParams = new URLSearchParams(window.location.search);
        const roomId = urlParams.get('room');
        if (roomId) {
            enterRoom(roomId, '地下のどこか'); // ルーム名は後で取得される
        }
    }
    showToast(`${nickname}として地下世界に潜りました`);
}

async function handleCreateRoom(e) {
    e.preventDefault();
    const roomName = UI.roomNameInput.value.trim();
    if (!roomName) {
        showToast('場所の名前を入力してください', 'error');
        return;
    }

    if (appState.firebaseReady) {
        try {
            const roomData = {
                roomName: roomName,
                description: '新しく開かれた場所',
                createdAt: serverTimestamp(),
                createdBy: appState.currentUser.id,
            };
            const docRef = await addDoc(collection(db, 'rooms'), roomData);
            closeCreateRoomModal();
            enterRoom(docRef.id, roomName);
            showToast(`${roomName} を開きました`);
        } catch (error) {
            console.error('ルーム作成エラー:', error);
            showToast('ルーム作成に失敗しました', 'error');
        }
    } else {
        // オフライン時のローカルルーム作成
        const newRoom = { id: generateId('room'), roomName: roomName, activeUsers: 1, description: '新しく開かれた場所（オフライン）' };
        appState.rooms.unshift(newRoom);
        renderRooms();
        closeCreateRoomModal();
        enterRoom(newRoom.id, newRoom.name);
    }
}

// --- ヘルパー関数 & UI操作 ---

function addMessage(message) {
    appState.messages.push(message);
    renderMessage(message);
}

function addSystemMessage(text) {
    addMessage({ id: generateId('sys'), text, type: 'system', timestamp: Date.now() });
}

function renderMessage(message) {
    const messageEl = document.createElement('div');
    messageEl.className = `message ${message.type}`;
    messageEl.dataset.messageId = message.id;
    
    if (message.type === 'system') {
        messageEl.innerHTML = `<div class="message-content">${escapeHtml(message.text)}</div>`;
    } else {
        const time = new Date(message.timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
        const isOwnMessage = appState.currentUser && message.authorName === appState.currentUser.nickname;
        
        messageEl.innerHTML = `
            <div class="message-header">
                <div class="message-avatar">${message.authorIcon}</div>
                <div class="message-author">${escapeHtml(message.authorName)}</div>
                <div class="message-time">${time}</div>
            </div>
            <div class="message-content">${escapeHtml(message.text).replace(/\n/g, '<br>')}</div>
            ${isOwnMessage ? '<button class="message-delete" onclick="deleteMessage(\'' + message.id + '\')">闇に葬る</button>' : ''}
        `;
    }
    
    const shouldScroll = UI.chatMessages.scrollTop + UI.chatMessages.clientHeight >= UI.chatMessages.scrollHeight - 50;
    UI.chatMessages.appendChild(messageEl);
    if (shouldScroll) {
        UI.chatMessages.scrollTop = UI.chatMessages.scrollHeight;
    }
}

async function deleteMessage(messageId) {
    if (!appState.currentRoom || !appState.firebaseReady) {
        showToast('削除できませんでした', 'error');
        return;
    }
    
    // アニメーション開始
    const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageEl) {
        messageEl.classList.add('deleting');
    }
    
    try {
        // Firebaseから削除
        await deleteDoc(doc(db, 'rooms', appState.currentRoom.id, 'messages', messageId));
        
        // ローカル配列からも削除
        appState.messages = appState.messages.filter(msg => msg.id !== messageId);
        
        // アニメーション完了後にDOM要素を削除
        setTimeout(() => {
            if (messageEl) {
                messageEl.remove();
            }
        }, 800);
        
        showToast('メッセージを闇に葬りました');
    } catch (error) {
        console.error('メッセージ削除エラー:', error);
        showToast('削除に失敗しました', 'error');
        if (messageEl) {
            messageEl.classList.remove('deleting');
        }
    }
}

// グローバルスコープに登録
window.deleteMessage = deleteMessage;

function generateIconSelector() {
    UI.iconSelector.innerHTML = '';
    iconOptions.forEach((icon, index) => {
        const option = document.createElement('div');
        option.className = 'icon-option';
        if (index === 0) option.classList.add('selected');
        option.textContent = icon;
        option.dataset.icon = icon;
        UI.iconSelector.appendChild(option);
    });
}

function selectIcon(selectedOption) {
    UI.iconSelector.querySelectorAll('.icon-option').forEach(opt => opt.classList.remove('selected'));
    selectedOption.classList.add('selected');
}

function showProfileModal() { UI.profileModal.classList.add('active'); }
function closeProfileModal() { UI.profileModal.classList.remove('active'); }
function showCreateRoomModal() { 
    if (!appState.currentUser) {
        showProfileModal();
        return;
    }
    UI.createRoomModal.classList.add('active'); 
}
function closeCreateRoomModal() { UI.createRoomModal.classList.remove('active'); }

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
}

function copyRoomUrl() {
    navigator.clipboard.writeText(window.location.href).then(() => {
        showToast('URLをコピーしました');
    }, () => {
        showToast('コピーに失敗しました', 'error');
    });
}

function exportLog() {
    const logText = appState.messages.map(msg => {
        const time = new Date(msg.timestamp).toLocaleString('ja-JP');
        if (msg.type === 'system') return `[${time}] ${msg.text}`;
        return `[${time}] ${msg.authorName}: ${msg.text}`;
    }).join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hole_log_${appState.currentRoom.name}_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('記憶を書き出しました');
}

// --- Firebase & 状態管理詳細 ---

async function setUserOnlineStatus(roomId) {
    if (!appState.currentUser) return;
    appState.statusRef = ref(rtdb, `status/${appState.currentUser.id}/${roomId}`);
    await set(appState.statusRef, { state: 'online', nickname: appState.currentUser.nickname });
    onDisconnect(appState.statusRef).remove();
}

async function loadMessages(roomId) {
    if (appState.listeners.messages) appState.listeners.messages();

    appState.messages = [];
    UI.chatMessages.innerHTML = '';
    
    const messagesQuery = query(collection(db, 'rooms', roomId, 'messages'), orderBy('createdAt'));
    appState.listeners.messages = onSnapshot(messagesQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
                const data = change.doc.data();
                const message = {
                    id: change.doc.id,
                    ...data,
                    timestamp: data.createdAt ? data.createdAt.toMillis() : Date.now()
                };
                if (!appState.messages.some(m => m.id === message.id)) {
                    addMessage(message);
                }
            }
        });
    }, (error) => {
        console.error('メッセージの購読エラー:', error);
        addDemoMessages();
    });
}

function monitorFirebaseConnection() {
    const connectedRef = ref(rtdb, '.info/connected');
    onValue(connectedRef, (snap) => {
        const isConnected = snap.val() === true;
        console.log(isConnected ? "Firebaseに接続" : "Firebaseから切断");
        if (!isConnected) showToast('接続が不安定です', 'warning');
    });
}

function cleanupBeforeUnload() {
    if (appState.listeners.room) appState.listeners.room();
    if (appState.listeners.messages) appState.listeners.messages();
    if (appState.firebaseReady && appState.statusRef) {
        remove(appState.statusRef); // 同期的に実行
    }
}

// --- ユーティリティ & デモ ---

function generateId(prefix) { return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`; }
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function isMobile() { return window.innerWidth <= 768; }
function adjustMobileUI() {
    if (isMobile()) {
        UI.messageInput.addEventListener('focus', () => {
            setTimeout(() => { UI.chatMessages.scrollTop = UI.chatMessages.scrollHeight; }, 300);
        });
    }
    // テキストエリアの自動高さ調整
    UI.messageInput.addEventListener('input', () => {
        UI.messageInput.style.height = 'auto';
        UI.messageInput.style.height = `${UI.messageInput.scrollHeight}px`;
    });
}

function startUserCounterAnimation() {
    const baseCount = 240 + Math.floor(Math.random() * 40);
    UI.userCount.textContent = baseCount;
    setInterval(() => {
        const currentCount = parseInt(UI.userCount.textContent, 10);
        const change = Math.floor(Math.random() * 11) - 5;
        UI.userCount.textContent = Math.max(200, Math.min(300, currentCount + change));
    }, Math.random() * 5000 + 5000);
}

function checkRoomFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('room');
    if (roomId) {
        // URLパラメータをクリア
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
        
        const storedUser = sessionStorage.getItem('holeUserProfile');
        if (storedUser) {
            appState.currentUser = JSON.parse(storedUser);
            // enterTheHoleが呼ばれていない場合があるので、直接ルームに入る
            if (UI.splashScreen.style.display !== 'none') {
                 UI.splashScreen.style.display = 'none';
                 UI.mainContent.classList.add('active');
                 UI.mainContent.classList.add('visible');
                 loadRooms();
            }
            // 自動的にルームに入らないようにする
            // ユーザーが明示的にルームをクリックした時のみ入る
            console.log('Room URL detected but not auto-entering:', roomId);
        } else {
            showProfileModal();
        }
    }
}

function loadDemoRooms() {
    appState.rooms = [
        { id: 'demo1', roomName: '猥雑な麻雀クラブ', description: '煙草の煙が立ち込める奥の間（デモ）', activeUsers: 3 },
        { id: 'demo2', roomName: '錆びついたジャズバー', description: '古いピアノの音色が響く（デモ）', activeUsers: 7 }
    ];
    renderRooms();
    appState.roomsLoaded = true;
}

function addDemoMessages() {
    addSystemMessage('サーバーとの接続が切断されました。これはデモメッセージです。');
    setTimeout(() => addMessage({ id: generateId('msg'), text: '今夜は冷えるな…', authorName: '名無しの客', authorIcon: '🎭', timestamp: Date.now(), type: 'user' }), 1000);
    setTimeout(() => addMessage({ id: generateId('msg'), text: 'この場所も随分と寂れたものだ', authorName: 'バーテンダー', authorIcon: '🍸', timestamp: Date.now(), type: 'bot' }), 3000);
}