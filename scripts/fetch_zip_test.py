import requests
import config
import write
from zipfile import ZipFile
import io
import re
import yaml
from time import time

try:
	from yaml import CLoader as Loader
except ImportError:
	from yaml import Loader

metadata_pattern = re.compile("---(.+?)---", re.DOTALL)

engine_ref_items = ["properties", "methods", "events", "callbacks", "items", "functions"]

class TaskTimer:
	tracking = dict()
	labels: list[tuple[str, float, bool]] = list()

	def _format_time(self, t: float):
		if t < 1.0:
			ms = t * 1000
			return f"{round(ms)}ms"
		else:
			return f"{round(t, 2)}s"
	
	def start(self, label: str):
		self.labels.append((label, time(), True))

	def stop(self):
		now = time()
		if len(self.labels) <= 0:
			return
		
		latest = self.labels[-1]
		if latest[2]:
			self.labels[-1] = (latest[0], now - latest[1], False)
			# print(f"{self.labels[-1][0]}: {self.labels[-1][1]}")
	
	def output(self, prefix: str):
		str_build = list()

		elapsed_total = sum(
			map(
				lambda item: item[1],
				self.labels
			)
		)

		str_build.append(f"{prefix} [total: {self._format_time(elapsed_total)}]")

		for item in self.labels:
			str_build.append(f"[{item[0]}: {self._format_time(item[1])}]")

		print(" ".join(str_build))

def fetch_zip() -> ZipFile:
	print("downloading...")
	data_res = requests.get("https://github.com/Roblox/creator-docs/archive/refs/heads/main.zip", headers=config.req_headers)
	data_res.raise_for_status()

	zip_file = ZipFile(io.BytesIO(data_res.content), "r")

	return zip_file

def get_zip_filepaths(zip_file: ZipFile):
	return list(
		filter(
			lambda filename: "content/en-us" in filename and (filename.endswith(".md") or filename.endswith(".yaml")),
			map(
				lambda zip_info: zip_info.filename,
				zip_file.filelist
			)
		)
	)

def zip_filepaths_to_urls(filepaths: list[str]):
	return list(
		map(
			lambda filename: filename[filename.find("content/en-us/"):],
			filepaths
		)
	)

def get_md_metadata(filepath, url, content):
	metadata_match = metadata_pattern.match(content)
	
	if metadata_match is None:
		print("> Failed to get metadata")
		return {
			"path": url,
		}
	else:
		metadata_str = metadata_match.group(1)
		metadata_dict = yaml.load(metadata_str, Loader=Loader)
		
		metadata_dict["path"] = url
		metadata_dict["type"] = "article"
		
		return metadata_dict

def get_yaml_metadata(filepath, url, content):
	data = yaml.load(content, Loader=Loader)

	metadata_dict = dict()
	metadata_dict["title"] = data["name"]
	metadata_dict["type"] = data["type"]
	metadata_dict["path"] = url

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
			# Skip deprecated items
			if "tags" in item and item["tags"] is not None and "Deprecated" in item["tags"]:
				continue

			subitem = dict()
			subitem["type"] = key
			if data["type"] == "enum":
				subitem["title"] = data["name"] + "." + item["name"]
			else:
				subitem["title"] = item["name"]
			if "summary" in item and item["summary"]:
				subitem["description"] = item["summary"]

			subitems.append(subitem)
	
	return metadata_dict

def get_metadata(zip_file: ZipFile, md_yaml_filepath: str, url: str):
	# print(f"fetching metadata for: {md_yaml_filepath}")
		
	with zip_file.open(md_yaml_filepath, "r") as file:
		content = file.read().decode("utf-8")

	if md_yaml_filepath.endswith(".md"):
		return get_md_metadata(md_yaml_filepath, url, content)
	elif md_yaml_filepath.endswith(".yaml"):
		return get_yaml_metadata(md_yaml_filepath, url, content)

def main():
	timer = TaskTimer()

	timer.start("download")
	with fetch_zip() as zip_file:
		timer.stop()

		timer.start("prepare")
		filepaths = get_zip_filepaths(zip_file)
		urls = zip_filepaths_to_urls(filepaths)
		timer.stop()

		print(f"fetching metadata [{len(filepaths)} files]...")

		timer.start("parse")
		metadata = list()
		for filepath, url in zip(filepaths, urls):
			metadata.append(get_metadata(zip_file, filepath, url))
		timer.stop()

		timer.start("write")
		write.write_json(metadata, "files_metadata.json")
		timer.stop()
	
	timer.output("done")

if __name__ == "__main__":
	main()
