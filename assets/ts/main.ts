import { animate, stagger } from "motion";

interface AddonDefinition {
	id: string;
	name: string;
	unit: string;
	pricePesewas: number;
}

interface MealDefinition {
	id: string;
	name: string;
	image: string;
	basePricePesewas: number;
	included: string[];
	addonIds: string[];
}

interface SelectedAddon extends AddonDefinition {
	quantity: number;
}

interface CartItem {
	id: string;
	mealId: string;
	mealName: string;
	basePricePesewas: number;
	included: string[];
	addons: SelectedAddon[];
	quantity: number;
}

const CART_KEY = "breakfast-buddy-configured-cart-v1";
const LEGACY_CART_KEY = "breakfast-buddy-cart";
const MAX_ADDON_QUANTITY = 10;
const MAX_PACKAGE_QUANTITY = 20;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const customizeButtons = document.querySelectorAll<HTMLButtonElement>("[data-customize-meal]");
const addonElements = document.querySelectorAll<HTMLElement>("[data-addon-definition]");
const addons = new Map<string, AddonDefinition>();
const meals = new Map<string, MealDefinition>();

addonElements.forEach((element) => {
	const { addonId, addonName, addonUnit, addonPricePesewas } = element.dataset;
	const pricePesewas = Number(addonPricePesewas);
	if (addonId && addonName && addonUnit && Number.isInteger(pricePesewas) && pricePesewas >= 0) {
		addons.set(addonId, { id: addonId, name: addonName, unit: addonUnit, pricePesewas });
	}
});

customizeButtons.forEach((button) => {
	const { customizeMeal, mealName, mealImage, basePricePesewas, included, addonIds } = button.dataset;
	const pricePesewas = Number(basePricePesewas);
	if (customizeMeal && mealName && mealImage && Number.isInteger(pricePesewas) && pricePesewas >= 0) {
		meals.set(customizeMeal, {
			id: customizeMeal,
			name: mealName,
			image: mealImage,
			basePricePesewas: pricePesewas,
			included: included?.split("|").filter(Boolean) ?? [],
			addonIds: addonIds?.split(",").filter((id) => addons.has(id)) ?? [],
		});
	}
});

let cart: CartItem[] = [];

function removeStoredItem(key: string): void {
	try {
		localStorage.removeItem(key);
	} catch {
		// Cart interactions still work when storage is blocked or unavailable.
	}
}

function isValidCartItem(value: unknown): value is CartItem {
	if (!value || typeof value !== "object") return false;
	const item = value as Partial<CartItem>;
	const meal = typeof item.mealId === "string" ? meals.get(item.mealId) : undefined;
	if (!meal || typeof item.id !== "string" || item.mealName !== meal.name || item.basePricePesewas !== meal.basePricePesewas) return false;
	if (!Number.isInteger(item.quantity) || (item.quantity ?? 0) < 1 || (item.quantity ?? 0) > MAX_PACKAGE_QUANTITY) return false;
	if (!Array.isArray(item.included) || item.included.join("|") !== meal.included.join("|")) return false;
	if (!Array.isArray(item.addons)) return false;
	const selectedIds = new Set<string>();

	return item.addons.every((selected) => {
		const definition = selected && typeof selected === "object" && typeof selected.id === "string" ? addons.get(selected.id) : undefined;
		if (!definition || selectedIds.has(definition.id)) return false;
		selectedIds.add(definition.id);
		return Boolean(
			meal.addonIds.includes(definition.id) && selected.name === definition.name && selected.unit === definition.unit &&
			selected.pricePesewas === definition.pricePesewas && Number.isInteger(selected.quantity) && selected.quantity > 0 && selected.quantity <= MAX_ADDON_QUANTITY,
		);
	});
}

try {
	const saved: unknown = JSON.parse(localStorage.getItem(CART_KEY) ?? "[]");
	if (Array.isArray(saved)) cart = saved.filter(isValidCartItem);
} catch {
	removeStoredItem(CART_KEY);
}
removeStoredItem(LEGACY_CART_KEY);

