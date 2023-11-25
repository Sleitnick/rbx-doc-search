chrome.runtime.onMessage.addListener((message) => {
	const url = message.url;
	document.location.assign(url);
});
