const STORAGE_KEY = "chifanle-state-v2";
const LEGACY_STORAGE_KEY = "chifanle-state-v1";

const STATUS_FLOW = [
  { key: "pending", label: "已接单", chefLabel: "新订单" },
  { key: "shopping", label: "采购确认", chefLabel: "待采购" },
  { key: "preparing", label: "备菜中", chefLabel: "备菜中" },
  { key: "cooking", label: "烹饪中", chefLabel: "烹饪中" },
  { key: "done", label: "吃饭啦", chefLabel: "已完成" },
];

const seedState = {
  dishes: [
    {
      id: "dish-tomato-beef",
      name: "番茄牛腩",
      category: "家常菜",
      description: "酸甜浓郁，适合 2-3 人共享。需要确认家里是否有土豆。",
      ingredients: [
        { name: "番茄", amount: "2 个", staple: false },
        { name: "牛腩", amount: "500 g", staple: false },
        { name: "土豆", amount: "1 个", staple: false },
        { name: "葱姜", amount: "适量", staple: true },
      ],
      minutes: 45,
      difficulty: "中等",
      availableToday: true,
    },
    {
      id: "dish-shrimp-egg",
      name: "虾仁滑蛋",
      category: "快手菜",
      description: "快手下饭，少油也好吃。适合临时加菜。",
      ingredients: [
        { name: "虾仁", amount: "200 g", staple: false },
        { name: "鸡蛋", amount: "3 个", staple: false },
        { name: "小葱", amount: "适量", staple: true },
      ],
      minutes: 18,
      difficulty: "简单",
      availableToday: true,
    },
    {
      id: "dish-corn-ribs",
      name: "玉米排骨汤",
      category: "汤",
      description: "适合提前炖煮，完成后自动通知开饭。",
      ingredients: [
        { name: "排骨", amount: "500 g", staple: false },
        { name: "玉米", amount: "1 根", staple: false },
        { name: "胡萝卜", amount: "1 根", staple: false },
      ],
      minutes: 60,
      difficulty: "中等",
      availableToday: true,
    },
    {
      id: "dish-egg-rice",
      name: "鸡蛋炒饭",
      category: "主食",
      description: "冰箱常备食材就能完成，适合加班后的快手主食。",
      ingredients: [
        { name: "米饭", amount: "2 碗", staple: true },
        { name: "鸡蛋", amount: "2 个", staple: false },
        { name: "胡萝卜", amount: "半根", staple: false },
        { name: "青豆", amount: "1 把", staple: false },
      ],
      minutes: 12,
      difficulty: "简单",
      availableToday: true,
    },
  ],
  orders: [
    {
      id: "order-demo-103",
      customer: "小张",
      people: 3,
      note: "少辣，米饭多一点，牛腩炖软一些",
      dishIds: ["dish-tomato-beef", "dish-shrimp-egg"],
      status: "preparing",
      createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
      updatedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    },
  ],
};

let state = loadState();
let currentRole = "";
let activeCategory = "全部";
let selectedDishIds = new Set();

const els = {
  loginPanel: document.querySelector("#loginPanel"),
  chefWorkspace: document.querySelector("#chefWorkspace"),
  customerWorkspace: document.querySelector("#customerWorkspace"),
  currentRole: document.querySelector("#currentRole"),
  categoryTabs: document.querySelector("#categoryTabs"),
  dishForm: document.querySelector("#dishForm"),
  dishFormTitle: document.querySelector("#dishFormTitle"),
  cancelEditDish: document.querySelector("#cancelEditDish"),
  orderForm: document.querySelector("#orderForm"),
  chefDishList: document.querySelector("#chefDishList"),
  customerDishList: document.querySelector("#customerDishList"),
  chefOrderLanes: document.querySelector("#chefOrderLanes"),
  customerOrderList: document.querySelector("#customerOrderList"),
  shoppingList: document.querySelector("#shoppingList"),
  selectedDishes: document.querySelector("#selectedDishes"),
  dishCount: document.querySelector("#dishCount"),
  orderCount: document.querySelector("#orderCount"),
  customerOrderCount: document.querySelector("#customerOrderCount"),
  customerSubtitle: document.querySelector("#customerSubtitle"),
  customerEta: document.querySelector("#customerEta"),
  chefActiveCount: document.querySelector("#chefActiveCount"),
  newOrderMetric: document.querySelector("#newOrderMetric"),
  shoppingMetric: document.querySelector("#shoppingMetric"),
  availableDishMetric: document.querySelector("#availableDishMetric"),
  toast: document.querySelector("#toast"),
};