const cartList = document.querySelector<HTMLUListElement>("#cart-items");
const cartCounts = document.querySelectorAll<HTMLElement>("[data-cart-count]");
const cartTotal = document.querySelector<HTMLElement>("#cart-total");
const clearCartButton = document.querySelector<HTMLButtonElement>("#clear-cart");
const dialog = document.querySelector<HTMLDialogElement>("#customize-dialog");
const dialogTitle = document.querySelector<HTMLElement>("#customize-title");
const includedList = document.querySelector<HTMLUListElement>("#included-items");
const addonControls = document.querySelector<HTMLElement>("#addon-controls");
const customizeTotal = document.querySelector<HTMLElement>("#customize-total");
const closeCustomizeButton = document.querySelector<HTMLButtonElement>("#close-customize");
const addCustomizedButton = document.querySelector<HTMLButtonElement>("#add-customized-package");
const customizeImage = document.querySelector<HTMLImageElement>("#customize-image");

let activeMeal: MealDefinition | null = null;
let addonSelection: Record<string, number> = {};

function formatMoney(pesewas: number): string {
	return `GH₵${(pesewas / 100).toFixed(2)}`;
}

function unitPrice(item: CartItem): number {
	return item.basePricePesewas + item.addons.reduce((total, addon) => total + addon.pricePesewas * addon.quantity, 0);
}

function calculateCartTotal(): number {
	return cart.reduce((total, item) => total + unitPrice(item) * item.quantity, 0);
}

function calculateCartQuantity(): number {
	return cart.reduce((total, item) => total + item.quantity, 0);
}

function saveCart(): void {
	try {
		localStorage.setItem(CART_KEY, JSON.stringify(cart));
	} catch {
		// Keep the in-memory cart usable even when persistence is unavailable.
	}
	renderCart();
}

