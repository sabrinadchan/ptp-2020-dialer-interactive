(function() {
  var margin = { top: 0, right: 0, bottom: 0, left: 0 },
      outerWidth = 450,
      outerHeight = 300 + margin.top,
      width = outerWidth - margin.right - margin.left,
      height = outerHeight - margin.top - margin.bottom;

  var svg = d3.select("#election-results").append("svg")
      .attr("width", outerWidth)
      .attr("height", outerHeight);

  var map = svg.append("g")
      .attr("id", "svg-map")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var results = new Map();

  const projection = d3.geoMercator()
      .scale(1 / (2 * Math.PI))
      .translate([0, 0]);

  var path = d3.geoPath(projection);

  var colorDemPct = d3.scaleSequential(d3.interpolateBlues)
      .domain([30, 60]);

  var colorTurnout = d3.scaleSequential(d3.interpolateGreens)
      .domain([60, 80]);

  var colorMargin = d3.scaleDiverging()
        .domain([-30, 0, 30])
        .interpolator(d3.interpolateRdBu)
        .clamp(true);

  var fieldToColorScale = {
    "pres_dem_pct": colorDemPct,
    "pres_margin_pct": colorMargin,
    "sen_dem_pct": colorDemPct,
    "sen_margin_pct": colorMargin,
    "vep_turnout_highest_office": colorTurnout,
  }

  var fieldToTitle = {
    "pres_dem_pct": "Presidential Election - Democratic Vote Share",
    "pres_margin_pct": "Presidential Election - Margin",
    "sen_dem_pct": "U.S. Senate Election - Democratic Vote Share",
    "sen_margin_pct": "U.S. Senate Election - Margin",
    "vep_turnout_highest_office": "2020 General Election Turnout % (Highest Office)",
  }

  var defaultField = "pres_margin_pct";

  // load geospatial boundaries
  Promise.all([
    d3.json("../data/geospatial/states-10m-filtered.topojson"),
    d3.tsv("../data/program/election-results.tsv", process)
  ])
  .then(([us,]) => {
    usFeatures = topojson.feature(us, us.objects.states).features

    projection.fitSize([width, height], {type: "FeatureCollection", "features": usFeatures});

    usFiltered = usFeatures.filter(d => statesAll.map(d => d.abbr).slice(1).includes(d.id))

    var tiles = d3.tile()
      .size([outerWidth, outerHeight])
      .scale(projection.scale() * 2 * Math.PI)
      .translate(projection([0, 0]))
      ();

    map.append("g")
        .selectAll("path")
        .data(topojson.feature(us, us.objects.nation).features)
      .enter().append("path")
        .attr("id", "electionsMapPath")
        .attr("d", path)
        .attr("stroke-width", "0px");

    var clipped = map.append("clipPath")
        .attr("id", "elections-map-clip")
      .append("use")
        .attr("xlink:href", "#electionsMapPath");

    map.append("g")
        .attr("clip-path", "url(#elections-map-clip)")
      .selectAll("image")
        .data(tiles)
      .enter().append("image")
        .attr("xlink:href", baseMapURL)
        .attr("x", d => (d[0] + tiles.translate[0]) * tiles.scale)
        .attr("y", d => (d[1] + tiles.translate[1]) * tiles.scale)
        .attr("width", tiles.scale)
        .attr("height", tiles.scale);

    map.append("g")
        .selectAll("path")
        .data(usFiltered)
      .enter().append("path")
        .attr("id", d => `election-map-state-${d.id}`)
        .attr("class", d => "state-path")
        .attr("d", path)
        .attr("fill", d => fieldToColorScale[defaultField](results.get(d.properties.name)[defaultField]))
        .on("mouseover", function(event, d) {
          d3.select(this).classed("active", true).raise();
          d3.select(`#state-row-${d.id}`).classed("active", true);
        })
        .on("mouseout", function(event, d) {
          d3.select(this).classed("active", null).lower();
          d3.select(`#state-row-${d.id}`).classed("active", null);
        });

    svg.append("text")
        .attr("id", "map-title")
        .attr("x", 10)
        .attr("y", 10)
        .attr("font-size", "14px")
        .attr("font-weight", "bold")
        .text(fieldToTitle[defaultField]);

    buildTable("#election-results-table", usFiltered, columns, sortTable);

    d3.selectAll("#election-results-table th").each(function(d){ 
      d3.select(this).classed(d.cl == defaultField ? " active" : "", true);
    });

    d3.selectAll("#election-results-table th")
        .on("click", function(event, d) {
          d3.select("#election-results-table th.sorted span").html("");
          d3.select("#election-results-table th.sorted").classed("sorted", null);

          d3.select(this).classed("sorted", true);
          d3.select(this).select("span")
              .html(d.parity == 1 ? "&#8593;" : "&#8595;");

          var rows = d3.selectAll("#election-results-table tbody").selectAll("tr");
          sortTable(rows, d.cl, d.parity);
          d.parity = -1 * d.parity;

          if (d.cl != "state") {
            d3.select("#map-title").text(fieldToTitle[d.cl])
            d3.select("#election-results-table th.col.active").classed("active", null)
            d3.select(`#election-results-table th.col-` + d.cl).classed("active", true)
            d3.selectAll(".state-path")
              .attr("fill", x => fieldToColorScale[d.cl](results.get(x.properties.name)[d.cl]))
              .attr("opacity", x => typeof results.get(x.properties.name)[d.cl] === "string" ? 0 : 1)
          }
        });

    d3.selectAll("#election-results-table tbody tr")
        .on("mouseover", function(event, d) {
          d3.select("#election-map-state-" + d.id).classed("active", true).raise();
        })
        .on("mouseout", function(event, d) {
          d3.select("#election-map-state-" + d.id).classed("active", null).lower();
        });

    d3.select("#state-row-13 td").html("Georgia*");

    d3.select("#election-results-table")
      .insert("caption",":first-child")
        .html("*Ossoff-Perdue runoff election final results");
  });

  var columns = [
    { head: 'State', cl: 'state', parity: 1, html: r => results.get(r.properties.name).state },
    { head: 'Pres.<br>Dem %', cl: 'pres_dem_pct', parity: 1, html: r => formatPercent(results.get(r.properties.name).pres_dem_pct / 100) },
    { head: 'Pres.<br>Margin', cl: 'pres_margin_pct', parity: 1, html: r => formatPercent(results.get(r.properties.name).pres_margin_pct / 100) },
    { head: 'Sen<br>Dem %', cl: 'sen_dem_pct', parity: 1, html: r => typeof results.get(r.properties.name).sen_dem_pct === "string" ? "—" : formatPercent(results.get(r.properties.name).sen_dem_pct / 100) },
    { head: 'Sen<br>Margin', cl: 'sen_margin_pct', parity: 1, html: r => typeof results.get(r.properties.name).sen_dem_pct === "string" ? "—" : formatPercent(results.get(r.properties.name).sen_margin_pct / 100) },
    { head: 'Turnout<br>(highest office)', cl: 'vep_turnout_highest_office', parity: 1, html: r => formatPercent(results.get(r.properties.name).vep_turnout_highest_office / 100) },
  ];

  function sortTable(arr, field, asc) {
    arr.sort((a,b) => {
      var stateA = results.get(a.properties.name),
          stateB = results.get(b.properties.name);

      if (stateA[field] < stateB[field]) return -1 * asc;
      if (stateA[field] > stateB[field]) return 1 * asc;
      return 0;
    });
  }

  function process(d) {
    var data = {
      'state': d.state,
      'pres_dem_pct': +d.pres_dem_pct,
      'pres_margin_pct': +d.pres_margin_pct,
      'sen_dem_pct': d.sen_dem_pct === "" ? "" : +d.sen_dem_pct,
      'sen_margin_pct': d.sen_margin_pct === "" ? "" : +d.sen_margin_pct,
      'vep_turnout_highest_office': +d.vep_turnout_highest_office
    }

    results.set(d.state, data)
  }
})();