/**
 * MODULE UNITS LIST & FILTERING (js/units/units-list.js)
 * Tải danh sách bài học Unit từ Supabase, lọc theo Subject/Module và hiển thị dạng thẻ
 */
import { esc, isRootUser, state, logTeacherActivity } from '../common.js';
import { SAMPLE_LEARN_UNITS } from '../learn-data.js';
import { unitsState, setUnitsState, normalizeSubjectName, normalizeModuleName, matchSubject, matchModule } from './units-state.js';

const db = () => window.supabaseClient;

export async function loadUnits() {
  try {
    const { data: units, error } = await db()
      .from('units')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;

    if (units && units.length > 0) {
      setUnitsState(units.map(u => {
        let contentObj = {};
        try {
          contentObj = typeof u.content === 'string' ? JSON.parse(u.content) : (u.content || {});
        } catch (e) {
          contentObj = {};
        }
        return {
          id: u.id,
          subject: u.subject || contentObj.subject || '🇬🇧 Tiếng Anh',
          module: u.module || contentObj.module || 'English B1 - General & Academic Skills',
          title: u.title || 'Unit không tên',
          topic: u.topic || '',
          level: u.level || 'A2',
          icon: u.icon || '📖',
          description: u.description || '',
          isHidden: u.is_hidden || false,
          created_by: u.created_by || '',
          listening: contentObj.listening || [],
          reading: contentObj.reading || [],
          speaking: contentObj.speaking || [],
          writing: contentObj.writing || [],
          languageFocus: contentObj.languageFocus || {}
        };
      }));
    } else {
      setUnitsState(JSON.parse(JSON.stringify(SAMPLE_LEARN_UNITS || [])));
    }
  } catch (e) {
    console.warn("Không tải được danh sách Units từ Supabase, sử dụng dữ liệu mẫu:", e);
    setUnitsState(JSON.parse(JSON.stringify(SAMPLE_LEARN_UNITS || [])));
  }

  populateUnitFilters();
  updateDatalists();
  renderUnitsList();
}

export function populateUnitFilters() {
  const subFilter = document.getElementById('flt-unit-subject');
  if (!subFilter) return;

  const subjects = new Set();
  unitsState.forEach(u => {
    if (u.subject) subjects.add(u.subject);
  });

  const curVal = subFilter.value;
  subFilter.innerHTML = '<option value="all">Tất cả môn học</option>';
  Array.from(subjects).sort().forEach(sub => {
    const opt = document.createElement('option');
    opt.value = sub;
    opt.textContent = sub;
    subFilter.appendChild(opt);
  });

  if (curVal && Array.from(subjects).includes(curVal)) {
    subFilter.value = curVal;
  }
  updateModuleFilterOptions();
}

export function updateModuleFilterOptions() {
  const subFilter = document.getElementById('flt-unit-subject');
  const modFilter = document.getElementById('flt-unit-module');
  if (!subFilter || !modFilter) return;

  const selSub = subFilter.value;
  const modules = new Set();

  unitsState.forEach(u => {
    if (selSub === 'all' || matchSubject(u.subject, selSub)) {
      if (u.module) modules.add(u.module);
    }
  });

  const curVal = modFilter.value;
  modFilter.innerHTML = '<option value="all">Tất cả Module / Học phần</option>';
  Array.from(modules).sort().forEach(mod => {
    const opt = document.createElement('option');
    opt.value = mod;
    opt.textContent = mod;
    modFilter.appendChild(opt);
  });

  if (curVal && Array.from(modules).includes(curVal)) {
    modFilter.value = curVal;
  }
}

export function updateDatalists() {
  const dlSubject = document.getElementById('dl-subjects');
  const dlModule = document.getElementById('dl-modules');

  if (dlSubject) {
    const subjects = new Set();
    unitsState.forEach(u => { if (u.subject) subjects.add(u.subject); });
    dlSubject.innerHTML = Array.from(subjects).map(s => `<option value="${esc(s)}">`).join('');
  }

  if (dlModule) {
    const modules = new Set();
    unitsState.forEach(u => { if (u.module) modules.add(u.module); });
    dlModule.innerHTML = Array.from(modules).map(m => `<option value="${esc(m)}">`).join('');
  }
}

