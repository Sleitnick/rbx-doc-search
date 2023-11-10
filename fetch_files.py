import requests
import base64
import re
import yaml

import write
import config

from concurrent.futures import ThreadPoolExecutor

try:
	from yaml import CLoader as Loader
except ImportError:
	from yaml import Loader

metadata_pattern = re.compile("---(.+?)---", re.DOTALL)

engine_ref_items = ["properties", "methods", "events", "callbacks", "items", "functions"]

def fetch_tree_data():
	data_res = requests.get("https://api.github.com/repos/Roblox/creator-docs/git/trees/main:content/en-us?recursive=true", headers=config.req_headers)
	data_res.raise_for_status()

	data = data_res.json()
	return data


def get_markdown_and_yaml_files(tree):
	md_yaml_files = list(map(
		lambda item: "content/en-us/" + item["path"],
		# filter(lambda item: item["type"] == "blob" and (item["path"].endswith(".md") or item["path"].endswith(".yaml")), tree)
		filter(lambda item: item["type"] == "blob" and (item["path"].endswith(".yaml")), tree) # TEMPORARY YAML TEST
	))

	return md_yaml_files


def get_md_metadata(filepath, content):
	metadata_match = metadata_pattern.match(content)
	
	if metadata_match is None:
		print("> Failed to get metadata")
		return {
			"path": filepath,
		}
	else:
		metadata_str = metadata_match.group(1)
		metadata_dict = yaml.load(metadata_str, Loader=Loader)
		
		metadata_dict["path"] = filepath
		
		return metadata_dict

def get_yaml_metadata(filepath, content):
	data = yaml.load(content, Loader=Loader)

	metadata_dict = dict()
	metadata_dict["title"] = data["name"]
	metadata_dict["path"] = filepath

	if "summary" in data and data["summary"]:
		metadata_dict["description"] = data["summary"]

	subitems = list()
	metadata_dict["subitems"] = subitems

	# Collect subitems (e.g. properties, methods, events)
	for key in data:
		if key not in engine_ref_items:
			continue

		items = data[key]
		if items is None:
			continue

		for item in items:
			# Skip deprecated and hidden items
			if "tags" in item and item["tags"] is not None and ("Deprecated" in item["tags"] or "Hidden" in item["tags"]):
				continue

			subitem = dict()
			subitem["title"] = item["name"]
			if "summary" in item and item["summary"]:
				subitem["description"] = item["summary"]

			subitems.append(subitem)
	
	return metadata_dict

def get_metadata(md_yaml_filepath):
	print("Fetching metadata for: " + md_yaml_filepath)

	res = requests.get(f"https://api.github.com/repos/Roblox/creator-docs/contents/{md_yaml_filepath}?ref=main", headers=config.req_headers)
	res.raise_for_status()

	content_encoded = res.json()["content"]
	content = base64.b64decode(content_encoded.encode("utf-8")).decode("utf-8")

	if md_yaml_filepath.endswith(".md"):
		return get_md_metadata(md_yaml_filepath, content)
	elif md_yaml_filepath.endswith(".yaml"):
		return get_yaml_metadata(md_yaml_filepath, content)

debug_one = None
# debug_one = "content/en-us/reference/engine/libraries/utf8.yaml"

def main():
	if debug_one is not None:
		print("DEBUG " + debug_one)
		data = get_metadata(debug_one)
		print(data)
		return
	
	data = fetch_tree_data()

	sha = data["sha"]
	tree = data["tree"]
	truncated = data["truncated"]

	# TODO: Do a recursive scan if truncated
	if truncated:
		print("Cannot handle truncated paths yet")
		exit(1)

	md_yaml_files = get_markdown_and_yaml_files(tree)
	write.write_json(md_yaml_files, "files.json")

	# Pool can't be too big, or else GitHub rate limits will kick in
	max_threads = 3

	with ThreadPoolExecutor(max_workers=max_threads) as pool:
		all_metadata = list(pool.map(get_metadata, md_yaml_files))
	
	write.write_json(all_metadata, "files_metadata.json")

	write.write_text(sha[:7], "sha.txt")

	print("Documentation metadata collection completed")

if __name__ == "__main__":
	main()
