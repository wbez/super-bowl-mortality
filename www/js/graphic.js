// Configuration
var GRAPHIC_ID = '#graphic';
var GRAPHIC_DATA_URL = 'super_bowl_data_transpose_2015.csv';
var LEGEND_DATA_URL = 'franchise_info_2015.csv';
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 540;

var GRAPHIC_MARGIN = {
    top: 5,
    right: 15,
    bottom: 30,
    left: 50
};

// D3 formatters
var fmtComma = d3.format(',');
var fmtYearAbbrev = d3.time.format('%y');
var fmtYearFull = d3.time.format('%Y');
var fmtMillions = d3.format(".2s");

d3.selection.prototype.moveToFront = function() {
  return this.each(function(){
    this.parentNode.appendChild(this);
  });
};

// Globals
var $graphic = null;
var pymChild = null;
var graphicData = null;
var legendData = null;
var isMobile = false;

/*
 * Initialize graphic
 */
var onWindowLoaded = function() {
    $graphic = $(GRAPHIC_ID);

    if (Modernizr.svg) {
        d3.csv(LEGEND_DATA_URL, function(error, data) {
            legendData = data;
            d3.csv(GRAPHIC_DATA_URL, onDataLoaded);
        });
    } else {
        pymChild = new pym.Child({});
    }
}

/*
 * CSV loaded
 */
var onDataLoaded = function(error, data) {
    graphicData = data;
    graphicData.forEach(function(d) {
        d['date'] = fmtYearFull.parse(d['year']);
    });

    pymChild = new pym.Child({
        renderCallback: render
    });
}

/*
 * Render the graphic(s)
 */
var render = function(containerWidth) {
    $graphic = $(GRAPHIC_ID);
    $cubs = $('#cubs')
    
    // Fallback if page is loaded outside of an iframe
    if (!containerWidth) {
        containerWidth = $graphic.parent().width();
    }

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    // Clear out existing graphic (for re-drawing)
    $graphic.empty();

    drawGraph(containerWidth, GRAPHIC_ID, graphicData, setGraphSelection);

    // Resize iframe to fit
    if (pymChild) {
        pymChild.sendHeight();
    }
}

$( window ).resize(function(){
    render();
})

var setGraphSelection = function(){
    console.log('trigger')
    var event = new Event('change');
    document.getElementById("teams").dispatchEvent(event);
}

/*
 * DRAW THE GRAPH
 */
