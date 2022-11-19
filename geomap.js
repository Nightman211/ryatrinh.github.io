/* ----------------------------------------------------------------------------
File: forcedirectedgraph.js
Javascript code for the force directed graph.
You can drag and move nodes, which then get frozen when dragged.
Double click to free a node.
You can pause/unpause with the pause/unpause button.
Radius and repulsion of nodes based on radius value in json
Link distance and strength based on value in json
Nodes collide based on radius
-----------------------------------------------------------------------------*/ 

//Define Margin
var margin = {left: 50, right: 50, top: 50, bottom: 50 }, 
    width = 1700 - margin.left - margin.right,
    height = 700 - margin.top - margin.bottom;

//Define x,y, and color scales
var colorScale = d3.scaleOrdinal(d3.schemeCategory10);

//Define SVG
var svg = d3.select("body").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)

var projection = d3.geoAlbers();

var path = d3.geoPath();

var color = d3.scaleThreshold()
    .domain([1, 10, 50, 200, 500, 1000, 2000, 4000])
    .range(d3.schemeOrRd[9]);

var x = d3.scaleSqrt()
    .domain([0, 4500])
    .rangeRound([440, 950]);

d3.select("body").append("div")
    .attr("class", "buttondiv")
    .append("button")
        .attr("class", "colorswap")
        .attr("onclick", "colorswap()")
        .text("Swap Color of Map")

d3.select("body").append("div")
    .attr("class", "buttondiv")
    .append("button")
        .attr("class", "showlines")
        .attr("onclick", "showlines()")
        .text("Toggle County Boundary")

function drawKey(){
    var g = svg.append("g")
        .attr("class", "key")
        .attr("text-anchor", "middle")
        .attr("transform", "translate(" + (150) + "," + (margin.top + height + 5) +")");
    g.selectAll("rect")
        .data(color.range().map(function(d) {
            d = color.invertExtent(d);
            if (d[0] == null) d[0] = x.domain()[0];
            if (d[1] == null) d[1] = x.domain()[1];
            return d;
        }))
        .enter().append("rect")
        .attr("height", 8)
        .attr("x", function(d) { return x(d[0]); })
        .attr("width", function(d) { return x(d[1]) - x(d[0]); })
        .attr("fill", function(d) { return color(d[0]); });
    g.append("text")
        .attr("class", "caption")
        .attr("x", x.range()[0])
        .attr("y", -6)
        .attr("fill", "#000")
        .attr("text-anchor", "start")
        .attr("font-weight", "bold")
        .text("Population per square mile");
    g.call(d3.axisBottom(x)
        .tickSize(13)
        .tickValues(color.domain()))
        .select(".domain")
        .remove();
}

var curr_color = 'red';

function colorswap(){
    if(curr_color == 'red'){
        svg.selectAll("path").remove()
        curr_color = 'blue';
        color.range(d3.schemeGnBu[9]);
        console.log(curr_color);
        drawMap();
    }
    else if(curr_color == 'blue'){
        svg.selectAll("path").remove()
        curr_color = 'red';
        color.range(d3.schemeOrRd[9]);
        console.log(curr_color);
        drawMap();
    }
}

// Tooltip variable
var tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("visibility", "hidden")
    .html("<p>You shouldn't see this!</p>");

// Draws tooltip and updates info
function drawTooltip(){
    node = d3.select(this);
    if(node.style('stroke-opacity') == 1){
        //console.log(node.attr("county_name"));
        tooltip.style("visibility", "visible");
        tooltip.html("<p class=tooltiptext>County Name: " + node.attr("county_name") + "</p>" +
                     "<p class=tooltiptext>Population Density: " + node.attr("pop_density") + " persons/mi²</p>");
    }
}
// Moves tooltip to follow cursor
function moveTooltip(pos){
    tooltip.style("top", (pos.pageY-30) + "px");
    tooltip.style("left", (pos.pageX+20) + "px");
}
// Undraws tooltip, set to invisible
function undrawTooltip() {
    tooltip.style("visibility", "hidden");
}

