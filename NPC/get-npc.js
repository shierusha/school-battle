const SUPABASE_URL = 'https://wfhwhvodgikpducrhgda.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmaHdodm9kZ2lrcGR1Y3JoZ2RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMTAwNjEsImV4cCI6MjA2MzU4NjA2MX0.P6P-x4SxjiR4VdWH6VFgY_ktgMac_OzuI4Bl7HWskz8';

const DEFAULT_NPC_BACKGROUND_URL = 'https://shierusha.github.io/school-battle/teachers/img/1.webp';
const DEFAULT_NPC_NAMEBOX_COLOR = '#3da2ad';
const NPC_NAMEBOX_ALPHA = 0.8;

const OCCUPATION_MAP = {
  attack: '攻擊手',
  healer: '補師',
  tank: '坦克',
  buffer: '增益手',
  jammer: '妨礙手'
};

const GENDER_MAP = {
  M: '男',
  F: '女',
  O: '其他'
};

const ALIGNMENT_MAP = {
  white: '白',
  black: '黑'
};

const ELEMENT_MAP = {
  fire: '火',
  water: '水',
  ice: '冰',
  wind: '風',
  earth: '土',
  thunder: '雷',
  dark: '暗',
  light: '光'
};

const ROLE_MAP = {
  melee: '近戰攻擊手',
  ranger: '遠攻攻擊手',
  balance: '普通攻擊手'
};

const POSITION_MAP = {
  close: '近戰區',
  far: '遠攻區'
};

const RANGE_MAP = {
  same_zone: '近距離',
  cross_zone: '遠距離',
  all_zone: '遠近皆可'
};

const TARGET_SELECT_TYPE_MAP = {
  people: '人頭',
  range: '區域',
  global: '全場'
};

const APPLIED_TO_MAP = {
  self: '自身',
  target: '目標',
  enemy: '敵方',
  ally: '隊友'
};

window.client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function getNpcParam() {
  const url = new URL(location.href);
  return (url.searchParams.get('npc') || '').trim();
}

function bustCache(url) {
  if (!url) return '';
  return url + (url.includes('?') ? '&v=' : '?v=') + Date.now();
}

function normalizeHexColor(value) {
  if (typeof value !== 'string') {
    return DEFAULT_NPC_NAMEBOX_COLOR;
  }

  const color = value.trim();

  if (/^#[0-9a-fA-F]{6}$/.test(color)) {
    return color.toLowerCase();
  }

  return DEFAULT_NPC_NAMEBOX_COLOR;
}

