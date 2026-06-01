/**
 * Whitelabel Sidebar - Core Orchestrator
 * Integrates Store, Service, Renderer, and Events into Frappe Desk.
 */

(function () {
	"use strict";

	window.WhitelabelSidebar = window.WhitelabelSidebar || {};

	const Store = WhitelabelSidebar.Store;
	const Service = WhitelabelSidebar.Service;
	const Renderer = WhitelabelSidebar.Renderer;
	const Events = WhitelabelSidebar.Events;

	// ── STEP 1: ZERO-FLASH PRE-HIDE ──
	// Uses MutationObserver to instantly hide Frappe's default sidebar before layout paint
	(function earlyHideDefaultSidebar() {
		try {
			function hideContainer(container) {
				const oldSidebars = [".body-sidebar", ".body-sidebar-placeholder"];
				oldSidebars.forEach(sel => {
					const el = container.querySelector(sel);
					if (el) el.style.setProperty("display", "none", "important");
				});
				// Prevent layout shifting jump
				const collapsed = typeof localStorage !== "undefined" && 
					localStorage.getItem("frappe_sidebar_collapsed") === "true";
				const initialWidth = collapsed ? "72px" : "280px";
				container.style.cssText = `
					width: ${initialWidth} !important;
					min-width: ${initialWidth} !important;
					height: 100vh !important;
					flex-shrink: 0 !important;
					overflow: hidden !important;
				`;
			}

			const existing = document.querySelector(".body-sidebar-container");
			if (existing) {
				hideContainer(existing);
				return;
			}

			const observer = new MutationObserver((mutations) => {
				for (let i = 0; i < mutations.length; i++) {
					const added = mutations[i].addedNodes;
					for (let j = 0; j < added.length; j++) {
						const node = added[j];
						if (!node.querySelector) continue;

						const container = node.classList && node.classList.contains("body-sidebar-container")
							? node
							: node.querySelector(".body-sidebar-container");

						if (container) {
							hideContainer(container);
							observer.disconnect();
							return;
						}
					}
				}
			});

			observer.observe(document.body || document.documentElement, {
				childList: true,
				subtree: true
			});
		} catch (e) {
			console.error("[WhitelabelSidebar] Mutation observer error:", e);
		}
	})();

	// ── STEP 2: FULL INITIALIZATION AND MOUNTING ──
	class SidebarManager {
		constructor() {
			this.root = null;
			this.backdrop = null;
			this.mobileTrigger = null;
			this.unsubscribeStore = null;
		}

		async init() {
			const container = document.querySelector(".body-sidebar-container");
			if (!container) {
				// Retry if not found immediately
				setTimeout(() => this.init(), 100);
				return;
			}

			// Clean any inline width styling from pre-hide observer so our stylesheet classes can take over
			container.style.removeProperty("width");
			container.style.removeProperty("min-width");
			container.style.removeProperty("height");
			container.style.removeProperty("flex-shrink");
			container.style.removeProperty("overflow");

			// Hide standard elements
			[".body-sidebar", ".body-sidebar-placeholder"].forEach(sel => {
				const el = container.querySelector(sel);
				if (el) el.style.display = "none";
			});

			// Build custom mount point
			this.root = document.createElement("div");
			this.root.id = "wl-sidebar-root";
			container.appendChild(this.root);

			// Activate sidebar layout on body
			document.body.classList.add("wl-sidebar-active");

			// Add backdrop & mobile triggers
			this.setupMobileComponents();

			// Bind event handling delegation
			Events.bind(this.root);

			// Fetch database configuration
			try {
				const data = await Service.fetchSidebarData();
				
				// Overwrite collapsed default setting from DB settings if user hasn't toggled it locally
				const localCollapsePref = localStorage.getItem("frappe_sidebar_collapsed");
				if (localCollapsePref === null && data.settings && data.settings.collapse_by_default) {
					Store.setState({ collapsed: true });
				}
			} catch (e) {
				console.error("[WhitelabelSidebar] Error fetching data:", e);
			}

			// Render immediately
			await Renderer.render(this.root);

			// Track initial visited page
			Service.trackRecentVisited();

			// Subscribe to state modifications for reactive rendering
			this.unsubscribeStore = Store.subscribe(() => {
				Renderer.render(this.root);
			});

			// Setup desk lifecycle listeners
			this.setupLifecycleListeners();
		}

		setupMobileComponents() {
			// Touch Overlay Backdrop
			this.backdrop = document.createElement("div");
			this.backdrop.className = "wl-mobile-backdrop";
			this.backdrop.addEventListener("click", () => {
				Store.setState({ mobileOpen: false });
			});
			document.body.appendChild(this.backdrop);

			// Responsive Hamburger Button
			this.mobileTrigger = document.createElement("button");
			this.mobileTrigger.className = "wl-mobile-trigger";
			this.mobileTrigger.setAttribute("aria-label", __("Toggle Menu"));
			this.mobileTrigger.innerHTML = `
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
					<line x1="3" y1="12" x2="21" y2="12"></line>
					<line x1="3" y1="6" x2="21" y2="6"></line>
					<line x1="3" y1="18" x2="21" y2="18"></line>
				</svg>
			`;
			this.mobileTrigger.addEventListener("click", () => {
				Store.setState({ mobileOpen: !Store.get("mobileOpen") });
			});

			// Inject into Frappe navbar so it sits naturally in the top bar.
			// Fall back to floating over the page if navbar not found.
			const navbarLeft = document.querySelector(
				'.navbar-header, .navbar .container-fluid, .navbar .navbar-left, .navbar'
			);
			if (navbarLeft) {
				navbarLeft.insertAdjacentElement("afterbegin", this.mobileTrigger);
			} else {
				document.body.appendChild(this.mobileTrigger);
			}
		}

		setupLifecycleListeners() {
			// Update highlight & recents logging on desk route transition
			$(document).on("page-change.wl-sidebar", () => {
				Store.setState({ mobileOpen: false });
				Service.trackRecentVisited();
				if (this.root) {
					Renderer.highlightActiveRoute(this.root);
				}
			});

			// Clean layout classes on window resizing
			window.addEventListener("resize", () => {
				if (window.innerWidth > 991 && Store.get("mobileOpen")) {
					Store.setState({ mobileOpen: false });
				}
			});
		}

		destroy() {
			if (this.unsubscribeStore) this.unsubscribeStore();
			if (this.root) this.root.remove();
			if (this.backdrop) this.backdrop.remove();
			if (this.mobileTrigger) this.mobileTrigger.remove();
			document.body.classList.remove("wl-sidebar-active");
			$(document).off("page-change.wl-sidebar");
		}
	}

	// Bootstrap after Frappe Desk initializes
	function checkFrappeDeskReady() {
		return typeof frappe !== "undefined" && frappe.boot && 
			(document.querySelector(".page-container") || document.querySelector(".layout-main"));
	}

	function bootstrap() {
		if (!checkFrappeDeskReady()) {
			setTimeout(bootstrap, 50);
			return;
		}
		if (window.WhitelabelSidebar.GoogleTranslate) {
			window.WhitelabelSidebar.GoogleTranslate.init();
		}
		if (window.FrappeWhitelabelRouteGuard) {
			window.FrappeWhitelabelRouteGuard.init();
		}
		if (window.WhitelabelSidebar.RouteAllowlist) {
			window.WhitelabelSidebar.RouteAllowlist.init();
		}
		window.WhitelabelSidebar.Manager = new SidebarManager();
		window.WhitelabelSidebar.Manager.init();
	}

	if (typeof frappe !== "undefined" && typeof frappe.ready === "function") {
		frappe.ready(bootstrap);
	} else {
		document.addEventListener("DOMContentLoaded", bootstrap);
	}
})();
