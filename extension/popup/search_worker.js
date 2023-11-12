importScripts("./pkg/search_test_wasm.js");

console.log("initializing worker");

const { search } = wasm_bindgen;

async function initWorker() {
	await wasm_bindgen("./pkg/search_test_wasm_bg.wasm");

	const titles = [];

	self.onmessage = async (event) => {
		const searchText = event.data[0];
		const searchItems = event.data[1];
		const id = event.data[2];

		if (titles.length === 0) {
			for (let i = 0; i < searchItems.length; i++) {
				titles[i] = searchItems[i].title;
			}
		}

		const resultIndices = search(searchText, titles);

		const results = resultIndices.map((resultIdx) => searchItems[resultIdx]);

		postMessage([results, id]);
	};
}

initWorker();
