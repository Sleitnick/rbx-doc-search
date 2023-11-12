const optionsListDiv = document.getElementById("options-list");

const optionsMapping = [

	{
		title: "Search Preferences",
		type: "heading"
	},
	{
		title: "Articles",
		key: "articles",
		type: "checkbox",
		default: true
	},
	{
		title: "Videos",
		key: "videos",
		type: "checkbox",
		default: true
	},
	{
		title: "Code Samples",
		key: "codesamples",
		type: "checkbox",
		default: true
	},
	{
		title: "Data Types",
		key: "datatype",
		type: "checkbox",
		default: true
	},
	{
		title: "Recipes",
		key: "recipes",
		type: "checkbox",
		default: true
	},
	{
		title: "Enums",
		key: "enum",
		type: "checkbox",
		default: true
	},
	{
		title: "Resources",
		key: "resources",
		type: "checkbox",
		default: true
	},
	{
		title: "Other",
		key: "other",
		type: "checkbox",
		default: true
	},

];

const generateOptionsList = () => {
	for (const optionItem of optionsMapping) {
		if (optionItem.type === "heading") {
			const heading = document.createElement("h2");
			heading.className = "category-heading";
			heading.innerText = optionItem.title;
			optionsListDiv.appendChild(heading);
		} else {
			const optionItemDiv = document.createElement("div");
			optionsListDiv.className = "option-item";
			const input = document.createElement("input");
			input.id = optionItem.key;
			input.type = optionItem.type;
			if (optionItem.type === "checkbox") {
				if (optionItem.default) {
					input.checked = true;
				}
			} else {
				optionItem.value = optionItem.default;
			}
			const label = document.createElement("label");
			label.htmlFor = optionItem.key;
			label.innerText = optionItem.title;
			optionItemDiv.appendChild(input);
			optionItemDiv.appendChild(label);
			optionItemDiv.appendChild(document.createElement("br"));
			optionsListDiv.appendChild(optionItemDiv);
		}
	}
	for (const optionItem of optionsMapping) {
		if (optionItem.type === "heading") continue;
		const isCheckbox = (optionItem.type === "checkbox");
		simpleStorage.get(optionItem.key, optionItem.default).then((value) => {
			const element = document.getElementById(optionItem.key);
			if (isCheckbox) {
				element.checked = value;
			} else {
				element.value = value;
			}
			element.addEventListener("change", () => {
				const v = isCheckbox ? element.checked : element.value;
				simpleStorage.set(optionItem.key, v).catch((e) => console.error(e));
			});
		}).catch((e) => {
			console.error(e);
		});
	}
};

const setupClearCacheButton = () => {
	const clearCacheBtn = document.getElementById("clear-cache-btn");
	const clearCacheText = clearCacheBtn.innerText;
	const clearCacheActiveText = "Clearing...";
	const clearCacheDisabledText = "Cleared";
	let disabled = false;
	clearCacheBtn.addEventListener("click", () => {
		if (disabled) return;
		disabled = true;
		clearCacheBtn.disabled = true;
		clearCacheBtn.innerText = clearCacheActiveText;
		simpleStorage.clear().then(() => {
			clearCacheBtn.innerText = clearCacheDisabledText;
		}).catch((err) => {
			clearCacheBtn.innerText = "Failed";
			console.error(err);
		}).finally(() => {
			setTimeout(() => {
				disabled = false;
				clearCacheBtn.disabled = false;
				clearCacheBtn.classList.remove("disabled");
				clearCacheBtn.innerText = clearCacheText;
			}, 1000);
		});
	});
};

const init = () => {
	generateOptionsList();
	setupClearCacheButton();
};

init();
