/*
 * L.MaidenheadSubdivided displays a Maidenhead Locator grid with 10x5 subdivisions.
 */

L.MaidenheadSubdivided = L.LayerGroup.extend({

	
	options: {
		// Line and label color
		color: 'rgba(255, 0, 0, 0.4)',
		// Subdivision line color
		subdivisionColor: 'rgba(100, 100, 100, 0.6)',
		// Show subdivisions
		showSubdivisions: true,
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
		this._map.on('viewreset '+ this.options.redraw, function () {
			grid.redraw();
		});

		this.eachLayer(map.addLayer, map);
	},
	
	onRemove: function (map) {
		// remove layer listeners and elements
		map.off('viewreset '+ this.options.redraw, this.map);
		this.eachLayer(this.removeLayer, this);
	},

	redraw: function () {
		var d3 =         new Array(20,10,10,10,10,10,1 ,1 ,1 ,1 ,1/24,1/24,1/24,1/24,1/24,1/240,1/240,1/240,1/240,1/240/24,1/240/24 );
		var lat_cor =    new Array(0 ,8 ,8 ,8 ,10,14,6 ,8 ,8 ,8 ,1.4 ,2.5 ,3   ,3.5 ,4   ,4    ,3.5  ,3.5  ,3    ,1.8     ,1.6      );
		var bounds = map.getBounds();
        
    
        var zoom = map.getZoom();
        console.log("zoom:",zoom);
        var unit = d3[zoom];
        
        console.log("unit:",unit);

		var lcor = lat_cor[zoom];
		var w = bounds.getWest();
		var e = bounds.getEast();
		var n = bounds.getNorth();
        var s = bounds.getSouth();
        
		if (zoom==1) {var c = 2;} else {var c = 0.1;}
		if (n > 85) n = 85;
		if (s < -85) s = -85;
		var left = Math.floor(w/(unit*2))*(unit*2);
		var right = Math.ceil(e/(unit*2))*(unit*2);
		var top = Math.ceil(n/unit)*unit;
        var bottom = Math.floor(s/unit)*unit;
        
        var myLeft = Math.floor(-71.297798/(unit*2))*(unit*2);
        var myRight = Math.ceil(-71.297798/(unit*2))*(unit*2);
        console.log("unit:",unit);
        console.log("myLeft:",myLeft);
        console.log("myRight:",myRight);

		this.eachLayer(this.removeLayer, this);
		
		// Find the centermost grid square
		var mapCenter = map.getCenter();
		var centerLon = mapCenter.lng;
		var centerLat = mapCenter.lat;
		var centermostSquare = null;
		var minDistance = Infinity;

		// First pass: find the centermost square
		for (var lon = left; lon < right; lon += (unit*2)) {
			for (var lat = bottom; lat < top; lat += unit) {
				var squareCenterLon = lon + unit;
				var squareCenterLat = lat + (unit/2);
				var distance = Math.sqrt(Math.pow(centerLon - squareCenterLon, 2) + Math.pow(centerLat - squareCenterLat, 2));
				
				if (distance < minDistance) {
					minDistance = distance;
					centermostSquare = {lon: lon, lat: lat};
				}
			}
		}

		// Second pass: draw all squares
		for (var lon = left; lon < right; lon += (unit*2)) {
			for (var lat = bottom; lat < top; lat += unit) {
                
                var locatorString = this._getLocator(lon,lat);
                console.log(locatorString);

            var bounds = [[lat,lon],[lat+unit,lon+(unit*2)]];

            var squareLeft = lon;
            var squareBottom = lat;
            var squareTop = lat+unit;
            var squareRight = lon+(unit*2);
            var centerLon = lon+unit;
            var centerLat = lat+(unit/2);
            
            console.log("left,right:",squareLeft,squareRight);
            console.log("top,bottom:",squareTop,squareBottom)
            
            // Main grid square boundary
            this.addLayer(L.rectangle(bounds, {color: this.options.color, weight: 1, fill:false, interactive: false}));

            // Check if this is the centermost square
            var isCentermost = (centermostSquare && lon === centermostSquare.lon && lat === centermostSquare.lat);

            // Add subdivisions if zoom level is high enough and option is enabled - only for centermost square
            if (this.options.showSubdivisions && zoom >= 15 && isCentermost) {
                this._addSubdivisions(squareLeft, squareBottom, squareRight, squareTop, isCentermost);
            }

			// Main grid square label
			this.addLayer(this._getLabel(centerLon, centerLat, locatorString, 'main'));
			}
		}
		return this;
	},

    _addSubdivisions: function(left, bottom, right, top, isCentermost) {
        var width = right - left;
        var height = top - bottom;
        var colWidth = width / 10;  // 10 columns
        var rowHeight = height / 5; // 5 rows

        // Draw vertical subdivision lines (columns)
        for (var i = 1; i < 10; i++) {
            var x = left + (i * colWidth);
            this.addLayer(L.polyline([[bottom, x], [top, x]], {
                color: this.options.subdivisionColor, 
                weight: 0.5, 
                fill: false, 
                interactive: false
            }));
        }

        // Draw horizontal subdivision lines (rows)
        for (var j = 1; j < 5; j++) {
            var y = bottom + (j * rowHeight);
            this.addLayer(L.polyline([[y, left], [y, right]], {
                color: this.options.subdivisionColor, 
                weight: 0.5, 
                fill: false, 
                interactive: false
            }));
        }

        // Add subdivision labels at zoom 15+ - only for centermost square
        if (map.getZoom() >= 15 && isCentermost) {
            this._addSubdivisionLabels(left, bottom, right, top, colWidth, rowHeight);
        }
    },

    _addSubdivisionLabels: function(left, bottom, right, top, colWidth, rowHeight) {
        var letters = ['A', 'B', 'C', 'D', 'E'];
        var width = right - left;
        var height = top - bottom;
        var spacing = Math.min(width, height) * 0.02; // Small spacing based on grid size
        
        // Add column numbers (1-10) just above the top edge
        for (var col = 0; col < 10; col++) {
            var x = left + (col * colWidth) + (colWidth / 2);
            var y = top + spacing; // Position just above top edge
            var label = (col + 1).toString(); // Start from 1, not 0
            
            this.addLayer(this._getLabel(x, y, label, 'subdivision'));
        }
        
        // Add row letters (A-E) just to the left of the left edge, starting from top
        for (var row = 0; row < 5; row++) {
            var x = left - spacing; // Position just to the left of left edge
            var y = top - (row * rowHeight) - (rowHeight / 2); // Start from top (A at top)
            var label = letters[row];
            
            this.addLayer(this._getLabel(x, y, label, 'subdivision'));
        }
    },
    	
	_getLabel: function(lon, lat, text, type) {
	    var title_size = new Array(0 ,10,12,16,20,26,12,16,24,36,12  ,14  ,20  ,36  ,60  ,12   ,20   ,36   ,60   ,12      ,24       );
        var zoom = map.getZoom();
        
        var size, color;
        if (type === 'subdivision') {
            // Use same font size as main grid labels
            size = title_size[zoom] ? title_size[zoom] + 'px' : '16px';
            color = this.options.color; // Use same color as main grid
        } else {
            size = title_size[zoom] ? title_size[zoom] + 'px' : '16px';
            color = this.options.color;
        }

        var title = '<div style="position: absolute; transform: translate(-50%, -50%); white-space: nowrap; cursor: default; text-align: center;"><font style="color:' + color + '; font-size:' + size + '; font-weight: 900;">' + text + '</font></div>';
      
        var myIcon = L.divIcon({
            className: 'my-div-icon', 
            html: title,
            iconSize: [0, 0],
            iconAnchor: [0, 0]
        });
        var marker = L.marker([lat,lon], {icon: myIcon}, clickable=false);
        return marker;
	},
	
	_getLocator: function(lon,lat) {
	  var ydiv_arr=new Array(10, 1, 1/24, 1/240, 1/240/24);
	  var d1 = "ABCDEFGHIJKLMNOPQR".split("");
	  var d2 = "ABCDEFGHIJKLMNOPQRSTUVWX".split("");
      var d4 = new Array(0,1,1,1,1,1,2,2,2,2,3,3,3,3,3,4,4,4,4,5,5);
      var locator = "";
      var x = lon;
      var y = lat;
      var precision = d4[map.getZoom()];
      console.log("precision:",precision)
      while (x < -180) {x += 360;}
      while (x > 180) {x -=360;}
      x = x + 180;
      y = y + 90;
      locator = locator + d1[Math.floor(x/20)] + d1[Math.floor(y/10)];
      for (var i=0; i<4; i=i+1) {
		if (precision > i+1) {
        rlon = x%(ydiv_arr[i]*2);
        rlat = y%(ydiv_arr[i]);
			if ((i%2)==0) {
				locator += Math.floor(rlon/(ydiv_arr[i+1]*2)) +""+ Math.floor(rlat/(ydiv_arr[i+1]));
			} else {
				locator += d2[Math.floor(rlon/(ydiv_arr[i+1]*2))] +""+ d2[Math.floor(rlat/(ydiv_arr[i+1]))];	
			}
		}
	  }  
      return locator;
	},

  
	

});

L.maidenheadSubdivided = function (options) {
	return new L.MaidenheadSubdivided(options);
};