document.querySelectorAll("[data-role]").forEach((button) => {
  button.addEventListener("click", () => setRole(button.dataset.role));
});

document.querySelectorAll("[data-action='logout']").forEach((button) => {
  button.addEventListener("click", () => setRole(""));
});

document.querySelector("[data-scroll-orders]").addEventListener("click", () => {
  document.querySelector("#customerOrders").scrollIntoView({ behavior: "smooth", block: "start" });
});

document.querySelector("#resetDemo").addEventListener("click", () => {
  state = structuredClone(seedState);
  selectedDishIds.clear();
  activeCategory = "全部";
  saveState();
  render();
  showToast("演示数据已重置");
});

els.cancelEditDish.addEventListener("click", resetDishForm);

els.dishForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const id = String(form.get("id")).trim();
  const dish = {
    id: id || crypto.randomUUID(),
    name: String(form.get("name")).trim(),
    category: String(form.get("category")).trim(),
    description: String(form.get("description")).trim(),
    ingredients: parseIngredients(String(form.get("ingredients"))),
    minutes: Number(form.get("minutes")),
    difficulty: String(form.get("difficulty")),
    availableToday: form.get("availableToday") === "on",
  };

  if (!dish.name || !dish.description || dish.ingredients.length === 0 || !dish.minutes) {
    showToast("请补全菜品信息");
    return;
  }

  const existingIndex = state.dishes.findIndex((item) => item.id === id);
  if (existingIndex >= 0) {
    state.dishes[existingIndex] = dish;
    showToast(`已更新菜品：${dish.name}`);
  } else {
    state.dishes.unshift(dish);
    showToast(`已保存菜品：${dish.name}`);
  }

  resetDishForm();
  saveState();
  render();
});

els.orderForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (selectedDishIds.size === 0) {
    showToast("请至少选择一道菜");
    return;
  }

  const form = new FormData(event.currentTarget);
  const customer = String(form.get("customer")).trim();
  const people = Number(form.get("people"));
  const note = String(form.get("note")).trim();

  if (!customer || !people) {
    showToast("请填写称呼和用餐人数");
    return;
  }

  const now = new Date().toISOString();
  const order = {
    id: crypto.randomUUID(),
    customer,
    people,
    note,
    dishIds: Array.from(selectedDishIds),
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };

  state.orders.unshift(order);
  selectedDishIds.clear();
  event.currentTarget.reset();
  els.orderForm.elements.people.value = 2;
  saveState();
  render();
  showToast("已通知厨师，厨房收到新订单");
});

function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!stored) return structuredClone(seedState);

  try {
    const parsed = JSON.parse(stored);
    return normalizeState(parsed);
  } catch {
    return structuredClone(seedState);
  }
}

function normalizeState(value) {
  const fallback = structuredClone(seedState);
  const dishes = Array.isArray(value.dishes) ? value.dishes : fallback.dishes;
  const orders = Array.isArray(value.orders) ? value.orders : [];

  return {
    dishes: dishes.map((dish, index) => ({
      id: dish.id || crypto.randomUUID(),
      name: dish.name || `菜品 ${index + 1}`,
      category: dish.category || "推荐",
      description: dish.description || `${dish.name || "这道菜"}，适合今日点单。`,
      ingredients: normalizeIngredients(dish.ingredients),
      minutes: Number(dish.minutes || dish.durationMinutes || 30),
      difficulty: dish.difficulty === "困难" ? "复杂" : dish.difficulty || "中等",
      availableToday: dish.availableToday !== false,
    })),
    orders: orders.map((order) => ({
      id: order.id || crypto.randomUUID(),
      customer: order.customer || order.customerName || "客户",
      people: Number(order.people || order.peopleCount || 2),
      note: order.note || "",
      dishIds: Array.isArray(order.dishIds) ? order.dishIds : [],
      status: normalizeStatus(order.status),
      createdAt: order.createdAt || new Date().toISOString(),
      updatedAt: order.updatedAt || order.createdAt || new Date().toISOString(),
    })),
  };
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

  renderCategoryTabs();
  renderCustomerDishes();
  renderSelectedDishes();
  renderChefDishes();
  renderOrders();
  renderShoppingList();
  renderMetrics();
}

