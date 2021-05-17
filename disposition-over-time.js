(function() {
  var mapWidth = 336,
      mapHeight = 200;

  var svg = d3.select("#pod-selector-map").append("svg")
      .attr("width", mapWidth)
      .attr("height", mapHeight)

  const projection = d3.geoMercator()
      .scale(1 / (2 * Math.PI))
      .translate([0, 0]);

  var path = d3.geoPath(projection);

  var color = d3.scaleQuantile()
      .domain(d3.range(30, 80))
      .range(d3.schemeBlues[9]);

  const demographics = ["age", "race", "sex"]

  var margin = { top: 20, right: 20, bottom: 40, left: 30 },
      outerWidth = 400,
      outerHeight = 200,
      chartWidth = outerWidth - margin.right - margin.left,
      chartHeight = outerHeight - margin.top - margin.bottom;

  var x = d3.scaleLinear()
      .range([0, chartWidth]);

  var y = d3.scaleLinear()
      .range([0, chartHeight]);

  /*var xAxis = d3.axisBottom()
      .scale(x)
      .tickSize(3)
      .tickFormat(d => d);*/

  var xAxisSecondary = d3.axisBottom()
      .scale(x)
      .tickSize(3)
      .tickFormat(d => weeks[d]);

  var yAxis = d3.axisLeft()
      .scale(y)
      .ticks(4)
      .tickSize(3)
      .tickFormat((d, i) => (d * 100) + (!i ? "%" : ""));

  // load geospatial boundaries
  Promise.all([
    d3.tsv("data/program/disposition-rates.tsv", d3.autoType),
    d3.json("data/geospatial/states-10m-filtered.topojson"),
  ])
  .then(([data, us,]) => {
    svg.selectAll("g").remove();

    usFeatures = topojson.feature(us, us.objects.states).features

    projection.fitSize([mapWidth, mapHeight], {type: "FeatureCollection", "features": usFeatures});

    usFiltered = usFeatures.filter(d => statesAll.map(d => d.abbr).slice(1).includes(d.id))
    
    var tiles = d3.tile()
      .size([mapWidth, mapHeight])
      .scale(projection.scale() * 2 * Math.PI)
      .translate(projection([0, 0]))
      ();

    svg.append("g")
        .selectAll("path")
        .data(topojson.feature(us, us.objects.nation).features)
      .enter().append("path")
        .attr("id", "podSelectorPath")
        .attr("d", path)
        .attr("stroke-width", "0px");

    var clipped = svg.append("clipPath")
        .attr("id", "disposition-clip")
      .append("use")
        .attr("xlink:href", "#podSelectorPath");

    var map = svg.append("g")
        .attr("clip-path", "url(#disposition-clip)")
      .selectAll("image")
        .data(tiles)
      .enter().append("image")
        .attr("xlink:href", d => `https://a.basemaps.cartocdn.com/rastertiles/light_nolabels/${d[2]}/${d[0]}/${d[1]}.png`)
        .attr("x", d => (d[0] + tiles.translate[0]) * tiles.scale)
        .attr("y", d => (d[1] + tiles.translate[1]) * tiles.scale)
        .attr("width", tiles.scale)
        .attr("height", tiles.scale);

    svg.append("g")
        .selectAll("path")
        .data(usFiltered)
      .enter().append("path")
        .attr("id", "podSelectorPath")
        .attr("class", d => `state ${pod_mapper[fips_to_state[d.id]]}`)
        .attr("d", path)
        .attr("stroke", "black")
        .attr("stroke-width", "1px")
        .attr("fill", "white")
        .attr("fill-opacity", 0.5)
        .on("mouseover", function(_, d) {
          d3.selectAll(`.state.${pod_mapper[fips_to_state[d.id]]}`).classed("active", true);
          d3.selectAll(`.line-${pod_mapper[fips_to_state[d.id]]}`).classed("active", true);
          var selected = d3.selectAll(`.label-${pod_mapper[fips_to_state[d.id]]}`)
            selected.classed("active", true);
            selected.each(function(x) { d3.select(this).raise() })
        }).on("mouseout", function(_, d) {
          d3.selectAll(`.state.${pod_mapper[fips_to_state[d.id]]}`).classed("active", null);
          d3.selectAll(`.line-${pod_mapper[fips_to_state[d.id]]}`).classed("active", null);
          d3.selectAll(`.label-${pod_mapper[fips_to_state[d.id]]}`).classed("active", null);
        });

    const divs = ["contact-rate-chart", "nh-rate-chart", "refusal-rate-chart"]
    const divMapper = {"contact-rate-chart": "contact rate", "nh-rate-chart": "not home rate", "refusal-rate-chart": "refusal rate",}
    for (var i = divs.length - 1; i >= 0; i--) {
      var metric = divMapper[divs[i]];

      var line = d3.line()
        .x((_, i) => x(dispositions.x[i]))
        .y(d => y(d));

      const columns = data.columns.slice(2);
      var dispositions = {
        series: data
          .filter(d => d.disposition == metric)
          .map(d => ({
            pod: d.pod,
            y: columns.map(k => +d[k])
          })),
        x: columns.map(d => +d)
      }

      x.domain([d3.max(dispositions.x)+0.5, d3.min(dispositions.x)])

      metric == "not home rate" ? y.domain([1,0.5]) : y.domain([0.1, 0]);

      var chartSvg = d3.select(`#${divs[i]}`).append("svg")
        .attr("width", outerWidth)
        .attr("height", outerHeight)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      /*chartSvg.append("g")
          .attr("class", "x axis")
          .attr("transform", "translate(0," + chartHeight + ")")
          .call(xAxis);*/

      chartSvg.append("g")
          .attr("class", "x secondary axis")
          .attr("transform", "translate(0," + (chartHeight + 0) + ")")
          .call(xAxisSecondary);

      chartSvg.append("g")
          .attr("class", "y axis")
          .call(yAxis)
          .call(g => g.select(".tick:first-of-type text").clone()
            .attr("x", 3)
            .attr("text-anchor", "start")
            .attr("font-weight", "bold")
            .text(metric));

      chartSvg.append("g")
        .selectAll("path")
        .data(dispositions.series)
        .join("path")
          .attr("class", d => `line line-${d.pod}`)
          .attr("stroke", d => d.pod == "All" ? "#f61b31" : "#1cb4f0") // opacity 1 equiv: #8EDAF8
          .attr("stroke-width", d => d.pod == "All" ? "2px" : "1px")
          .attr("opacity", d => d.pod == "All" ? 1 : 0.5)
          .attr("d", d => line(d.y))
          .on("mouseover", function(_, d) {
            d3.selectAll(`.state.${d.pod}`).classed("active", true);
            d3.selectAll(`.line-${d.pod}`).classed("active", true);
            var selected = d3.selectAll(`.label-${d.pod}`)
            selected.classed("active", true);
            selected.each(function(x) { d3.select(this).raise() })
          }).on("mouseout", function(_, d) {
            d3.selectAll(`.state.${d.pod}`).classed("active", null);
            d3.selectAll(`.line-${d.pod}`).classed("active", null);
            d3.selectAll(`.label-${d.pod}`).classed("active", null);
          });
  /*
      chartSvg.append("text")
          .attr("transform", `translate(${chartWidth / 2}, ${chartHeight + margin.bottom / 1.8})`)
          .attr("text-anchor", "middle")
          .attr("font-size", "10px")
          .attr("font-weight", "bold")
          .text("program week");*/

    let previousNY = 0
    //sort annotations by first data point for ordering
    const labelAnnotations = dispositions.series.sort((a, b) =>
        b.y[b.y.length -1] - a.y[a.y.length -1]
      )
      .reduce((p, c) => {
        //push annotation down if it will overlap
        const ypx = y(c.y[c.y.length -1]) - (metric == "refusal rate" ? 4 : 0)
        let ny

        if (ypx - previousNY < 10) {
          ny = previousNY + (metric == "refusal rate" ? 9 : 10)
        }

        p.push({
          note: { label: c.pod, orientation: "leftRight", align: "middle" },
          className: `label--top label-${c.pod}`,
          y: ypx,
          x: 0,
          dx: 1,
          id: c.pod,
          disable: ["connector"],
          color: c.pod == "All" ? "#f61b31" : "#1cb4f0",
          ny //use ny to directly place the note in xy space if needed
        })
        previousNY = ny || ypx - (metric == "refusal rate" ? 4 : 0)

        return p
      }, []);

      const textAnnotationsBg = d3.annotation()
          .type(d3.annotationLabel)
          .annotations(labelAnnotations);

      chartSvg.append("g")
          .attr("class", "annotation-group label--under")
          .call(textAnnotationsBg);

      const textAnnotations = d3.annotation()
          .type(d3.annotationLabel)
          .annotations(labelAnnotations);

      chartSvg.append("g")
          .attr("class", "annotation-group")
          .call(textAnnotations);
    }

  });
})();
