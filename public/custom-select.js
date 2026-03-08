(() => {
  if (window.BambiCustomSelect) return;

  const instances = new WeakMap();
  let activeInstance = null;
  let seed = 0;

  const nativeValueDescriptor = Object.getOwnPropertyDescriptor(
    HTMLSelectElement.prototype,
    "value"
  );
  const nativeSelectedIndexDescriptor = Object.getOwnPropertyDescriptor(
    HTMLSelectElement.prototype,
    "selectedIndex"
  );

  const nextId = (prefix) => `${prefix}-${Date.now()}-${seed++}`;

  const ensureId = (element, prefix) => {
    if (!element.id) {
      element.id = nextId(prefix);
    }
    return element.id;
  };

  const getOptionLabel = (option) => option?.textContent?.trim() || option?.value || "Chon";

  const getSelectedOption = (select) => {
    const options = Array.from(select.options);
    return options.find((option) => option.selected) || options[select.selectedIndex] || options[0] || null;
  };

  const closeInstance = (instance) => {
    if (!instance) return;
    instance.root.classList.remove("is-open");
    instance.trigger.setAttribute("aria-expanded", "false");
    instance.panel.hidden = true;
    if (activeInstance === instance) {
      activeInstance = null;
    }
  };

  const focusSelectedOption = (instance) => {
    const selected = Array.from(instance.optionsRoot.querySelectorAll(".custom-select-option")).find(
      (button) => button.getAttribute("aria-selected") === "true"
    );
    (selected || instance.optionsRoot.querySelector(".custom-select-option"))?.focus();
  };

  const openInstance = (instance) => {
    if (!instance || instance.trigger.disabled) return;
    if (activeInstance && activeInstance !== instance) {
      closeInstance(activeInstance);
    }

    instance.root.classList.add("is-open");
    instance.trigger.setAttribute("aria-expanded", "true");
    instance.panel.hidden = false;
    activeInstance = instance;
    window.requestAnimationFrame(() => focusSelectedOption(instance));
  };

  const syncInstance = (instance) => {
    if (!instance) return;

    const { select, trigger, label, optionsRoot } = instance;
    const options = Array.from(select.options);
    const selectedOption = getSelectedOption(select);
    const isDisabled = select.disabled || options.length === 0;

    label.textContent = selectedOption ? getOptionLabel(selectedOption) : "Khong co lua chon";
    trigger.disabled = isDisabled;

    optionsRoot.innerHTML = options
      .map((option, index) => {
        const selected = selectedOption?.value === option.value;
        return `
          <button
            class="custom-select-option${selected ? " is-selected" : ""}"
            id="${instance.optionsId}-${index}"
            type="button"
            role="option"
            data-value="${String(option.value)
              .replaceAll("&", "&amp;")
              .replaceAll('"', "&quot;")
              .replaceAll("<", "&lt;")
              .replaceAll(">", "&gt;")}"
            aria-selected="${selected ? "true" : "false"}"
            ${option.disabled ? "disabled" : ""}
          >
            <span class="custom-select-option-label">${String(getOptionLabel(option))
              .replaceAll("&", "&amp;")
              .replaceAll("<", "&lt;")
              .replaceAll(">", "&gt;")}</span>
          </button>
        `;
      })
      .join("");

    if (!options.length) {
      optionsRoot.innerHTML =
        '<div class="custom-select-empty">Khong co lua chon.</div>';
    }
  };

  const chooseValue = (instance, value, emitEvents = true) => {
    if (!instance) return;

    const nextValue = value ?? "";
    if (instance.select.value !== nextValue) {
      nativeValueDescriptor?.set?.call(instance.select, nextValue);
    }

    syncInstance(instance);

    if (emitEvents) {
      instance.select.dispatchEvent(new Event("input", { bubbles: true }));
      instance.select.dispatchEvent(new Event("change", { bubbles: true }));
    }
  };

  const bindLabel = (instance) => {
    const selectId = ensureId(instance.select, "bambi-select");
    document.querySelectorAll(`label[for="${selectId}"]`).forEach((labelEl) => {
      labelEl.addEventListener("click", (event) => {
        event.preventDefault();
        if (instance.trigger.disabled) return;
        openInstance(instance);
      });
    });
  };

  const enhanceSelect = (select) => {
    if (!select || instances.has(select) || select.multiple) return instances.get(select);

    const wrapper = document.createElement("div");
    wrapper.className = "custom-select";

    select.parentNode.insertBefore(wrapper, select);
    wrapper.appendChild(select);
    select.classList.add("custom-select-native");
    select.dataset.customSelectEnhanced = "true";

    const trigger = document.createElement("button");
    trigger.className = "custom-select-trigger";
    trigger.type = "button";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");

    const label = document.createElement("span");
    label.className = "custom-select-current";
    trigger.appendChild(label);

    const arrow = document.createElement("span");
    arrow.className = "custom-select-arrow";
    arrow.setAttribute("aria-hidden", "true");
    trigger.appendChild(arrow);

    const panel = document.createElement("div");
    panel.className = "custom-select-panel";
    panel.hidden = true;

    const optionsId = nextId("bambi-select-options");
    const optionsRoot = document.createElement("div");
    optionsRoot.className = "custom-select-options";
    optionsRoot.id = optionsId;
    optionsRoot.setAttribute("role", "listbox");
    panel.appendChild(optionsRoot);

    trigger.setAttribute("aria-controls", optionsId);

    wrapper.appendChild(trigger);
    wrapper.appendChild(panel);

    const instance = {
      select,
      root: wrapper,
      trigger,
      label,
      panel,
      optionsRoot,
      optionsId,
    };

    instances.set(select, instance);

    trigger.addEventListener("click", () => {
      if (wrapper.classList.contains("is-open")) {
        closeInstance(instance);
        return;
      }
      openInstance(instance);
    });

    trigger.addEventListener("keydown", (event) => {
      if (!["Enter", " ", "ArrowDown", "ArrowUp"].includes(event.key)) return;
      event.preventDefault();
      openInstance(instance);
    });

    optionsRoot.addEventListener("click", (event) => {
      const button = event.target.closest(".custom-select-option");
      if (!button || button.disabled) return;
      chooseValue(instance, button.dataset.value || "");
      closeInstance(instance);
      trigger.focus();
    });

    optionsRoot.addEventListener("keydown", (event) => {
      const buttons = Array.from(optionsRoot.querySelectorAll(".custom-select-option:not([disabled])"));
      const currentIndex = buttons.indexOf(document.activeElement);

      if (event.key === "Escape") {
        event.preventDefault();
        closeInstance(instance);
        trigger.focus();
        return;
      }

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        if (!buttons.length) return;
        const offset = event.key === "ArrowDown" ? 1 : -1;
        const nextIndex =
          currentIndex === -1 ? 0 : (currentIndex + offset + buttons.length) % buttons.length;
        buttons[nextIndex].focus();
        return;
      }

      if (event.key === "Home" || event.key === "End") {
        event.preventDefault();
        if (!buttons.length) return;
        buttons[event.key === "Home" ? 0 : buttons.length - 1].focus();
        return;
      }

      if (event.key === "Enter" || event.key === " ") {
        const button = document.activeElement.closest(".custom-select-option");
        if (!button || button.disabled) return;
        event.preventDefault();
        chooseValue(instance, button.dataset.value || "");
        closeInstance(instance);
        trigger.focus();
      }
    });

    select.addEventListener("change", () => syncInstance(instance));
    select.addEventListener("bambi:custom-select-sync", () => syncInstance(instance));

    const observer = new MutationObserver(() => syncInstance(instance));
    observer.observe(select, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["disabled"],
    });

    bindLabel(instance);
    syncInstance(instance);
    return instance;
  };

  const refresh = (root = document) => {
    root.querySelectorAll("select.select").forEach((select) => {
      const instance = enhanceSelect(select);
      syncInstance(instance);
    });
  };

  const refreshSelect = (target) => {
    const select =
      typeof target === "string" ? document.querySelector(target) : target;
    if (!select) return;
    const instance = enhanceSelect(select);
    syncInstance(instance);
  };

  if (nativeValueDescriptor?.configurable) {
    Object.defineProperty(HTMLSelectElement.prototype, "value", {
      configurable: true,
      enumerable: nativeValueDescriptor.enumerable,
      get() {
        return nativeValueDescriptor.get.call(this);
      },
      set(value) {
        nativeValueDescriptor.set.call(this, value);
        if (instances.has(this)) {
          this.dispatchEvent(new Event("bambi:custom-select-sync"));
        }
      },
    });
  }

  if (nativeSelectedIndexDescriptor?.configurable) {
    Object.defineProperty(HTMLSelectElement.prototype, "selectedIndex", {
      configurable: true,
      enumerable: nativeSelectedIndexDescriptor.enumerable,
      get() {
        return nativeSelectedIndexDescriptor.get.call(this);
      },
      set(value) {
        nativeSelectedIndexDescriptor.set.call(this, value);
        if (instances.has(this)) {
          this.dispatchEvent(new Event("bambi:custom-select-sync"));
        }
      },
    });
  }

  document.addEventListener("click", (event) => {
    if (!activeInstance) return;
    if (activeInstance.root.contains(event.target)) return;
    closeInstance(activeInstance);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !activeInstance) return;
    const current = activeInstance;
    closeInstance(current);
    current.trigger.focus();
  });

  document.addEventListener(
    "reset",
    (event) => {
      window.setTimeout(() => refresh(event.target), 0);
    },
    true
  );

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => refresh());
  } else {
    refresh();
  }

  window.BambiCustomSelect = {
    refresh,
    refreshSelect,
  };
})();
