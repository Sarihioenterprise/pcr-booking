(function () {
  "use strict";

  var scriptTag = document.currentScript;
  var operatorId = scriptTag && scriptTag.getAttribute("data-operator");
  var apiOrigin = scriptTag ? scriptTag.src.replace(/\/widget\.js.*$/, "") : "";

  if (!operatorId) {
    console.error("PCR Booking Widget: missing data-operator attribute");
    return;
  }

  // Create container
  var container = document.createElement("div");
  container.id = "pcr-booking-widget";
  scriptTag.parentNode.insertBefore(container, scriptTag.nextSibling);

  // Use shadow DOM for style isolation
  var shadow = container.attachShadow({ mode: "open" });

  var styles = `
    :host {
      display: block;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    .pcr-widget {
      max-width: 480px;
      margin: 0 auto;
      padding: 24px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }
    .pcr-widget h2 {
      margin: 0 0 4px;
      font-size: 20px;
      font-weight: 700;
      color: #1a202c;
    }
    .pcr-widget p.subtitle {
      margin: 0 0 20px;
      font-size: 14px;
      color: #718096;
    }
    .pcr-field {
      margin-bottom: 14px;
    }
    .pcr-field label {
      display: block;
      margin-bottom: 4px;
      font-size: 13px;
      font-weight: 600;
      color: #4a5568;
    }
    .pcr-field input,
    .pcr-field select {
      width: 100%;
      padding: 10px 12px;
      font-size: 14px;
      border: 1px solid #cbd5e0;
      border-radius: 8px;
      background: #f7fafc;
      color: #1a202c;
      box-sizing: border-box;
      outline: none;
      transition: border-color 0.15s;
    }
    .pcr-field input:focus,
    .pcr-field select:focus {
      border-color: #2EBD6B;
      box-shadow: 0 0 0 3px rgba(46, 189, 107, 0.15);
    }
    .pcr-row {
      display: flex;
      gap: 12px;
    }
    .pcr-row .pcr-field {
      flex: 1;
    }
    .pcr-submit {
      width: 100%;
      padding: 12px;
      margin-top: 6px;
      font-size: 15px;
      font-weight: 600;
      color: #ffffff;
      background: #2EBD6B;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.15s;
    }
    .pcr-submit:hover {
      background: #26a35d;
    }
    .pcr-submit:disabled {
      background: #a0d8b8;
      cursor: not-allowed;
    }
    .pcr-error {
      margin-top: 10px;
      padding: 10px;
      font-size: 13px;
      color: #c53030;
      background: #fff5f5;
      border-radius: 6px;
    }
    .pcr-success {
      text-align: center;
      padding: 32px 16px;
    }
    .pcr-success .checkmark {
      display: inline-block;
      width: 48px;
      height: 48px;
      line-height: 48px;
      font-size: 24px;
      background: #2EBD6B;
      color: #fff;
      border-radius: 50%;
      margin-bottom: 12px;
    }
    .pcr-success h3 {
      margin: 0 0 6px;
      font-size: 18px;
      font-weight: 700;
      color: #1a202c;
    }
    .pcr-success p {
      margin: 0;
      font-size: 14px;
      color: #718096;
    }
  `;

  var styleEl = document.createElement("style");
  styleEl.textContent = styles;
  shadow.appendChild(styleEl);

  var wrapper = document.createElement("div");
  wrapper.className = "pcr-widget";
  shadow.appendChild(wrapper);

  function renderForm() {
    wrapper.innerHTML = `
      <h2>Book a Rental Car</h2>
      <p class="subtitle">Fill out the form and we'll get back to you shortly.</p>
      <form id="pcr-form">
        <div class="pcr-field">
          <label for="pcr-name">Full Name</label>
          <input type="text" id="pcr-name" name="name" required placeholder="John Doe" />
        </div>
        <div class="pcr-field">
          <label for="pcr-phone">Phone Number</label>
          <input type="tel" id="pcr-phone" name="phone" required placeholder="(555) 123-4567" />
        </div>
        <div class="pcr-field">
          <label for="pcr-email">Email Address</label>
          <input type="email" id="pcr-email" name="email" required placeholder="john@example.com" />
        </div>
        <div class="pcr-row">
          <div class="pcr-field">
            <label for="pcr-dates">Desired Start Date</label>
            <input type="date" id="pcr-dates" name="dates_requested" required />
          </div>
          <div class="pcr-field">
            <label for="pcr-duration">Duration (days)</label>
            <input type="number" id="pcr-duration" name="duration_days" min="1" max="365" required placeholder="7" />
          </div>
        </div>
        <button type="submit" class="pcr-submit">Submit Booking Request</button>
        <div id="pcr-error" class="pcr-error" style="display:none;"></div>
      </form>
    `;

    var form = shadow.getElementById("pcr-form");
    form.addEventListener("submit", handleSubmit);
  }

  function renderSuccess() {
    wrapper.innerHTML = `
      <div class="pcr-success">
        <div class="checkmark">&#10003;</div>
        <h3>Request Submitted!</h3>
        <p>We've received your booking request and will be in touch soon.</p>
      </div>
    `;
  }

  function handleSubmit(e) {
    e.preventDefault();
    var form = shadow.getElementById("pcr-form");
    var btn = shadow.querySelector(".pcr-submit");
    var errorEl = shadow.getElementById("pcr-error");

    btn.disabled = true;
    btn.textContent = "Submitting...";
    errorEl.style.display = "none";

    var payload = {
      operator_id: operatorId,
      name: shadow.getElementById("pcr-name").value.trim(),
      phone: shadow.getElementById("pcr-phone").value.trim(),
      email: shadow.getElementById("pcr-email").value.trim(),
      dates_requested: shadow.getElementById("pcr-dates").value,
      duration_days: parseInt(shadow.getElementById("pcr-duration").value, 10),
    };

    fetch(apiOrigin + "/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) throw new Error(data.error || "Submission failed");
          return data;
        });
      })
      .then(function () {
        renderSuccess();
      })
      .catch(function (err) {
        errorEl.textContent = err.message || "Something went wrong. Please try again.";
        errorEl.style.display = "block";
        btn.disabled = false;
        btn.textContent = "Submit Booking Request";
      });
  }

  renderForm();
})();