var drawGraph = function(graphicWidth, id, data, callback) {
    var graph = d3.select(id);

    var color = d3.scale.ordinal()
        .range(['#97233F','#A71930','#241773','#00338D','#0085CA','#0B162A','#FB4F14','#FB4F14','#ACC0C6','#FB4F14','#005A8B','#203731','#03202F','#002C5F','#006778','#FFB612','#008E97','#4F2683','#002244','#9F8958','#0B2265','#203731','#A5ACAF','#004953','#FFB612','#FFB612','#AA0000','#69BE28','#002244','#D50A0A','#4B92DB','#773141']);

    // Desktop / default
    var aspectWidth = 16;
    var aspectHeight = 9;
    var ticksX = 10;
    var ticksY = 10;

    // Mobile
    if (isMobile) {
        aspectWidth = 4;
        aspectHeight = 3;
        ticksX = 5;
        ticksY = 5;
    }

    // define chart dimensions
    var width = graphicWidth - GRAPHIC_MARGIN['left'] - GRAPHIC_MARGIN['right'];
    var height = Math.ceil((graphicWidth * aspectHeight) / aspectWidth) - GRAPHIC_MARGIN['top'] - GRAPHIC_MARGIN['bottom'];

    var x = d3.time.scale()
        .range([ 0, width ])

    var y = d3.scale.linear()
        .range([ height, 0 ]);

    // define axis and grid
    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(function(d, i) {
            if (isMobile) {
                return '\u2019' + fmtYearAbbrev(d);
            } else {
                return fmtYearFull(d);
            }
        });

    var xAxisGrid = function() {
        return xAxis;
    }

    var yAxis = d3.svg.axis()
        .orient('left')
        .scale(y)
        .ticks(ticksY)
        .tickFormat(function(d) { return fmtMillions(d).replace('M', ' mil')});

    var yAxisGrid = function() {
        return yAxis;
    }

    // define the line(s)
    var line = d3.svg.line()
        .defined(function(d) { return d['amt'] != 'NaN'; })
        .interpolate('monotone')
        .x(function(d) {
            return x(d['date']);
        })
        .y(function(d) {
            return y(d['amt']);
        });

    var area = d3.svg.area()
        .defined(function(d) { return d['amt'] != 'NaN'; })
        .x(function(d) { return x(d['date']); })
        .y0(height)
        .y1(function(d) { return y(d['amt']); });

    // assign a color to each line
    color.domain(d3.keys(graphicData[0]).filter(function(key) {
        return key !== 'year';
    }));

    // parse data into columns
    var formattedData = {};
    for (var column in graphicData[0]) {
        if (column == 'date') continue;
        formattedData[column] = graphicData.map(function(d) {
            return { 'date': d['date'], 'amt': d[column] };
// filter out empty data. uncomment this if you have inconsistent data.
//        }).filter(function(d) {
//            return d['amt'].length > 0;
        });
    }

    // set the data domain
    x.domain(d3.extent(graphicData, function(d) {
        return d['date'];
    }));

    y.domain([ 0, d3.max(d3.entries(formattedData), function(c) {
            return d3.max(c['value'], function(v) {
                var n = v['amt'];
                return Math.ceil(n/5) * 5; // round to next 5
            });
        })
    ]);

    // draw the chart
    var svg = graph.append('svg')
		.attr('width', width + GRAPHIC_MARGIN['left'] + GRAPHIC_MARGIN['right'])
		.attr('height', height + GRAPHIC_MARGIN['top'] + GRAPHIC_MARGIN['bottom'])
        .append('g')
            .attr('transform', 'translate(' + GRAPHIC_MARGIN['left'] + ',' + GRAPHIC_MARGIN['top'] + ')');

    // x-axis (bottom)
    svg.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxis);

    // y-axis (left)
    svg.append('g')
        .attr('class', 'y axis')
        .call(yAxis);

    // x-axis gridlines
    svg.append('g')
        .attr('class', 'x grid')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxisGrid()
            .tickSize(-height, 0, 0)
            .tickFormat('')
        );

    // y-axis gridlines
    svg.append('g')
        .attr('class', 'y grid')
        .call(yAxisGrid()
            .tickSize(-width, 0, 0)
            .tickFormat('')
        );

    // draw the area
    svg.append('g')
        .attr('class', 'areas')
        .selectAll('path')
        .data(d3.entries(formattedData))
        .enter()
        .append('path')
            .attr('class', function(d, i) {
                var n = '';
                if (d['key'] == '49ers'){
                    n = 'niners'
                } else {
                    n = classify(d['key'])
                }
                return 'area area-' + i + ' ' + n;
            })
            .attr("d", function(d) {
                return area(d['value']);
            })
            .style("opacity", 0.1)
            .style("fill", function(d) { return color(d['key']);});

    // draw the line(s)
    svg.append('g')
        .attr('class', 'lines')
        .selectAll('path')
        .data(d3.entries(formattedData))
        .enter()
        .append('path')
            .attr('class', function(d, i) {
                var n = '';
                if (d['key'] == '49ers'){
                    n = 'niners'
                } else {
                    n = classify(d['key'])
                }
                return 'line line-' + i + ' ' + n;
            })
            .attr('stroke', function(d) {
                return color(d['key']);
            })
            .attr('stroke-width',6)
            .attr('d', function(d) {
                return line(d['value']);
            })
            .style("stroke-opacity", 0.1)
            .on("click",function(d,i){
                var n = '';
                if (d['key'] == '49ers'){
                    n = 'niners'
                } else {
                    n = classify(d['key'])
                }
                lines = d3.selectAll('.line')
                lines.transition().style("stroke-opacity", 0.1)
                var area = d3.selectAll('.area')
                area.transition().style("opacity", 0.1)
                var sel = d3.select(this);
                sel.moveToFront();
                sel.transition().style("stroke-opacity", 1)
                var area = d3.selectAll('.area').filter('.'+n)
                area.transition().style("opacity", 0.75)
                area.moveToFront()
                var select = d3.selectAll(".option").filter('.'+n)
                select.attr('selected','selected');

                // replace text
                team_text.html(function(){
                    var select = d3.selectAll('.option').filter('.'+n)
                    console.log(select.attr('data-text'))
                    return select.attr('data-text')
                })  

                // reset select
                select.selectAll("option")
                    .property("selected", function(d){ return d.team_short === n; });
            });
            // .on("mouseout",function(d,i){
            //   var sel = d3.select(this);
            //   sel.transition().style("stroke-opacity", 0.1)
            //   var area = d3.select('.area-'+i)
            //   area.transition().style("opacity", 0.1)
            // });

    // add select element

    var team_text  = d3.select('.team_text');

    var select = d3.select("#teams")

    select.selectAll("option")
      .data(legendData)
      .enter()
        .append("option")
        .sort(function(a, b) {return d3.ascending(a.team, b.team);})
        .attr("value", function (d) { 
            var n = '';
            if (d.team_short == '49ers'){
                n = 'niners'
            } else {
                n = classify(d.team_short)
            }
            return n; 
        })
        .text(function (d) { return d.team;} )
        .attr('class', function(d, i) {
            var n = '';
            if (d.team_short == '49ers'){
                n = 'niners'
            } else {
                n = classify(d.team_short)
            }
            return 'option option-' + (i+1) + ' ' + n;
        })
        .attr('data-text', function(d, i) {
            return d['text'];
        })
        .property("selected", function(d){ return d.team_short === 'Bears'; });

    select
        .on('change', function() {
            // reset all styles
            selected = d3.select(this).property('value');
            console.log(selected)
            team = classify(selected)
            if (team == '49ers') {
                team = 'niners';
            }
            lines = d3.selectAll('.line')
            lines.transition().style("stroke-opacity", 0.1)
            var area = d3.selectAll('.area')
            area.transition().style("opacity", 0.1)

            // highlight current selection
            var sel = d3.selectAll('.line').filter('.'+team);
            sel.moveToFront();
            sel.transition().style("stroke-opacity", 1)
            var area = d3.selectAll('.area').filter('.'+team)
            area.transition().style("opacity", 0.75)
            area.moveToFront()

            // replace text
            team_text.html(function(){
                var select = d3.selectAll('.option').filter('.'+team)
                console.log(select.attr('data-text'))
                return select.attr('data-text')
            })  
        });

    callback()


    
}

/*
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
$(window).load(onWindowLoaded);