function renderCategoryTabs() {
  const categories = ["全部", ...new Set(todayDishes().map((dish) => dish.category))];
  if (!categories.includes(activeCategory)) activeCategory = "全部";

  els.categoryTabs.innerHTML = categories
    .map(
      (category) =>
        `<button class="tab ${category === activeCategory ? "active" : ""}" data-category="${escapeHtml(category)}" type="button">${escapeHtml(category)}</button>`,
    )
    .join("");

  els.categoryTabs.querySelectorAll("[data-category]").forEach((button) => {
    button.addEventListener("click", () => {
      activeCategory = button.dataset.category;
      renderCategoryTabs();
      renderCustomerDishes();
    });
  });
}

function renderCustomerDishes() {
  const dishes = todayDishes().filter((dish) => activeCategory === "全部" || dish.category === activeCategory);
  els.customerSubtitle.textContent = `今晚 ${todayDishes().length} 道菜可点`;
  els.customerEta.textContent = estimateSelectedMinutes()
    ? `已选菜品预计 ${estimateSelectedMinutes()} 分钟`
    : "厨师会同步采购和制作进度";

  els.customerDishList.innerHTML =
    dishes.map((dish) => customerDishCard(dish)).join("") || emptyState("厨师还没有发布今日菜单。");

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

function renderSelectedDishes() {
  if (selectedDishIds.size === 0) {
    els.selectedDishes.textContent = "还未选择菜品";
    return;
  }

  els.selectedDishes.innerHTML = Array.from(selectedDishIds)
    .map(findDish)
    .filter(Boolean)
    .map(
      (dish) => `
        <div class="selected-item">
          <span>${escapeHtml(dish.name)}</span>
          <span>${dish.minutes} 分钟</span>
        </div>
      `,
    )
    .join("");
}

function renderChefDishes() {
  els.dishCount.textContent = `${state.dishes.length} 道菜`;
  els.chefDishList.innerHTML =
    state.dishes.map((dish) => chefDishRow(dish)).join("") || emptyState("还没有菜品，先录入一道拿手菜。");

  els.chefDishList.querySelectorAll("[data-toggle-dish]").forEach((button) => {
    button.addEventListener("click", () => {
      const dish = findDish(button.dataset.toggleDish);
      if (!dish) return;
      dish.availableToday = !dish.availableToday;
      saveState();
      render();
      showToast(dish.availableToday ? "已设为今日可点" : "已下架今日菜单");
    });
  });

  els.chefDishList.querySelectorAll("[data-edit-dish]").forEach((button) => {
    button.addEventListener("click", () => fillDishForm(button.dataset.editDish));
  });

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
      selectedDishIds.delete(dishId);
      saveState();
      render();
      showToast("菜品已删除");
    });
  });
}

function renderOrders() {
  els.orderCount.textContent = `${state.orders.length} 单`;
  els.customerOrderCount.textContent = `${state.orders.length} 单`;

  const laneKeys = ["pending", "shopping", "preparing", "cooking", "done"];
  els.chefOrderLanes.innerHTML = laneKeys
    .map((status) => {
      const orders = state.orders.filter((order) => order.status === status);
      return `
        <div class="lane">
          <div class="lane-title">
            <span>${escapeHtml(statusChefLabel(status))}</span>
            <span>${orders.length}</span>
          </div>
          ${orders.map((order) => chefOrderCard(order)).join("") || emptyState("暂无订单")}
        </div>
      `;
    })
    .join("");

  els.customerOrderList.innerHTML =
    state.orders.map((order) => customerOrderCard(order)).join("") || emptyState("你还没有提交订单。");

  els.chefOrderLanes.querySelectorAll("[data-next-status]").forEach((button) => {
    button.addEventListener("click", () => {
      const order = state.orders.find((item) => item.id === button.dataset.orderId);
      if (!order) return;
      order.status = button.dataset.nextStatus;
      order.updatedAt = new Date().toISOString();
      saveState();
      render();
      showToast(order.status === "done" ? "已通知客户：吃饭啦" : `订单已更新为：${statusChefLabel(order.status)}`);
    });
  });
}

function renderShoppingList() {
  const ingredients = collectShoppingItems();

  if (ingredients.length === 0) {
    els.shoppingList.innerHTML = emptyState("暂无需要采购的食材。");
    return;
  }

  els.shoppingList.innerHTML = ingredients
    .map(
      (item) => `
        <div class="ingredient-row">
          <div>
            <strong>${escapeHtml(item.name)}</strong>
            <p>${escapeHtml(item.orders.join("、"))}</p>
          </div>
          <span class="amount">${escapeHtml(item.amounts.join(" + "))}</span>
        </div>
      `,
    )
    .join("");
}

