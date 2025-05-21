// ====== Supabase 設定 ======
const SUPABASE_URL = 'https://jtijaauoeqpyyoicpcor.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFz...'; // 你的原 key
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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

function showLogin(msg = '') {
  document.getElementById('login-form').style.display = '';
  document.getElementById('signup-form').style.display = 'none';
  document.getElementById('forgot-form').style.display = 'none';
  document.getElementById('signup-msg').textContent = '';
  document.getElementById('forgot-msg').textContent = '';

  // ✅ 等 DOM 轉換後再填入 email
  setTimeout(() => {
    const emailField = document.getElementById('login-email');
    const savedEmail = localStorage.getItem('last_signup_email');
    if (emailField && savedEmail) {
      emailField.value = savedEmail;
      localStorage.removeItem('last_signup_email');
    }
  }, 50);

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

  // ✅ 記住 email，登入時自動填入
  localStorage.setItem('last_signup_email', email);

  // 嘗試寫入 players 表
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
    if (
      insertError.message.includes('duplicate key') &&
      insertError.message.includes('players_email_key')
    ) {
      document.getElementById('signup-msg').textContent = '此信箱已註冊過，請直接登入或重送驗證信。';
    } else {
      document.getElementById('signup-msg').textContent = '系統錯誤，請稍後再試。';
    }
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

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://sheruka-game.github.io/school-battle/reset.html'
  });

  document.getElementById('forgot-btn').classList.remove('loading');

  if (error) {
    msgDiv.textContent = '寄送失敗: ' + error.message;
  } else {
    msgDiv.textContent = '如果你已註冊，我們已寄出密碼重設信，請查收信箱。';
    msgDiv.className = 'msg success';
  }
}

// 初始化
document.addEventListener('DOMContentLoaded', function () {
  showLogin();
});