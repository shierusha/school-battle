window.supabase = window.supabase || supabase;
window.client = window.supabase.createClient(
  'https://wfhwhvodgikpducrhgda.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmaHdodm9kZ2lrcGR1Y3JoZ2RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMTAwNjEsImV4cCI6MjA2MzU4NjA2MX0.P6P-x4SxjiR4VdWH6VFgY_ktgMac_OzuI4Bl7HWskz8'
);

// 

const TEST_STUDENT_IDS = [
  '24e1a631-016a-422a-9f27-a6e5774c254f',
  '434cbc99-9a4f-4334-bc71-7236b8daf51c',
  '6ceb01f3-d296-438f-be5a-eebfa6e30e41',
  '845dd04d-ff39-43a8-ad84-e8f714a8b454',
  'ee8ea0cd-d664-4b5f-8f714a8b454',
  'ee8ea0cd-d664-4b5f-8d0e-0240bf9debdb'
];
const SPECIAL_PLAYER_ID = '126bda27-405c-45a3-8f54-1e819fe44c8c';

const OCCUPATION_MAP = {
  attack: "攻擊手", healer: "補師", tank: "坦克", buffer: "增益手", jammer: "妨礙手"
};
const GENDER_MAP = { M: "男", F: "女", O: "其他" }; 
const ALIGNMENT_MAP = { white: "白", black: "黑" };
const ELEMENT_MAP = {
  fire: "火", water: "水", ice: "冰", wind: "風", earth: "土",
  thunder: "雷", dark: "暗", light: "光"
};
const RANGE_MAP = {
  same_zone: "近距離", cross_zone: "遠距離", all_zone: "遠近皆可"
};
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

async function fetchStudentData(client, stuParam) {
  // 用 student_id 查 (白名單或特殊玩家)
  if (isUuid(stuParam)) {
    let { data, error } = await client
      .from('students')
      .select('*, student_images(*), student_notes(*), player_id, element_weakness:weakness_id(element)')
      .eq('student_id', stuParam)
      .maybeSingle();
    if (error || !data) return null;
    // 白名單 student 或特殊玩家才允許
    if (TEST_STUDENT_IDS.includes(data.student_id) || data.player_id === SPECIAL_PLAYER_ID)
      return data;
    return null;
  }
  // 否則用 student_code 查
  let { data, error } = await client
    .from('students')
    .select('*, student_images(*), student_notes(*), element_weakness:weakness_id(element)')
    .eq('student_code', stuParam)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

// 技能查詢（技能同時帶效果、debuff、觸發條件）
async function fetchSkills(client, student_id) {
  // 先查所有技能
  let { data: skills, error } = await client
    .from('student_skills')
    .select(`
      *,
      passive_trigger:passive_trigger_id(condition),
      student_skill_effect_links(effect_id, skill_id, effect:effect_id(effect_name,description)),
      student_skill_debuff_links(debuff_id, skill_id, applied_to, debuff:debuff_id(debuff_name))
    `)
    .eq('student_id', student_id)
    .order('skill_slot', { ascending: true });
  if (error || !skills) return [];
  // 整理資料
  return skills.map(s => ({
    ...s,
    effects: (s.student_skill_effect_links || []).map(e => e.effect?.effect_name).filter(Boolean),
    debuffs: (s.student_skill_debuff_links || []).map(d => ({
      applied_to: d.applied_to === "self" ? "自身" : "目標",
      name: d.debuff?.debuff_name
    })).filter(d => d.name),
    custom_skill_effect: s.custom_skill_uuid && s.custom_skill_uuid.description,
    trigger_condition: s.passive_trigger && s.passive_trigger.condition
  }));
}

// 填入卡片
function fillStudentCard(student, skills) {
  // 正反面圖片
  const frontImg = (student.student_images || []).find(i => i.image_type === "front");
  const backImg = (student.student_images || []).find(i => i.image_type === "back") || frontImg;

  document.querySelectorAll('[data-key="student_images.front_url"]').forEach(el => { if (frontImg) el.src = frontImg.image_url; });
  document.querySelectorAll('[data-key="student_images.back_url"]').forEach(el => { if (backImg) el.src = backImg.image_url; });

  // 主要欄位
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

  // 角色設定（notes）
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

  // 技能
  for (let i = 0; i < 2; i++) {
    const skill = skills[i] || {};
    document.querySelectorAll(`[data-key="student_skills.${i + 1}.skill_name"]`).forEach(el => el.innerText = skill.skill_name || "");
    document.querySelectorAll(`[data-key="student_skills.${i + 1}.final_cd"]`).forEach(el => el.innerText = skill.is_passive ? "X" : (skill.final_cd || ""));
    document.querySelectorAll(`[data-key="student_skills.${i + 1}.max_targets"]`).forEach(el => {
      let val = skill.max_targets;
      if (val === 1) el.innerText = "單體";
      else if (val > 1) el.innerText = `範圍(${val})`;
      else el.innerText = "";
    });
    document.querySelectorAll(`[data-key="student_skills.${i + 1}.range"]`).forEach(el => el.innerText = mapEnum(skill.range, RANGE_MAP));
    document.querySelectorAll(`[data-key="student_skills.${i + 1}.description"]`).forEach(el => {
      if (skill.is_passive && skill.trigger_condition) {
        el.innerText = `條件：\n${skill.trigger_condition}\n\n${skill.description || ""}`;
      } else {
        el.innerText = skill.description || "";
      }
    });
    document.querySelectorAll(`[data-key="student_skills.${i + 1}.effectsAndDebuffs"]`).forEach(el => {
      let html = "";
      if (skill.custom_skill_effect) html += `【${skill.custom_skill_effect}】\n\n`;
      if (skill.effects && skill.effects.length > 0) skill.effects.forEach(e => html += `# 【${e}】\n`);
      if (skill.debuffs && skill.debuffs.length > 0) skill.debuffs.forEach(d => html += `# ${d.applied_to}【${d.name}】\n`);
      el.innerText = html;
    });
  }

  // 額外技能
  const extraSkills = skills.slice(2);
  document.querySelectorAll('[data-key="student_skills.extra_skills"]').forEach(el => {
    if (extraSkills.length === 0) {
      el.style.display = "none";
    } else {
      el.style.display = "";
      el.onclick = () => {
        let html = "";
        extraSkills.forEach(skill => {
          html += `${skill.skill_name}\n${skill.description}\n\n`;
        });
        if (typeof showInfoModal === "function")
          showInfoModal("額外技能", html.replace(/\n/g, "<br>"));
      };
    }
  });
}

// 自動執行
window.addEventListener('DOMContentLoaded', async () => {
  // 1. 解析參數
  const stuParam = getStuParam();
  if (!stuParam || !window.client) return;

  // 2. 抓主資料
  const student = await fetchStudentData(window.client, stuParam);
  if (!student) {
    alert("? 你想找誰?");
    return;
  }
  // 3. 抓技能
  const skills = await fetchSkills(window.client, student.student_id);
  // 4. 塞到卡片
  fillStudentCard(student, skills);
  // 5. 字型適配
  if (typeof fitAll === "function") fitAll();
  if (typeof checkLongTextByCharCount === "function") checkLongTextByCharCount(13);
});
