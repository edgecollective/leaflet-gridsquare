/*
 * L.ViewportGrid displays a 10x5 grid overlay on the entire visible map area.
 */

L.ViewportGrid = L.LayerGroup.extend({

	options: {
		// Grid line color
		gridColor: 'rgba(0, 0, 0, 1)',
		// Label color
		labelColor: 'rgba(0, 0, 0, 1)',
		// Show grid
		showGrid: true,
		// Redraw on move or moveend
		redraw: 'moveend'
	},

	initialize: function (options) {
		L.LayerGroup.prototype.initialize.call(this);
		L.Util.setOptions(this, options);
	},

	onAdd: function (map) {
		this._map = map;
		var grid = this.redraw();
		this._map.on('viewreset zoomend ' + this.options.redraw, function () {
			grid.redraw();
		});

		this.eachLayer(map.addLayer, map);
	},
	
	onRemove: function (map) {
		// remove layer listeners and elements
		map.off('viewreset zoomend ' + this.options.redraw, this.redraw, this);
		this.eachLayer(this.removeLayer, this);
	},

	redraw: function () {
		// Clear existing layers
		this.eachLayer(this.removeLayer, this);
		
		if (!this.options.showGrid) {
			return this;
		}

		// Get current map bounds
		var bounds = this._map.getBounds();
		var viewportWest = bounds.getWest();
		var viewportEast = bounds.getEast();
		var viewportNorth = bounds.getNorth();
		var viewportSouth = bounds.getSouth();
		
		// Calculate viewport dimensions
		var viewportWidth = viewportEast - viewportWest;
		var viewportHeight = viewportNorth - viewportSouth;
		
		// Calculate label offsets for alignment
		var labelOffsetH = viewportWidth * 0.02; // 2% horizontal offset
		var labelOffsetV = viewportHeight * 0.02; // 2% vertical offset
		
		// Create 2:1 ratio bounding rectangle that aligns with label positions
		var availableWidth = viewportWidth - (labelOffsetH * 2); // Account for left label space
		var availableHeight = viewportHeight - (labelOffsetV * 2); // Account for top label space
		var scale = 0.75; // Slightly larger since we have more space
		
		var rectWidth, rectHeight;
		
		// Determine dimensions to maintain 2:1 ratio within available space
		if (availableWidth / availableHeight > 2) {
			// Available space is wider than 2:1, constrain by height
			rectHeight = availableHeight * scale;
			rectWidth = rectHeight * 2;
		} else {
			// Available space is narrower than 2:1, constrain by width
			rectWidth = availableWidth * scale;
			rectHeight = rectWidth / 2;
		}
		
		// Position rectangle to align with label positions
		var west = viewportWest + labelOffsetH;
		var east = west + rectWidth;
		var north = viewportNorth - labelOffsetV;
		var south = north - rectHeight;
		
		// Draw the bounding rectangle
		this.addLayer(L.rectangle([[south, west], [north, east]], {
			color: this.options.gridColor, 
			weight: 2, 
			fill: false, 
			interactive: false
		}));
		
		// Calculate grid dimensions within the bounding rectangle
		var colWidth = rectWidth / 10;  // 10 columns
		var rowHeight = rectHeight / 5; // 5 rows
		
		// Draw vertical grid lines (columns) within bounding rectangle
		for (var i = 1; i < 10; i++) {
			var x = west + (i * colWidth);
			this.addLayer(L.polyline([[south, x], [north, x]], {
				color: this.options.gridColor, 
				weight: 0.8, 
				fill: false, 
				interactive: false
			}));
		}

		// Draw horizontal grid lines (rows) within bounding rectangle
		for (var j = 1; j < 5; j++) {
			var y = south + (j * rowHeight);
			this.addLayer(L.polyline([[y, west], [y, east]], {
				color: this.options.gridColor, 
				weight: 0.8, 
				fill: false, 
				interactive: false
			}));
		}

		// Add labels outside the bounding rectangle
		this._addLabels(west, south, east, north, colWidth, rowHeight);
		
		return this;
	},

	_addLabels: function(west, south, east, north, colWidth, rowHeight) {
		var letters = ['A', 'B', 'C', 'D', 'E'];
		var width = east - west;
		var height = north - south;
		
		// Get viewport bounds and calculate label offset
		var viewportBounds = this._map.getBounds();
		var viewportNorth = viewportBounds.getNorth();
		var viewportWest = viewportBounds.getWest();
		var viewportWidth = viewportBounds.getEast() - viewportBounds.getWest();
		var viewportHeight = viewportBounds.getNorth() - viewportBounds.getSouth();
		
		// Small offset to shift labels slightly inward
		var labelOffsetH = viewportWidth * 0.02; // 2% horizontal offset
		var labelOffsetV = viewportHeight * 0.02; // 2% vertical offset
		
		// Add column numbers (1-10) slightly down from the top
		for (var col = 0; col < 10; col++) {
			var x = west + (col * colWidth) + (colWidth / 2);
			var y = viewportNorth - labelOffsetV; // Position slightly down from top
			var label = (col + 1).toString(); // Start from 1, not 0
			
			this.addLayer(this._getLabel(x, y, label));
		}
		
		// Add row letters (A-E) slightly right from the left edge, starting from top
		for (var row = 0; row < 5; row++) {
			var x = viewportWest + labelOffsetH; // Position slightly right from left edge
			var y = north - (row * rowHeight) - (rowHeight / 2); // Start from top (A at top)
			var label = letters[row];
			
			this.addLayer(this._getLabel(x, y, label));
		}
	},
	
	_getLabel: function(lon, lat, text) {
		var zoom = this._map.getZoom();
		
		// Calculate larger font size based on viewport
		var bounds = this._map.getBounds();
		var width = bounds.getEast() - bounds.getWest();
		var height = bounds.getNorth() - bounds.getSouth();
		var viewportSize = Math.min(width, height);
		
		// Larger base font size calculation
		var baseFontSize = Math.max(16, Math.min(48, viewportSize * 200 / zoom));
		var size = baseFontSize + 'px';

		var title = '<div style="position: absolute; transform: translate(-50%, -50%); white-space: nowrap; cursor: default; text-align: center;"><font style="color:' + this.options.labelColor + '; font-size:' + size + '; font-weight: 900;">' + text + '</font></div>';
	  
		var myIcon = L.divIcon({
			className: 'viewport-grid-label', 
			html: title,
			iconSize: [0, 0],
			iconAnchor: [0, 0]
		});
		var marker = L.marker([lat, lon], {icon: myIcon, interactive: false});
		return marker;
	}
});

L.viewportGrid = function (options) {
	return new L.ViewportGrid(options);
};