export function renderUnitsList() {
  const container = document.getElementById('unit-list-container');
  if (!container) return;

  const subFilter = document.getElementById('flt-unit-subject')?.value || 'all';
  const modFilter = document.getElementById('flt-unit-module')?.value || 'all';
  const searchFilter = (document.getElementById('flt-unit-search')?.value || '').toLowerCase().trim();

  const filtered = unitsState.filter(u => {
    if (subFilter !== 'all' && !matchSubject(u.subject, subFilter)) return false;
    if (modFilter !== 'all' && !matchModule(u.module, modFilter)) return false;
    if (searchFilter) {
      const matchText = `${u.title} ${u.topic} ${u.description || ''} ${u.subject || ''} ${u.module || ''}`.toLowerCase();
      if (!matchText.includes(searchFilter)) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; background: #ffffff; border-radius: 12px; border: 1.5px dashed #cbd5e1;">
        <div style="font-size: 36px; margin-bottom: 8px;">📭</div>
        <div style="font-size: 15px; font-weight: 700; color: #334155;">Chưa có Unit nào phù hợp với bộ lọc</div>
        <div style="font-size: 13px; color: #64748b; margin-top: 4px;">Hãy thử đổi tiêu chí tìm kiếm hoặc bấm nút "Tạo Unit Mới" để bắt đầu thiết kế.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(u => {
    const lisCount = (u.listening || []).length;
    const readCount = (u.reading || []).length;
    const spkCount = (u.speaking || []).length;
    const wrtCount = (u.writing || []).length;
    const lfFlashcards = (u.languageFocus?.flashcards || []).length;
    const lfGrammar = (u.languageFocus?.grammarChallenge || []).length;

    const userEmail = state.currentUserEmail || '';
    const isRoot = isRootUser(userEmail);
    const isOwner = !u.created_by || u.created_by === userEmail;
    const canEdit = isRoot || isOwner;

    return `
      <div class="card" style="background:#ffffff; border-radius:14px; border:1.5px solid ${u.isHidden ? '#fecaca' : '#e2e8f0'}; padding:18px; box-shadow:0 2px 8px rgba(0,0,0,0.04); display:flex; flex-direction:column; justify-content:space-between; position:relative; overflow:hidden;">
        ${u.isHidden ? `<div style="position:absolute; top:12px; right:12px; background:#fee2e2; color:#dc2626; font-size:11px; font-weight:800; padding:2px 8px; border-radius:4px; border:1px solid #fca5a5;">🔒 Đang ẩn</div>` : ''}
        <div>
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
            <span style="font-size:28px; background:#f1f5f9; width:48px; height:48px; display:inline-flex; align-items:center; justify-content:center; border-radius:10px;">${esc(u.icon || '📖')}</span>
            <div style="flex:1; min-width:0;">
              <span style="font-size:11px; font-weight:700; color:#6366f1; background:#e0e7ff; padding:2px 8px; border-radius:4px; display:inline-block; margin-bottom:2px;">${esc(u.level || 'A2')}</span>
              <h4 style="font-size:15px; font-weight:800; color:#0f172a; margin:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${esc(u.title)}">${esc(u.title)}</h4>
            </div>
          </div>
          
          <div style="font-size:12.5px; color:#475569; font-weight:600; margin-bottom:6px;">Chủ đề: <span style="color:#0284c7;">${esc(u.topic || 'General')}</span></div>
          <div style="font-size:11.5px; color:#64748b; margin-bottom:12px; line-height:1.4;">${esc(u.description || 'Chưa có mô tả chi tiết.')}</div>
          
          <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:16px;">
            <span class="skill-tag" style="background:#eff6ff; color:#1d4ed8; font-size:11px; padding:3px 8px; border-radius:6px; font-weight:700;">🎧 Lis: ${lisCount}</span>
            <span class="skill-tag" style="background:#f0fdf4; color:#15803d; font-size:11px; padding:3px 8px; border-radius:6px; font-weight:700;">📖 Read: ${readCount}</span>
            <span class="skill-tag" style="background:#fefce8; color:#a16207; font-size:11px; padding:3px 8px; border-radius:6px; font-weight:700;">🗣️ Spk: ${spkCount}</span>
            <span class="skill-tag" style="background:#fdf2f8; color:#be185d; font-size:11px; padding:3px 8px; border-radius:6px; font-weight:700;">✍️ Wrt: ${wrtCount}</span>
            <span class="skill-tag" style="background:#f5f3ff; color:#6d28d9; font-size:11px; padding:3px 8px; border-radius:6px; font-weight:700;">🔍 LF: ${lfFlashcards + lfGrammar}</span>
          </div>
        </div>

        <div style="display:flex; gap:6px; border-top:1px solid #f1f5f9; padding-top:12px; justify-content:flex-end;">
          <a href="learn.html" target="_blank" class="btn btn-sm" style="background:#f8fafc; border:1px solid #cbd5e1; color:#334155; text-decoration:none; font-weight:700;" title="Mở phòng học thử nghiệm">👁️ Học thử</a>
          ${canEdit ? `
            <button class="btn btn-sm btn-p" onclick="window.openUnitEditor('${esc(u.id)}')" style="font-weight:700;">✏️ Sửa</button>
            <button class="btn btn-sm" onclick="window.toggleUnitVisibility('${esc(u.id)}')" style="background:#f1f5f9; color:#475569;" title="${u.isHidden ? 'Mở hiển thị' : 'Ẩn unit này'}">${u.isHidden ? '👁️ Hiện' : '🔒 Ẩn'}</button>
            <button class="btn btn-sm btn-danger" onclick="window.deleteUnit('${esc(u.id)}')" title="Xóa Unit này">🗑️</button>
          ` : `
            <span style="font-size:11.5px; color:#94a3b8; padding:4px 8px; background:#f8fafc; border-radius:6px; border:1px solid #e2e8f0;">🔒 Chỉ xem</span>
          `}
        </div>
      </div>
    `;
  }).join('');
}

export async function toggleUnitVisibility(unitId) {
  const unit = unitsState.find(u => u.id === unitId);
  if (!unit) return;

  const newStatus = !unit.isHidden;
  unit.isHidden = newStatus;

  try {
    const { error } = await db()
      .from('units')
      .update({ is_hidden: newStatus, updated_at: Date.now() })
      .eq('id', unitId);

    if (error) throw error;
    renderUnitsList();
  } catch (e) {
    console.error("Lỗi cập nhật trạng thái Unit:", e);
    alert("Không thể cập nhật trạng thái hiển thị của Unit!");
  }
}

export async function deleteUnit(unitId) {
  if (!confirm("Bạn có chắc chắn muốn xóa Unit này không? Hành động này sẽ không thể khôi phục!")) {
    return;
  }

  const u = unitsState.find(x => x.id === unitId);
  const uTitle = u ? u.title : unitId;

  try {
    const { error } = await db()
      .from('units')
      .delete()
      .eq('id', unitId);

    if (error) throw error;

    setUnitsState(unitsState.filter(unit => unit.id !== unitId));
    populateUnitFilters();
    updateDatalists();
    renderUnitsList();

    await logTeacherActivity('Xóa Unit', 'Bài học & Khung chương trình', `Unit: ${uTitle}`, `ID: ${unitId}`);
    alert("✅ Đã xóa Unit thành công!");
  } catch (e) {
    console.error("Lỗi xóa Unit:", e);
    alert("❌ Lỗi xóa Unit: " + (e.message || ''));
  }
}

if (typeof window !== 'undefined') {
  window.onUnitFilterChange = function() {
    updateModuleFilterOptions();
    renderUnitsList();
  };
  window.onUnitSearchInput = function() {
    renderUnitsList();
  };
}
