# Plan: Wire Machine Models to Repair Staff Dashboard

This plan covers the implementation of what is described in section 8 of DataTrackingSummary.md. It is here for reference, and has been implemented.
---

## Context
The `Machine`, `RepairRecord`, `MachinePart`, `MachineNote`, and `MachinePhoto` models have been defined in `models.py` and seeded in `populate_db.py`, but have no API surface. The Repair Staff Dashboard at `dashboards_frontend/src/pages/repair-staff/` is fully UI-complete using mock data. This plan wires real backend endpoints to the existing frontend UI.

---

## Critical Pre-Work (Do First)

### 1. Fix `related_name` conflict in `models.py`
`Machine` has a `TextField` named `notes`. `MachineNote` also uses `related_name='notes'`, which creates a Django ORM clash. Change it to `'machine_notes'`:
- **File:** `codepop_backend/backend/models.py`
- Change `related_name='notes'` → `related_name='machine_notes'` on `MachineNote.machine`

### 2. Add Pillow to `requirements.txt`
`MachinePhoto` uses `ImageField`, which requires Pillow. It is currently missing.
- **File:** `codepop_backend/requirements.txt`
- Add: `Pillow>=10.0.0`

### 3. Run migrations
```bash
python manage.py makemigrations backend
python manage.py migrate
```

---

## Step 1 — Backend: `settings.py`
**File:** `codepop_backend/codepop_backend/settings.py`

Add below existing static files config:
```python
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'
```

---

## Step 2 — Backend: Project `urls.py`
**File:** `codepop_backend/codepop_backend/urls.py`

Add media serving for development (append after `urlpatterns`):
```python
from django.conf import settings
from django.conf.urls.static import static

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

---

## Step 3 — Backend: `serializers.py`
**File:** `codepop_backend/backend/serializers.py`

Add a new section at the bottom. Import the new models:
```python
from .models import Machine, RepairRecord, MachinePart, MachineNote, MachinePhoto
```

Add six new serializers:

| Serializer | Purpose | Key Computed Fields |
|---|---|---|
| `MachineNoteSerializer` | Note list/create | `author` → full name |
| `MachinePhotoSerializer` | Photo list/upload | `url` via `request.build_absolute_uri`, `uploaded_by` → full name |
| `MachinePartSerializer` | Parts tab | `stock_status` derived from `stock_qty`+`eta_days`; `qty_available` alias; `eta` as ISO date |
| `RepairRecordSerializer` | History tab | `date` from `started_at`, `technician` → full name, `duration` computed from `started_at`/`completed_at`, `outcome` from status |
| `MachineListSerializer` | Machines table | `store_name` via `StoreRegistry` lookup, `downtime_duration` from `last_status_change`, `priority_score` heuristic, `warranty_status`, `repair_state` label mapping, `assigned_tech` from latest open `RepairRecord` |
| `MachineDetailSerializer` | Drawer details tab | Extends `MachineListSerializer` + `last_note` from `MachineNote` query, `last_update_time` human-readable delta |

**Note:** `MachineDetailSerializer.get_last_note` must query `MachineNote.objects.filter(machine=obj)` directly (not `obj.machine_notes`) because the TextField `obj.notes` and the FK reverse accessor share a name until the related_name fix propagates.

---

## Step 4 — Backend: `views.py`
**File:** `codepop_backend/backend/views.py`

Add at the bottom of the file. All views use `permission_classes = [IsAuthenticated]` and `APIView` pattern (consistent with existing non-CRUD custom views):

| View class | Method | URL |
|---|---|---|
| `MachineListView` | GET | `/api/repair/machines/` |
| `MachineDetailView` | GET | `/api/repair/machines/<id>/` |
| `MachineStatusUpdateView` | PATCH | `/api/repair/machines/<id>/status/` |
| `MachineHistoryView` | GET | `/api/repair/machines/<id>/history/` (last 10 by `-started_at`) |
| `MachinePartsView` | GET | `/api/repair/machines/<id>/parts/` |
| `MachineNotesView` | GET + POST | `/api/repair/machines/<id>/notes/` |
| `MachinePhotosView` | POST | `/api/repair/machines/<id>/photos/` |
| `MachinePhotoDeleteView` | DELETE | `/api/repair/machines/<id>/photos/<photo_id>/` |

**Scoping:** `MachineListView` filters by `request.user.repair_profile.assigned_store_id` when the user has a `RepairStaffProfile`; otherwise returns all machines.

**Photo delete:** Only the `uploaded_by` user or a superuser can delete. Delete the physical file with `photo.photo.delete(save=False)` before deleting the DB record.

**Status update:** Validate new status against `Machine.STATUS_CHOICES` before saving. Use `save(update_fields=['status', 'last_status_change'])`.

---

## Step 5 — Backend: `urls.py`
**File:** `codepop_backend/backend/urls.py`

Import and register all 8 new views. Add URL patterns under a `# ── Repair Staff Machine Endpoints ──` comment. All use `<str:machine_id>` (not `<int:>` because `Machine.machine_id` is a CharField like `"1"` or `"M-01"`):

```python
path('api/repair/machines/', MachineListView.as_view()),
path('api/repair/machines/<str:machine_id>/', MachineDetailView.as_view()),
path('api/repair/machines/<str:machine_id>/status/', MachineStatusUpdateView.as_view()),
path('api/repair/machines/<str:machine_id>/history/', MachineHistoryView.as_view()),
path('api/repair/machines/<str:machine_id>/parts/', MachinePartsView.as_view()),
path('api/repair/machines/<str:machine_id>/notes/', MachineNotesView.as_view()),
path('api/repair/machines/<str:machine_id>/photos/', MachinePhotosView.as_view()),
path('api/repair/machines/<str:machine_id>/photos/<int:photo_id>/', MachinePhotoDeleteView.as_view()),
```

