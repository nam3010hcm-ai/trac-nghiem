/**
 * MODULE UNITS STATE & NORMALIZATION (js/units/units-state.js)
 * Quản lý state danh sách Units, normalize subject/module & upsert DB
 */

const db = () => window.supabaseClient;

export let unitsState = [];
export let editingUnitId = null;
export let currentDesignerSkill = 'listening';
export let _currentLfSubTab = 'past_verbs';

export function setEditingUnitId(id) {
  editingUnitId = id;
}

export function setCurrentDesignerSkill(skill) {
  currentDesignerSkill = skill;
}

export function setCurrentLfSubTab(subTab) {
  _currentLfSubTab = subTab;
}

export function setUnitsState(arr) {
  unitsState = arr;
}

export async function safeUpsertUnit(payload) {
  if (!db()) return { error: new Error('Supabase client chưa được khởi tạo') };

  // Payload chuẩn hóa cho bảng learning_units
  const learningUnitPayload = {
    id: payload.id,
    subject: payload.subject || '🇬🇧 Tiếng Anh',
    module: payload.module || 'English B1 - General & Academic Skills',
    title: payload.title || 'Unit không tên',
    topic: payload.topic || '',
    level: payload.level || 'A2 - B1',
    icon: payload.icon || '📖',
    description: payload.description || '',
    is_hidden: payload.is_hidden ?? payload.isHidden ?? false,
    listening: Array.isArray(payload.listening) ? payload.listening : [],
    reading: Array.isArray(payload.reading) ? payload.reading : [],
    speaking: Array.isArray(payload.speaking) ? payload.speaking : [],
    writing: Array.isArray(payload.writing) ? payload.writing : [],
    language_focus: payload.language_focus || payload.languageFocus || {},
    created_by: payload.created_by || '',
    created_at: payload.created_at || Date.now()
  };

  try {
    // 1. Thử upsert vào bảng learning_units trước
    const { data, error } = await db()
      .from('learning_units')
      .upsert([learningUnitPayload], { onConflict: 'id' })
      .select();

    if (!error) {
      return { data, error: null };
    }

    console.warn("Lưu learning_units gặp thông báo:", error.message || error);

    // 2. Nếu bảng learning_units chưa tồn tại (PGRST205 / 404), thử upsert vào bảng units (legacy fallback)
    const fallbackUnitsPayload = {
      id: payload.id,
      title: payload.title,
      topic: payload.topic,
      level: payload.level,
      icon: payload.icon,
      description: payload.description,
      is_hidden: payload.is_hidden ?? payload.isHidden ?? false,
      content: payload.content || JSON.stringify({
        subject: payload.subject,
        module: payload.module,
        listening: payload.listening,
        reading: payload.reading,
        speaking: payload.speaking,
        writing: payload.writing,
        languageFocus: payload.language_focus || payload.languageFocus
      }),
      subject: payload.subject,
      module: payload.module,
      updated_at: Date.now()
    };

    const resUnits = await db()
      .from('units')
      .upsert([fallbackUnitsPayload], { onConflict: 'id' })
      .select();

    if (!resUnits.error) {
      return resUnits;
    }

    // 3. Fallback tối thiểu cho units nếu thiếu cột subject/module
    const minimalUnitsPayload = {
      id: payload.id,
      title: payload.title,
      topic: payload.topic,
      level: payload.level,
      icon: payload.icon,
      description: payload.description,
      is_hidden: payload.is_hidden ?? payload.isHidden ?? false,
      content: fallbackUnitsPayload.content,
      updated_at: Date.now()
    };

    return await db().from('units').upsert([minimalUnitsPayload], { onConflict: 'id' }).select();
  } catch (err) {
    console.error("Lỗi khi lưu Unit lên Supabase:", err);
    return { error: err };
  }
}

export function normalizeSubjectName(sub) {
  if (!sub) return 'Tiếng Anh';
  const clean = String(sub).trim().replace(/^[\p{Emoji}\s]+/u, '').trim();
  if (!clean || clean.toLowerCase() === 'tiếng anh' || clean.toLowerCase() === 'english') {
    return 'Tiếng Anh';
  }
  return clean;
}

export function normalizeModuleName(mod) {
  if (!mod) return '';
  let clean = String(mod).trim();
  clean = clean.replace(/^[0-9]+[\.\:\-\s]+/, '');
  clean = clean.replace(/\s+/g, ' ');
  return clean.toLowerCase();
}

export function matchSubject(unitSub, targetSub) {
  if (!targetSub || targetSub === 'all') return true;
  const s1 = normalizeSubjectName(unitSub);
  const s2 = normalizeSubjectName(targetSub);
  return s1.toLowerCase() === s2.toLowerCase();
}

export function matchModule(unitMod, targetMod) {
  if (!targetMod || targetMod === 'all') return true;
  const m1 = normalizeModuleName(unitMod);
  const m2 = normalizeModuleName(targetMod);
  return m1 === m2 || m1.includes(m2) || m2.includes(m1);
}
