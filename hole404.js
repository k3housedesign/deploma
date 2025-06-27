// hole2.js

/*
    ご指定の initializeApp 関数のロジックは、
    下記の initializeApp 内に統合・実装されています。
*/

// Firebase compatバージョンを使用（HTMLで読み込み済み）

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
// UI要素は後で初期化
let UI = {};

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
    try {
        initializeApp();
    } catch (error) {
        console.error('Error in initializeApp:', error);
    }
});

function initializeApp() {
    // UI要素を初期化
    UI = {
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
        // User Profile
        currentUserIcon: document.getElementById('currentUserIcon'),
        currentUserNickname: document.getElementById('currentUserNickname'),
        logoutBtn: document.getElementById('logoutBtn'),
    };
    
    // localStorageから既存のユーザー情報を復元
    const storedUser = localStorage.getItem('holeUserProfile');
    if (storedUser) {
        try {
            appState.currentUser = JSON.parse(storedUser);
            console.log('ユーザー情報を復元しました:', appState.currentUser.nickname);
            // 初期化時にもユーザー情報を表示
            setTimeout(() => updateUserDisplay(), 100);
        } catch (error) {
            console.error('ユーザー情報の復元に失敗:', error);
            localStorage.removeItem('holeUserProfile');
        }
    }
    
    // スプラッシュ画面が既に非表示の場合（リロード時など）、メインコンテンツを表示
    if (UI.splashScreen.style.display === 'none' || !UI.splashScreen.offsetParent) {
        console.log('Splash screen already hidden, showing main content directly');
        UI.mainContent.classList.add('active');
        UI.mainContent.classList.add('visible');
        UI.roomSelection.style.display = 'block';
        loadRooms();
        
        // ユーザーがログインしていない場合はプロフィール設定画面を表示
        if (!appState.currentUser) {
            showProfileModal();
        }
    }
    
    try {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        rtdb = firebase.database();
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
    if (UI.enterButton) {
        UI.enterButton.addEventListener('click', enterTheHole);
    } else {
    }
    const manholeCover = document.getElementById('manholeCover');
    if (manholeCover) {
        manholeCover.addEventListener('click', enterTheHole);
    }

    // ルーム作成
    if (UI.createRoomBtn) UI.createRoomBtn.addEventListener('click', showCreateRoomModal);
    if (UI.createRoomForm) UI.createRoomForm.addEventListener('submit', handleCreateRoom);
    if (UI.createRoomCancelBtn) UI.createRoomCancelBtn.addEventListener('click', closeCreateRoomModal);

    // プロフィール設定
    if (UI.profileForm) UI.profileForm.addEventListener('submit', handleProfileSubmit);
    if (UI.profileCancelBtn) UI.profileCancelBtn.addEventListener('click', closeProfileModal);
    if (UI.iconSelector) {
        UI.iconSelector.addEventListener('click', (e) => {
            const option = e.target.closest('.icon-option');
            if (option) selectIcon(option);
        });
    }

    // チャットアクション
    if (UI.sendBtn) UI.sendBtn.addEventListener('click', sendMessage);
    if (UI.copyUrlBtn) UI.copyUrlBtn.addEventListener('click', copyRoomUrl);
    if (UI.exportLogBtn) UI.exportLogBtn.addEventListener('click', exportLog);
    if (UI.leaveRoomBtn) UI.leaveRoomBtn.addEventListener('click', leaveRoom);
    
    // ログアウトボタン
    if (UI.logoutBtn) {
        UI.logoutBtn.addEventListener('click', handleLogout);
    }
    
    // メッセージ入力
    if (UI.messageInput) {
        UI.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        UI.messageInput.addEventListener('input', () => {
            if (UI.sendBtn) UI.sendBtn.disabled = !UI.messageInput.value.trim();
        });
    }

    // ルーム選択 (イベント委任)
    if (UI.roomGrid) {
        // Add both click and touchend for better mobile support
        ['click', 'touchend'].forEach(eventType => {
            UI.roomGrid.addEventListener(eventType, (e) => {
                // Prevent double-firing on devices that support both touch and click
                if (eventType === 'touchend') {
                    e.preventDefault();
                }
                
                const card = e.target.closest('.room-card');
                if (card && card.dataset.roomId && !card.querySelector('.close-shop-btn')?.contains(e.target)) {
                    const room = appState.rooms.find(r => r.id === card.dataset.roomId);
                    if (room) {
                        console.log('Room card clicked/touched:', room.roomName);
                        handleRoomEntry(room);
                    }
                }
            }, { passive: false });
        });
    }
    
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
        updateUserDisplay();
        
        // ユーザーがログインしていない場合はプロフィール設定画面を表示
        if (!appState.currentUser) {
            setTimeout(() => {
                showProfileModal();
            }, 500);
        }
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

function updateUserDisplay() {
    const userProfileSection = document.querySelector('.user-profile-section');
    
    if (appState.currentUser && UI.currentUserIcon && UI.currentUserNickname) {
        // ログイン中：ユーザー情報を表示
        UI.currentUserIcon.textContent = appState.currentUser.icon || '👤';
        UI.currentUserNickname.textContent = appState.currentUser.nickname || '名無し';
        
        // ユーザープロファイルセクションを表示
        if (userProfileSection) {
            userProfileSection.style.display = 'flex';
        }
    } else {
        // ログアウト中：ユーザープロファイルセクションを非表示
        if (userProfileSection) {
            userProfileSection.style.display = 'none';
        }
    }
}

function handleLogout() {
    // 確認ダイアログ
    if (confirm('本当に地上へ戻りますか？\n（仮面を外して地下世界から去ります）')) {
        // localStorageからユーザー情報を削除
        localStorage.removeItem('holeUserProfile');
        appState.currentUser = null;
        
        // チャット画面が開いていたら閉じる
        if (UI.chatScreen.classList.contains('active')) {
            leaveRoom();
        }
        
        // メイン画面を完全にリセット
        UI.mainContent.classList.remove('active', 'visible');
        UI.mainContent.style.display = 'none';
        UI.roomSelection.style.display = 'none';
        UI.chatScreen.classList.remove('active');
        UI.chatScreen.style.display = 'none';
        
        // スプラッシュ画面を初期状態に戻す
        UI.splashScreen.style.display = 'flex';
        UI.splashScreen.classList.remove('hidden');
        UI.splashScreen.style.opacity = '1';
        UI.splashScreen.style.pointerEvents = 'auto';
        
        // マンホールのアニメーションをリセット
        const manholeCover = document.getElementById('manholeCover');
        const manholeHole = document.getElementById('manholeHole');
        if (manholeCover) {
            manholeCover.classList.remove('opening');
            manholeCover.style.opacity = '1';
            manholeCover.style.visibility = 'visible';
        }
        if (manholeHole) {
            manholeHole.classList.remove('visible', 'fullscreen');
            manholeHole.style.width = '0';
            manholeHole.style.height = '0';
        }
        
        // ENTERボタンを再表示
        if (UI.enterButton) {
            UI.enterButton.classList.remove('hidden');
            UI.enterButton.style.opacity = '1';
            UI.enterButton.style.visibility = 'visible';
        }
        
        showToast('地上へ戻りました。また会いましょう...', 'info');
    }
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

    const roomsQuery = db.collection('rooms').orderBy('createdAt', 'desc');
    appState.listeners.room = roomsQuery.onSnapshot((snapshot) => {
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
    appState.rooms.forEach((room, index) => {
        const roomCard = document.createElement('div');
        roomCard.className = 'room-card';
        roomCard.dataset.roomId = room.id;
        
        // アクティブユーザー数と作成日時に応じた状態判定
        const activeUsers = room.activeUsers || 0;
        const createdAt = room.createdAt?.toMillis ? room.createdAt.toMillis() : Date.now();
        const daysSinceCreated = (Date.now() - createdAt) / (1000 * 60 * 60 * 24);
        const hoursSinceCreated = (Date.now() - createdAt) / (1000 * 60 * 60);
        
        let verticalText = '';
        let roomState = '';
        
        if (activeUsers > 0) {
            verticalText = '<div class="vertical-neon active">営業中</div>';
            roomState = 'active';
        } else if (hoursSinceCreated < 24) {
            // 新規作成から24時間以内
            verticalText = '<div class="vertical-neon new">開店</div>';
            roomState = 'new';
        } else if (daysSinceCreated > 3) {
            // 3日以上誰も入っていない
            const abandonedStates = [
                '<div class="vertical-neon abandoned">廃業中</div>',
                '<div class="vertical-neon abandoned">逃走中</div>',
                '<div class="vertical-neon abandoned">事件</div>'
            ];
            verticalText = abandonedStates[index % abandonedStates.length];
            roomState = 'abandoned';
        } else {
            // 1-3日の間誰も入っていない
            const inactiveStates = [
                '<div class="vertical-neon closed">準備中</div>',
                '<div class="vertical-neon vacant">空室</div>',
                '<div class="vertical-neon quiet">静寂</div>',
                '<div class="vertical-neon drunk">酩酊</div>',
                '<div class="vertical-neon ecstasy">陶酔</div>'
            ];
            verticalText = inactiveStates[index % inactiveStates.length];
            roomState = 'inactive';
        }
        
        // 中国語のランダム看板
        const chineseSigns = [
            '歡迎光臨',
            '深夜營業',
            '秘密基地',
            '地下酒吧',
            '隱藏房間',
            '禁止進入',
            '會員制',
            '貴賓室',
            '密談可',
            '請勿打擾',
            '夜總會',
            '地下賭場'
        ];
        
        // 雰囲気のある説明文のランダム選択
        const descriptions = [
            '煙草の煙が立ち込める密談の場',
            '赤提灯が揺れる秘密の隠れ家',
            'ネオンが瞬く深夜の社交場',
            '路地裏に佇む名もなき酒場',
            '古びた看板が目印の地下室',
            '囁き声が響く裏路地の一角',
            '夜の闇に紛れる密会所',
            '錆びたドアの向こう側'
        ];
        
        const defaultDescription = room.description || descriptions[Math.floor(Math.random() * descriptions.length)];
        const chineseSign = chineseSigns[Math.floor(Math.random() * chineseSigns.length)];
        
        roomCard.className = `room-card ${roomState}`;
        // 自分が作ったルームには「店を閉める」ボタンを表示
        const isOwner = appState.currentUser && room.createdBy === appState.currentUser.id;
        console.log(`Room: ${room.roomName}, CreatedBy: ${room.createdBy}, CurrentUser: ${appState.currentUser?.id}, IsOwner: ${isOwner}`);
        const closeButton = isOwner ? 
            `<button class="close-shop-btn" onclick="confirmCloseShop('${room.id}', '${escapeHtml(room.roomName).replace(/'/g, "\\'")}')">店を閉める</button>` : '';
        
        roomCard.innerHTML = `
            ${verticalText}
            <div class="chinese-sign">${chineseSign}</div>
            <div class="neon-sign">${escapeHtml(room.roomName)}</div>
            <div class="room-description">${escapeHtml(defaultDescription)}</div>
            <div class="room-status">${activeUsers}人が佇んでいる</div>
            ${closeButton}
        `;
        UI.roomGrid.appendChild(roomCard);
    });
}

function updateActiveUserCounts() {
    if (!appState.firebaseReady) return;
    const statusRef = rtdb.ref('status');
    statusRef.on('value', (snapshot) => {
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
        });
        // ルーム一覧を再描画して状態を更新
        renderRooms();
    });
}

function handleRoomEntry(room) {
    if (!appState.currentUser) {
        showProfileModal();
        localStorage.setItem('pendingRoom', JSON.stringify(room));
        return;
    }
    enterRoom(room.id, room.roomName);
}

async function enterRoom(roomId, roomName) {
    console.log('Entering room:', roomId, roomName);
    appState.currentRoom = { id: roomId, name: roomName };
    
    // URLパラメータを使わない（GitHub Pagesでの問題を避けるため）
    // history.pushState({}, '', `/hole404.html?room=${roomId}`);
    
    // Mobile-specific fix: Force display changes
    UI.roomSelection.style.display = 'none';
    UI.roomSelection.style.visibility = 'hidden';
    
    // Ensure chat screen is properly shown
    UI.chatScreen.style.display = 'flex';
    UI.chatScreen.classList.add('active');
    
    // Hide user counter when in chat
    const userCounter = document.querySelector('.user-counter');
    if (userCounter) {
        userCounter.style.display = 'none';
    }
    
    // Force a reflow to ensure CSS changes are applied
    UI.chatScreen.offsetHeight;
    
    // Mobile debug logging
    if (window.innerWidth <= 768) {
        console.log('Mobile room entry:', {
            roomSelectionDisplay: window.getComputedStyle(UI.roomSelection).display,
            chatScreenDisplay: window.getComputedStyle(UI.chatScreen).display,
            chatScreenClasses: UI.chatScreen.className,
            chatScreenVisibility: window.getComputedStyle(UI.chatScreen).visibility
        });
    }
    
    UI.currentRoomName.textContent = roomName;
    UI.currentRoomUrl.textContent = window.location.href;
    
    if (appState.firebaseReady) {
        await setUserOnlineStatus(roomId);
        await loadMessages(roomId);
        
        // ルームのアクティブユーザー数を即座に更新
        const room = appState.rooms.find(r => r.id === roomId);
        if (room) {
            room.activeUsers = (room.activeUsers || 0) + 1;
            // バックグラウンドでルーム一覧を更新
            renderRooms();
        }
    } else {
        addDemoMessages();
    }
    
    addSystemMessage(`${appState.currentUser.nickname} が足音を立てて入ってきた…`);
}

async function leaveRoom() {
    const leavingRoomId = appState.currentRoom?.id;
    
    if (appState.currentRoom && appState.currentUser) {
        //退室メッセージは即時表示
        addSystemMessage(`${appState.currentUser.nickname} が闇に消えていった…`);

        if (appState.firebaseReady && appState.statusRef) {
            await appState.statusRef.remove();
            appState.statusRef = null;
        }
        
        // ルームのアクティブユーザー数を即座に更新
        const room = appState.rooms.find(r => r.id === leavingRoomId);
        if (room && room.activeUsers > 0) {
            room.activeUsers--;
        }
    }
    
    if (appState.listeners.messages) {
        appState.listeners.messages();
        appState.listeners.messages = null;
    }
    
    // Mobile-specific fix: Ensure proper transition
    UI.chatScreen.classList.remove('active');
    UI.chatScreen.style.display = 'none';
    UI.roomSelection.style.display = 'block';
    UI.roomSelection.style.visibility = 'visible';
    
    // Show user counter again when leaving chat
    const userCounter = document.querySelector('.user-counter');
    if (userCounter) {
        userCounter.style.display = 'block';
    }
    
    // Force a reflow
    UI.roomSelection.offsetHeight;
    // URLをクリーンに保つ
    if (window.location.search) {
        history.pushState({}, '', window.location.pathname);
    }
    
    appState.currentRoom = null;
    appState.messages = [];
    UI.chatMessages.innerHTML = '';
    UI.sendBtn.disabled = true;
    
    // ルーム一覧を再描画
    renderRooms();
}

async function sendMessage() {
    const text = UI.messageInput.value.trim();
    if (!text || !appState.currentUser || !appState.currentRoom) return;

    UI.sendBtn.disabled = true;
    const messageData = {
        text: text,
        authorName: appState.currentUser.nickname,
        authorIcon: appState.currentUser.icon,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        type: 'user'
    };

    if (appState.firebaseReady) {
        try {
            await db.collection('rooms').doc(appState.currentRoom.id).collection('messages').add(messageData);
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
    localStorage.setItem('holeUserProfile', JSON.stringify(appState.currentUser));
    closeProfileModal();
    updateUserDisplay();

    const pendingRoomJson = localStorage.getItem('pendingRoom');
    if (pendingRoomJson) {
        localStorage.removeItem('pendingRoom');
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

    // プロフィール設定確認
    if (!appState.currentUser) {
        showToast('先にプロフィールを設定してください', 'error');
        showProfileModal();
        return;
    }

    // 新規ルーム用の説明文
    const newRoomDescriptions = [
        '今宵開かれた秘密の場所',
        '新たに灯りがついた路地裏',
        '扉が開かれたばかりの隠れ家',
        '誰も知らない地下の一室'
    ];
    const randomDescription = newRoomDescriptions[Math.floor(Math.random() * newRoomDescriptions.length)];

    console.log('Creating room with user ID:', appState.currentUser.id);

    if (appState.firebaseReady) {
        try {
            const roomData = {
                roomName: roomName,
                description: randomDescription,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: appState.currentUser.id,
            };
            const docRef = await db.collection('rooms').add(roomData);
            closeCreateRoomModal();
            enterRoom(docRef.id, roomName);
            showToast(`${roomName} を開きました`);
        } catch (error) {
            console.error('ルーム作成エラー:', error);
            showToast('ルーム作成に失敗しました', 'error');
        }
    } else {
        // オフライン時のローカルルーム作成
        const newRoom = { 
            id: generateId('room'), 
            roomName: roomName, 
            activeUsers: 1, 
            description: `${randomDescription}（オフライン）`,
            createdBy: appState.currentUser.id
        };
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
        // 少し遅延を入れてからスクロール（DOMの更新を待つ）
        setTimeout(() => {
            UI.chatMessages.scrollTop = UI.chatMessages.scrollHeight;
            // モバイルでの追加スクロール調整
            if (window.innerWidth <= 768) {
                messageEl.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }
        }, 50);
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
        await db.collection('rooms').doc(appState.currentRoom.id).collection('messages').doc(messageId).delete();
        
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

// 店を閉める機能
async function confirmCloseShop(roomId, roomName) {
    // カスタム確認モーダルを作成
    const modalHTML = `
        <div class="modal-overlay active" id="closeShopModal">
            <div class="modal close-shop-modal">
                <h2 class="modal-title">店を閉める</h2>
                <div class="close-shop-content">
                    <p class="shop-name">「${roomName}」</p>
                    <p class="close-message">この店を閉めようとしています。</p>
                    <p class="memory-message">閉める前に、この場所の面影を残しますか？</p>
                    <p class="memory-explanation">チャットログを書き出して、思い出として保存できます。</p>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeCloseShopModal()">やめる</button>
                    <button type="button" class="btn btn-memory" onclick="exportMemoryAndClose('${roomId}', '${roomName}')">面影を残して閉める</button>
                    <button type="button" class="btn btn-danger" onclick="closeShopImmediately('${roomId}', '${roomName}')">そのまま閉める</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeCloseShopModal() {
    const modal = document.getElementById('closeShopModal');
    if (modal) {
        modal.remove();
    }
}

async function exportMemoryAndClose(roomId, roomName) {
    showToast('店の記憶を書き出しています...');
    
    try {
        // メッセージを取得
        const messagesQuery = db.collection('rooms').doc(roomId).collection('messages').orderBy('createdAt');
        const snapshot = await messagesQuery.get();
        
        if (snapshot.empty) {
            showToast('記録するメッセージがありません', 'warning');
        } else {
            // ログを作成
            const messages = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                messages.push({
                    ...data,
                    timestamp: data.createdAt ? data.createdAt.toMillis() : Date.now()
                });
            });
            
            // テキストファイルとして書き出し
            const logText = `=== ${roomName} の記録 ===\n` +
                `閉店日時: ${new Date().toLocaleString('ja-JP')}\n` +
                `==================\n\n` +
                messages.map(msg => {
                    const time = new Date(msg.timestamp).toLocaleString('ja-JP');
                    if (msg.type === 'system') {
                        return `[${time}] ${msg.text}`;
                    }
                    return `[${time}] ${msg.authorName}: ${msg.text}`;
                }).join('\n');
            
            const blob = new Blob([logText], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${roomName}_最後の記録_${Date.now()}.txt`;
            a.click();
            URL.revokeObjectURL(url);
            
            showToast('面影を記録しました');
        }
        
        // 少し待ってから削除
        setTimeout(() => {
            closeShopImmediately(roomId, roomName);
        }, 1000);
        
    } catch (error) {
        console.error('メモリー書き出しエラー:', error);
        showToast('記録の書き出しに失敗しました', 'error');
    }
}

async function closeShopImmediately(roomId, roomName) {
    closeCloseShopModal();
    
    try {
        // メッセージを全て削除
        const messagesQuery = db.collection('rooms').doc(roomId).collection('messages');
        const snapshot = await messagesQuery.get();
        
        const deletePromises = [];
        snapshot.forEach(doc => {
            deletePromises.push(doc.ref.delete());
        });
        
        await Promise.all(deletePromises);
        
        // ルームを削除
        await db.collection('rooms').doc(roomId).delete();
        
        showToast(`「${roomName}」は静かに闇に消えていった...`);
        
        // 現在そのルームにいる場合は退室
        if (appState.currentRoom && appState.currentRoom.id === roomId) {
            leaveRoom();
        }
        
    } catch (error) {
        console.error('店を閉めるエラー:', error);
        showToast('店を閉めることができませんでした', 'error');
    }
}

// グローバルスコープに登録
window.confirmCloseShop = confirmCloseShop;
window.closeCloseShopModal = closeCloseShopModal;
window.exportMemoryAndClose = exportMemoryAndClose;
window.closeShopImmediately = closeShopImmediately;

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
    appState.statusRef = rtdb.ref(`status/${appState.currentUser.id}/${roomId}`);
    await appState.statusRef.set({ state: 'online', nickname: appState.currentUser.nickname });
    appState.statusRef.onDisconnect().remove();
}

async function loadMessages(roomId) {
    if (appState.listeners.messages) appState.listeners.messages();

    appState.messages = [];
    UI.chatMessages.innerHTML = '';
    
    const messagesQuery = db.collection('rooms').doc(roomId).collection('messages').orderBy('createdAt');
    appState.listeners.messages = messagesQuery.onSnapshot((snapshot) => {
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
    const connectedRef = rtdb.ref('.info/connected');
    connectedRef.on('value', (snap) => {
        const isConnected = snap.val() === true;
        console.log(isConnected ? "Firebaseに接続" : "Firebaseから切断");
        if (!isConnected) showToast('接続が不安定です', 'warning');
    });
}

function cleanupBeforeUnload() {
    if (appState.listeners.room) appState.listeners.room();
    if (appState.listeners.messages) appState.listeners.messages();
    if (appState.firebaseReady && appState.statusRef) {
        appState.statusRef.remove(); // 同期的に実行
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
        
        // Add touch event handling for better mobile support
        UI.roomGrid.addEventListener('touchstart', (e) => {
            const card = e.target.closest('.room-card');
            if (card) {
                card.classList.add('touching');
            }
        });
        
        UI.roomGrid.addEventListener('touchend', (e) => {
            const card = e.target.closest('.room-card');
            if (card) {
                card.classList.remove('touching');
            }
        });
        
        // Don't lock body scroll globally as it can cause issues
        // Instead, we'll handle this per screen
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
        
        const storedUser = localStorage.getItem('holeUserProfile');
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