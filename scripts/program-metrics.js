(function() {
  var mapWidth = 336,
      mapHeight = 200;

  var svg = d3.select("#program-metrics-map").append("svg")
    .attr("width", mapWidth)
    .attr("height", mapHeight)

  var color = d3.scaleQuantile()
      .domain(d3.range(30, 80))
      .range(d3.schemeBlues[9]);

  var margin = { top: 10, right: 30, bottom: 15, left: 30 },
      pmChartOuterWidth = 400,
      pmChartOuterHeight = 110,
      pmChartWidth = pmChartOuterWidth - margin.right - margin.left,
      pmChartHeight = pmChartOuterHeight - margin.top - margin.bottom;

  var parseTime = d3.timeParse("%Y-%m-%d");

  var x = d3.scaleBand()
      .range([0, pmChartWidth])
      .padding(0.2);

  var y = d3.scaleLinear()
      .range([pmChartHeight, 0]);

  var xAxis = d3.axisBottom()
      .scale(x)
      .tickSize(3)
      .tickFormat(d3.timeFormat("%-m/%-d"));

  var xAxisSecondary = d3.axisBottom()
      .scale(x)
      .tickSize(0)
      .tickFormat(d => weeks[d]);

  var yAxis = d3.axisLeft()
      .scale(y)
      .ticks(4)
      .tickSize(3)
      .tickFormat(d3.format("~s"))

  // load geospatial boundaries
  Promise.all([
    d3.tsv("data/program/program-metrics.tsv", parse),
    d3.json("data/geospatial/states-10m-filtered.topojson"),
  ])
  .then(([program, us, state]) => {
    svg.selectAll("g").remove();

    var byDate = d3.rollups(program, v => { return {"dials": d3.sum(v, d => d.dials), "canvassed": d3.sum(v, d => d.canvassed), "ctvs": d3.sum(v, d => d.ctvs), "vbms": d3.sum(v, d => d.vbms), "vote plan": d3.sum(v, d => d.vote_plan)}}, d => d.datecanvassed)
        .sort((a, b) => d3.ascending(a[0], b[0]));

    var byDateByState = d3.rollups(program, v => { return {"dials": d3.sum(v, d => d.dials), "canvassed": d3.sum(v, d => d.canvassed), "ctvs": d3.sum(v, d => d.ctvs), "vbms": d3.sum(v, d => d.vbms), "vote plan": d3.sum(v, d => d.vote_plan)}}, d => d.datecanvassed, d => d.statecode)
        .sort((a, b) => d3.ascending(a[0], b[0]));

    x.domain(byDate.map(d => d[0]));
    xAxis.tickValues(d3.timeTuesdays(byDate[0][0], new Date("2020-11-04")));

    usFeatures = topojson.feature(us, us.objects.states).features

    projection.fitSize([mapWidth, mapHeight], {type: "FeatureCollection", "features": usFeatures});

    usFiltered = usFeatures.filter(d => statesAll.map(d => d.abbr).slice(1).includes(d.id))

    svg.append("g")
        .attr("clip-path", "url(#contiguous-us-clip)")
      .selectAll("image")
        .data(tiles)
      .enter().append("image")
        .attr("xlink:href", baseMapURL)
        .attr("x", d => (d[0] + tiles.translate[0]) * tiles.scale)
        .attr("y", d => (d[1] + tiles.translate[1]) * tiles.scale)
        .attr("width", tiles.scale)
        .attr("height", tiles.scale);

    var hoverDisabled = false;
    svg.append("g")
        .selectAll("path")
        .data(usFiltered)
      .enter().append("path")
        .attr("class", d => `state ${fips_to_state[d.id]} clickable`)
        .attr("d", path)
        .attr("stroke", "black")
        .attr("stroke-width", "1px")
        .attr("fill", "white")
        .attr("fill-opacity", 0.5)
        .on("mouseover", function(_, d) {
          if (!hoverDisabled) {
            state = fips_to_state[d.id]
            d3.select(this).classed("active", true);
            var data = byDateByState.map(x => [x[0], x[1].filter(y => y[0] == state)[0][1]])
            update(data, state);
          }
        })
        .on("mouseout", function(_, d) {
          if (!hoverDisabled) {
          d3.select(this).classed("active", null);
          update(byDate, "All");
          }
        })
        .on("click", function(_, d) {
          if (d3.select(this).classed("locked")) {
            hoverDisabled = false;
            d3.select(this).classed("active", null);
            d3.select(this).classed("locked", null);
            update(byDate, "All")
          } else {
            hoverDisabled = true;
            d3.select(".state.active").classed("active", null);
            d3.select(".state.locked").classed("locked", null);
            d3.select(this).classed("active", true);
            d3.select(this).classed("locked", true);

            state = fips_to_state[d.id]
            var data = byDateByState.map(x => [x[0], x[1].filter(y => y[0] == state)[0][1]])
            update(data, state);
          }
        })

    const divs = ["dials-chart", "canvassed-chart", "ctvs-chart", "vote-plan-vbm-chart"]
    const divMapper = {"dials-chart": "dials", "canvassed-chart": "canvassed", "ctvs-chart": "ctvs", "vote-plan-vbm-chart": "vote plan"}
    for (var i = divs.length - 1; i >= 0; i--) {
      var metric = divMapper[divs[i]];

      y.domain([0, d3.max(byDate, d => d[1][metric])]).nice();

      var chartSvg = d3.select(`#${divs[i]}`).append("svg")
        .attr("width", pmChartOuterWidth)
        .attr("height", pmChartOuterHeight)
      .append("g")
        .attr("id", `svg-${divs[i]}`)
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")

      chartSvg.append("g")
          .attr("class", "x axis")
          .attr("transform", "translate(0," + pmChartHeight + ")")
          .call(xAxis);

      chartSvg.append("g")
          .attr("class", "x secondary axis")
          .attr("transform", "translate(0," + (pmChartHeight + 15) + ")")
          .call(xAxisSecondary);

      chartSvg.append("line")
          .attr("class", "focus")
          .attr("stroke", "green")
          .attr("stroke-width", 1)
          .attr("y1", -8)
          .attr("y2", pmChartHeight)
          .style("opacity", 0)
    }

    var foci = d3.selectAll(".focus")

    function update(data, state) {
      d3.selectAll(".program-metrics-chart rect").remove();
      d3.selectAll(".program-metrics-chart g.y.axis").remove();
      d3.selectAll(".program-metrics-chart g.y.axis text").remove();

      for (var i = divs.length - 1; i >= 0; i--) {
        var metric = divMapper[divs[i]],
            metricMax = d3.max(data, d => d[1][metric]);

        if (!metricMax) metricMax = d3.max(data, d => d[1]["vbms"]);
        y.domain([0, metricMax]).nice();

        var chartSvg = d3.select(`#svg-${divs[i]}`);

        chartSvg.append("g")
            .selectAll("rect")
            .data(data)
            .join("rect")
              .attr("x", d => x(d[0]))
              .attr("y", d => y(d[1][metric]))
              .attr("width", d => x.bandwidth())
              //.attr("width", d => 4.3)
              //.attr("height", 1)
              .attr("height", d => pmChartHeight - y(d[1][metric]))

        if (metric == "vote plan") {
          chartSvg.append("g")
            .selectAll("rect")
            .data(data)
            .join("rect")
              .attr("fill", "#f62338")
              .attr("x", d => x(d[0]))
              .attr("y", d => y(d[1]["vbms"]))
              .attr("width", d => 4)
              .attr("height", d => pmChartHeight - y(d[1]["vbms"]))
        }

        chartSvg.append("g")
          .attr("class", "y axis")
          .call(yAxis)
          .call(g => g.select("text").clone()
            .attr("x", 3)
            .attr("y", -pmChartHeight + 2)
            .attr("text-anchor", "start")
            .attr("font-weight", "bold")
            .html(metric == "vote plan" ? `<tspan fill="#f62338">vbms</tspan> / ${metric}` : metric));

        chartSvg.append("rect")
            .style("fill", "none")
            .style("pointer-events", "all")
            .attr("width", pmChartWidth)
            .attr("height", pmChartHeight)
            .on("mouseover", mouseover)
            .on("mousemove", mousemove)
            .on("mouseout", mouseout);
      }

      d3.select("#th-state")
        .text(abbrToStateName[state]);
      d3.select("#td-dials")
        .text(formatNumber(d3.sum(data, d => d[1].dials)));
      d3.select("#td-canvassed")
        .text(formatNumber(d3.sum(data, d => d[1].canvassed)));
      d3.select("#td-ctvs")
        .text(formatNumber(d3.sum(data, d => d[1].ctvs)));
      d3.select("#td-vbms")
        .text(formatNumber(d3.sum(data, d => d[1].vbms)));
      d3.select("#td-vote-plans")
        .text(formatNumber(d3.sum(data, d => d[1]["vote plan"])));

      function mouseover() {
        foci.each(function(d) {d3.select(this).style("opacity", 1)})
      }

      var stepSize = x.step();
      var domainLen = x.domain().length;
      function mousemove(event) {
        var i = Math.trunc((d3.pointer(event)[0] / stepSize));
        i = i >= domainLen ? i - 1 : i
        selectedData = data[i]

        if (!hoverDisabled) {
          d3.selectAll(".state").classed("active", null);
          selectedStates = byDateByState[i][1].filter(d => d[1].dials > 0)
          if (selectedStates.length) {
            d3.selectAll(selectedStates.map(d => `.${d[0]}`).join(",")).classed("active", true);
          }
        }

        x1 = x(selectedData[0]) + (x.step() / 2)
        foci.each(function(d) {
          d3.select(this).attr("x1", x1).attr("x2", x1)
        })

        d3.selectAll(".focus-caption").remove();

        for (var i = divs.length - 1; i >= 0; i--) {
          var metric = divMapper[divs[i]];
          d3.select(`#svg-${divs[i]}`)
              .append("text")
              .attr("class", "focus-caption")
              .attr("text-anchor", "end")
              .attr("x", x1 - 3)
              .attr("y", -3)
              .attr("font-size", "8px")
              .text(formatDate(selectedData[0]));

          d3.select(`#svg-${divs[i]}`)
              .append("text")
              .attr("class", "focus-caption")
              .attr("text-anchor", "start")
              .attr("x", x1 + 3)
              .attr("y", -3)
              .attr("font-size", "8px")
              .attr("fill", metric == "vote plan" && selectedData[1][metric] < selectedData[1]["vbms"] ? "#f62338" : "black")
              .text(metric == "vote plan" && selectedData[1][metric] < selectedData[1]["vbms"] ? formatNumber(selectedData[1]["vbms"]) : formatNumber(selectedData[1][metric]));
        }
      }

      function mouseout() {
        foci.each(function(d) {d3.select(this).style("opacity", 0)})
        d3.selectAll(".focus-caption").remove();
        if (!hoverDisabled) d3.selectAll(".state").classed("active", null);
      }
    }

    update(byDate, "All")
  });

  function parse(d) {
    d.datecanvassed = parseTime(d.datecanvassed)
    d.dials = +d.dials
    d.canvassed = +d.canvassed
    d.ctvs = +d.ctvs
    d.vbms = +d.vbms
    d.vote_plan = +d.vote_plan
    d.week_number = +d.week_number
    d.dialer_minutes = +d.dialer_minutes
    return d;
  }
})();
