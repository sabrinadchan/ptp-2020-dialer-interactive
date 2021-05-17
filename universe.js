(function(){
  Promise.all([
    d3.tsv("data/program/universe.tsv", d3.autoType),
    d3.tsv("data/program/staff.tsv", d3.autoType),
    d3.tsv("data/program/impact.tsv", d3.autoType),
  ])
  .then(([targets, staff, impact]) => {
    buildTable("#targets-table", targets.filter(d => d.statecode != "All"), targetColumns, sortTable);

    d3.selectAll("#targets-table th")
        .on("click", function(event, d) {
          d3.select("#targets-table th.sorted span").html("");
          d3.select("#targets-table th.sorted").classed("sorted", null);

          d3.select(this).classed("sorted", true);
          d3.select(this).select("span")
              .html(d.parity == 1 ? "&#8593;" : "&#8595;");

          var rows = d3.selectAll("#targets-table tbody").selectAll("tr");
          sortTable(rows, d.cl, d.parity);
          d.parity = -1 * d.parity;
        });

    buildTableFooter("#targets-table", targets.filter(d => d.statecode == "All"), targetColumns);

    buildTable("#field-staff-table", staff.filter(d => d.state != "All States"), staffColumns, sortTable);

    d3.selectAll("#field-staff-table th")
        .on("click", function(event, d) {
          d3.select("#field-staff-table th.sorted span").html("");
          d3.select("#field-staff-table th.sorted").classed("sorted", null);

          d3.select(this).classed("sorted", true);
          d3.select(this).select("span")
              .html(d.parity == 1 ? "&#8593;" : "&#8595;");

          var rows = d3.selectAll("#field-staff-table tbody").selectAll("tr");
          sortTable(rows, d.cl, d.parity);
          d.parity = -1 * d.parity;
        });

    buildTableFooter("#field-staff-table", staff.filter(d => d.state == "All States"), staffColumns);

    buildTable("#impact-table", impact.filter(d => d.statecode != "All States"), impactColumns, sortTable);

    d3.selectAll("#impact-table th")
        .on("click", function(event, d) {
          d3.select("#impact-table th.sorted span").html("");
          d3.select("#impact-table th.sorted").classed("sorted", null);

          d3.select(this).classed("sorted", true);
          d3.select(this).select("span")
              .html(d.parity == 1 ? "&#8593;" : "&#8595;");

          var rows = d3.selectAll("#impact-table tbody").selectAll("tr");
          sortTable(rows, d.cl, d.parity);
          d.parity = -1 * d.parity;
        });

     buildTableFooter("#impact-table", impact.filter(d => d.statecode == "All States"), impactColumns) 
  });

  var targetColumns = [
    { head: 'State', cl: 'statecode', parity: 1, html: r => abbrToStateName[r.statecode] },
    { head: 'Targets', cl: 'universe', parity: 1, html: r => formatNumber(r.universe) },
    { head: 'Avg. Age', cl: 'avg_age', parity: 1, html: r => formatNumber(r.avg_age) },
    { head: '% Under 35', cl: 'under_35_pct', parity: 1, html: r => formatPercent(r.under_35_pct) },
    { head: '% Women', cl: 'f_pct', parity: 1, html: r => formatPercent(r.f_pct) },
    { head: '% People of Color', cl: 'poc_pct', parity: 1, html: r => formatPercent(r.poc_pct) },
    { head: '% Rural', cl: 'rural_pct', parity: 1, html: r => formatPercent(r.rural_pct) },
    { head: '% Suburban', cl: 'suburban_pct', parity: 1, html: r => formatPercent(r.suburban_pct) },
    { head: '% Urban', cl: 'urban_pct', parity: 1, html: r => formatPercent(r.urban_pct) },
  ];

  var staffColumns = [
    { head: 'State', cl: 'state', parity: 1, html: r => r.state },
    { head: 'Calling Region', cl: 'calling_region', parity: 1, html: r => r.calling_region },
    { head: 'Field Staff', cl: 'field_staff', parity: 1, html: r => formatNumber(r.field_staff) },
  ];

  var impactColumns = [
    { head: 'State', cl: 'statecode', parity: 1, html: r => r.statecode },
    { head: 'Turnout<br>(attempted)', cl: 'turnout_attempted', parity: 1, html: r => isNaN(r.turnout_attempted) ? "—" : formatPercent(r.turnout_attempted) },
    { head: 'Turnout<br>(canvassed)', cl: 'turnout_canvassed', parity: 1, html: r => isNaN(r.turnout_canvassed) ? "—" : formatPercent(r.turnout_canvassed) },
    { head: 'Dials', cl: 'dials', parity: 1, html: r => formatNumber(r.dials) },
    { head: 'Canvassed', cl: 'canvassed', parity: 1, html: r => formatNumber(r.canvassed) },
    { head: 'Commits<br>To Vote', cl: 'ctvs', parity: 1, html: r => formatNumber(r.ctvs) },
    { head: 'VBM<br>Sign-Ups', cl: 'vbms', parity: 1, html: r => formatNumber(r.vbms) },
    { head: 'Vote Plans', cl: 'vote_plan', parity: 1, html: r => formatNumber(r.vote_plan) },
    { head: 'Call Time<br>(hrs)', cl: 'dialer_minutes', parity: 1, html: r => formatNumber(r.dialer_minutes / 60) },

  ];

  function sortTable(arr, field, asc) {
    console.log(field)
    arr.sort((a,b) => {
      if(isNaN(a[field]) || isNaN(b[field])) return - 1;
      if (a[field] < b[field]) return -1 * asc;
      if (a[field] > b[field]) return 1 * asc;
      return 0;
    });
  }
})();