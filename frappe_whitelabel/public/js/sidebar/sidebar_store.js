/**
 * Whitelabel Sidebar Store
 * Unified state management using a reactive observable pattern.
 */

(function () {
	"use strict";

	// Namespace setup
	window.WhitelabelSidebar = window.WhitelabelSidebar || {};

	const STORAGE_PREFIX = "frappe_sidebar_";

	// Initial core state
	let state = {
		collapsed: getStorage("collapsed", false),
		mobileOpen: false,
		searchText: "",
		menuItems: [],
		favorites: getStorage("favorites", []),
		recents: getStorage("recents", [])
	};

	const listeners = [];

	// LocalStorage Helpers
	function getStorage(key, defaultValue) {
		try {
			const val = localStorage.getItem(STORAGE_PREFIX + key);
			if (val === null) return defaultValue;
			return JSON.parse(val);
		} catch (e) {
			return defaultValue;
		}
	}

	function setStorage(key, value) {
		try {
			localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
		} catch (e) {
			console.error("[WhitelabelSidebar Store] Error writing to localStorage:", e);
		}
	}

	WhitelabelSidebar.Store = {
		/**
		 * Retrieve the current state or a specific key
		 */
		get(key) {
			if (key) return state[key];
			return { ...state };
		},

		/**
		 * Set new state properties and trigger re-renders
		 */
		setState(newState) {
			const oldState = { ...state };
			state = { ...state, ...newState };

			// Persist selected user configuration properties
			if (newState.collapsed !== undefined) {
				setStorage("collapsed", state.collapsed);
			}
			if (newState.favorites !== undefined) {
				setStorage("favorites", state.favorites);
			}
			if (newState.recents !== undefined) {
				setStorage("recents", state.recents);
			}

			// Notify subscribers of the change
			listeners.forEach(fn => fn(state, oldState));
		},

		/**
		 * Subscribe to state changes
		 */
		subscribe(fn) {
			if (typeof fn === "function") {
				listeners.push(fn);
			}
			// Return unsubscribe function
			return () => {
				const index = listeners.indexOf(fn);
				if (index > -1) {
					listeners.splice(index, 1);
				}
			};
		}
	};
})();
