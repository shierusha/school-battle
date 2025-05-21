// ====== Supabase 設定 ======
const SUPABASE_URL = 'https://jtijaauoeqpyyoicpcor.supabase.co';
const SUPABASE_KEY = '你的KEY';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 顯示/隱藏密碼
function togglePw(inputId, btn) {
  const input = document.getElementById(inputId);
  input.type = input.type === 'password' ? 'text' : 'password';
  btn.textContent = input.type === 'password' ? '(ΦωΦ)' : '(=ω=)';
}

// ===== 表單切換 =====
function showSignUp() {
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('signup-form').style.display = '';
  document.getElementById('forgot-form').style.display = 'none';
  clearMsgs();
}
function showLogin(msg = '') {
  document.getElementById('login-form').style.display = '';
  document.getElementById('signup-form').style.display = 'none';
  document.getElementById('forgot-form').style.display = 'none';
  clearMsgs();

  // 自動填入註冊信箱
  const emailField = document.getElementById('login-email');
  const savedEmail = localStorage.getItem('last_signup_email');
  if (emailField && savedEmail) {
    emailField.value = savedEmail;
    localStorage.removeItem('last_signup_email');
  }
  if (msg) showMsg('login-msg', msg, true);
}
function showForgot() {
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('signup-form').style.display = 'none';
  document.getElementById('forgot-form').style.display = '';
  clearMsgs();
}
function clearMsgs() {
  ['login-msg', 'signup-msg', 'forgot-msg'].forEach(id => {
    const m = document.getElementById(id);
    if (m) { m.textContent = ''; m.className = 'msg'; }
  });
}
function showMsg(id, msg, success = false) {
  const d = document.getElementById(id);
  if (d) {
    d.textContent = msg;
    d.className = success ? 'msg success' : 'msg';
  }
}

// ============ 註冊 ============
async function signUp() {
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const username = document.getElementById('signup-username').value.trim();
  if (!email || !password || !username) {
    showMsg('signup-msg', '請填寫所有欄位');
    return;
  }
  // 註冊帳號
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error || !data.user) {
    showMsg('signup-msg', '註冊失敗: ' + (error?.message || '未知錯誤'));
    return;
  }
  // 存信箱（for 自動填入）
  localStorage.setItem('last_signup_email', email);

  // 寫入玩家資料
  const { error: insertError } = await supabase.from('players').insert({
    player_id: data.user.id,
    email,
    username,
    role: 'player'
  });
  if (insertError) {
    if (insertError.message.includes('players_email_key')) {
      showMsg('signup-msg', '此信箱已註冊過，請直接登入。');
    } else {
      showMsg('signup-msg', '系統錯誤，請稍後再試。');
    }
    return;
  }
  showLogin('註冊成功，請驗證信箱！');
}

// ============ 登入 ============
async function signIn() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!email || !password) {
    showMsg('login-msg', '請輸入帳號與密碼');
    return;
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    showMsg('login-msg', '登入失敗: ' + (error?.message || '帳號驗證失敗'));
    return;
  }
  localStorage.setItem('player_id', data.user.id);

  const { data: player, error: playerError } = await supabase
    .from('players')
    .select('*')
    .eq('player_id', data.user.id)
    .single();
  if (playerError) {
    showMsg('login-msg', '查無玩家資料，請重新註冊');
    return;
  }
  localStorage.setItem('player_username', player.username);
  window.location.href = 'https://sheruka-game.github.io/create-student/creat-st.html';
}

// ============ 忘記密碼 ============
async function handleForgot(e) {
  e.preventDefault();
  const email = document.getElementById('forgot-email').value.trim();
  if (!email) {
    showMsg('forgot-msg', '請輸入電子信箱');
    return;
  }
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://sheruka-game.github.io/school-battle/reset.html'
  });
  if (error) {
    showMsg('forgot-msg', '寄送失敗: ' + error.message);
  } else {
    showMsg('forgot-msg', '如果你已註冊，我們已寄出重設信。', true);
  }
}

// 初始化
document.addEventListener('DOMContentLoaded', showLogin);
