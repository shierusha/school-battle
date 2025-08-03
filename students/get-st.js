window.supabase = window.supabase || supabase;
window.client = window.supabase.createClient(
  'https://wfhwhvodgikpducrhgda.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmaHdodm9kZ2lrcGR1Y3JoZ2RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMTAwNjEsImV4cCI6MjA2MzU4NjA2MX0.P6P-x4SxjiR4VdWH6VFgY_ktgMac_OzuI4Bl7HWskz8'
);

const TEST_STUDENT_IDS = [
  '24e1a631-016a-422a-9f27-a6e5774c254f',
  '434cbc99-9a4f-4334-bc71-7236b8daf51c',
  '6ceb01f3-d296-438f-be5a-eebfa6e30e41',
  '845dd04d-ff39-43a8-ad84-e8f714a8b454',
  'ee8ea0cd-d664-4b5f-8d0e-0240bf9debdb'
];
const SPECIAL_PLAYER_ID = '126bda27-405c-45a3-8f54-1e819fe44c8c';

const OCCUPATION_MAP = { attack: "攻擊手", healer: "補師", tank: "坦克", buffer: "增益手", jammer: "妨礙手" };
const GENDER_MAP = { M: "男", F: "女", O: "其他" };
const ALIGNMENT_MAP = { white: "白", black: "黑" };
const ELEMENT_MAP = { fire: "火", water: "水", ice: "冰", wind: "風", earth: "土", thunder: "雷", dark: "暗", light: "光" };
const RANGE_MAP = { same_zone: "近距離", cross_zone: "遠距離", all_zone: "遠近皆可" };
const ROLE_MAP = { melee: "近戰攻擊手", ranger: "遠攻攻擊手", balance: "普通攻擊手" };
const POSITION_MAP = { close: "近戰區", far: "遠攻區" };

function mapEnum(val, mapObj) {
  if (!val) return "";
  if (Array.isArray(val)) return val.map(v => mapObj[v] || v).join(" / ");
  return mapObj[val] || val;
}

function getStuParam() {
  const url = new URL(location.href);
  return url.searchParams.get("stu") || "";
}

function isUuid(v) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

// 查目前登入帳號在players表的role（判斷是不是admin）
async function getIsAdmin(client) {
  const { data: { user } } = await client.auth.getUser();
  const currentPlayerId = user?.id || "";
  if (!currentPlayerId) return false;
  let { data: player } = await client
    .from('players')
    .select('role')
    .eq('player_id', currentPlayerId)
    .maybeSingle();
  return player && player.role === 'admin';
}

