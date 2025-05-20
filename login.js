// Supabase 設定
const SUPABASE_URL = 'https://jtijaauoeqpyyoicpcor.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0aWphYXVvZXFweXlvaWNwY29yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2MzIwOTQsImV4cCI6MjA2MjIwODA5NH0.2wwDuo8wMtmNIPaidTsTOjlZeqngq7g3w32uTXn3VM0';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 切換 註冊/登入 畫面
function showSignUp() {
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('signup-form').style.display = '';
  document.getElementById('login-msg').textContent = '';
  document.getElementById('signup-msg').textContent = '';
}
function showLogin(msg='') {
  document.getElementById('login-form').style.display = '';
  document.getElementById('signup-form').style.display = 'none';
  document.getElementById('signup-msg').textContent = '';
  if (msg) {
    document.getElementById('login-msg').textContent = msg;
    document.getElementById('login-msg').className = 'msg success';
  } else {
    document.getElementById('login-msg').textContent = '';
    document.getElementById('login-msg').className = 'msg';
  }
}

// 密碼顯示/隱藏＋貓咪顏文字切換
function togglePw(inputId, btn) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '(=ω=)'; // 閉眼
  } else {
    input.type = 'password';
    btn.textContent = '(ΦωΦ)'; // 睜眼
  }
}

function setLoading(isLoading) {
  document.getElementById('login-btn').classList.toggle('loading', isLoading);
  document.getElementById('signup-btn').classList.toggle('loading', isLoading);
  const resetBtn = document.getElementById('reset-btn');
  if (resetBtn) resetBtn.classList.toggle('loading', isLoading);
}

// ============ 註冊 ============
async function signUp() {
  setLoading(true);
  document.getElementById('signup-msg').textContent = '';
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const username = document.getElementById('signup-username').value.trim();
  if (!email || !password || !username) {
    document.getElementById('signup-msg').textContent = '請填寫所有欄位';
    setLoading(false);
    return;
  }

  // 1. Auth 註冊
  let data, error;
  try {
    ({ data, error } = await supabase.auth.signUp({ email, password }));
  } catch (e) {
    document.getElementById('signup-msg').textContent = '無法連線到伺服器';
    setLoading(false);
    return;
  }
  if (error) {
    document.getElementById('signup-msg').textContent = '註冊失敗: ' + error.message;
    setLoading(false);
    return;
  }
  const user = data.user;
  if (!user) {
    document.getElementById('signup-msg').textContent = '請檢查信箱驗證設定，註冊未成功。';
    setLoading(false);
    return;
  }

  // 2. 註冊成功後，插入玩家表
  let insertError;
  try {
    ({ error: insertError } = await supabase.from('players').insert({
      player_id: user.id,
      email: email,
      username: username,
      role: 'player'
    }));
  } catch (e) {
    document.getElementById('signup-msg').textContent = '無法連線到伺服器';
    setLoading(false);
    return;
  }
  if (insertError) {
    document.getElementById('signup-msg').textContent = '玩家資料儲存失敗: ' + insertError.message;
    setLoading(false);
    return;
  }
  setLoading(false);
  showLogin('註冊成功，請驗證信箱！');
}

// ============ 登入 ============
async function signIn() {
  setLoading(true);
  document.getElementById('login-msg').textContent = '';
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!email || !password) {
    document.getElementById('login-msg').textContent = '請輸入帳號與密碼';
    setLoading(false);
    return;
  }
  // 1. Auth 登入
  let data, error;
  try {
    ({ data, error } = await supabase.auth.signInWithPassword({ email, password }));
  } catch (e) {
    document.getElementById('login-msg').textContent = '無法連線到伺服器';
    setLoading(false);
    return;
  }
  if (error) {
    document.getElementById('login-msg').textContent = '登入失敗: ' + error.message;
    setLoading(false);
    return;
  }
  const user = data.user;
  if (!user) {
    document.getElementById('login-msg').textContent = '帳號異常，請確認信箱驗證';
    setLoading(false);
    return;
  }
  localStorage.setItem('player_id', user.id);

  // 2. 查詢玩家表
  let player, playerError;
  try {
    ({ data: player, error: playerError } = await supabase
      .from('players')
      .select('*')
      .eq('player_id', user.id)
      .single());
  } catch (e) {
    document.getElementById('login-msg').textContent = '無法查詢玩家資料';
    setLoading(false);
    return;
  }
  if (playerError) {
    document.getElementById('login-msg').textContent = '查無玩家資料，請重新註冊';
    setLoading(false);
    return;
  }

  // 你可以存在 localStorage，之後用 player.username
  localStorage.setItem('player_username', player.username);

  // 登入成功自動跳轉
  setTimeout(() => {
    window.location.href = 'https://sheruka-game.github.io/create-student/creat-st.html';
  }, 600);
}

