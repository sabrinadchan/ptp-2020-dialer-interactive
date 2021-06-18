(function() {
    var margin = { top: 30, right: 0, bottom: 35, left: 0 },
        outerWidth = 450,
        outerHeight = 300 + margin.top + margin.bottom,
        width = outerWidth - margin.right - margin.left,
        height = outerHeight - margin.top - margin.bottom;

  const defaultState = "08";

  var svg = d3.select("#geographic-shift").append("svg")
      .attr("width", outerWidth)
      .attr("height", outerHeight);

  var stateMap = svg.append("g")
        .attr("id", "geographic-shift-map")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var title = svg.append("text")
      .attr("x", outerWidth / 2)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .attr("font-size", "20px")
      .attr("font-weight", "bold");

   function drawTextButton(svg, text, x, y, textAnchor) {
    var button = svg.append("g")
        .attr("class", "text-button")
        .attr("id", text == "Canvassing Targets" ? "default-text-button" : "");

    var rectLayer = button.append("g"),
        textLayer = button.append("g");

    var text = textLayer.append("text")
        .attr("x", x)
        .attr("y", y)
        .attr("text-anchor", textAnchor)
        .attr("font-size", "14px")
        .attr("font-weight", "bold")
        .attr("fill", "white")
        .html(text);

    var textBBox = text.node().getBBox();

    var rect = rectLayer.append("rect")
        .attr("rx", 8)
        .attr("ry", 8)
        .attr("x", textBBox.x - 10)
        .attr("y", textBBox.y - 4)
        .attr("width", textBBox.width + 20)
        .attr("height", textBBox.height + 8)
        .attr("stroke-width", "1.5px")
        .attr("stroke", "#333");

    return button;
  }

  canvassingTargetsButton = drawTextButton(svg, "Canvassing Targets", 12, outerHeight - 10, "start");
  phoneTargetsButton = drawTextButton(svg, "Phone Targets", outerWidth - 12, outerHeight - 10, "end");

  const projectionState = d3.geoMercator()
      .scale(1 / (2 * Math.PI))
      .translate([0, 0]);

  var pathState = d3.geoPath(projectionState);

  var tile = d3.tile()
      .extent([0, 0], [width, height])
      .tileSize(512);
      //.size([width, height])
      //.scale(projection.scale() * 2 * Math.PI)
      //.translate(projection([0, 0]));

  var color = d3.scaleQuantile()
      .domain(d3.range(30, 80))
      .range(d3.schemeBlues[9]);

    const geographicShiftStates = [
      {name: "Colorado", abbr: "08"},
      {name: "Georgia", abbr: "13"},
      {name: "Iowa", abbr: "19"},
      {name: "Kansas", abbr: "20"},
      {name: "Kentucky", abbr: "21"},
      {name: "Maine", abbr: "23"},
      {name: "Michigan", abbr: "26"},
      {name: "Montana", abbr: "30"},
      {name: "North Carolina", abbr: "37"},
      {name: "Nebraska", abbr: "31"},
      {name: "New Hampshire", abbr: "33"},
      {name: "Pennsylvania", abbr: "42"},
      {name: "Wisconsin", abbr: "55"},
    ]

  // load geospatial boundaries
  Promise.all([
    d3.json("data/geospatial/canvass-distribution.geojson"),
    d3.json("data/geospatial/phone-distribution.geojson"),
    d3.json("data/geospatial/states-10m-filtered.topojson"),
  ])
  .then(([canvass, phone, us,]) => {
    var usFiltered = usFeatures.filter(d => geographicShiftStates.map(d => d.abbr).includes(d.id));

    var selectorMap = d3.select("#selector-map").append("svg")
      .attr("width", tileWidth)
      .attr("height", tileHeight);

    selectorMap.append("g")
        .attr("clip-path", "url(#contiguous-us-clip)")
      .selectAll("image")
        .data(tiles)
      .enter().append("image")
        .attr("xlink:href", baseMapURL)
        .attr("x", d => (d[0] + tiles.translate[0]) * tiles.scale)
        .attr("y", d => (d[1] + tiles.translate[1]) * tiles.scale)
        .attr("width", tiles.scale)
        .attr("height", tiles.scale);

    selectorMap.append("g")
        .selectAll("path")
        .data(usFiltered)
      .enter().append("path")
        .attr("id", d => `geoshift-selector-state-${d.id}`)
        .attr("class", d => "state geoshift-selector clickable")
        .attr("d", path)
        .attr("stroke", "black")
        .attr("stroke-width", "1px")
        .on("click", function(_, d) {
          d3.select(".state.geoshift-selector.active").classed("active", null);
          d3.select(this).classed("active", true);
          update(canvass, phone, us, d.id)
        });
    
    d3.select(`#geoshift-selector-state-${defaultState}`).classed("active", true);
    update(canvass, phone, us, defaultState);
  });

  function update(canvass, phone, us, state) {
    stateMap.selectAll("g").remove();
    d3.select(".text-button.active").classed("active", null);
    d3.select("#default-text-button").classed("active", true);

    canvass = canvass.features.filter(d => d.properties.state == state);
    phone = phone.features.filter(d => d.properties.state == state)
    
    var usFeatures = topojson.feature(us, us.objects.states).features,
        selectedState = usFeatures.filter(d => d.id == state);

    projectionState.fitSize([width, height], {type: "FeatureCollection", "features": selectedState});
    //projection.fitSize([width, height], canvass);

    canvass = canvass.map(d => d.geometry.coordinates);
    phone = phone.map(d => d.geometry.coordinates);

    var tile = d3.tile()
      .size([width, height])
      .scale(projectionState.scale() * 2 * Math.PI)
      .translate(projectionState([0, 0]))
    var stateTiles = tile()

    stateMap.append("g")
        .selectAll("path")
        .data(selectedState)
      .enter().append("path")
        .attr("id", "statePath")
        .attr("d", pathState)
        .attr("stroke-width", "0px");

    var clipped = stateMap.append("clipPath")
        .attr("id", "clip")
      .append("use")
        .attr("xlink:href", "#statePath");

    var map = stateMap.append("g")
        .attr("clip-path", "url(#clip)")
      .selectAll("image")
        .data(stateTiles)
      .enter().append("image")
        .attr("xlink:href", d => `https://a.basemaps.cartocdn.com/rastertiles/voyager_nolabels/${d[2]}/${d[0]}/${d[1]}.png`)
        .attr("x", d => (d[0] + stateTiles.translate[0]) * stateTiles.scale)
        .attr("y", d => (d[1] + stateTiles.translate[1]) * stateTiles.scale)
        .attr("width", stateTiles.scale)
        .attr("height", stateTiles.scale);

    stateMap.append("g")
        .selectAll("path")
        .data(selectedState)
      .enter().append("path")
        .attr("id", "statePath")
        .attr("d", pathState)
        .attr("stroke", "black")
        .attr("stroke-width", "1.5px")
        .attr("fill", "none");

    var circles = stateMap.append("g")

    circles.datum(canvass)
      .call(updateCircles);

    title.text(`${abbrToStateName[fips_to_state[state]]}`);

    canvassingTargetsButton.on("click", function(_, d) {
      transitionStateMap(circles, canvass, this);
    });

    phoneTargetsButton.on("click", function(_, d) {
      transitionStateMap(circles, phone, this);
    });

    transitionStateMap(circles, phone, phoneTargetsButton.node());
  }

  function transitionStateMap(circles, data, text) {
    var t = d3.transition()
        .delay(500) // make shorter still?
        .duration(2000);

    circles.selectAll("circle").data(data)
        .transition(t)
        .attr("cx", d => projectionState(d)[0])
        .attr("cy", d => projectionState(d)[1])
        .attr("r", 1)
        .on("end", function() {
          d3.select(".text-button.active").classed("active", null);
          d3.select(text).classed("active", true);
        })
  }

  function updateCircles(sel) {
    var circles = sel.selectAll("circle")
      .data(d => d);

    var merged = circles.enter()
        .append("circle")
        .attr("r", 2)
        .merge(circles);

    merged.classed("added", d => d.added)
        .attr("cx", d => projectionState(d)[0])
        .attr("cy", d => projectionState(d)[1])
        .attr("r", 1);

    circles.exit().remove();

  }
})();
