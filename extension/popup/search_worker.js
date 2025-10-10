importScripts("./pkg/doc_search_wasm.js");

const { search } = wasm_bindgen;

async function initWorker() {
	await wasm_bindgen({ module_or_path: "./pkg/doc_search_wasm_bg.wasm" });

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

	// Post message with ID of -1 to indicate worker is ready:
	postMessage([[], -1]);
}

initWorker();
