
const form = document.getElementById('pairForm');
const phoneInput = document.getElementById('phone');
const pairBtn = document.getElementById('pairBtn');
const result = document.getElementById('result');
const pairCode = document.getElementById('pairCode');
const copyBtn = document.getElementById('copyBtn');
const statusText = document.getElementById('status');

// Require the user to confirm ownership of the number.
const consent = document.createElement('label');
consent.style.cssText =
  'display:flex;align-items:flex-start;gap:9px;margin-top:16px;text-align:left;line-height:1.5;letter-spacing:0;font-size:12px;';

consent.innerHTML = `
  <input type="checkbox" id="numberConsent"
    style="width:17px;height:17px;min-width:17px;margin:0;">
  <span>I own this WhatsApp number and authorize linking my own device.</span>
`;

form.insertBefore(consent, pairBtn);

form.addEventListener('submit', async event => {
  event.preventDefault();

  const phone = phoneInput.value.replace(/\D/g, '');
  const confirmed = document.getElementById('numberConsent').checked;

  result.hidden = true;
  pairCode.textContent = '';

  if (phone.length < 10 || phone.length > 15) {
    statusText.textContent = 'Enter a valid phone number with country code.';
    return;
  }

  if (!confirmed) {
    statusText.textContent = 'Please confirm that this is your own number.';
    return;
  }

  pairBtn.disabled = true;
  pairBtn.textContent = 'PLEASE WAIT...';
  statusText.textContent = 'Requesting your pairing code...';

  try {
    const response = await fetch('/pair', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ phone })
    });

    const data = await response.json();

    if (!response.ok || !data.code) {
      throw new Error(data.error || 'Pairing request failed.');
    }

    pairCode.textContent = data.code;
    result.hidden = false;
    statusText.textContent =
      'Use this code only on your own WhatsApp device.';

  } catch (error) {
    statusText.textContent = error.message;
  } finally {
    pairBtn.disabled = false;
    pairBtn.textContent = 'GET PAIRING CODE';
  }
});

copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(pairCode.textContent);
    copyBtn.textContent = 'COPIED!';
    setTimeout(() => {
      copyBtn.textContent = 'COPY CODE';
    }, 2000);
  } catch {
    statusText.textContent = 'Please copy the code manually.';
  }
});