// ============ 密碼重設（兩次輸入必須一致） ============
async function handleResetPassword(e) {
  if (e) e.preventDefault();

  const newPassword = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;
  const msgDiv = document.getElementById('reset-msg');
  msgDiv.textContent = '';

  if (!newPassword || newPassword.length < 6) {
    msgDiv.textContent = '請輸入至少6位數新密碼';
    return;
  }
  if (newPassword !== confirmPassword) {
    msgDiv.textContent = '兩次密碼輸入不一致';
    return;
  }
  setLoading(true);

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    msgDiv.textContent = '密碼重設失敗: ' + error.message;
    setLoading(false);
    return;
  }
  // 取得 email，帶回登入頁
  const { data: userData } = await supabase.auth.getUser();
  if (userData && userData.user && userData.user.email) {
    localStorage.setItem('reset_email', userData.user.email);
  }
  msgDiv.textContent = '密碼重設成功，請重新登入！';
  setLoading(false);
  setTimeout(() => {
    window.location.hash = '';
    document.getElementById('login-section').style.display = '';
    document.getElementById('reset-section').style.display = 'none';
    // window.location.href = 'index.html'; // 如果是獨立重設頁請打開這行
  }, 1200);
}

// ============ 頁面初始化/根據 hash 決定顯示什麼 ============
document.addEventListener('DOMContentLoaded', async function() {
  // 依 hash 決定顯示登入/重設
  const params = new URLSearchParams(window.location.hash.slice(1));
  const type = params.get('type');

  // 密碼重設流程
  if (type === 'recovery') {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('reset-section').style.display = '';
    // 自動填 email
    const { data: userData } = await supabase.auth.getUser();
    if (userData && userData.user && userData.user.email) {
      const emailInput = document.getElementById('login-email');
      if (emailInput) emailInput.value = userData.user.email;
    }
    return;
  }
  // 信箱驗證流程
  if (type === 'signup') {
    document.getElementById('login-section').style.display = '';
    document.getElementById('reset-section').style.display = 'none';
    // 自動填 email
    const { data: userData } = await supabase.auth.getUser();
    if (userData && userData.user && userData.user.email) {
      const emailInput = document.getElementById('login-email');
      if (emailInput) emailInput.value = userData.user.email;
      document.getElementById('login-msg').textContent = '信箱驗證成功，請登入';
      document.getElementById('login-msg').className = 'msg success';
    }
    setTimeout(() => { window.location.hash = ''; }, 2000);
    return;
  }
  // 密碼重設成功帶回登入頁自動填好
  const resetEmail = localStorage.getItem('reset_email');
  if (resetEmail) {
    const emailInput = document.getElementById('login-email');
    if (emailInput) emailInput.value = resetEmail;
    document.getElementById('login-msg').textContent = '密碼重設成功，請用新密碼登入';
    document.getElementById('login-msg').className = 'msg success';
    localStorage.removeItem('reset_email');
  }

  // 預設顯示登入
  document.getElementById('login-section').style.display = '';
  document.getElementById('reset-section').style.display = 'none';
});

// (如果用 <form onsubmit="...">，不需額外綁定事件，否則可這樣)
// document.getElementById('reset-section').addEventListener('submit', handleResetPassword);
