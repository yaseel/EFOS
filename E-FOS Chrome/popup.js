document.addEventListener("DOMContentLoaded", () => {
  console.log("[Popup] popup.js loaded");

  // --- Helper functions for settings view and gear image ---
  function isSettingsVisible() {
    const settingsView = document.getElementById("settingsView");
    return settingsView && settingsView.classList.contains("visible");
  }

  function updateGearImage(isSettings) {
    const settingsButton = document.getElementById("settingsButton");
    if (settingsButton) {
      const gearImg = settingsButton.querySelector("img");
      const isDark = document.body.classList.contains("dark-mode");
      gearImg.src = isSettings
        ? (isDark ? "images/back_dark.png" : "images/back_light.png")
        : (isDark ? "images/gear_dark.png" : "images/gear_light.png");
    }
  }

  // --- Dark Mode Detection ---
  const darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const isDark = darkModeQuery.matches;
  console.log("[Popup] Dark mode (on load):", isDark);
  if (isDark) {
    document.body.classList.add("dark-mode");
  } else {
    document.body.classList.remove("dark-mode");
  }
  updateGearImage(isSettingsVisible());

  // --- Main Button URLs ---
  const urls = {
    neptun: "https://neptun.elte.hu",
    canvas: "https://canvas.elte.hu",
    tms: "https://tms.inf.elte.hu"
  };

  // --- Open New Tab (Chrome only) ---
  function openNewTab(url) {
    chrome.tabs.create({ url: url });
  }

  // --- Neptun Button Listener ---
  document.getElementById("neptunButton").addEventListener("click", () => {
    console.log("[Popup] Neptun button clicked.");
    const settingsStr = localStorage.getItem("neptunAutoLoginSettings");
    console.log("[Popup] Retrieved settings from storage:", settingsStr);

    if (settingsStr) {
      const settings = JSON.parse(settingsStr);
      console.log("[Popup] Parsed settings:", settings);
      if (settings.enabled) {
        console.log("[Popup] Auto-login is enabled. Opening direct login page...");
        chrome.tabs.create({ url: "https://neptun.elte.hu/Account/Login" }, (tab) => {
          console.log("[Popup] New tab created. Tab ID:", tab.id);
          // Listen for the tab finishing loading.
          chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo, updatedTab) {
            if (tabId === tab.id && changeInfo.status === "complete") {
              console.log("[Popup] New tab finished loading. URL:", updatedTab.url);
              chrome.tabs.onUpdated.removeListener(listener);
              // Send the message with error checking.
              chrome.tabs.sendMessage(tab.id, {
                action: "fillCredentials",
                code: settings.code,
                password: settings.password
              }, (response) => {
                if (chrome.runtime.lastError) {
                  console.error("[Popup] sendMessage error:", chrome.runtime.lastError.message);
                } else {
                  console.log("[Popup] Response from content script:", response);
                }
              });
            }
          });
        });
        return;
      } else {
        console.log("[Popup] Auto-login not enabled in settings.");
      }
    } else {
      console.log("[Popup] No auto-login settings found.");
    }

    console.log("[Popup] Opening default Neptun homepage.");
    openNewTab(urls.neptun);
  });

  // --- Other Button Listeners ---
  document.getElementById("canvasButton").addEventListener("click", () => {
    openNewTab(urls.canvas);
  });
  document.getElementById("tmsButton").addEventListener("click", () => {
    openNewTab(urls.tms);
  });

  // --- Focus Mode Injection ---
  document.getElementById("activateFocusButton").addEventListener("click", () => {
    function activateFocusMode() {
      document.documentElement.style.width = "100vw";
      document.documentElement.style.overflowX = "hidden";
      document.body.style.width = "100vw";
      document.body.style.overflowX = "hidden";
      document.querySelectorAll(".row").forEach(el => el.style.display = "inline");
      document.querySelectorAll(
        ".col-md-3, .col-md-4, .navbar, .content-title, .d-flex.justify-content-between.flex-wrap.flex-md-nowrap.align-items-center.pb-2.mb-2.border-bottom"
      ).forEach(el => el.remove());
      document.querySelectorAll(".col-xl-10, .col-md-9").forEach(el => el.style.maxWidth = "97%");
    }
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: activateFocusMode
        }, () => {
          alert("Focus Mode Activated");
        });
      }
    });
  });

  // --- Info Focus Button Listener (open modal) ---
  document.getElementById("infoFocusButton").addEventListener("click", () => {
    openModal();
  });

  // --- Modal Functionality (Info Modal) ---
  const modalEl = document.getElementById("infoModal");
  const closeModalBtn = document.getElementById("closeModal");

  function openModal() {
    modalEl.style.display = "block";
    setTimeout(() => {
      modalEl.classList.add("show");
    }, 10);
  }

  function closeModal() {
    modalEl.classList.remove("show");
    modalEl.classList.add("closing");
    setTimeout(() => {
      modalEl.style.display = "none";
      modalEl.classList.remove("closing");
    }, 300);
  }

  closeModalBtn.addEventListener("click", closeModal);
  window.addEventListener("click", (event) => {
    if (event.target === modalEl) {
      closeModal();
    }
  });

  // --- Saved Modal Functionality ---
  function closeSavedModal() {
    const savedModal = document.getElementById("savedModal");
    savedModal.classList.remove("show");
    savedModal.classList.add("closing");
    setTimeout(() => {
      savedModal.style.display = "none";
      savedModal.classList.remove("closing");
    }, 300);
  }

  function openSavedModal() {
    const savedModal = document.getElementById("savedModal");
    savedModal.style.display = "block";
    setTimeout(() => {
      savedModal.classList.add("show");
    }, 10);
    const autoCloseTimer = setTimeout(() => {
      closeSavedModal();
    }, 1500);
    savedModal.onclick = () => {
      clearTimeout(autoCloseTimer);
      closeSavedModal();
    };
  }

  // --- Settings View Toggle (Fade Transition) ---
  document.getElementById("settingsButton").addEventListener("click", () => {
    const mainView = document.getElementById("mainView");
    const settingsView = document.getElementById("settingsView");

    if (isSettingsVisible()) {
      settingsView.classList.remove("visible");
      settingsView.classList.add("hidden");
      mainView.classList.remove("hidden");
      mainView.classList.add("visible");
      updateGearImage(false);
    } else {
      mainView.classList.remove("visible");
      mainView.classList.add("hidden");
      settingsView.classList.remove("hidden");
      settingsView.classList.add("visible");
      loadNeptunSettings();
      updateGearImage(true);
    }
  });

  // --- Neptun Auto-Login Settings ---
  document.getElementById("neptunAutoLoginCheckbox").addEventListener("change", function () {
    const enabled = this.checked;
    document.getElementById("neptunCode").disabled = !enabled;
    document.getElementById("neptunPassword").disabled = !enabled;
  });

  document.getElementById("saveNeptunSettings").addEventListener("click", () => {
    const enabled = document.getElementById("neptunAutoLoginCheckbox").checked;
    const code = document.getElementById("neptunCode").value;
    const password = document.getElementById("neptunPassword").value;
    const settings = { enabled, code, password };
    localStorage.setItem("neptunAutoLoginSettings", JSON.stringify(settings));
    openSavedModal();
  });

  function loadNeptunSettings() {
    const settingsStr = localStorage.getItem("neptunAutoLoginSettings");
    if (settingsStr) {
      const settings = JSON.parse(settingsStr);
      document.getElementById("neptunAutoLoginCheckbox").checked = settings.enabled;
      document.getElementById("neptunCode").value = settings.code;
      document.getElementById("neptunPassword").value = settings.password;
      document.getElementById("neptunCode").disabled = !settings.enabled;
      document.getElementById("neptunPassword").disabled = !settings.enabled;
    }
  }
});