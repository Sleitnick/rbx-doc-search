const searchForm = document.getElementById("search-form");
const inputElement = document.getElementById("search");
const resultsDiv = document.getElementById("results");

const CHECK_RELEASE_INFO_INTERVAL = 1 * 60 * 60 * 1000;

const permissions = {
	origins: [
		"*://*.github.com/*",
		"*://github.com/*",
		"*://objects.githubusercontent.com/*",
	],
};

let firstResult = null;

async function getMetadataFromCache() {
	const res = await chrome.storage.local.get(["metadata"]);
	return JSON.parse(res.metadata);
}

async function getLatestCachedTag() {
	const res = await chrome.storage.local.get(["tagName"]);
	return res.tagName;
}

async function cacheMetadata(metadata, tagName) {
	await chrome.storage.local.set({
		"metadata": JSON.stringify(metadata),
		"tagName": tagName,
		"timestamp": Date.now(),
	});
}

async function shouldCheckReleaseInfo() {
	const res = await chrome.storage.local.get(["timestamp"]);
	if (!res || !res.timestamp) return true;

	const elapsed = Date.now() - res.timestamp;
	return elapsed > CHECK_RELEASE_INFO_INTERVAL;
}

async function getLatestReleaseInfo() {
	const releaseInfo = await (await fetch("https://api.github.com/repos/Sleitnick/rbx-doc-search/releases/latest")).json();
	return releaseInfo;
}

async function fetchMetadataFromRelease(releaseInfo) {
	const tagName = releaseInfo.tag_name;

	const asset = releaseInfo.assets.find((asset) => asset.name === "files_metadata.json");

	const metadataRes = await fetch(asset.url, {headers: {"Accept": "application/octet-stream"}, credentials: "omit"});
	const metadataBlob = await metadataRes.blob();
	const metadata = JSON.parse(await metadataBlob.text());

	cacheMetadata(metadata, tagName);

	return metadata;
}

async function getMetadata() {
	const shouldCheck = await shouldCheckReleaseInfo();
	if (!shouldCheck) {
		return await getMetadataFromCache() ?? await fetchMetadataFromRelease(await getLatestReleaseInfo());
	}

	const releaseInfo = await getLatestReleaseInfo();
	const cachedTag = await getLatestCachedTag();
	if (releaseInfo.tag_name === cachedTag) {
		return await getMetadataFromCache() ?? await fetchMetadataFromRelease(releaseInfo);
	} else {
		return await fetchMetadataFromRelease(releaseInfo);
	}
}

async function openUrl(url) {
	const tabs = await chrome.tabs.query({active: true, currentWindow: true});

	const activeTab = tabs[0];
	if (!activeTab) return;

	const onDocSite = activeTab.url.startsWith("https://create.roblox.com/docs/");

	if (onDocSite) {
		await chrome.tabs.sendMessage(activeTab.id, {url: url});
	} else {
		window.open(url, onDocSite ? "_self" : "_blank");
	}

	window.close();
}

function createResultChild(item, index) {
	const a = document.createElement("a");
	a.setAttribute("href", item.url);
	a.setAttribute("target", "_blank");
	a.dataset.index = index;
	a.className = "result-item-link";
	a.id = `result-item-${index}`;

	a.addEventListener("click", (e) => {
		e.preventDefault();
		openUrl(item.url).catch(console.error);
	});

	const div = document.createElement("div");
	div.className = "result-item";
	const h3 = document.createElement("h3");
	h3.className = "result-title";
	h3.innerText = item.title;
	const p = document.createElement("p");
	p.className = "result-category";
	p.innerText = item.type;
	div.appendChild(h3);
	div.appendChild(p);
	a.appendChild(div);

	return a;
}

function handleResults(results) {
	resultsDiv.innerHTML = "";
	if (results === undefined) return;

	if (results.length === 0) {
		resultsDiv.innerText = "No results";
		return;
	}

	const resultsInnerDiv = document.createElement("div");

	for (let i = 0; i < results.length; i++) {
		const item = results[i];
		resultsInnerDiv.append(createResultChild(item, i));
	}

	resultsDiv.appendChild(resultsInnerDiv);
}

