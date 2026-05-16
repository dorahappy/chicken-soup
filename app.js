const STORAGE_KEY = "chifanle-state-v1";

const STATUS_FLOW = [
  { key: "new", label: "收到订单" },
  { key: "shopping", label: "采购食材" },
  { key: "cooking", label: "制作中" },
  { key: "done", label: "吃饭啦" },
];

const seedState = {
  dishes: [
    {
      id: "dish-tomato-beef",
      name: "番茄牛腩",
      ingredients: ["番茄", "牛腩", "土豆", "葱姜"],
      minutes: 45,
      difficulty: "中等",
    },
    {
      id: "dish-egg-rice",
      name: "鸡蛋炒饭",
      ingredients: ["米饭", "鸡蛋", "胡萝卜", "青豆"],
      minutes: 12,
      difficulty: "简单",
    },
    {
      id: "dish-spicy-fish",
      name: "水煮鱼片",
      ingredients: ["黑鱼片", "豆芽", "青菜", "花椒", "辣椒"],
      minutes: 35,
      difficulty: "困难",
    },
  ],
  orders: [],
};

let state = loadState();
let currentRole = "";
let selectedDishIds = new Set();

const els = {
  loginPanel: document.querySelector("#loginPanel"),
  chefWorkspace: document.querySelector("#chefWorkspace"),
  customerWorkspace: document.querySelector("#customerWorkspace"),
  currentRole: document.querySelector("#currentRole"),
  dishForm: document.querySelector("#dishForm"),
  orderForm: document.querySelector("#orderForm"),
  chefDishList: document.querySelector("#chefDishList"),
  customerDishList: document.querySelector("#customerDishList"),
  chefOrderList: document.querySelector("#chefOrderList"),
  customerOrderList: document.querySelector("#customerOrderList"),
  shoppingList: document.querySelector("#shoppingList"),
  selectedDishes: document.querySelector("#selectedDishes"),
  dishCount: document.querySelector("#dishCount"),
  orderCount: document.querySelector("#orderCount"),
  customerOrderCount: document.querySelector("#customerOrderCount"),
  toast: document.querySelector("#toast"),
};

document.querySelectorAll("[data-role]").forEach((button) => {
  button.addEventListener("click", () => setRole(button.dataset.role));
});

document.querySelectorAll("[data-action='logout']").forEach((button) => {
  button.addEventListener("click", () => setRole(""));
});

document.querySelector("#resetDemo").addEventListener("click", () => {
  state = structuredClone(seedState);
  selectedDishIds.clear();
  saveState();
  render();
  showToast("演示数据已重置");
});

els.dishForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const dish = {
    id: crypto.randomUUID(),
    name: String(form.get("name")).trim(),
    ingredients: splitIngredients(String(form.get("ingredients"))),
    minutes: Number(form.get("minutes")),
    difficulty: String(form.get("difficulty")),
  };

  if (!dish.name || dish.ingredients.length === 0 || !dish.minutes) {
    showToast("请补全菜品信息");
    return;
  }

  state.dishes.unshift(dish);
  event.currentTarget.reset();
  saveState();
  render();
  showToast(`已保存菜品：${dish.name}`);
});

els.orderForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (selectedDishIds.size === 0) {
    showToast("请至少选择一道菜");
    return;
  }

  const form = new FormData(event.currentTarget);
  const customer = String(form.get("customer")).trim();
  const note = String(form.get("note")).trim();

  if (!customer) {
    showToast("请填写你的称呼");
    return;
  }

  const order = {
    id: crypto.randomUUID(),
    customer,
    note,
    dishIds: Array.from(selectedDishIds),
    status: "new",
    createdAt: new Date().toISOString(),
  };

  state.orders.unshift(order);
  selectedDishIds.clear();
  event.currentTarget.reset();
  saveState();
  render();
  showToast("已通知厨师，厨房收到新订单");
});

function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return structuredClone(seedState);

  try {
    const parsed = JSON.parse(stored);
    return {
      dishes: Array.isArray(parsed.dishes) ? parsed.dishes : seedState.dishes,
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
    };
  } catch {
    return structuredClone(seedState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function setRole(role) {
  currentRole = role;
  selectedDishIds.clear();
  render();
}

function render() {
  els.loginPanel.classList.toggle("hidden", Boolean(currentRole));
  els.chefWorkspace.classList.toggle("hidden", currentRole !== "chef");
  els.customerWorkspace.classList.toggle("hidden", currentRole !== "customer");
  els.currentRole.textContent =
    currentRole === "chef" ? "厨师视角" : currentRole === "customer" ? "客户视角" : "请选择角色";

  renderChefDishes();
  renderCustomerDishes();
  renderOrders();
  renderShoppingList();
  renderSelectedDishes();
}

function renderChefDishes() {
  els.dishCount.textContent = `${state.dishes.length} 道菜`;
  els.chefDishList.innerHTML =
    state.dishes.map((dish) => dishCard(dish, { mode: "chef" })).join("") ||
    emptyState("还没有菜品，先录入一道拿手菜。");

  els.chefDishList.querySelectorAll("[data-delete-dish]").forEach((button) => {
    button.addEventListener("click", () => {
      const dishId = button.dataset.deleteDish;
      const isInActiveOrder = state.orders.some(
        (order) => order.status !== "done" && order.dishIds.includes(dishId),
      );
      if (isInActiveOrder) {
        showToast("该菜品仍在未完成订单中，暂不能删除");
        return;
      }
      state.dishes = state.dishes.filter((dish) => dish.id !== dishId);
      saveState();
      render();
      showToast("菜品已删除");
    });
  });
}

function renderCustomerDishes() {
  els.customerDishList.innerHTML =
    state.dishes.map((dish) => dishCard(dish, { mode: "customer" })).join("") ||
    emptyState("厨师还没有发布菜单。");

  els.customerDishList.querySelectorAll("[data-select-dish]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.selectDish;
      if (selectedDishIds.has(id)) {
        selectedDishIds.delete(id);
      } else {
        selectedDishIds.add(id);
      }
      renderCustomerDishes();
      renderSelectedDishes();
    });
  });
}

