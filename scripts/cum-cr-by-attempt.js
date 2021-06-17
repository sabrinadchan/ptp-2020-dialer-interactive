(function() {
  var data;

  var margin = { top: 50, right: 30, bottom: 40, left: 30 },
      outerWidth = 600,
      outerHeight = 400,
      width = outerWidth - margin.right - margin.left,
      height = outerHeight - margin.top - margin.bottom;

  var x = d3.scaleLinear()
      .range([0, width])
      .clamp(true);

  var y = d3.scaleLinear()
      .range([0, height]);

  var xAxis = d3.axisBottom()
      .scale(x)
      .tickSize(3)
      .tickFormat(d => d);

  var yAxis = d3.axisLeft()
      .scale(y)
      .ticks(4)
      .tickSize(3)
      .tickFormat((d, i) => d3.format(".2")(d * 100) + (!i ? "%" : ""));

  var svg = d3.select("#cum-cr-by-attempt-chart").append("svg")
      .attr("width", outerWidth)
      .attr("height", outerHeight)
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  Promise.all([
    d3.tsv("data/program/cum-cr-by-attempt.tsv"),
  ])
  .then(([data,]) => {

    var line = d3.line()
      //.curve(d3.curveBasis)
      .x((_, i) => x(data.x[i]))
      .y(d => y(d))
      .defined(d => d);

    const columns = data.columns.slice(1);
    data = {
      series: data.map(d => ({
        name: d.state,
        y: columns.map(k => +d[k])
      })),
      x: columns.map(d => +d)
    }

    //x.domain(d3.extent(data.x).reverse())
    x.domain([d3.min(data.x), 10])
    y.domain([0.1,0]);

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
        .call(g => g.select(".tick:first-of-type text").clone()
          .attr("x", 3)
          .attr("text-anchor", "start")
          .attr("font-weight", "bold")
          .text("cum. contact rate"));

    svg.append("g")
      .selectAll("path")
      .data(data.series)
      .join("path")
        .attr("class", "line")
        .attr("id", d => `line-${d.name}`)
        .attr("stroke", d => d.name == "Avg" ? "#f61b31" : "#1cb4f0")
        .attr("stroke-width", d => d.name == "Avg" ? "2px" : "1px")
        .attr("opacity", d => d.name == "Avg" ? 1 : 0.5)
        .attr("d", d => line(d.y))
        .on("mouseover", function(_, d) {
          d3.select(`#line-${d.name}`).classed("active", true);
          var selected = d3.selectAll(`.label-${d.name}`)
          selected.classed("active", true);
          selected.each(function(x) { d3.select(this).raise() })
        }).on("mouseout", function(_, d) {
          d3.select(`#line-${d.name}`).classed("active", null);
          d3.selectAll(`.label-${d.name}`).classed("active", null);
        });

    svg.append("text")
        .attr("transform", `translate(${width / 2}, ${height + 30})`)
        .attr("text-anchor", "middle")
        .attr("font-size", "10px")
        .attr("font-weight", "bold")
        .text("attempts");

    svg.append("text")
        .attr("transform", `translate(0, -20)`)
        .attr("text-anchor", "start")
        .attr("font-size", "18px")
        .attr("font-weight", "bold")
        .text("Share of state voter universe contacted by attempt number");

  let previousNY = 0,
      previousNX = 0;
  //sort annotations by last data point for ordering
  const labelAnnotations = data.series.sort((a, b) =>
      b.y[b.y.indexOf(0) - 1] - a.y[a.y.indexOf(0) - 1]
    )
    .reduce((p, c) => {
      //push annotation down if it will overlap
      var lastX = Math.min(c.y.indexOf(0), 10);
      lastX = (lastX == -1 ? 10 : lastX);
      
      const xpx = x(lastX),
            ypx = y(c.y[lastX - 1]);
      
      let ny, nx
      if (ypx - previousNY < 10 && xpx == previousNX) {
        ny = previousNY + 6
        nx = previousNX + 4
      }

      p.push({
        note: { label: c.name, orientation: "leftRight", align: "middle", },
        className: `label--top label-${c.name}`,
        x: xpx,
        y: ypx,
        dx: 1,
        disable: ["connector"],
        color: c.name == "Avg" ? "#f61b31" : "#1cb4f0",
        ny, nx
      })
      previousNY = ny || ypx
      previousNX = xpx

      return p
    }, []);

    const textAnnotationsBg = d3.annotation()
        .type(d3.annotationLabel)
        .annotations(labelAnnotations);

    svg.append("g")
        .attr("class", "annotation-group label--under")
        .call(textAnnotationsBg);
    
    const textAnnotations = d3.annotation()
        .type(d3.annotationLabel)
        .annotations(labelAnnotations);

    svg.append("g")
        .attr("class", "annotation-group")
        .call(textAnnotations);
  });
})();