var lines = true;
function showlines(){
    lines = !lines;
    if(lines){
        d3.selectAll("path")
        .style('stroke-width', '1')
        console.log("line on")
    }
    else{
        d3.selectAll("path")
        .style('stroke-width', '0')
        console.log("line off")
    }
}

let counties_array = [];
let countries_pop_dens

let count = 0;

function drawMap(){
    d3.csv("Population-Density By County.csv").then(function(data) {
        //console.log(data);

        d3.json("counties-10m.json").then(function(topology) {
            let geojson = topojson.feature(topology, topology.objects.counties);
            //console.log(topology);

            for(let x = 0; x < data.length; x++){
                if(data[x]['GEO.display-label'] == "Wisconsin"){
                    counties_array.push(data[x]['GCT_STUB.display-label'])
                    //console.log(data[x]['GCT_STUB.display-label']);
                }
            }
            //console.log(counties_array);

            projection.center([1, 45.5]);
            projection.scale(6000);
            path.projection(projection);

            for(let x = 0; x < geojson.features.length; x++){
                for(let y = 0; y < data.length; y++){
                    if(data[y]['GEO.display-label'] == 'Wisconsin'){
                        if(geojson.features[x].properties.name == data[y]['GCT_STUB.display-label'] && Math.floor(geojson.features[x].id/1000) == 55){
                            geojson.features[x].pop_density = data[y]['Density per square mile of land area'];
                        }
                    }
                }
            }

            svg.selectAll("path")
            .data(geojson.features)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("class", "path")
            .attr("county_name", function(d){
                return d.properties.name;
            })
            .attr("pop_density", function(d){
                return d.pop_density;
            })
            .on("mouseover", drawTooltip)
            .on("mousemove", moveTooltip)
            .on("mouseout", undrawTooltip)
            .style('stroke-width', function(d){
                if(lines){
                    return 1;
                }
                else{
                    return 0;
                }
            })
            .style('stroke', 'black')
            .style('stroke-opacity', function(d){
                if(counties_array.includes(d.properties.name) && Math.floor(d.id/1000) == 55){
                    return 1;
                }
                else{
                    return 0;
                }
            })
            .style("fill", function(d){
                if(counties_array.includes(d.properties.name) && Math.floor(d.id/1000) == 55){
                    return color(d.pop_density);
                }
                else{
                    return "white";
                }
            });
            drawKey();
        });
    });
}

drawMap();
/*
d3.csv("Population-Density By County.csv").then(function(data) {
    console.log(data);
    
    for(let x = 0; x < data.length; x++){
        if(data[x]['GEO.display-label'] == "Wisconsin"){
            console.log(data[x]['GCT_STUB.display-label']);
        }
    }
    
    d3.json("wi_counties_geojson.geojson").then(function(json) {
        console.log(json);
        
        for(let x = 0; x < data.length; x++){
            for(let y = 0; y < json.features.length; y++){
                if(data[x]['GEO.display-label'] === 'Wisconsin'){
                    if(data[x]['GCT_STUB.display-label'] == json.features[y]['properties']['county_nam']){
                        //console.log("match");
                        console.log(data[x]['GCT_STUB.display-label']);
                        console.log(json.features[y]['properties']['county_nam']);
                        console.log(data[x]['Density per square mile of land area']);
                        //console.log(data[x]['GCT_STUB.display-label']);
                        json.features[y]['properties']['pop_den'] = data[x]['Density per square mile of land area'];
                    }
                }
                //console.log(json.features[x]['properties']['county_nam']);
            }
        }
        
        projection.fitExtent([[margin.left, margin.top], [margin.left+width, margin.top+height]], json);
        path.projection(projection);

        svg.selectAll("path")
            .data(json.features)
            .enter()
            .append("path")
            .attr("d", path)
            .style('stroke-opacity','1')
            .style("fill", function(d) {
                return color(d['properties']['pop_den']);
            });
    });
});
*/