function createCartItemId(): string {
	if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
	const bytes = crypto.getRandomValues(new Uint8Array(16));
	return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

function createQuantityButton(label: string, text: string, action: () => void): HTMLButtonElement {
	const button = document.createElement("button");
	button.type = "button";
	button.textContent = text;
	button.setAttribute("aria-label", label);
	button.className = "flex size-8 items-center justify-center rounded-full border border-bb-cocoa/20 bg-white font-bold hover:border-bb-red hover:text-bb-red disabled:cursor-not-allowed disabled:opacity-35";
	button.addEventListener("click", () => {
		action();
		if (!reduceMotion) animate(button, { scale: [1, 0.88, 1] }, { duration: 0.18 });
	});
	return button;
}

function changePackageQuantity(id: string, change: number): void {
	const item = cart.find((entry) => entry.id === id);
	if (!item) return;
	const next = item.quantity + change;
	if (next <= 0) cart = cart.filter((entry) => entry.id !== id);
	else item.quantity = Math.min(next, MAX_PACKAGE_QUANTITY);
	saveCart();
}

function renderCart(): void {
	if (!cartList || !cartTotal) return;
	cartList.replaceChildren();
	cartCounts.forEach((count) => { count.textContent = String(calculateCartQuantity()); });
	cartTotal.textContent = formatMoney(calculateCartTotal());
	clearCartButton?.classList.toggle("hidden", cart.length === 0);

	if (cart.length === 0) {
		const empty = document.createElement("li");
		empty.textContent = "Your selected packages will appear here.";
		empty.className = "rounded-lg bg-bb-cream px-4 py-6 text-center text-bb-cocoa/50";
		cartList.append(empty);
		return;
	}

	for (const item of cart) {
		const row = document.createElement("li");
		row.className = "rounded-lg bg-bb-cream px-4 py-4";
		const heading = document.createElement("div");
		heading.className = "flex items-start justify-between gap-3";
		const name = document.createElement("span");
		name.className = "font-bold";
		name.textContent = item.mealName;
		const subtotal = document.createElement("span");
		subtotal.className = "shrink-0 font-bold text-bb-red";
		subtotal.textContent = formatMoney(unitPrice(item) * item.quantity);
		heading.append(name, subtotal);
		row.append(heading);

		const included = document.createElement("p");
		included.className = "mt-1 text-[11px] leading-4 text-bb-cocoa/55";
		included.textContent = `Includes: ${item.included.join(", ")}`;
		row.append(included);

		if (item.addons.length > 0) {
			const extras = document.createElement("p");
			extras.className = "mt-1 text-[11px] leading-4 text-bb-cocoa/70";
			extras.textContent = `Extras: ${item.addons.map((addon) => `${addon.name} × ${addon.quantity}`).join(", ")}`;
			row.append(extras);
		}

		const controls = document.createElement("div");
		controls.className = "mt-3 flex items-center gap-3";
		const decrease = createQuantityButton(`Decrease ${item.mealName} package quantity`, "−", () => changePackageQuantity(item.id, -1));
		const quantity = document.createElement("span");
		quantity.className = "min-w-5 text-center font-bold";
		quantity.textContent = String(item.quantity);
		const increase = createQuantityButton(`Increase ${item.mealName} package quantity`, "+", () => changePackageQuantity(item.id, 1));
		increase.disabled = item.quantity >= MAX_PACKAGE_QUANTITY;
		const remove = document.createElement("button");
		remove.type = "button";
		remove.className = "ml-auto text-xs font-bold text-bb-red hover:text-bb-cocoa";
		remove.textContent = "Remove";
		remove.addEventListener("click", () => { cart = cart.filter((entry) => entry.id !== item.id); saveCart(); });
		controls.append(decrease, quantity, increase, remove);
		row.append(controls);
		cartList.append(row);
	}

	if (!reduceMotion) {
		animate(Array.from(cartList.children), { opacity: [0, 1], y: [6, 0] }, { duration: 0.22, delay: stagger(0.035) });
	}
}

function calculateCustomizationTotal(): number {
	if (!activeMeal) return 0;
	return activeMeal.basePricePesewas + Object.entries(addonSelection).reduce((total, [id, quantity]) => {
		const addon = addons.get(id);
		return addon ? total + addon.pricePesewas * quantity : total;
	}, 0);
}

function updateCustomizationTotal(): void {
	if (customizeTotal) customizeTotal.textContent = formatMoney(calculateCustomizationTotal());
}

function renderAddonControls(): void {
	if (!activeMeal || !addonControls) return;
	addonControls.replaceChildren();

	for (const id of activeMeal.addonIds) {
		const addon = addons.get(id);
		if (!addon) continue;
		const row = document.createElement("div");
		row.className = "flex items-center justify-between gap-3 rounded-lg bg-bb-cream px-3 py-3";
		const info = document.createElement("div");
		const name = document.createElement("p");
		name.className = "text-sm font-bold";
		name.textContent = addon.name;
		const detail = document.createElement("p");
		detail.className = "mt-0.5 text-[11px] text-bb-cocoa/55";
		detail.textContent = `${addon.unit} • ${formatMoney(addon.pricePesewas)}`;
		info.append(name, detail);
		const controls = document.createElement("div");
		controls.className = "flex items-center gap-2";
		const decrease = createQuantityButton(`Decrease ${addon.name}`, "−", () => {
			addonSelection[id] = Math.max(0, (addonSelection[id] ?? 0) - 1);
			renderAddonControls(); updateCustomizationTotal();
		});
		decrease.disabled = (addonSelection[id] ?? 0) === 0;
		const value = document.createElement("span");
		value.className = "w-5 text-center text-sm font-bold";
		value.textContent = String(addonSelection[id] ?? 0);
		const increase = createQuantityButton(`Increase ${addon.name}`, "+", () => {
			addonSelection[id] = Math.min(MAX_ADDON_QUANTITY, (addonSelection[id] ?? 0) + 1);
			renderAddonControls(); updateCustomizationTotal();
		});
		increase.disabled = (addonSelection[id] ?? 0) >= MAX_ADDON_QUANTITY;
		controls.append(decrease, value, increase);
		row.append(info, controls);
		addonControls.append(row);
	}
}

function openCustomization(meal: MealDefinition): void {
	if (!dialog || !dialogTitle || !includedList || !customizeImage) return;
	activeMeal = meal;
	addonSelection = Object.fromEntries(meal.addonIds.map((id) => [id, 0]));
	dialogTitle.textContent = meal.name;
	customizeImage.src = meal.image;
	customizeImage.alt = meal.name;
	includedList.replaceChildren(...meal.included.map((item) => {
		const row = document.createElement("li");
		row.className = "flex items-center gap-2 rounded-lg bg-bb-cream px-3 py-2";
		const check = document.createElement("span");
		check.className = "text-bb-red";
		check.setAttribute("aria-hidden", "true");
		check.textContent = "✓";
		const text = document.createElement("span");
		text.textContent = item;
		row.append(check, text);
		return row;
	}));
	renderAddonControls();
	updateCustomizationTotal();
	dialog.showModal();
	if (!reduceMotion) {
		animate(dialog, { opacity: [0, 1], scale: [0.97, 1], y: [12, 0] }, { duration: 0.24, ease: "easeOut" });
		animate(customizeImage, { opacity: [0, 1], scale: [0.88, 1] }, { duration: 0.32, ease: "easeOut" });
	}
}

async function closeCustomization(): Promise<void> {
	if (!dialog?.open) return;
	if (!reduceMotion) {
		await animate(dialog, { opacity: 0, scale: 0.98, y: 8 }, { duration: 0.14, ease: "easeIn" });
	}
	dialog.close();
}

customizeButtons.forEach((button) => {
	button.addEventListener("click", () => {
		const id = button.dataset.customizeMeal;
		const meal = id ? meals.get(id) : undefined;
		if (meal) {
			if (!reduceMotion) animate(button, { scale: [1, 0.96, 1] }, { duration: 0.18 });
			openCustomization(meal);
		}
	});
});

closeCustomizeButton?.addEventListener("click", () => { void closeCustomization(); });
dialog?.addEventListener("cancel", (event) => {
	event.preventDefault();
	void closeCustomization();
});
dialog?.addEventListener("click", (event) => {
	if (event.target === dialog) void closeCustomization();
});

addCustomizedButton?.addEventListener("click", async () => {
	if (!activeMeal) return;
	const selectedAddons = activeMeal.addonIds.flatMap((id) => {
		const addon = addons.get(id);
		const quantity = addonSelection[id] ?? 0;
		return addon && quantity > 0 ? [{ ...addon, quantity }] : [];
	});
	cart.push({
		id: createCartItemId(),
		mealId: activeMeal.id,
		mealName: activeMeal.name,
		basePricePesewas: activeMeal.basePricePesewas,
		included: [...activeMeal.included],
		addons: selectedAddons,
		quantity: 1,
	});
	saveCart();
	await closeCustomization();
	document.querySelector("#order-summary")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
});

clearCartButton?.addEventListener("click", () => { cart = []; saveCart(); });

renderCart();

if (!reduceMotion) {
	const intro = document.querySelector<HTMLElement>("[data-intro-card]");
	const cards = Array.from(document.querySelectorAll<HTMLElement>("[data-meal-card]"));
	if (intro) animate(intro, { opacity: [0, 1], y: [10, 0] }, { duration: 0.32, ease: "easeOut" });
	if (cards.length > 0) animate(cards, { opacity: [0, 1], y: [14, 0] }, { duration: 0.35, delay: stagger(0.06), ease: "easeOut" });
}
