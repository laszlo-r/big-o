(function() {

	function BigO() {

		this.init = function() {

			this.canvas = $('canvas').getContext('2d');
			this.window_resize = Event.on(window, 'resize', function() { window.bigO.lazy_refresh(); })

			this.colors = "ff0000,ffff00,00ff00,00ffff,4444ff,ff00ff"
			this.metrics = { minx: 500, miny: 500, gridx: 20, gridy: 20, griddef: 20, gridmax: 300, gridmin: 0.0001, p: 3, c: 3 }

			this.algorithms = [
				['logarithmic', 'log(n)', 'Math.log(n)', 0, '#ff00ff'], 
				['linear', 'n', 'n', 0, '#8800ff'], 
				['loglinear', 'log(n) * n', 'Math.log(n) * n', 0, ''], 
				['quadratic', 'n^2', 'Math.pow(n, 2)', 0, ''], 
				['polynomial', 'n^p', 'Math.pow(n, p)', 0, ''], 
				['exponential', 'c^n', 'Math.pow(c, n)', 0, ''], 
				['factorial', 'n!', 'bigO.gamma_integral(n)', 0, '']
				// ['factorial', '$A($R(1, n)).reduce(function(a, b) { return a * b; }, 1)']
			]

			this.setup_algorithms()
			this.event_handlers()
			this.setup_ui()
			this.lazy_refresh(50)
		}

		this.setup_algorithms = function() {

			// used for estimating the gamma function (for the non-discrete factorial)
			var integral = function(F, range) {
				var a = range[0], b = range[1], step = range[2], f1 = F(a), f2, area, result = 0

				// sum up areas at each interval
				for (var i = a; i < b; i += step) {
					f2 = F(i + step) // F at the next step
					area = step * (f1 + f2) / 2 // estimated area between f1 and f2
					f1 = f2 // use this on the next step
					if (!Number.isNaN(area)) result += area
				}

				// if (b - a) is not properly dividable by step, we have to add the remaining area
				if (i > b) result += (b - i + step) * (F(b) + F(i - step)) / 2
				return result;
			}

			// range and interval on which gamma should be calculated (gamma gets insignificantly small after x = 10)
			var range = [0, 10, 0.05]

			// the gamma function
			var gamma = function(x, p) { return Math.exp(-x) * Math.pow(x, p); }

			// calculate the gamma integral for a given n
			this.gamma_integral = function(n) { return integral(function(x) { return gamma(x, n); }, range); }

			var colors = this.colors.split(',').map(function(a) { return a.match(/.{2}/g).map(function(b) { return parseInt(b, 16); }); })

			var init_algorithm = function(item, i) {
				this.algorithms[i][3] = new Function("n", "p", "c", "return " + item[2] + ";");
				this.algorithms[i][4] = this.color_map(colors, this.algorithms.length - i - 1, this.algorithms.length - 1)
			}

			this.algorithms.each(init_algorithm, this)
		}

		this.setup_ui = function() {
			$('algorithms').insert({ 
				top: this.algorithms.map(
					function(x) { return "- <b style='color: #" + x[4] + "'>" + x[0] + ":</b> " + x[1]; }
				).join("<br />")
			})
			$('gridx').value = this.metrics.gridx
			$('gridy').value = this.metrics.gridy
			$('p').value = this.metrics.p
			$('c').value = this.metrics.c
		}

		this.event_handlers = function() {

			// scaling by dragging on the canvas
			// scale grid size by powers of 2, essentially doubling/halving every 50 pixels
			var scale = function(x) { return Math.pow(2, x / 50); }

			// normalize gridsize to a given range, then round it to simple numbers (round_to digits, at most max_fraction digits)
			var normalize = function(x, max, min, base) {
				var round_to = 2, max_fraction = 4 // max_fraction is sorta tied to metrics.gridmin

				// multiply scale with the previously set gridsize (so x becomes the desired gridsize)
				x *= base

				// place of most significant digit (100 -> 3; 0.1 -> 0, 0.0001 -> -3)
				var c = Math.floor(Math.log(x) / Math.LN10) + 1

				// a 10-based number which is round_to magnitudes smaller than x (but minimum 0.0001, depending on max_fraction)
				var d = Math.pow(10, Math.max(-max_fraction, c - round_to))

				// round x to the round_to significant digits
				// for example: x = 123,    c = 3, round_to = 2, d = 10,    x = floor(123 / 10) * 10 = 120
				// and another: x = 0.7354, c = 0, round_to = 3, d = 0.001, x = floor(0.7354 / 0.001) * 0.001 = 0.735
				x = Math.floor(x / d) * d

				// contain in the given range (an extremely large or small grid is useless, and distorts calculations anyway)
				x = Math.min(max, Math.max(min, x))

				// digits to show: if < 1, round_to - c (but at most max_fraction digits), otherwise round_to - c (but minimum 0)
				d = c < 0 ? Math.min(max_fraction, round_to - c) : Math.max(0, round_to - c)

				// return normalized number (float with trailing bits) and the converted-to-string number
				return [x, x.toFixed(d)]
			}

			// this is called on mouse dragging
			this.resize_event = function(e) {
				// mouse movement relative to mousedown coordinates
				var dx = e.x - this.mouse.x, 
					dy = -(e.y - this.mouse.y)

				// scale and normalize movement
				dx = normalize(scale(dx), this.metrics.gridmax, this.metrics.gridmin, this.metrics.gridxbase);
				dy = normalize(scale(dy), this.metrics.gridmax, this.metrics.gridmin, this.metrics.gridybase);

				// store the simplified grid sizes
				this.metrics.gridx = dx[0]
				this.metrics.gridy = dy[0]

				// display the properly string-converted sizes
				$('gridx').value = dx[1]
				$('gridy').value = dy[1]

				// don't refresh on every single movement
				this.lazy_refresh(5)
			}

			// hold mouse-related info here
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

			var canvas = $('canvas')
			for (var k in this.mouse)
				if (typeof this.mouse[k] === 'function')
					this.mouse['on' + k] = canvas.on('mouse' + k, this.mouse[k])

			// stop the initiated movement handler, a mousedown event will start it
			this.mouse.onmove.stop()
		}


		this.draw_algorithm = function(item, index) {
			var name = item[0], func = item[3], color = item[4], height = this.metrics.h
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
				this.canvas.fillText(item[1].toFixed(5), x + 120, y);
			}
			list.each(show_value, this)
		}

		this.redraw = function() {
			this.draw_grid()
			this.algorithms.each(this.draw_algorithm, { canvas: this.canvas, metrics: this.metrics })
			// this.show_settings()
		}

		this.update_ui = function() {
			var list = 'gridx,gridy,p,c'
			list.split(',').each(function(item) { $(item).value = this.metrics[item]; }, this)
		}

		this.refresh = function(new_metrics) {
			var start = new Date(), 
				m = this.metrics, 
				canvas = $('canvas'), 
				x = canvas.offsetLeft, y = canvas.offsetTop

			m.offx = x
			m.offy = y
			// available width, assuming a centered canvas
			canvas.width = m.w = Math.max(m.minx, document.viewport.getWidth() - x)
			// available height, minus a constant 5 to avoid scrolling (chrome)
			canvas.height = m.h = Math.max(m.miny, document.viewport.getHeight() - y - 5)

			// update metrics with valid numbers
			if (typeof new_metrics === 'object') {
				for (var k in new_metrics)
					if (typeof new_metrics[k] === 'number' && !Number.isNaN(new_metrics[k]))
						m[k] = new_metrics[k]
				if (new_metrics.reset) m.gridx = m.gridy = m.griddef
				this.update_ui()
			}

			this.redraw()
			// this.debug('refresh at ' + start.toLocaleString() + ' in ' + ((new Date()).getTime() - start.getTime()) / 1000 + ' seconds')
			return false;
		}

		this.lazy_refresh = function(time) {
			if (this.last_resize_id) clearTimeout(this.last_resize_id)
			this.last_resize_id = setTimeout(function() { bigO.refresh(); }, time || 100)
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
