const $ = id => document.getElementById(id);

let allBatches = [];
let emailManuallyEdited = false;

function showCard(id) {
  ['loading-card', 'closed-card', 'form-card', 'success-card'].forEach(cardId => {
    $(cardId).hidden = cardId !== id;
  });
}

function showError(message) {
  const box = $('form-error');
  box.textContent = message;
  box.hidden = !message;
}

function updateBatchChoices() {
  const deptId = $('department-id').value;
  const year = Number($('year-of-study').value);
  const select = $('batch-id');
  const previous = select.value;

  const eligible = allBatches.filter(batch => {
    if (!batch.allowCrossDepartment && batch.departmentId && batch.departmentId !== deptId) {
      return false;
    }
    if (!batch.allowMultipleYears && Array.isArray(batch.allowedYears) && batch.allowedYears.length > 0) {
      if (!batch.allowedYears.includes(year)) return false;
    }
    return true;
  });

  select.replaceChildren();
  const noneOption = document.createElement('option');
  noneOption.value = '';
  noneOption.textContent = eligible.length ? 'No batch selected' : 'No matching batch available';
  select.appendChild(noneOption);

  for (const batch of eligible) {
    const option = document.createElement('option');
    option.value = batch.id;
    option.textContent = `${batch.name} (${batch.code})`;
    select.appendChild(option);
  }

  if (eligible.some(b => b.id === previous)) {
    select.value = previous;
  }
}

async function init() {
  try {
    const response = await fetch('/api/v1/auth/student-register/options', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok || !data.open) {
      showCard('closed-card');
      return;
    }

    const deptSelect = $('department-id');
    deptSelect.replaceChildren();
    for (const dept of data.departments || []) {
      const option = document.createElement('option');
      option.value = dept.id;
      option.textContent = `${dept.code} — ${dept.name}`;
      deptSelect.appendChild(option);
    }

    allBatches = data.batches || [];
    updateBatchChoices();
    showCard('form-card');
  } catch {
    showCard('closed-card');
  }
}

$('enrollment-id').addEventListener('input', event => {
  const value = event.target.value.toUpperCase().replace(/\s+/g, '');
  event.target.value = value;
  if (!emailManuallyEdited) {
    $('email-local').value = value.toLowerCase();
  }
});

$('email-local').addEventListener('input', event => {
  emailManuallyEdited = event.target.value.trim().length > 0;
});

$('department-id').addEventListener('change', updateBatchChoices);
$('year-of-study').addEventListener('change', updateBatchChoices);

$('register-form').addEventListener('submit', async event => {
  event.preventDefault();
  showError('');

  const fullName = $('full-name').value.trim();
  const enrollmentId = $('enrollment-id').value.trim().toUpperCase();
  const emailLocal = $('email-local').value.trim().split('@')[0];
  const email = emailLocal ? `${emailLocal.toLowerCase()}@kahedu.edu.in` : '';
  const departmentId = $('department-id').value;
  const yearOfStudy = Number($('year-of-study').value);
  const batchId = $('batch-id').value;

  if (!fullName || !enrollmentId || !emailLocal || !departmentId) {
    showError('Please fill in all required fields.');
    return;
  }

  const submitBtn = $('submit-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating Account...';

  try {
    const response = await fetch('/api/v1/auth/student-register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName,
        email,
        enrollmentId,
        departmentId,
        yearOfStudy,
        batchId: batchId || undefined
      })
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 403) {
        showCard('closed-card');
        return;
      }
      throw new Error(payload?.message || 'Registration could not be completed.');
    }

    $('done-name').textContent = payload.user.fullName;
    $('done-email').textContent = payload.user.email;
    $('done-password').textContent = payload.user.enrollmentId;
    showCard('success-card');
  } catch (err) {
    showError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create Student Account';
  }
});

init();