function renderMetrics() {
  const activeOrders = state.orders.filter((order) => order.status !== "done");
  els.chefActiveCount.textContent = `${activeOrders.length} 个订单进行中`;
  els.newOrderMetric.textContent = state.orders.filter((order) => order.status === "pending").length;
  els.shoppingMetric.textContent = collectShoppingItems().length;
  els.availableDishMetric.textContent = todayDishes().length;
}

function customerDishCard(dish) {
  const selected = selectedDishIds.has(dish.id);
  const ingredientSummary = dish.ingredients
    .slice(0, 2)
    .map((item) => item.name)
    .join(" / ");

  return `
    <article class="dish-card ${selected ? "selected" : ""}">
      <button class="dish-select-hit" data-select-dish="${dish.id}" type="button" aria-label="${selected ? "取消选择" : "选择"}${escapeHtml(dish.name)}"></button>
      <div class="dish-art" aria-hidden="true">${escapeHtml(dish.name.slice(0, 1))}</div>
      <div>
        <div class="item-head">
          <h3>${escapeHtml(dish.name)}</h3>
          <span class="select-indicator">${selected ? "已选" : "+"}</span>
        </div>
        <p>${escapeHtml(dish.description)}</p>
        <div class="meta-row">
          <span class="mini">${dish.minutes} 分钟</span>
          <span class="mini">${escapeHtml(dish.difficulty)}</span>
          <span class="mini">${escapeHtml(ingredientSummary || dish.category)}</span>
        </div>
      </div>
    </article>
  `;
}

function chefDishRow(dish) {
  return `
    <article class="menu-row">
      <div>
        <strong>${escapeHtml(dish.name)}</strong>
        <p>${escapeHtml(dish.category)} · ${dish.minutes} 分钟 · ${escapeHtml(dish.difficulty)} · ${dish.ingredients.map((item) => item.name).join("、")}</p>
      </div>
      <div class="row-actions">
        <button class="small-button ${dish.availableToday ? "primary-action" : ""}" data-toggle-dish="${dish.id}" type="button">${dish.availableToday ? "今日可点" : "已下架"}</button>
        <button class="small-button" data-edit-dish="${dish.id}" type="button">编辑</button>
        <button class="small-button danger" data-delete-dish="${dish.id}" type="button">删除</button>
      </div>
    </article>
  `;
}

function chefOrderCard(order) {
  const dishes = orderDishes(order);
  const nextStatus = getNextStatus(order.status);
  const shopping = orderShoppingItems(order);

  return `
    <article class="order-card">
      <div class="item-head">
        <strong>${escapeHtml(order.customer)} · ${order.people} 人</strong>
        <span class="tag ${order.status === "done" ? "" : "warning"}">${escapeHtml(statusChefLabel(order.status))}</span>
      </div>
      <p>${dishes.map((dish) => escapeHtml(dish.name)).join("、") || "菜品已下架"}</p>
      ${order.note ? `<p>备注：${escapeHtml(order.note)}</p>` : ""}
      ${shopping.length ? `<p>需买：${shopping.map((item) => `${escapeHtml(item.name)} ${escapeHtml(item.amount)}`).join("、")}</p>` : ""}
      <div class="order-actions">
        ${nextStatus ? `<button class="small-button primary-action" data-order-id="${order.id}" data-next-status="${nextStatus}" type="button">推进到${escapeHtml(statusChefLabel(nextStatus))}</button>` : `<span class="tag">已通知客户</span>`}
      </div>
    </article>
  `;
}

function customerOrderCard(order) {
  const dishes = orderDishes(order);
  const totalMinutes = dishes.reduce((sum, dish) => sum + Number(dish.minutes || 0), 0);
  const readyAt = new Date(new Date(order.createdAt).getTime() + totalMinutes * 60 * 1000);
  const statusIndex = STATUS_FLOW.findIndex((item) => item.key === order.status);

  return `
    <article class="progress-card">
      <p class="eyebrow">Order #${escapeHtml(order.id.slice(0, 4).toUpperCase())}</p>
      <h3>${order.status === "done" ? "吃饭啦" : `预计 ${formatClock(readyAt)} 吃饭`}</h3>
      <p>${dishes.map((dish) => escapeHtml(dish.name)).join("、") || "菜品已下架"} · ${order.people} 人</p>
      <div class="notice">${customerNotice(order)}</div>
      <div class="steps">
        ${STATUS_FLOW.map(
          (status, index) => `
            <div class="step ${index < statusIndex ? "done" : index === statusIndex ? "active" : ""}">
              <span class="dot">${index + 1}</span>
              <strong>${escapeHtml(status.label)}</strong>
              <span>${index <= statusIndex ? formatClock(order.updatedAt) : "待开始"}</span>
            </div>
          `,
        ).join("")}
      </div>
    </article>
  `;
}