function focusOnNextElement() {
	const focused = document.querySelector(":focus");
	if (!focused) return;
	let index = -1;
	if (focused === inputElement) {
		index = 0;
	} else {
		index = focused.dataset.index;
		if (typeof(index) === "undefined") {
			return;
		}
		index = parseInt(index) + 1;
	}
	const id = `result-item-${index}`;
	const nextFocused = document.getElementById(id);
	if (nextFocused) {
		nextFocused.focus();
	}
}

function focusOnPrevElement() {
	const focused = document.querySelector(":focus");
	if ((!focused) || focused === inputElement) return null;
	let index = focused.dataset.index;
	if (typeof(index) === "undefined") {
		return;
	}
	index = parseInt(index) - 1;
	if (index < 0) {
		inputElement.focus();
		return;
	}
	const id = `result-item-${index}`;
	const prevFocused = document.getElementById(id);
	if (prevFocused) {
		prevFocused.focus();
	}
}

async function checkPermissions() {
	if (typeof browser === "undefined") return Promise.resolve(true);
	return await browser.permissions.contains(permissions);
}

async function attemptRequestPermissions() {
	if (typeof browser === "undefined") return Promise.resolve(true);
	return await browser.permissions.request(permissions);
}

async function setupPermissionRequest() {
	const btn = document.createElement("button");
	btn.innerText = "Grant Permissions";
	btn.classList.add("init-btn");
	resultsDiv.appendChild(btn);

	searchForm.classList.add("hide");

	let resolve;
	let reject;

	btn.addEventListener("click", async () => {
		attemptRequestPermissions()
			.then(resolve)
			.catch(reject)
			.finally(() => {
				resultsDiv.removeChild(btn);
			});
		window.close();
	});

	return new Promise((res, rej) => {
		resolve = res;
		reject = rej;
	});
}

async function main() {
	// Handle host permissions on Firefox:
	const alreadyGranted = await checkPermissions();
	if (!alreadyGranted) {
		await setupPermissionRequest();
	}

	inputElement.focus();

	console.time("startup");

	const metadata = await getMetadata();

	const searchItems = [];
	for (const item of metadata) {
		let path = item.path.match(/content\/en\-us\/(.+)\.(md|yaml)$/)[1];
		if (path.endsWith("/index")) {
			path = path.substring(0, path.length - 6);
		}
		const url = `https://create.roblox.com/docs/${path}`;
		searchItems.push({
			title: item.title,
			type: item.type,
			url: url,
		});
		if (item.subitems !== undefined) {
			for (const subitem of item.subitems) {
				let anchor = subitem.title.match(/(:|\.)(.+)$/);
				searchItems.push({
					title: subitem.title,
					type: subitem.type ? `${item.type} ${subitem.type}` : item.type,
					url: anchor ? `${url}#${anchor[2]}` : url,
				});
			}
		}
	}

	const worker = new Worker("search_worker.js");
	let lastId = 0;

	const onInput = (event) => {
		const value = event.target.value.trim();

		lastId++;
		const id = lastId;

		if (value === "") {
			firstResult = null;
			handleResults(undefined);
			return;
		}

		worker.postMessage([value, searchItems, id]);
	};

	inputElement.addEventListener("input", onInput);
	if (inputElement.value !== "") {
		inputElement.dispatchEvent(new Event("input", {bubbles: true}));
	}

	worker.onmessage = (event) => {
		const resId = event.data[1];
		if (resId !== lastId) {
			return;
		}

		const results = event.data[0];
		firstResult = results.length > 0 ? results[0] : null;
		handleResults(results);
	};

	searchForm.addEventListener("submit", (event) => {
		event.preventDefault();
		if (firstResult) {
			openUrl(firstResult.url).catch(console.error);
		}
		window.close();
	});

	document.addEventListener("keydown", (event) => {
		const key = event.key;
		let handled = false;
		if (key === "ArrowDown") {
			focusOnNextElement();
			handled = true;
		} else if (key === "ArrowUp") {
			focusOnPrevElement();
			handled = true;
		}
		if (handled) {
			event.preventDefault();
		}
	});

	console.timeEnd("startup");
}

main();