// 查學生卡（權限全部寫死）
async function fetchStudentData(client, stuParam, isAdmin) {
  if (isUuid(stuParam)) {
    // 用 student_id 查，只有 admin/白名單/特殊玩家能查
    let { data, error } = await client
      .from('students')
      .select('*, student_images(*), student_notes(*), player_id, element_weakness:weakness_id(element)')
      .eq('student_id', stuParam)
      .maybeSingle();
    if (error || !data) return null;
    if (
      TEST_STUDENT_IDS.includes(data.student_id) || // 白名單
      data.player_id === SPECIAL_PLAYER_ID ||       // 特殊玩家
      isAdmin                                       // 管理員
    ) return data;
    return null; // 其他人一律擋掉
  }
  // 用 student_code 查，任何人都可
  let { data, error } = await client
    .from('students')
    .select('*, student_images(*), student_notes(*), element_weakness:weakness_id(element)')
    .eq('student_code', stuParam)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

// 查技能（這裡加入 movement_skill 資訊）
async function fetchSkills(client, student_id) {
  let { data: skills, error } = await client
    .from('student_skills')
    .select(`
      *,
      passive_trigger:passive_trigger_id(condition),
      movement_skill:linked_movement_id(move_name),
      student_skill_effect_links(effect_id, skill_id, effect:effect_id(effect_name,description)),
      student_skill_debuff_links(debuff_id, skill_id, applied_to, debuff:debuff_id(debuff_name))
    `)
    .eq('student_id', student_id)
    .order('skill_slot', { ascending: true });
  if (error || !skills) return [];
  return skills.map(s => ({
    ...s,
    effects: (s.student_skill_effect_links || []).map(e => e.effect?.effect_name).filter(Boolean),
    debuffs: (s.student_skill_debuff_links || []).map(d => ({
      applied_to: d.applied_to === "self" ? "自身" : "目標",
      name: d.debuff?.debuff_name
    })).filter(d => d.name),
    custom_skill_effect: s.custom_skill_uuid && s.custom_skill_uuid.description,
    trigger_condition: s.passive_trigger && s.passive_trigger.condition,
    movement_effect_name: s.movement_skill?.move_name   // 新增
  }));
}

// 填入資料
function fillStudentCard(student, skills) {
  const frontImg = (student.student_images || []).find(i => i.image_type === "front");
  const backImg = (student.student_images || []).find(i => i.image_type === "back") || frontImg;

  document.querySelectorAll('[data-key="student_images.front_url"]').forEach(el => { if (frontImg) el.src = frontImg.image_url; });
  document.querySelectorAll('[data-key="student_images.back_url"]').forEach(el => { if (backImg) el.src = backImg.image_url; });

  document.querySelectorAll('[data-key="students.student_code"]').forEach(el => el.innerText = student.student_code);
  document.querySelectorAll('[data-key="students.name"]').forEach(el => el.innerText = student.name);
  document.querySelectorAll('[data-key="students.nickname"]').forEach(el => {
    if (!student.nickname) el.parentElement.style.display = 'none';
    else el.innerText = student.nickname;
  });
  document.querySelectorAll('[data-key="students.alignment"]').forEach(el => el.innerText = mapEnum(student.alignment, ALIGNMENT_MAP));
  document.querySelectorAll('[data-key="students.race"]').forEach(el => el.innerText = student.race || "");
  document.querySelectorAll('[data-key="students.age"]').forEach(el => el.innerText = (student.age && student.age > 0) ? student.age : "？");
  document.querySelectorAll('[data-key="students.gender"]').forEach(el => el.innerText = mapEnum(student.gender, GENDER_MAP));
  document.querySelectorAll('[data-key="students.height"]').forEach(el => el.innerText = student.height || "");
  document.querySelectorAll('[data-key="students.weight"]').forEach(el => el.innerText = student.weight || "");
  document.querySelectorAll('[data-key="students.likes"]').forEach(el => el.innerText = student.likes || "");
  document.querySelectorAll('[data-key="students.hate"]').forEach(el => el.innerText = student.hate || "");
  document.querySelectorAll('[data-key="students.background"]').forEach(el => el.innerText = student.background || "");
  document.querySelectorAll('[data-key="students.occupation_type"]').forEach(el => el.innerText = mapEnum(student.occupation_type, OCCUPATION_MAP));
  document.querySelectorAll('[data-key="students.element"]').forEach(el => el.innerText = mapEnum(student.element, ELEMENT_MAP));
  document.querySelectorAll('[data-key="element_weakness.element"]').forEach(el => {
    el.innerText = student.element_weakness && student.element_weakness.element ? mapEnum(student.element_weakness.element, ELEMENT_MAP) : "無";
  });
  document.querySelectorAll('[data-key="students.preferred_role"]').forEach(el => el.innerText = mapEnum(student.preferred_role, ROLE_MAP));
  document.querySelectorAll('[data-key="students.starting_position"]').forEach(el => el.innerText = mapEnum(student.starting_position, POSITION_MAP));
  document.querySelectorAll('[data-key="students.personality"]').forEach(el => el.innerText = student.personality || ""); // 新增這行

  document.querySelectorAll('[data-key="student_notes.content"]').forEach(el => {
    if (!student.student_notes || student.student_notes.length === 0) {
      el.innerText = "";
      return;
    }
    el.innerText = student.student_notes
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(n => n.is_public ? `# ${n.content}` : "# ???")
      .join('\n');
  });

  for (let i = 0; i < 2; i++) {
    const skill = skills[i] || {};
    document.querySelectorAll(`[data-key="student_skills.${i + 1}.skill_name"]`).forEach(el => el.innerText = skill.skill_name || "");
    document.querySelectorAll(`[data-key="student_skills.${i + 1}.final_cd"]`).forEach(el => el.innerText = skill.is_passive ? "X" : (skill.final_cd ?? 0));
    document.querySelectorAll(`[data-key="student_skills.${i + 1}.max_targets"]`).forEach(el => {
      let val = skill.max_targets;
      if (val === 1) el.innerText = "單體";
      else if (val > 1) el.innerText = `範圍(${val})`;
      else el.innerText = "";
    });
    document.querySelectorAll(`[data-key="student_skills.${i + 1}.range"]`).forEach(el => el.innerText = mapEnum(skill.range, RANGE_MAP));
    document.querySelectorAll(`[data-key="student_skills.${i + 1}.description"]`).forEach(el => {
      if (skill.is_passive && skill.trigger_condition) {
        el.innerText = `${skill.description || ""}\n\n條件：${skill.trigger_condition}`;
      } else {
        el.innerText = skill.description || "";
      }
    });
    document.querySelectorAll(`[data-key="student_skills.${i + 1}.effectsAndDebuffs"]`).forEach(el => {
      let html = "";
      if (skill.custom_skill_effect) html += `${skill.custom_skill_effect}\n\n`;
      if (skill.effects && skill.effects.length > 0) skill.effects.forEach(e => html += `# ${e}\n`);
      if (skill.movement_effect_name) html += `# 移動效果${skill.movement_effect_name}\n`;
      if (skill.debuffs && skill.debuffs.length > 0) skill.debuffs.forEach(d => html += `# ${d.applied_to}${d.name}\n`);
      el.innerText = html;
    });
  }

  const extraSkills = skills.slice(2);
  document.querySelectorAll('[data-key="student_skills.extra_skills"]').forEach(el => {
    if (extraSkills.length === 0) {
      el.style.display = "none";
      el.onclick = null;
    } else {
      el.style.display = "";
      el.onclick = () => {
        let html = "";
        extraSkills.forEach(skill => {
          html += `${skill.skill_name || ""}\n${skill.description || ""}\n\n`;
        });
        if (typeof showInfoModal === "function")
          showInfoModal("額外技能", html.replace(/\n/g, "<br>"));
      };
    }
  });

  // ★★★ 這裡是修正重點：填完資料後才執行這兩個 function
  if (typeof fitAll === "function") fitAll();
  if (typeof checkLongTextByCharCount === "function") checkLongTextByCharCount(13);
}

// 自動流程
window.addEventListener('DOMContentLoaded', async () => {
  const stuParam = getStuParam();
  if (!stuParam || !window.client) return;

  const isAdmin = await getIsAdmin(window.client);

  const student = await fetchStudentData(window.client, stuParam, isAdmin);

  if (!student) {
    alert("? 你想找誰?");
    return;
  }

  const skills = await fetchSkills(window.client, student.student_id);

  fillStudentCard(student, skills);
});


//-----------------------------------------------------------

function setNameFontSize(selector, maxChars) {
  document.querySelectorAll(selector).forEach(box => {
    const nameDiv = box.querySelector('.name-box');
    if (!nameDiv) return;
    const fontSize = box.offsetHeight / maxChars * 0.98;
    nameDiv.style.fontSize = fontSize + "px";
  });
}

function fitAllNameBoxes() {
  setNameFontSize('.bigname-box', 12);
  setNameFontSize('.littlename-box', 9);
}

function setInfoBoxFontSize() {
  const infoBoxes = document.querySelectorAll('.info-box');
  if (!infoBoxes.length) return;
  let minHeight = Infinity;
  infoBoxes.forEach(box => {
    const h = box.offsetHeight;
    if (h < minHeight) minHeight = h;
  });
  const fontSize = minHeight * 0.62;
  infoBoxes.forEach(box => {
    box.style.fontSize = fontSize + "px";
  });
}

function setFlipBtnFontSize() {
  document.querySelectorAll('.row-flip-btn').forEach(box => {
    const btn = box.querySelector('.flip-btn');
    if (!btn) return;
    // 用高度算，讓四字不會超出（0.55可微調）
    const fontSize = Math.max(box.offsetHeight * 0.6);
    btn.style.fontSize = fontSize + "px";
  });
}

function setStudentIdFontSize() {
  document.querySelectorAll('.student-id').forEach(box => {
    // 用外層高度計算，數字可依區塊比例微調
    const fontSize = Math.max(box.offsetHeight * 0.7); // 12是最小字體
    box.style.fontSize = fontSize + "px";
  });
}

function fitAll() {
  fitAllNameBoxes();
  setInfoBoxFontSize();
  setFlipBtnFontSize();
  setStudentIdFontSize();
}

window.addEventListener('DOMContentLoaded', fitAll);
window.addEventListener('resize', fitAll);
window.addEventListener('load', fitAll);


// 更多
// 判斷 info-value 超過 13 字才顯示 ...MORE
function checkLongTextByCharCount(N = 13) {
  document.querySelectorAll('.info-box').forEach(box => {
    const value = box.querySelector('.info-value');
    const btn = box.querySelector('.show-more-btn');
    if (!value || !btn) return;
    if (value.innerText.trim().length > N) {
      btn.style.display = 'block';
      btn.onclick = function() {
        // 標題優先抓 info-label, 沒有就用 data-title (button自訂)，最後才 "效果"
        const label = this.dataset.title || box.querySelector('.info-label')?.innerText || "效果";
        showInfoModal(label, value.innerHTML);
      }
    } else {
      btn.style.display = 'none';
    }
  });
}
// 初次不要呼叫，resize 時才判斷
window.addEventListener('resize', () => checkLongTextByCharCount(13));


// 彈跳視窗相關
function showInfoModal(title, content) {
  document.getElementById('info-modal-title').innerText = title;
  document.getElementById('info-modal-body').innerHTML = content;
  document.getElementById('info-modal').style.display = 'flex';
}
// 點背景關閉彈窗
document.getElementById('info-modal').addEventListener('click', function(e) {
  if (e.target === this) {
    e.stopPropagation();  // ★★★ 關鍵！阻止觸發 document click
    this.style.display = 'none';
  }
});


window.addEventListener('DOMContentLoaded', () => {
  const flipCard = document.getElementById('flipCard');

  // 點翻面按鈕（阻止冒泡）
  document.querySelectorAll('.flip-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      flipCard.classList.toggle('flipped');
    });
  });

  // 點畫面上非卡片、非彈窗時才翻面
  document.addEventListener('click', (e) => {
    // 判斷 info-modal 是否有顯示
    const modal = document.getElementById('info-modal');
    const isModalOpen = modal && getComputedStyle(modal).display !== 'none';
    // 如果有彈窗開著就不做任何事
    if (isModalOpen) return;
    // 點到非卡片區才翻面
    if (!e.target.closest('#flipCard')) {
      flipCard.classList.toggle('flipped');
    }
  });
});