function fillDishForm(id) {
  const dish = findDish(id);
  if (!dish) return;

  els.dishFormTitle.textContent = "编辑菜品";
  els.dishForm.elements.id.value = dish.id;
  els.dishForm.elements.name.value = dish.name;
  els.dishForm.elements.category.value = dish.category;
  els.dishForm.elements.description.value = dish.description;
  els.dishForm.elements.ingredients.value = dish.ingredients
    .map((item) => `${item.name} x${item.amount}${item.staple ? " 常备" : ""}`)
    .join("\n");
  els.dishForm.elements.minutes.value = dish.minutes;
  els.dishForm.elements.difficulty.value = dish.difficulty;
  els.dishForm.elements.availableToday.checked = dish.availableToday;
  els.dishForm.scrollIntoView({ behavior: "smooth", block: "center" });
}

function resetDishForm() {
  els.dishFormTitle.textContent = "新增菜品";
  els.dishForm.reset();
  els.dishForm.elements.id.value = "";
  els.dishForm.elements.availableToday.checked = true;
}

function parseIngredients(value) {
  return value
    .split(/[,，、\n]/)
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((raw) => {
      const normalized = raw.replace(/\s+/g, " ");
      const staple = /常备/.test(normalized);
      const clean = normalized.replace(/常备/g, "").trim();
      const match = clean.match(/^(.+?)(?:\s*[xX*]\s*|\s+)([\d.]+.*)$/);
      return {
        name: (match ? match[1] : clean).trim(),
        amount: (match ? match[2] : "适量").trim(),
        staple,
      };
    })
    .filter((item) => item.name);
}

function normalizeIngredients(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return { name: item, amount: "适量", staple: false };
      return {
        name: item.name || "",
        amount: item.amount || item.quantity || "适量",
        staple: Boolean(item.staple),
      };
    })
    .filter((item) => item.name);
}

function collectShoppingItems() {
  const map = new Map();
  state.orders
    .filter((order) => !["done"].includes(order.status))
    .forEach((order) => {
      orderShoppingItems(order).forEach((item) => {
        const key = item.name;
        const existing = map.get(key) || { name: key, amounts: [], orders: [] };
        existing.amounts.push(item.amount);
        existing.orders.push(`${order.customer} 的订单`);
        map.set(key, existing);
      });
    });
  return Array.from(map.values());
}

function orderShoppingItems(order) {
  return orderDishes(order)
    .flatMap((dish) => dish.ingredients)
    .filter((item) => !item.staple);
}

function orderDishes(order) {
  return order.dishIds.map(findDish).filter(Boolean);
}

function todayDishes() {
  return state.dishes.filter((dish) => dish.availableToday);
}

function estimateSelectedMinutes() {
  return Array.from(selectedDishIds)
    .map(findDish)
    .filter(Boolean)
    .reduce((sum, dish) => sum + Number(dish.minutes || 0), 0);
}

function findDish(id) {
  return state.dishes.find((dish) => dish.id === id);
}

function getNextStatus(status) {
  const index = STATUS_FLOW.findIndex((item) => item.key === status);
  return STATUS_FLOW[index + 1]?.key || "";
}

function normalizeStatus(status) {
  const map = {
    new: "pending",
    pending: "pending",
    shopping: "shopping",
    preparing: "preparing",
    cooking: "cooking",
    done: "done",
  };
  return map[status] || "pending";
}

function statusChefLabel(status) {
  return STATUS_FLOW.find((item) => item.key === status)?.chefLabel || "未知状态";
}

function customerNotice(order) {
  if (order.status === "done") return "厨师已经完成，请准备开饭。";
  if (order.status === "pending") return "厨师已收到订单，正在确认材料和制作安排。";
  if (order.status === "shopping") return `厨师正在确认采购：${orderShoppingItems(order).map((item) => item.name).join("、") || "无需额外采购"}。`;
  if (order.status === "preparing") return "厨师已确认材料，当前进入备菜中。";
  return "锅已经热起来了，正在烹饪中。";
}

function formatClock(value) {
  return new Intl.DateTimeFormat("zh-CN", {
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
