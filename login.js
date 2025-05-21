// ====== Supabase 設定 ======
const SUPABASE_URL = 'https://jtijaauoeqpyyoicpcor.supabase.co';
const SUPABASE_KEY = '你的KEY'; // 只改這裡，其他不動
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 顯示/隱藏密碼
function togglePw(inputId, btn) {
  const input = document.getElementById(inputId);
  input.type = input.type === 'password' ? 'text' : 'password';
  btn.textContent = input.type === 'password' ? '(ΦωΦ)' : '(=ω=)';
}

// 表單切換
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
  document.getElementById('login-msg').textContent = msg || '';
  document.getElementById('login-msg').className = msg ? 'msg success' : 'msg';
  document.getElementById('signup-msg').textContent = '';
  document.getElementById('forgot-msg').textContent = '';
}
function showForgot() {
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('signup-form').style.display = 'none';
  document.getElementById('forgot-form').style.display = '';
  document.getElementById('login-msg').textContent = '';
  document.getElementById('signup-msg').textContent = '';
  document.getElementById('forgot-msg').textContent = '';
}

// 註冊
async function signUp() {
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const username = document.getElementById('signup-username').value.trim();
  const msgBox = document.getElementById('signup-msg');
  msgBox.textContent = '';
  if (!email || !password || !username) {
    msgBox.textContent = '請填寫所有欄位';
    return;
  }
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error || !data.user) {
    msgBox.textContent = '註冊失敗: ' + (error?.message || '未知錯誤');
    return;
  }
  const { error: insertError } = await supabase.from('players').insert({
    player_id: data.user.id,
    email,
    username,
    role: 'player'
  });
  if (insertError) {
    if (insertError.message.includes('players_email_key')) {
      msgBox.textContent = '此信箱已註冊過，請直接登入。';
    } else {
      msgBox.textContent = '系統錯誤，請稍後再試。';
    }
    return;
  }
  showLogin('註冊成功，請驗證信箱！');
}

// 登入
async function signIn() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const msgBox = document.getElementById('login-msg');
  msgBox.textContent = '';
  if (!email || !password) {
    msgBox.textContent = '請輸入帳號與密碼';
    return;
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    msgBox.textContent = '登入失敗: ' + (error?.message || '帳號驗證失敗');
    return;
  }
  localStorage.setItem('player_id', data.user.id);

  const { data: player, error: playerError } = await supabase
    .from('players')
    .select('*')
    .eq('player_id', data.user.id)
    .single();
  if (playerError) {
    msgBox.textContent = '查無玩家資料，請重新註冊';
    return;
  }
  localStorage.setItem('player_username', player.username);
  window.location.href = 'https://sheruka-game.github.io/create-student/creat-st.html';
}

// 忘記密碼
async function handleForgot(e) {
  e.preventDefault();
  const email = document.getElementById('forgot-email').value.trim();
  const msgBox = document.getElementById('forgot-msg');
  msgBox.textContent = '';
  if (!email) {
    msgBox.textContent = '請輸入電子信箱';
    return;
  }
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://sheruka-game.github.io/school-battle/reset.html'
  });
  if (error) {
    msgBox.textContent = '寄送失敗: ' + error.message;
  } else {
    msgBox.textContent = '如果你已註冊，我們已寄出重設信。';
    msgBox.className = 'msg success';
  }
}

document.addEventListener('DOMContentLoaded', showLogin);