function renderOrders() {
  els.orderCount.textContent = `${state.orders.length} 单`;
  els.customerOrderCount.textContent = `${state.orders.length} 单`;

  els.chefOrderList.innerHTML =
    state.orders.map((order) => orderCard(order, { mode: "chef" })).join("") ||
    emptyState("暂无订单消息。");

  els.customerOrderList.innerHTML =
    state.orders.map((order) => orderCard(order, { mode: "customer" })).join("") ||
    emptyState("你还没有提交订单。");

  els.chefOrderList.querySelectorAll("[data-status]").forEach((button) => {
    button.addEventListener("click", () => {
      const order = state.orders.find((item) => item.id === button.dataset.orderId);
      if (!order) return;
      order.status = button.dataset.status;
      saveState();
      render();
      showToast(order.status === "done" ? "已通知客户：吃饭啦" : `订单已更新为：${statusLabel(order.status)}`);
    });
  });
}

function renderShoppingList() {
  const activeOrders = state.orders.filter((order) => order.status !== "done");
  const ingredientMap = new Map();

  activeOrders.forEach((order) => {
    order.dishIds
      .map(findDish)
      .filter(Boolean)
      .flatMap((dish) => dish.ingredients)
      .forEach((ingredient) => {
        ingredientMap.set(ingredient, (ingredientMap.get(ingredient) || 0) + 1);
      });
  });

  if (ingredientMap.size === 0) {
    els.shoppingList.innerHTML = emptyState("暂无需要采购的食材。");
    return;
  }

  els.shoppingList.innerHTML = Array.from(ingredientMap.entries())
    .map(
      ([ingredient, count]) => `
        <div class="shopping-item">
          <div class="item-head">
            <strong>${escapeHtml(ingredient)}</strong>
            <span class="tag warning">${count} 份</span>
          </div>
        </div>
      `,
    )
    .join("");
}

function renderSelectedDishes() {
  if (selectedDishIds.size === 0) {
    els.selectedDishes.textContent = "还未选择菜品";
    return;
  }

  els.selectedDishes.innerHTML = Array.from(selectedDishIds)
    .map(findDish)
    .filter(Boolean)
    .map((dish) => `<span class="tag">${escapeHtml(dish.name)}</span>`)
    .join(" ");
}

function dishCard(dish, options) {
  const selected = selectedDishIds.has(dish.id);
  const action =
    options.mode === "chef"
      ? `<button class="delete-button" data-delete-dish="${dish.id}" type="button">删除</button>`
      : `<button class="status-button ${selected ? "active" : ""}" data-select-dish="${dish.id}" type="button">${selected ? "已选择" : "选择"}</button>`;

  return `
    <article class="dish-item ${selected ? "selected" : ""}">
      <div class="item-head">
        <strong>${escapeHtml(dish.name)}</strong>
        ${action}
      </div>
      <div class="meta-row">
        <span class="tag">${dish.minutes} 分钟</span>
        <span class="tag warning">${escapeHtml(dish.difficulty)}</span>
      </div>
      <p class="muted">材料：${dish.ingredients.map(escapeHtml).join("、")}</p>
    </article>
  `;
}

function orderCard(order, options) {
  const dishes = order.dishIds.map(findDish).filter(Boolean);
  const totalMinutes = dishes.reduce((sum, dish) => sum + Number(dish.minutes || 0), 0);
  const statusIndex = STATUS_FLOW.findIndex((item) => item.key === order.status);
  const controls =
    options.mode === "chef"
      ? `<div class="inline-actions">
          ${STATUS_FLOW.map(
            (status) =>
              `<button class="status-button ${order.status === status.key ? "active" : ""}" data-order-id="${order.id}" data-status="${status.key}" type="button">${status.label}</button>`,
          ).join("")}
        </div>`
      : "";

  return `
    <article class="order-item">
      <div class="item-head">
        <strong>${escapeHtml(order.customer)} 的订单</strong>
        <span class="tag ${order.status === "done" ? "" : "warning"}">${statusLabel(order.status)}</span>
      </div>
      <div class="meta-row">
        <span class="tag">${dishes.length} 道菜</span>
        <span class="tag">预计 ${totalMinutes} 分钟</span>
        <span class="tag">${formatTime(order.createdAt)}</span>
      </div>
      <p class="muted">菜品：${dishes.map((dish) => escapeHtml(dish.name)).join("、") || "菜品已下架"}</p>
      ${order.note ? `<p class="muted">备注：${escapeHtml(order.note)}</p>` : ""}
      <div class="progress" aria-label="订单进度">
        ${STATUS_FLOW.map((_, index) => `<span class="${index <= statusIndex ? "done" : ""}"></span>`).join("")}
      </div>
      ${order.status === "done" && options.mode === "customer" ? `<p class="muted"><strong>吃饭啦！</strong> 厨师已经完成，请准备开饭。</p>` : ""}
      ${controls}
    </article>
  `;
}

function splitIngredients(value) {
  return value
    .split(/[,，、\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function findDish(id) {
  return state.dishes.find((dish) => dish.id === id);
}

function statusLabel(status) {
  return STATUS_FLOW.find((item) => item.key === status)?.label || "未知状态";
}

function formatTime(value) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function emptyState(message) {
  return `<div class="empty">${escapeHtml(message)}</div>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.remove("hidden");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    els.toast.classList.add("hidden");
  }, 2400);
}

render();
