(function() {

	function BigO() {

		this.init = function() {

			this.canvas = $('canvas').getContext('2d');
			this.window_resize = Event.on(window, 'resize', function() { window.bigO.lazy_refresh(); })


			var colors = "ff0000,ffff00,00ff00,00ffff,6666ff"
			colors = colors.split(',').map(function(a) { return a.match(/.{2}/g).map(function(b) { return parseInt(b, 16); }); })

			this.state = {
				update: function(items) { for (var k in items) this[k] = items[k]; return this; }, 

				metrics: {
					canvas: { x: 600, y: 600, mx: 1200, my: 750 }
				}
			}

			this.algorithms = $A([
				['logarithmic', 'Math.log(n) / Math.LN2'], 
				['linear', 'n'], 
				['loglinear', 'Math.log(n) / Math.LN2 * n'], 
				['quadratic', 'Math.pow(n, 2)'], 
				['polynomial', 'Math.pow(n, p)'], 
				['exponential', 'Math.pow(c, n)'], 
				['factorial', 'Math.pow(c, n)']
			])


			var init_function = function(item, i) {
				this.algorithms[i][2] = new Function("n", "p", "c", "return " + item[1] + ";");
				this.algorithms[i][3] = this.color_map(colors, this.algorithms.length - i - 1, this.algorithms.length - 1)
			}
			this.algorithms.each(init_function, this)

			this.lazy_refresh(50)

		}

		this.draw_function = function(item) {
			var func = item[2], color = item[3], max = $('canvas').height
			var steps = 100, pad = 10, x, y, value
			this.canvas.lineWidth = 2
			this.canvas.fillStyle = this.canvas.strokeStyle = '#' + color
			this.canvas.font = "normal 12px verdana"
			this.canvas.beginPath()
			for (var i = 0; i < steps; i++) {
				value = func(i, this.p, this.c)
				x = i * this.n / steps
				y = max - value
				if (value > 0) this.canvas[i ? 'lineTo' : 'moveTo'](x, y)
				if (value > max || i == steps - 1) {
					x = Math.min(x, this.n - this.canvas.measureText(item[0]).width - pad)
					y = value > max ? 2 * pad : y - pad
					this.canvas.fillText(item[0], x, y)
					break
				}
			}
			this.canvas.stroke()
			this.canvas.closePath()
		}

		this.redraw = function(n) {

			this.algorithms.each(this.draw_function, { canvas: this.canvas, n: n, p: 3, c: 1.1 })

		}

		this.refresh = function() {
			var start = new Date(), 
				size = this.state.metrics.canvas, 
				canvas = $('canvas'), 
				x = canvas.offsetLeft, y = canvas.offsetTop

			// available width, assuming a centered canvas
			canvas.width = size.w = Math.max(size.x, document.viewport.getWidth() - x * 2)
			// available height, minus a constant 5 to avoid scrolling (chrome)
			canvas.height = size.h = Math.max(size.y, document.viewport.getHeight() - y - 5)

			this.redraw(canvas.width)
			this.debug('refresh at ' + start.toLocaleString() + ' in ' + ((new Date()).getTime() - start.getTime()) / 1000 + ' seconds')
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
