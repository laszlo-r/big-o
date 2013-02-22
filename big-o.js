(function() {

	function BigO() {

		this.init = function() {

			this.canvas = $('canvas').getContext('2d');
			this.window_resize = Event.on(window, 'resize', function() { window.bigO.lazy_refresh(); })

			var colors = "ff0000,ffff00,00ff00,6666ff"
			colors = colors.split(',').map(function(a) { return a.match(/.{2}/g).map(function(b) { return parseInt(b, 16); }); })

			this.metrics = { minx: 500, miny: 500, gridx: 20, gridy: 20, p: 3, c: 3 }

			this.algorithms = [
				['logarithmic', 'Math.log(n) / Math.LN2'], 
				['linear', 'n'], 
				['loglinear', 'Math.log(n) / Math.LN2 * n'], 
				['quadratic', 'Math.pow(n, 2)'], 
				['polynomial', 'Math.pow(n, p)'], 
				['exponential', 'Math.pow(c, n)'], 
				['factorial', 'bigO.gamma_integral(n)']
				// ['factorial', '$A($R(1, n)).reduce(function(a, b) { return a * b; }, 1)']
			]

			var integral = function(F, a, b, step) {
				var area = function(x) { return step * (F(x + step) + F(x)) / 2; }
				var value, result = 0
				for (var i = a; i < b; i += step) {
					value = area(i)
					if (!Number.isNaN(value)) result += value
				}
				if (i > b) result += (b - i + step) * (F(b) + F(i - step)) / 2
				return result;
			}

			var irange = [0, 10, 0.05]
			var gamma = function(x, p) { return Math.exp(-x) * Math.pow(x, p); }
			this.gamma_integral = function(n) { return integral(function(x) { return gamma(x, n); }, irange[0], irange[1], irange[2]); }

			var init_function = function(item, i) {
				this.algorithms[i][2] = new Function("n", "p", "c", "return " + item[1] + ";");
				this.algorithms[i][3] = this.color_map(colors, this.algorithms.length - i - 1, this.algorithms.length - 1)
			}

			this.algorithms.each(init_function, this)
			this.event_handlers()
			this.lazy_refresh(50)

		}

		this.event_handlers = function() {

			this.resize_event = function(e) {
				var dx = e.x - this.mouse.x, 
					dy = e.y - this.mouse.y

				// scaling by canvas dragging
				// var scale = function(d) { return Math.pow(2, d / 50); }
				// this.metrics.gridx = this.metrics.gridxbase * scale(dx)
				// this.metrics.gridy = this.metrics.gridybase * scale(-dy)

				// scaling by dragging the 2x2 point of the grid
				this.metrics.gridx = (e.x - this.metrics.offx) / 2
				this.metrics.gridy = (this.metrics.h - e.y + this.metrics.offy) / 2

				// console.log([this.metrics.gridx, this.metrics.gridy, dx, dy].join(', '))
				this.lazy_refresh(5)
				this.refresh()
			}

			var canvas = $('canvas')

			this.mouse = {
				x: 0, 
				y: 0, 
				is_over: 0, 
				is_down: 0, 
				move: function(e) { bigO.resize_event(e) }, 
				over: function(e) { bigO.mouse.is_over = 1; }, 
				out: function(e) { bigO.mouse.is_over = 0; }, 
				down: function(e) {
					if (!bigO.mouse.is_over) return
					bigO.mouse.is_down = 1
					bigO.mouse.x = e.x
					bigO.mouse.y = e.y
					bigO.mouse.onmove.start()
					bigO.metrics.gridxbase = bigO.metrics.gridx
					bigO.metrics.gridybase = bigO.metrics.gridy
				}, 
				up: function(e) {
					bigO.mouse.is_down = 0;
					bigO.mouse.onmove.stop()
				}
			}

			for (var k in this.mouse)
				if (typeof this.mouse[k] === 'function')
					this.mouse['on' + k] = canvas.on('mouse' + k, this.mouse[k])

			this.mouse.onmove.stop()
		}


		this.draw_algorithm = function(item, index) {
			var name = item[0], func = item[2], color = item[3], height = this.metrics.h
			var x, y, value, pad = 10, s, steps = 5, max_steps, gridx = this.metrics.gridx, gridy = this.metrics.gridy

			// gridx and gridy represent the size of an 1*1 grid in pixels
			// we want to draw on this grid, but also at 10..20 pixel steps

			// number of 10+ pixel steps fitting into one grid block: 2^floor(log2(gridx / steps))
			steps = Math.pow(2, Math.floor(Math.log(gridx / steps) / Math.LN2))
			// number of total steps fitting onto the canvas
			max_steps = (s = Math.floor(gridx / 2)) + Math.floor(steps * (this.metrics.w / gridx - 1))

			this.canvas.font = "normal 12px verdana"
			this.canvas.lineWidth = 3
			this.canvas.fillStyle = this.canvas.strokeStyle = '#' + color
			this.canvas.beginPath()

			for (var i = 0; i < max_steps; i++) {
				x = i <= s ? i / s : 1 + (i - s) / steps
				value = func(x, this.metrics.p, this.metrics.c)
				x = gridx * x//i / steps
				y = height - gridy * value
				this.canvas[i ? 'lineTo' : 'moveTo'](x, y)
				if (y < 0) break
			}

			// find an endpoint for the label
			// x = Math.min(x, this.n - this.canvas.measureText(name).width - pad)
			// y = (value > height ? 2 * pad : y - pad) + (index % 2 ? 50 : 0)
			// this.canvas.fillText(name, x, y)

			this.canvas.stroke()
			this.canvas.closePath()
		}

		this.draw_grid = function() {
			var x = this.metrics.gridx, y = this.metrics.gridy, h = this.metrics.h
			var lines = [
				[[0, h - y], [2 * x, h - y]], 
				[[x, h - 2 * y], [x, h]], 
				[[0, h - 2 * y], [2 * x, h - 2 * y], [2 * x, h]]
			]
			this.canvas.lineWidth = 1
			this.canvas.strokeStyle = "#666"
			var draw_line = function(line) {
				this.canvas.beginPath()
				this.canvas.moveTo(line[0][0], line[0][1])
				line.slice(1).each(function(item) { this.canvas.lineTo(item[0], item[1]); }, this)
				this.canvas.stroke()
				this.canvas.closePath()
			}
			lines.each(draw_line, this)
		}

		this.show_settings = function() {
			var gridx = this.metrics.gridx, gridy = this.metrics.gridy
			var list = [
				['grid X size', gridx], 
				['grid Y size', gridy], 
				['polynomial base', this.metrics.p], 
				['exponential base', this.metrics.c]
			]
			var show_value = function(item, i) {
				var x = this.metrics.w - 200, y = (i + 1) * 20
				this.canvas.fillStyle = "rgba(200, 200, 200, 0.2)"
				this.canvas.fillRect(x - 5, y - 15, 200, 20)
				this.canvas.fillStyle = "#eee"
				this.canvas.fillText(item[0], x, y);
				this.canvas.fillText(item[1].toFixed(3), x + 120, y);
			}
			list.each(show_value, this)
		}

		this.redraw = function() {
			this.draw_grid()
			this.algorithms.each(this.draw_algorithm, { canvas: this.canvas, metrics: this.metrics })
			this.show_settings()
		}

		this.refresh = function() {
			var start = new Date(), 
				m = this.metrics, 
				canvas = $('canvas'), 
				x = canvas.offsetLeft, y = canvas.offsetTop

			m.offx = x
			m.offy = y
			// available width, assuming a centered canvas
			canvas.width = m.w = Math.max(m.minx, document.viewport.getWidth() - x * 2)
			// available height, minus a constant 5 to avoid scrolling (chrome)
			canvas.height = m.h = Math.max(m.miny, document.viewport.getHeight() - y - 5)

			this.redraw()
			// this.debug('refresh at ' + start.toLocaleString() + ' in ' + ((new Date()).getTime() - start.getTime()) / 1000 + ' seconds')
		}

		this.lazy_refresh = function(time) {
			if (this.last_resize_id) clearTimeout(this.last_resize_id)
			this.last_resize_id = setTimeout(function() { bigO.refresh(); }, time || 500)
		}



		this.hex = function(x) { return ('0' + x.toString(16)).slice(-2); }
		this.hex_color = function(x) { return x.map(this.hex).join(''); }
		this.color_diff = function(a, b, index, ratio) { return parseInt(a[index] + (b[index] - a[index]) * ratio, 10) || 0; }

		// calculate the color of (index/max)% on a color list
		this.color_map = function(colors, index, max) {
			if (max) index /= max
			if (index < 0) index += 1 // revert colormap for negatives

			// edge cases, string values
			if (index <= 0 || Number.isNaN(index / 1)) return this.hex_color(colors[0])
			if (index >= 1) return this.hex_color(colors.slice(-1)[0])

			// the ratio between two colors
			var step = 1 / (colors.length - 1), ratio = (index % step) / step, i = parseInt(index / step, 10)

			return this.hex_color([0, 1, 2].map(function(a) { return this.color_diff(colors[i], colors[i + 1], a, ratio); }, this))
		}


		// convert to int, ignore NaN
		this.int = function(x, base) { return parseInt(x, base || 10) || 0; }

		this.debug = function(stuff) { console.log(stuff); }

		document.observe("dom:loaded", function() { window.bigO.init(); });

	}

	window.bigO = new BigO();

})();