---

## Step 6 — Frontend: `api/machines.js`
**File:** `dashboards_frontend/src/api/machines.js`

Replace all three stubs with fully implemented functions using `apiFetch` from `./client.js`:
- `getMachines()` — GET list
- `getMachineDetail(machineId)` — GET detail
- `updateMachineStatus(machineId, status)` — PATCH status
- `getMachineHistory(machineId)` — GET history
- `getMachineParts(machineId)` — GET parts
- `getMachineNotes(machineId)` — GET notes
- `createMachineNote(machineId, content)` — POST note
- `uploadMachinePhoto(machineId, file)` — **do NOT use `apiFetch`** (it forces `Content-Type: application/json` which breaks multipart). Use raw `fetch` with only `Authorization: Token <key>` header; let browser set multipart boundary.
- `deleteMachinePhoto(machineId, photoId)` — DELETE

---

## Step 7 — Frontend: `Machines.jsx`
**File:** `dashboards_frontend/src/pages/repair-staff/pages/Machines.jsx`

### 7.1 Replace mock imports
Remove: `import { MACHINES, MACHINE_HISTORY, MACHINE_PARTS } from '../mockData'`

Add API function imports from `../../../api/machines`.

### 7.2 Add state
```js
const [machines, setMachines] = useState([]);
const [machinesLoading, setMachinesLoading] = useState(true);
const [machinesError, setMachinesError] = useState(null);
const [drawerHistory, setDrawerHistory] = useState([]);
const [drawerParts, setDrawerParts] = useState([]);
const [drawerNotes, setDrawerNotes] = useState([]);
const [drawerPhotos, setDrawerPhotos] = useState([]);  // NEW
const [drawerLoading, setDrawerLoading] = useState(false);
```

### 7.3 Add `useEffect` hooks
- On mount: call `getMachines()` → `setMachines`
- On `drawerMachine` change: call `Promise.all([getMachineHistory, getMachineParts, getMachineNotes])` → set drawer state

### 7.4 Field name mapping
API returns snake_case; existing JSX uses camelCase mock fields. Apply a camelCase transform in `getMachines()` result handling OR update JSX references. Key mappings:
`store_name`, `downtime_duration`, `last_service`, `priority_score`, `revenue_impact`, `install_date`, `warranty_status`, `repair_state`, `estimated_completion`, `assigned_tech`

### 7.5 Replace mock data references in JSX
- `MACHINES` → `machines`
- `MACHINE_HISTORY[drawerMachine.id]` → `drawerHistory`
- `MACHINE_PARTS[drawerMachine.model]` → `drawerParts`
- Notes: render `drawerNotes` array instead of single `drawerMachine.lastNote` string

### 7.6 Wire note save button
Replace placeholder with `createMachineNote(drawerMachine.id, noteText)` call → prepend result to `drawerNotes`.

### 7.7 Add Photos tab
Add `'photos'` to the drawer tabs array. Add a tab pane that: renders `drawerPhotos` list with `<img>` + delete button; has a file `<input>` that calls `uploadMachinePhoto` and prepends the result.

### 7.8 Add loading/error guards
Wrap `DataTable` in `machinesLoading` / `machinesError` conditional render.

---

## Order of Operations

1. Fix `related_name='machine_notes'` in `models.py`
2. Add `Pillow>=10.0.0` to `requirements.txt` + install
3. Run `makemigrations` + `migrate`
4. Add `MEDIA_URL`/`MEDIA_ROOT` to `settings.py`
5. Add `static()` media serving to project-level `urls.py`
6. Add serializers to `serializers.py`
7. Add views to `views.py`
8. Add URLs to `backend/urls.py`
9. Restart Django dev server
10. Implement `api/machines.js`
11. Update `Machines.jsx`

---

## Verification

**Backend:**
1. `GET /backend/api/repair/machines/` — returns JSON array with all computed fields
2. `GET /backend/api/repair/machines/1/` — returns single machine detail
3. `PATCH /backend/api/repair/machines/1/status/` body `{"status":"REPAIR_START"}` — updates and returns machine
4. `GET /backend/api/repair/machines/1/history/` — returns up to 10 repair records with computed `duration`/`outcome`
5. `GET /backend/api/repair/machines/1/parts/` — returns parts with computed `stock_status` and ISO `eta`
6. `POST /backend/api/repair/machines/1/notes/` body `{"content":"test"}` — returns 201 with `author` populated
7. `POST /backend/api/repair/machines/1/photos/` with `multipart/form-data` photo — returns 201 with working `/media/` URL
8. `DELETE /backend/api/repair/machines/1/photos/<id>/` — returns 204; file deleted from disk
9. Unauthenticated request to any endpoint — returns 401

**Frontend (browser):**
1. Login as repair staff user → Machines page loads data from API (verify in Network tab — no mock fallback)
2. Click a machine row → drawer opens with Details tab showing real data
3. History tab → `/history/` fires, repair records render
4. Parts tab → `/parts/` fires, stock status badges correct
5. Notes tab → add note → 201 in Network, note appears at top of list
6. Photos tab → upload image → photo appears; delete → removed from list
7. Logout and re-access → redirected to `/login`
