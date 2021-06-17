const fips_to_state = {
  "All": "All",
  "01": "AL",
  "04": "AZ",
  "08": "CO",
  "12": "FL",
  "13": "GA",
  "19": "IA",
  "20": "KS",
  "21": "KY",
  "23": "ME",
  "26": "MI",
  "27": "MN",
  "30": "MT",
  "37": "NC",
  "31": "NE",
  "33": "NH",
  "42": "PA",
  "45": "SC",
  "55": "WI",
}

const pod_mapper = {
  'AZ': "MTW",
  'CO': "MTW",
  'MT': "MTW",
  'MN': "MTW",
  'AL': "MW",
  'IA': "MW",
  'NE': "MW",
  'WI': "MW",
  'KS': "MW",
  'ME': "NE",
  'NC': "NE",
  'NH': "NE",
  'PA': "NE",
  'MI': "NE",
  'KY': "NE",
  'FL': "SE",
  'GA': "SE",
  'SC': "SE",
}

const abbrToStateName = {
  'All': "All States",
  'AZ': "Arizona",
  'CO': "Colorado",
  'MT': "Montana",
  'MN': "Minnesota",
  'AL': "Alabama",
  'IA': "Iowa",
  'NE': "Nebraska",
  'WI': "Wisconsin",
  'KS': "Kansas",
  'ME': "Maine",
  'NC': "North Carolina",
  'NH': "New Hampshire",
  'PA': "Pennsylvania",
  'MI': "Michigan",
  'KY': "Kentucky",
  'FL': "Florida",
  'GA': "Georgia",
  'SC': "South Carolina",
}

const states = [
  {name: "All States", abbr: "All"},
  {name: "Colorado", abbr: "08"},
  {name: "Florida", abbr: "12"},
  {name: "Georgia", abbr: "13"},
  {name: "Iowa", abbr: "19"},
  {name: "Kansas", abbr: "20"},
  {name: "Kentucky", abbr: "21"},
  {name: "Maine", abbr: "23"},
  {name: "Michigan", abbr: "26"},
  {name: "Montana", abbr: "30"},
  {name: "Nebraska", abbr: "31"},
  {name: "New Hampshire", abbr: "33"},
  {name: "North Carolina", abbr: "37"},
  {name: "Pennsylvania", abbr: "42"},
  {name: "Wisconsin", abbr: "55"},
]

const statesAll = [
  {name: "All States", abbr: "All"},
  {name: "Alabama", abbr: "01"},
  {name: "Arizona", abbr: "04"},
  {name: "Colorado", abbr: "08"},
  {name: "Florida", abbr: "12"},
  {name: "Georgia", abbr: "13"},
  {name: "Iowa", abbr: "19"},
  {name: "Kansas", abbr: "20"},
  {name: "Kentucky", abbr: "21"},
  {name: "Maine", abbr: "23"},
  {name: "Michigan", abbr: "26"},
  {name: "Minnesota", abbr: "27"},
  {name: "Montana", abbr: "30"},
  {name: "North Carolina", abbr: "37"},
  {name: "Nebraska", abbr: "31"},
  {name: "New Hampshire", abbr: "33"},
  {name: "Pennsylvania", abbr: "42"},
  {name: "South Carolina", abbr: "45"},
  {name: "Wisconsin", abbr: "55"},
]

const weeks = {
  11: "8/15-21",
  10: "8/22-28",
  9: "8/29-9/4",
  8: "9/5-11",
  7: "9/12-18",
  6: "9/19-25",
  5: "9/26-10/2",
  4: "10/3-9",
  3: "10/10-16",
  2: "10/17-23",
  1: "10/24-11/3",
}

const weeks2 = {
  11: "8/15",
  10: "8/22",
  9: "8/29",
  8: "9/5",
  7: "9/12",
  6: "9/19",
  5: "9/26",
  4: "10/3",
  3: "10/10",
  2: "10/17",
  1: "10/24-11/3",
}

const ptpBlue = "#1cb4f0";

var formatNumber = d3.format(",d");
var formatPercent = d3.format(".1%");
var formatDate = d3.timeFormat("%-d %b")

const tileWidth = 336,//450,
      tileHeight = 200;//300;

const baseMapURL = d => `https://a.basemaps.cartocdn.com/rastertiles/voyager_nolabels/${d[2]}/${d[0]}/${d[1]}.png`;

var tiles;

const projection = d3.geoMercator()
      .scale(1 / (2 * Math.PI))
      .translate([0, 0]);

var path = d3.geoPath(projection);

Promise.all([
  d3.json("data/geospatial/states-10m-filtered.topojson"),
])
.then(([us,]) => {
  usFeatures = topojson.feature(us, us.objects.states).features
  projection.fitSize([tileWidth, tileHeight], {type: "FeatureCollection", "features": usFeatures});

  tiles = d3.tile()
      .size([tileWidth, tileHeight])
      .scale(projection.scale() * 2 * Math.PI)
      .translate(projection([0, 0]))
      ();

  var defs = d3.select("#defs").append("svg")
      .attr("width", 0)
      .attr("height", 0)
    .append("defs");

  defs.append("g")
      .selectAll("path")
      .data(topojson.feature(us, us.objects.nation).features)
    .enter().append("path")
      .attr("id", "contiguous-us-path")
      .attr("d", path)
      .attr("stroke-width", "0px");

  defs.append("clipPath")
      .attr("id", "contiguous-us-clip")
    .append("use")
      .attr("xlink:href", "#contiguous-us-path");
})

function buildTableRows(tableElement, data, columns) {
  var rows = tableElement.selectAll("tr")
      .data(data)
    .enter().append("tr")
      .attr("class", d => "state-row")
      .attr("id", d => `state-row-${d.id}`);

  rows.selectAll("td")
      .data((row, i) => columns.map(c => {
        var cell = {};
        Object.keys(c).forEach(k => {
          cell[k] = typeof c[k] == 'function' ? c[k](row) : c[k];
        });
        return cell;
      }))
    .enter().append("td")
      .attr("class", d => `col col-${d.cl}`)
      .html(d => d.html);
}
    
function buildTable(tableID, data, columns, sortTable) {
  var table = d3.select(tableID),
      thead = table.append("thead"),
      tbody = table.append("tbody");

  thead.append("tr")
      .selectAll("th")
      .data(columns)
    .enter().append("th")
      .attr("class", d => `col clickable col-${d.cl}`)
      .html(d => d.head + " <span></span>");

  buildTableRows(tbody, data, columns);
}

function buildTableFooter(tableID, data, columns) {
  var table = d3.select(tableID),
      tfoot = table.append("tfoot");

  buildTableRows(tfoot, data, columns);
}