function hexToRgba(hex, alpha) {
  const normalized = normalizeHexColor(hex);
  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function setNpcNameboxColor(color) {
  const rgbaColor = hexToRgba(color, NPC_NAMEBOX_ALPHA);

  document.querySelectorAll('.name-box').forEach(box => {
    box.style.background = rgbaColor;
  });
}

function setNpcBackground(url) {
  const finalUrl = url || DEFAULT_NPC_BACKGROUND_URL;

  document.querySelectorAll('.bg-img').forEach(img => {
    img.src = bustCache(finalUrl);
  });
}

function mapEnum(value, mapObject) {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  if (Array.isArray(value)) {
    return value
      .map(item => mapObject[item] || item)
      .filter(Boolean)
      .join(' / ');
  }

  return mapObject[value] || value;
}

function mapNpcSkillRange(skill) {
  if (!skill) return '';

  if (skill.target_select_type === 'global' || skill.range === null) {
    return '全域攻擊';
  }

  if (skill.range === undefined || skill.range === '') {
    return '';
  }

  return RANGE_MAP[skill.range] || skill.range;
}

function mapNpcMaxTargets(skill) {
  if (!skill) return '';

  if (skill.target_select_type === 'global') {
    return '全場';
  }

  if (skill.target_select_type === 'range') {
    if (skill.max_targets === null || skill.max_targets === undefined || skill.max_targets === '') {
      return '區域';
    }

    const number = Number(skill.max_targets);

    if (number === 1) {
      return '單區';
    }

    if (number > 1) {
      return `區域(${number})`;
    }

    return '';
  }

  if (skill.max_targets === null || skill.max_targets === undefined || skill.max_targets === '') {
    return '';
  }

  const number = Number(skill.max_targets);

  if (number === 1) {
    return '單體';
  }

  if (number > 1) {
    return `範圍(${number})`;
  }

  return '';
}

function mapAppliedTo(value) {
  return APPLIED_TO_MAP[value] || '';
}

function setTextByDataKey(dataKey, value) {
  document.querySelectorAll(`[data-key="${dataKey}"]`).forEach(el => {
    el.textContent = value ?? '';
  });
}

function setImageByDataKey(dataKey, imageUrl) {
  document.querySelectorAll(`[data-key="${dataKey}"]`).forEach(el => {
    if (imageUrl) {
      el.src = bustCache(imageUrl);
      el.style.display = '';
    } else {
      el.removeAttribute('src');
      el.style.display = 'none';
    }
  });
}

function indexBy(array, key) {
  const map = new Map();

  (array || []).forEach(item => {
    if (item && item[key] !== undefined && item[key] !== null) {
      map.set(item[key], item);
    }
  });

  return map;
}

async function fetchNpcData(npcName) {
  const { data, error } = await window.client
    .from('other_npcs')
    .select(`
      *,
      element_weakness:weakness_id(element),
      othernpc_images(*),
      othernpc_notes(*)
    `)
    .eq('name', npcName)
    .maybeSingle();

  if (error) {
    console.error('NPC 查詢失敗', error);
    return null;
  }

  return data || null;
}

async function fetchNpcSkills(othernpcId) {
  const { data: skills, error } = await window.client
    .from('othernpc_skills')
    .select('*')
    .eq('othernpc_id', othernpcId)
    .order('skill_slot', { ascending: true });

  if (error || !skills) {
    console.error('NPC 技能查詢失敗', error);
    return [];
  }

  const skillIds = skills
    .map(skill => skill.id)
    .filter(id => id !== null && id !== undefined);

  if (skillIds.length === 0) {
    return skills;
  }

  const [
    sharedLinksResult,
    npcLinksResult,
    debuffLinksResult,
    movementResult,
    triggerResult
  ] = await Promise.all([
    window.client
      .from('othernpc_skill_effect_links')
      .select('skill_id,effect_id')
      .in('skill_id', skillIds),

    window.client
      .from('othernpc_skill_npc_effect_links')
      .select('skill_id,npc_effect_id')
      .in('skill_id', skillIds),

    window.client
      .from('othernpc_skill_debuff_links')
      .select('skill_id,debuff_id,applied_to')
      .in('skill_id', skillIds),

    fetchNpcMovementRows(skills),

    fetchNpcTriggerRows(skills)
  ]);

  const sharedLinks = sharedLinksResult.data || [];
  const npcLinks = npcLinksResult.data || [];
  const debuffLinks = debuffLinksResult.data || [];
  const movementRows = movementResult || [];
  const triggerRows = triggerResult || [];

  const sharedEffectIds = [...new Set(sharedLinks.map(link => link.effect_id).filter(Boolean))];
  const npcEffectIds = [...new Set(npcLinks.map(link => link.npc_effect_id).filter(Boolean))];
  const debuffIds = [...new Set(debuffLinks.map(link => link.debuff_id).filter(Boolean))];

  const [
    sharedEffectsResult,
    npcEffectsResult,
    debuffsResult
  ] = await Promise.all([
    sharedEffectIds.length > 0
      ? window.client
          .from('skill_effects')
          .select('effect_id,effect_name,description')
          .in('effect_id', sharedEffectIds)
      : Promise.resolve({ data: [] }),

    npcEffectIds.length > 0
      ? window.client
          .from('npc_skill_effects')
          .select('effect_id,effect_name,description')
          .in('effect_id', npcEffectIds)
      : Promise.resolve({ data: [] }),

    debuffIds.length > 0
      ? window.client
          .from('skill_debuff')
          .select('debuff_id,debuff_name,description')
          .in('debuff_id', debuffIds)
      : Promise.resolve({ data: [] })
  ]);

  const sharedEffectMap = indexBy(sharedEffectsResult.data || [], 'effect_id');
  const npcEffectMap = indexBy(npcEffectsResult.data || [], 'effect_id');
  const debuffMap = indexBy(debuffsResult.data || [], 'debuff_id');
  const movementMap = indexBy(movementRows, 'move_id');
  const triggerMap = indexBy(triggerRows, 'othernpc_trigger_id');

  return skills.map(skill => {
    const skillSharedLinks = sharedLinks.filter(link => link.skill_id === skill.id);
    const skillNpcLinks = npcLinks.filter(link => link.skill_id === skill.id);
    const skillDebuffLinks = debuffLinks.filter(link => link.skill_id === skill.id);

    const sharedEffects = skillSharedLinks
      .map(link => sharedEffectMap.get(link.effect_id))
      .filter(Boolean);

    const npcEffects = skillNpcLinks
      .map(link => npcEffectMap.get(link.npc_effect_id))
      .filter(Boolean);

    const debuffs = skillDebuffLinks
      .map(link => {
        const debuff = debuffMap.get(link.debuff_id);

        if (!debuff) {
          return null;
        }

        return {
          applied_to: mapAppliedTo(link.applied_to),
          name: debuff.debuff_name,
          description: debuff.description || ''
        };
      })
      .filter(Boolean);

    const movement = skill.linked_movement_id
      ? movementMap.get(skill.linked_movement_id)
      : null;

    const trigger = skill.othernpc_trigger_id
      ? triggerMap.get(skill.othernpc_trigger_id)
      : null;

    return {
      ...skill,
      shared_effects: sharedEffects,
      npc_effects: npcEffects,
      debuffs,
      movement_effect_name: movement ? movement.move_name : '',
      movement_effect_description: movement ? movement.description : '',
      trigger_condition: trigger ? trigger.condition : '',
      trigger_code: trigger ? trigger.trigger_code : '',
      trigger_remarks: trigger ? trigger.remarks : ''
    };
  });
}

async function fetchNpcMovementRows(skills) {
  const movementIds = [...new Set(
    (skills || [])
      .map(skill => skill.linked_movement_id)
      .filter(Boolean)
  )];

  if (movementIds.length === 0) {
    return [];
  }

  const { data, error } = await window.client
    .from('movement_skills')
    .select('move_id,move_name,description')
    .in('move_id', movementIds);

  if (error) {
    console.error('NPC 移動技能查詢失敗', error);
    return [];
  }

  return data || [];
}

async function fetchNpcTriggerRows(skills) {
  const triggerIds = [...new Set(
    (skills || [])
      .map(skill => skill.othernpc_trigger_id)
      .filter(Boolean)
  )];

  if (triggerIds.length === 0) {
    return [];
  }

  const { data, error } = await window.client
    .from('othernpc_passive_trigger')
    .select('othernpc_trigger_id,condition,trigger_code,remarks')
    .in('othernpc_trigger_id', triggerIds);

  if (error) {
    console.error('NPC 被動觸發條件查詢失敗', error);
    return [];
  }

  return data || [];
}

function fillNpcImages(npc) {
  const images = Array.isArray(npc.othernpc_images) ? npc.othernpc_images : [];
  const frontImage = images.find(item => item.image_type === 'front');
  const backImage = images.find(item => item.image_type === 'back') || frontImage;

  setImageByDataKey('othernpc_images.front_url', frontImage ? frontImage.image_url : '');
  setImageByDataKey('othernpc_images.back_url', backImage ? backImage.image_url : '');
}

function fillNpcNotes(npc) {
  const notes = Array.isArray(npc.othernpc_notes) ? npc.othernpc_notes : [];

  const text = notes
    .slice()
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .map(note => note.is_public ? `# ${note.content}` : '# ???')
    .join('\n');

  setTextByDataKey('othernpc_notes.content', text);
}

function buildSkillDescription(skill) {
  if (!skill) {
    return '';
  }

  let text = skill.description || '';

  if (skill.is_passive && skill.trigger_condition) {
    text += `${text ? '\n\n' : ''}條件：${skill.trigger_condition}`;
  }

  return text;
}

function buildSkillEffectText(skill) {
  if (!skill) {
    return '';
  }

  const lines = [];

  if (Array.isArray(skill.npc_effects)) {
    skill.npc_effects.forEach(effect => {
      if (effect && effect.effect_name) {
        lines.push(`# ${effect.effect_name}`);
      }
    });
  }

  if (Array.isArray(skill.shared_effects)) {
    skill.shared_effects.forEach(effect => {
      if (effect && effect.effect_name) {
        lines.push(`# ${effect.effect_name}`);
      }
    });
  }

  if (skill.movement_effect_name) {
    lines.push(`# ${skill.movement_effect_name}`);
  }

  if (Array.isArray(skill.debuffs)) {
    skill.debuffs.forEach(debuff => {
      if (debuff && debuff.name) {
        lines.push(`# ${debuff.applied_to || ''}${debuff.name}`);
      }
    });
  }

  if (skill.need_cc !== null && skill.need_cc !== undefined && skill.need_cc !== '') {
    lines.push(`# 開啟技能CC：${skill.need_cc}`);
  }

  return lines.join('\n');
}

function fillNpcSkillSlot(slotNumber, skill) {
  const prefix = `othernpc_skills.${slotNumber}`;

  setTextByDataKey(`${prefix}.skill_name`, skill ? skill.skill_name || '' : '');
  setTextByDataKey(`${prefix}.cd`, skill ? (skill.is_passive ? 'X' : (skill.cd ?? '')) : '');
  setTextByDataKey(`${prefix}.max_targets`, skill ? mapNpcMaxTargets(skill) : '');
  setTextByDataKey(`${prefix}.range`, skill ? mapNpcSkillRange(skill) : '');
  setTextByDataKey(`${prefix}.description`, skill ? buildSkillDescription(skill) : '');
  setTextByDataKey(`${prefix}.effectsAndDebuffs`, skill ? buildSkillEffectText(skill) : '');
}

function fillNpcExtraSkills(skills) {
  const extraSkills = Array.isArray(skills) ? skills.slice(2) : [];

  document.querySelectorAll('[data-key="othernpc_skills.extra_skills"]').forEach(el => {
    if (extraSkills.length === 0) {
      el.style.display = 'none';
      el.onclick = null;
      return;
    }

    el.style.display = '';

    el.onclick = function () {
      const sections = extraSkills.map(skill => {
        const lines = [];

        lines.push(skill.skill_name || '未命名技能');

        if (skill.is_passive) {
          lines.push('CD：X');
        } else if (skill.cd !== null && skill.cd !== undefined && skill.cd !== '') {
          lines.push(`CD：${skill.cd}`);
        }

        const description = buildSkillDescription(skill);
        const effects = buildSkillEffectText(skill);

        if (description) {
          lines.push(description);
        }

        if (effects) {
          lines.push(effects);
        }

        return lines.join('\n');
      });

      showInfoModal('額外技能', sections.join('\n\n'));
    };
  });
}

function fillNpcCard(npc, skills) {
  document.body.classList.toggle('dark-bg', npc.alignment === 'black');

  setNpcBackground(npc.background_image_url || DEFAULT_NPC_BACKGROUND_URL);
  setNpcNameboxColor(npc.namebox_color || DEFAULT_NPC_NAMEBOX_COLOR);

  fillNpcImages(npc);

  setTextByDataKey('other_npcs.npc_category', npc.npc_category || '');
  setTextByDataKey('other_npcs.name', npc.name || '');
  setTextByDataKey('other_npcs.alignment', mapEnum(npc.alignment, ALIGNMENT_MAP));
  setTextByDataKey('other_npcs.race', npc.race || '');
  setTextByDataKey('other_npcs.age', npc.age || '');
  setTextByDataKey('other_npcs.gender', mapEnum(npc.gender, GENDER_MAP));
  setTextByDataKey('other_npcs.height', npc.height || '');
  setTextByDataKey('other_npcs.weight', npc.weight || '');
  setTextByDataKey('other_npcs.personality', npc.personality || '');
  setTextByDataKey('other_npcs.likes', npc.likes || '');
  setTextByDataKey('other_npcs.hate', npc.hate || '');
  setTextByDataKey('other_npcs.background', npc.background || '');
  setTextByDataKey('other_npcs.occupation_type', mapEnum(npc.occupation_type, OCCUPATION_MAP));
  setTextByDataKey('other_npcs.element', npc.element ? mapEnum(npc.element, ELEMENT_MAP) : '無');
  setTextByDataKey('element_weakness.element', npc.element_weakness && npc.element_weakness.element ? mapEnum(npc.element_weakness.element, ELEMENT_MAP) : '無');
  setTextByDataKey('other_npcs.preferred_role', mapEnum(npc.preferred_role, ROLE_MAP));
  setTextByDataKey('other_npcs.starting_position', npc.starting_position ? mapEnum(npc.starting_position, POSITION_MAP) : '無');

  document.querySelectorAll('.littlename-box').forEach(box => {
    const nickElement = box.querySelector('[data-key="other_npcs.nickname"]');

    if (npc.nickname && npc.nickname.trim()) {
      box.style.display = '';
      if (nickElement) {
        nickElement.textContent = npc.nickname;
      }
    } else {
      box.style.display = 'none';
      if (nickElement) {
        nickElement.textContent = '';
      }
    }
  });

  fillNpcNotes(npc);
  fillNpcSkillSlot(1, skills[0] || null);
  fillNpcSkillSlot(2, skills[1] || null);
  fillNpcExtraSkills(skills);

  if (typeof fitAll === 'function') {
    fitAll();
  }

  if (typeof checkLongTextByCharCount === 'function') {
    checkLongTextByCharCount(11);
  }

  setTimeout(() => {
    if (typeof fitAll === 'function') {
      fitAll();
    }

    if (typeof checkLongTextByCharCount === 'function') {
      checkLongTextByCharCount(11);
    }
  }, 80);
}

function setNameFontSize(selector, maxChars) {
  document.querySelectorAll(selector).forEach(box => {
    const nameDiv = box.querySelector('.name-box');
    if (!nameDiv) return;

    const fontSize = box.offsetHeight / maxChars * 0.98;
    nameDiv.style.fontSize = fontSize + 'px';
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

    if (h > 0 && h < minHeight) {
      minHeight = h;
    }
  });

  if (!Number.isFinite(minHeight)) {
    return;
  }

  const fontSize = minHeight * 0.62;

  infoBoxes.forEach(box => {
    box.style.fontSize = fontSize + 'px';
  });
}

function setFlipBtnFontSize() {
  document.querySelectorAll('.row-flip-btn').forEach(box => {
    const btn = box.querySelector('.flip-btn');
    if (!btn) return;

    const fontSize = Math.max(box.offsetHeight * 0.6);
    btn.style.fontSize = fontSize + 'px';
  });
}

function setStudentIdFontSize() {
  document.querySelectorAll('.student-id').forEach(box => {
    const fontSize = Math.max(box.offsetHeight * 0.7);
    box.style.fontSize = fontSize + 'px';
  });
}

function fitAll() {
  fitAllNameBoxes();
  setInfoBoxFontSize();
  setFlipBtnFontSize();
  setStudentIdFontSize();
}

function showInfoModal(title, content) {
  const modalTitle = document.getElementById('info-modal-title');
  const modalBody = document.getElementById('info-modal-body');
  const modal = document.getElementById('info-modal');

  if (!modalTitle || !modalBody || !modal) {
    return;
  }

  modalTitle.textContent = title || '內容';
  modalBody.textContent = content || '';
  modal.style.display = 'flex';
}

function checkLongTextByCharCount(maxCount = 11) {
  document.querySelectorAll('.info-box').forEach(box => {
    const value = box.querySelector('.info-value');
    const btn = box.querySelector('.show-more-btn');

    if (!value || !btn) return;

    if ((value.innerText || '').trim().length > maxCount) {
      btn.style.display = 'block';

      btn.onclick = function () {
        const title = this.dataset.title || box.querySelector('.info-label')?.innerText || '內容';
        showInfoModal(title, value.innerText || value.textContent || '');
      };
    } else {
      btn.style.display = 'none';
      btn.onclick = null;
    }
  });
}

function bindModalClose() {
  const modal = document.getElementById('info-modal');

  if (!modal) {
    return;
  }

  modal.addEventListener('click', function (e) {
    if (e.target === this) {
      e.stopPropagation();
      this.style.display = 'none';
    }
  });
}

function bindFlipEvents() {
  const flipCard = document.getElementById('flipCard');

  if (!flipCard) {
    return;
  }

  document.querySelectorAll('.flip-btn').forEach(btn => {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      flipCard.classList.toggle('flipped');
    });
  });

  document.addEventListener('click', function (e) {
    const modal = document.getElementById('info-modal');
    const isModalOpen = modal && getComputedStyle(modal).display !== 'none';

    if (isModalOpen) {
      return;
    }

    if (!e.target.closest('#flipCard')) {
      flipCard.classList.toggle('flipped');
    }
  });
}

  flipButtons.forEach(btn => {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      flipCard.classList.toggle('flipped');
    });
  });

  document.addEventListener('click', function (e) {
    const modal = document.getElementById('info-modal');
    const isModalOpen = modal && getComputedStyle(modal).display !== 'none';

    if (isModalOpen) {
      return;
    }

    if (!e.target.closest('#flipCard')) {
      flipCard.classList.toggle('flipped');
    }
  });
}

async function initNpcCardPage() {
  const npcName = getNpcParam();

  if (!npcName) {
    alert('找不到 NPC 名稱');
    return;
  }

  const npc = await fetchNpcData(npcName);

  if (!npc) {
    alert('找不到這個 NPC');
    return;
  }

  const skills = await fetchNpcSkills(npc.othernpc_id);

  fillNpcCard(npc, skills);
}

window.addEventListener('DOMContentLoaded', function () {
  bindModalClose();
  bindFlipEvents();
  fitAll();
  initNpcCardPage();
});

window.addEventListener('resize', function () {
  fitAll();
  checkLongTextByCharCount(11);
});

window.addEventListener('load', function () {
  fitAll();
  checkLongTextByCharCount(11);
});
