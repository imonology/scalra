
        // TODO: find IE-compilable method (Element is not defined)
        // detect origin position on screen
        Element.prototype.leftTopScreen = function () {
            var x = this.offsetLeft;
            var y = this.offsetTop;       
            return new Array (x, y);
        }
        
        var Display = {    
            DEFAULT_EDGEWIDTH: 2,
            
            // boundary for this display (length & width)
            bound: [0,0],
                               
            // a list of edges to be drawn (each edge has 'a' and 'b' points, each point has 'x' & 'y')
            edges: [],
            
            // a number array of current OX symbols, 0: O, 1: X
            sites: [],
            
            // a list of circles to draw
            circles: [],
                            
            // where to draw
            canvas: undefined,
            
            // where to put text
            textarea: undefined,
            
            // title
            title: undefined,
            
            // topleft coordinates
            topleft: undefined,
            
            // re-obtain origin point
            refreshOrigin: function () {
                if (this.canvas !== undefined)
                    this.topleft = this.canvas.leftTopScreen();
            },
            
            init: function (bound, canvas, text, title) {

				console.log('Display.init called');
					
                // store reference to drawing areas
                this.bound = bound || this.bound;   
                this.canvas = canvas || this.canvas;
                this.textarea = text || this.textarea;
                this.title = title || this.title;
                
                // clear all data
                this.edges = [];
                this.sites = [];
                this.circles = [];       
            },
            
            // replace content
            update: function (data) {
    
                this.refreshOrigin();  
    
                // either update to new, or keep existing
                this.edges = (data.edges ? data.edges : this.edges);
                this.sites = (data.nodes ? data.nodes : this.sites);
                this.circles = (data.circles ? data.circles : this.circles);
                
				//console.log('updating ' + data.circles.length + ' circles');
				//console.log('updating ' + this.circles.length + ' this.circles');
				
                this.render();
            },
            
                    
            // draw an edge between two cells
            drawCells: function (a, b) {
                var x = a % 3, y = Math.floor(a / 3);
                a = {x: this.bound.x/6 + (x * this.bound.x/3), y: this.bound.y/6 + (y * this.bound.y/3)};
                x = b % 3, y = Math.floor(b / 3);
                b = {x: this.bound.x/6 + (x * this.bound.x/3), y: this.bound.y/6 + (y * this.bound.y/3)};
                
                this.edges.push({a: a, b: b, w: 7});
                this.render();                 
            },
            
            // output a text
            writeText: function (msg) {
                this.textarea.value += (msg + '\n');
                this.textarea.scrollTop = this.textarea.scrollHeight
            },
                          
            // draw screen
            render: function () {
                    
                // check if loaded
                if (this.canvas == null)
                    return;
                    
				var ctx = this.canvas.getContext('2d');
                
                function draw_circle(x,y,r) {
                    ctx.beginPath();
                    ctx.arc(x, y, r, 0, Math.PI*2, true);
                    ctx.stroke();
                }           
    
                function draw_cross(curr_x, curr_y, radius) {
                    ctx.beginPath();                
                    ctx.moveTo(curr_x - radius, curr_y - radius);
                    ctx.lineTo(curr_x + radius, curr_y + radius);
                    ctx.moveTo(curr_x + radius, curr_y - radius);
                    ctx.lineTo(curr_x - radius, curr_y + radius);                    
                    ctx.stroke();
                }
                
                function draw_edge(edge) {
                    ctx.beginPath();
                    ctx.strokeStyle='#000';                
                    var w = (typeof edge.w !== 'undefined' ? edge.w : Display.DEFAULT_EDGEWIDTH);
                    ctx.lineWidth = w; 
					//console.log('width: ' + w);
					ctx.moveTo(edge.a.x, edge.a.y);
					ctx.lineTo(edge.b.x, edge.b.y);
                    ctx.stroke();            
                }
                                       
				// clear background
				ctx.globalAlpha = 1;
    
				ctx.beginPath();
				ctx.rect(0,0,this.canvas.width,this.canvas.height);
				ctx.fillStyle = 'white';
				ctx.fill();
				ctx.strokeStyle = '#888';            
				ctx.stroke();
							
                // edges
				var edges = this.edges,
					iEdge = edges.length;
                    
                //console.log('drawing ' + iEdge + ' edges...');
				while (iEdge--)
					draw_edge(edges[iEdge]);
				            
                // restore line width
                ctx.lineWidth = Display.DEFAULT_EDGEWIDTH;
                
                // circles
				//console.log('drawing circles: ' + this.circles.length);
                for (var i=0; i < this.circles.length; i++) {
                    var c = this.circles[i];
					//console.log('x: ' + c.x + ' y: ' + c.y + ' r: ' + c.r);
                    draw_circle(c.x, c.y, c.r);
                }
                
				// sites
				var sites = this.sites;
                    
                // set up drawing center x & y
                var curr_x = this.bound.x/6;
                var curr_y = this.bound.y/6;
                var radius = (this.bound.x/3/3);
                
				for (var iSite = 0; iSite < sites.length; iSite++) {
					v = sites[iSite];
					// v can be 0 (for 'X') or 1 (for 'O')
                    if (v === 1) {
                        draw_cross(curr_x, curr_y, radius);
                    }
                    else if (v === 0) {
                        // draw 'O'
                        draw_circle(curr_x, curr_y, radius);
                    }         
                    // otherwise we don't draw
                    
                    curr_x += this.bound.x/3;
                    // check for going to next row
                    if (curr_x > this.bound.x) {
                        curr_x = this.bound.x/6;
                        curr_y += this.bound.y/3;
                    }
				} 
            }   
        }; // end Display
    

// make module usable in both node.js and webpage    
if (typeof module !== 'undefined')
	module.exports = Display;        