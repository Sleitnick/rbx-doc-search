import requests

import config
import write


def fetch_latest_roblox_version():
	"""Fetch the latest roblox version."""

	print("Fetching latest Roblox version")
	res = requests.get("http://setup.roblox.com/versionQTStudio")
	res.raise_for_status()
	return res.text


def fetch_api_dump(version):
	"""Fetch the API dump from the given version."""

	print("Fetching API dump")

	info_res = requests.get(f"https://api.github.com/repos/RobloxAPI/build-archive/contents/data/production/builds/{version}/API-Dump.json?ref=master", headers=config.req_headers)
	info_res.raise_for_status()
	info = info_res.json()
	url = info["download_url"]

	download_res = requests.get(url)
	download_res.raise_for_status()
	return download_res.json()


if __name__ == "__main__":
	rbx_version = fetch_latest_roblox_version()
	api_dump = fetch_api_dump(rbx_version)

	write.write_text(rbx_version[8:], "rbx_version_hash.txt")
	write.write_json(api_dump, "api_dump.json")

	print("API dump collection completed")
