import os

token = os.environ["GH_PAT"]

req_headers = {
	"Authorization": f"Bearer {token}",
	"Accept": "application/vnd.github+json",
	"X-GitHub-Api-Version": "2022-11-28",
}
