(function() {
  var margin = { top: 20, right: 0, bottom: 0, left: 0 },
      outerWidth = 900,
      outerHeight = 500 + margin.top,
      treemapWidth = outerWidth - margin.right - margin.left,
      treemapHeight = outerHeight - margin.top - margin.bottom;

  var svg = d3.select("#treemap").append("svg")
      .attr("viewBox", "0 0 " + treemapWidth + " " + treemapHeight)
     .attr("preserveAspectRatio", "xMidYMid meet")

  var treemap = svg.append("g")
      .attr("id", "svg-treemap")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var treemapTitle = svg.append("text")
      .attr("id", "treemap-title")
      .attr("x", 10)
      .attr("y", 15)
      .attr("font-size", "16px")
      .attr("font-weight", "bold");

  function demoToFullText(text) {
    if (text == "F") {
      return "Female";
    } else if (text == "M") {
      return "Male";
    } else if (text == "Native Am") {
      return "Native American";
    } else {
      return text;
    }
  }

  var tip = d3.tip()
      .attr('class', 'd3-tip')
      .offset([-10, 0])
      .html(d =>`<p><strong>${abbrToStateName[selectState.property("value")]}</strong><br><br>${d.ancestors().reverse().map(d => demoToFullText(d.data[0])).filter(Boolean).join(", ")}<br><br>${formatNumber(d.value)} targets</p>`);

  svg.call(tip);

  var colorMapper = {
    "F": "#F68481",
    "M": "#5CC7DD",
    "Unknown Sex": "#76797E",
    "White": "#5CC7DD",
    "Black": "#72D793",
    "Asian": "#F68481",
    "Latino": "#E6CD58",
    "Native Am": "#CF9FD3",
    "Unknown Race": "#76797E",
    "18-24": "#E6CD58",
    "25-34": "#72D793",
    "35-49": "#CF9FD3",
    "50-64": "#5CC7DD",
    "65+": "#F68481",
    "Unknown Age": "#76797E"
  }

  function color(d) {
    return d ? colorMapper[d] : "#5CC7DD"
  }

  var demographics = ["race"];
  d3.select("#buttonRace").classed("active", true);

  var selectState = d3.select("#selectState");

  selectState.selectAll("state-options")
      .data(statesAll)
    .enter().append('option')
      .text(d => d.name)
      .attr("value", d => fips_to_state[d.abbr]);

  // load geospatial boundaries
  Promise.all([
    d3.tsv("../data/program/demographics.tsv", d3.autoType),
  ])
  .then(([demos,]) => {
    selectState.on("change", update);

    d3.selectAll(".buttonDemographic")
    .each(function() {
      var selected = d3.select(this);
      
      selected.on("click", function(event, x) {
          selected.classed("active") ? selected.classed("active", null) : selected.classed("active", true);

          var demo = this.value;
          demographics.includes(demo) ? demographics.splice(demographics.indexOf(demo), 1) : demographics.push(demo);
          update();
        })
    })

    function update() {
      treemap.selectAll("g").remove()
      treemap.selectAll("text").remove()

      var state = selectState.property("value")
          groupers = demographics.map(x => {return d => d[x]});

      d3.selectAll(".selectDemographic")
        .each(function() {
          if (this.value) groupers.push(d => d[this.value]);
        });

      if (demographics.length > 0){
        treemapTitle.text(`
          ${abbrToStateName[state]}
          Target Universe by ${demographics.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(" & ")}`
        )
      } else {
        treemapTitle.text(`
          ${[abbrToStateName[state]]}
          Target Universe`
        )
      }

      var rolledUp = d3.rollup(demos, v => d3.sum(v, d => state == "All" || state == d.state ? d.counts : 0), ...groupers)

      var childrenAccessorFn = ([ key, value ]) => value.size && Array.from(value)

      var root = d3.hierarchy([null, rolledUp], childrenAccessorFn)
            .sum(([, value]) => value)
            .sort((a,b) => b.value - a.value);

      var tmap = d3.treemap()
          .size([treemapWidth, treemapHeight])
          //.tile(d3.treemapSliceDice)
          //.paddingTop(25)
          //.paddingRight(2)
          //.paddingInner(2)
          .padding(2)
          .paddingTop(10)
        (root)

      var leaf = treemap.selectAll("g")
        .data(tmap.leaves())
        .join("g")
          .attr("transform", d => `translate(${d.x0},${d.y0})`)
          .on('mouseover', function(_, d) {
            tip.show(d, this)
          })
          .on('mouseout', function(_, d) {
            tip.hide(d, this);
          });

/*
      leaf.append("title")
        .text(d => `${state}${d.ancestors().reverse().map(d => d.data[0]).join(", ")}\n${formatNumber(d.value)}`);
*/
      leaf.append("rect")
          .attr("id", (_, i) => `leaf${i}`)
          .attr("width", d => d.x1 - d.x0)
          .attr("height", d => d.y1 - d.y0)
          //.attr("fill", d => { while (d.depth > 1) d = d.parent; return color(d.data[0]); })
          //.attr("stroke", d => { while (d.depth > 1) d = d.parent; return "black"; })
          .attr("fill", d => { return color(d.data[0]); })
          .attr("fill-opacity", 0.6);

      leaf.append("clipPath")
          .attr("id", (_, i) => `clip${i}`)
        .append("use")
          .attr("xlink:href", (_, i) => `#leaf${i}`)

      leaf.append("text")
          .attr("clip-path", (_, i) => `url(#clip${i})`)
        .selectAll("tspan")
        .data(d => [d.data[0], formatNumber(d.data[1])]) //formatPct(d.data[1] / tmap.value)])
        .join("tspan")
          .attr("x", 3)
          .attr("y", (d, i, nodes) => `${(i === nodes.length - 1) * 0.3 + 1.1 + i * 0.9}em`)
          .attr("fill-opacity", (d, i, nodes) => i === nodes.length - 1 ? 0.7 : null)
          .attr("font-size", "10px")
          .text(d => !d ? d : d.includes("Unk") ? "Unk" : d);

      treemap.selectAll("titles")
          .data(root.descendants().filter(d => d.depth == 1 && d.height > 0))
          .join("text")
            .attr("x", d => d.x0+4)
            .attr("y", d => d.y0+8)
            .text(d => d.data[0].includes("Unk") ? "Unk": d.data[0])// Update title to full text -- demographic to full-text
            .attr("font-size", "10px")
            .attr("font-weight", "bold")
            .attr("color", "black")
            //.attr("fill",  d => color(d.data[0]));

      treemap.selectAll("titles")
          .data(root.descendants().filter(d => d.depth == 2 && d.height > 0))
          .join("text")
            .attr("id", (_, i) => `title${i}`)
            .attr("x", d => d.x0+2)
            .attr("y", d => d.y0+8)
            .text(d => d.data[0].includes("Unk") ? "Unk": d.data[0])
            .attr("font-size", "10px")
            .attr("color", "black");
    }

    update();
  });
})();
