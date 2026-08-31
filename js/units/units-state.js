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

  const { data, error } = await db()
    .from('units')
    .upsert([payload], { onConflict: 'id' })
    .select();

  if (error) {
    const isSubjectColMissing = error.message?.includes('subject') || error.code === 'PGRST204';
    if (isSubjectColMissing) {
      console.warn("Cột 'subject' hoặc 'module' chưa có trong Schema DB, tự động fallback:", error.message);
      const fallbackPayload = {
        id: payload.id,
        title: payload.title,
        topic: payload.topic,
        level: payload.level,
        icon: payload.icon,
        description: payload.description,
        is_hidden: payload.is_hidden,
        content: payload.content,
        updated_at: payload.updated_at
      };
      return await db().from('units').upsert([fallbackPayload], { onConflict: 'id' }).select();
    }
  }

  return { data, error };
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
