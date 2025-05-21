// ====== Supabase 設定 ======
const SUPABASE_URL = 'https://jtijaauoeqpyyoicpcor.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0aWphYXVvZXFweXlvaWNwY29yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2MzIwOTQsImV4cCI6MjA2MjIwODA5NH0.2wwDuo8wMtmNIPaidTsTOjlZeqngq7g3w32uTXn3VM0';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);


// ===== 錯誤訊息轉換 =====
function transErrorMsg(msg) {
  if (!msg) return '';
  if (msg.includes('Invalid login credentials')) return '帳號或密碼錯誤';
  if (msg.includes('Email not confirmed')) return '信箱尚未驗證，請至信箱點擊驗證連結！';
  if (msg.includes('User already registered')) return '此信箱已經註冊過了';
  if (msg.includes('User not found')) return '查無此帳號，請確認信箱是否輸入正確';
  if (msg.includes('Password should be at least')) return '密碼長度不足（至少 6 位）';
  if (msg.includes('Invalid email or password')) return '帳號或密碼錯誤';
  if (msg.includes('network error')) return '網路連線失敗，請稍後再試';
  if (msg.includes('Email rate limit')) return '請勿頻繁操作，請稍後再試';
  // 你可以繼續加更多自訂
  return msg; // 預設回傳原本內容
}

// ==== 密碼顯示/隱藏（貓咪眼睛）====
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

// ===== 表單切換 =====
function showSignUp() {
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('signup-form').style.display = '';
  document.getElementById('forgot-form').style.display = 'none';
  document.getElementById('login-msg').textContent = '';
  document.getElementById('signup-msg').textContent = '';
  document.getElementById('forgot-msg').textContent = '';
}
function showLogin(msg='') {
  document.getElementById('login-form').style.display = '';
  document.getElementById('signup-form').style.display = 'none';
  document.getElementById('forgot-form').style.display = 'none';
  document.getElementById('signup-msg').textContent = '';
  document.getElementById('forgot-msg').textContent = '';
  if (msg) {
    document.getElementById('login-msg').textContent = msg;
    document.getElementById('login-msg').className = 'msg success';
  } else {
    document.getElementById('login-msg').textContent = '';
    document.getElementById('login-msg').className = 'msg';
  }
}
function showForgot() {
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('signup-form').style.display = 'none';
  document.getElementById('forgot-form').style.display = '';
  document.getElementById('login-msg').textContent = '';
  document.getElementById('signup-msg').textContent = '';
  document.getElementById('forgot-msg').textContent = '';
}
function setLoading(isLoading) {
  document.getElementById('login-btn').classList.toggle('loading', isLoading);
  document.getElementById('signup-btn').classList.toggle('loading', isLoading);
  document.getElementById('forgot-btn').classList.toggle('loading', isLoading);
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
    document.getElementById('signup-msg').textContent = '註冊失敗: ' + transErrorMsg(error.message);
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
    document.getElementById('signup-msg').textContent = '玩家資料儲存失敗: ' + transErrorMsg(insertError.message);
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
    document.getElementById('login-msg').textContent = '登入失敗: ' + transErrorMsg(error.message);
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

// ============ 忘記密碼 ============
async function handleForgot(e) {
  e.preventDefault();
  const email = document.getElementById('forgot-email').value.trim();
  const msgDiv = document.getElementById('forgot-msg');
  msgDiv.textContent = '';
  if (!email) {
    msgDiv.textContent = '請輸入電子信箱';
    return;
  }
  document.getElementById('forgot-btn').classList.add('loading');
  // 寄送 reset password 信
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://sheruka-game.github.io/school-battle/reset.html'
  });
  document.getElementById('forgot-btn').classList.remove('loading');
  if (error) {
    msgDiv.textContent = '寄送失敗: ' + transErrorMsg(error.message);
  } else {
    msgDiv.textContent = '已寄送密碼重設信到你的信箱，請查收！';
    msgDiv.className = 'msg success';
  }
}

// 初始化顯示登入
document.addEventListener('DOMContentLoaded', function() {
  showLogin();
});
