// === Supabase 設定 ===
const SUPABASE_URL = 'https://jtijaauoeqpyyoicpcor.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0aWphYXVvZXFweXlvaWNwY29yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2MzIwOTQsImV4cCI6MjA2MjIwODA5NH0.2wwDuo8wMtmNIPaidTsTOjlZeqngq7g3w32uTXn3VM0';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==== 密碼顯示/隱藏 ====
function togglePw(inputId, btn) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '(=ω=)';
  } else {
    input.type = 'password';
    btn.textContent = '(ΦωΦ)';
  }
}

// ==== 登入/註冊切換 ====
function showSignUp() {
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('signup-form').style.display = '';
  document.getElementById('login-msg').textContent = '';
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

  // 查詢玩家表
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
  localStorage.setItem('player_username', player.username);

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
    showLogin();
    document.getElementById('login-section').style.display = '';
    document.getElementById('reset-section').style.display = 'none';
    // 自動填好信箱
    const emailInput = document.getElementById('login-email');
    if (emailInput && userData && userData.user && userData.user.email) {
      emailInput.value = userData.user.email;
    }
  }, 1200);
}

// ==== hash 控制頁面顯示 ====
document.addEventListener('DOMContentLoaded', handleAuthUI);
window.addEventListener('hashchange', handleAuthUI);

async function handleAuthUI() {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const type = params.get('type');
  const loginSection = document.getElementById('login-section');
  const resetSection = document.getElementById('reset-section');
  const msgDiv = document.getElementById('login-msg');

  // 1. 只要 hash 裡有 type=recovery 就一定顯示重設密碼
  if (type === 'recovery') {
    loginSection.style.display = 'none';
    resetSection.style.display = '';
    msgDiv.textContent = '';
    // 自動聚焦密碼
    setTimeout(() => {
      const pwd = document.getElementById('new-password');
      if(pwd) pwd.focus();
    }, 150);
    return;
  }

  // 2. 信箱驗證（type=signup）
  if (type === 'signup') {
    loginSection.style.display = '';
    resetSection.style.display = 'none';
    msgDiv.textContent = '信箱驗證成功，請登入';
    msgDiv.className = 'msg success';
    setTimeout(() => { window.location.hash = ''; }, 2000);
    return;
  }

  // 3. 密碼重設連結過期/失效
  const errorCode = params.get('error_code');
  if (errorCode === 'otp_expired' || params.get('error') === 'access_denied') {
    loginSection.style.display = '';
    resetSection.style.display = 'none';
    msgDiv.textContent = '密碼重設連結已過期或失效，請重新申請「忘記密碼」郵件。';
    msgDiv.className = 'msg';
    setTimeout(() => { window.location.hash = ''; }, 4000);
    return;
  }

  // 4. 密碼重設成功帶回登入頁自動填好
  const resetEmail = localStorage.getItem('reset_email');
  if (resetEmail) {
    loginSection.style.display = '';
    resetSection.style.display = 'none';
    const emailInput = document.getElementById('login-email');
    if (emailInput) emailInput.value = resetEmail;
    msgDiv.textContent = '密碼重設成功，請用新密碼登入';
    msgDiv.className = 'msg success';
    localStorage.removeItem('reset_email');
    return;
  }

  // 5. 預設顯示登入
  loginSection.style.display = '';
  resetSection.style.display = 'none';
  msgDiv.textContent = '';
  msgDiv.className = 'msg';
}
