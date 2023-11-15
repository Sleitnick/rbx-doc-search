from time import time

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
