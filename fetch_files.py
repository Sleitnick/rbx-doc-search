import requests
import base64
import re
import yaml

import write
import config

try:
	from yaml import CLoader as Loader
except ImportError:
	from yaml import Loader

metadata_pattern = re.compile("---(.+?)---", re.DOTALL)


def fetch_tree_data():
	data_res = requests.get("https://api.github.com/repos/Roblox/creator-docs/git/trees/main:content?recursive=true", headers=config.req_headers)
	data_res.raise_for_status()

	data = data_res.json()
	return data


def get_markdown_files(tree):
	md_files = list(map(
		lambda item: "content/" + item["path"],
		filter(lambda item: item["type"] == "blob" and item["path"].endswith(".md"), tree)
	))

	return md_files


def get_metadata(md_filepath):
	print("Fetching metadata for: " + md_filepath)

	res = requests.get(f"https://api.github.com/repos/Roblox/creator-docs/contents/{md_filepath}?ref=main", headers=config.req_headers)
	res.raise_for_status()
	
	content_encoded = res.json()["content"]
	content = base64.b64decode(content_encoded.encode("utf-8")).decode("utf-8")
	
	metadata_match = metadata_pattern.match(content)
	
	if metadata_match == None:
		print("> Failed to get metadata")
		return {
			"path": md_filepath,
		}
	else:
		metadata_str = metadata_match.group(1)
		metadata_dict = yaml.load(metadata_str, Loader=Loader)
		
		metadata_dict["path"] = md_filepath
		
		return metadata_dict


def fetch_files():
	data = fetch_tree_data()

	sha = data["sha"]
	tree = data["tree"]
	truncated = data["truncated"]

	# TODO: Do a recursive scan if truncated
	if truncated:
		print("Cannot handle truncated paths yet")
		exit(1)

	md_files = get_markdown_files(tree)
	write.write_json(md_files, "files.json")

	all_metadata = list(map(get_metadata, md_files))
	write.write_json(all_metadata, "files_metadata.json")

	write.write_text(sha[:7], "sha.txt")


if __name__ == "__main__":
	fetch_files()
