'use strict';
let data = ""
let svg = ""
let tooltip = ""

const measurements = {
    margin: 50,
    width: 500,
    height: 500
}

window.onload = function() {
    svg = d3.select("body").append("svg")
        .attr("width", 700)
        .attr("height", 700);

    console.log("here")

    tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .attr('style', 'position: absolute; opacity: 0;');

    d3.csv("./cal2.csv").then(function (data) {
        data.forEach(function (d) {
            d["price"] = d["price"].replace(/[,]/g, '')
            d["price"] = +d["price"]
        });


        makeHistogram(data)
    })

}

function makeHistogram(data) {
    let specData = data.filter(data => data["date"] === "2020-02")

    specData = specData.filter(function(v) {
        return this[v.listing_id]?
          !Object.assign(this[v.listing_id], v):
          (this[v.listing_id] = v);
      }, {});
    let price = specData.map(row => row["price"])

    let maxprice = d3.max(price);
    let minprice = d3.min(price);
    var x = d3.scaleLinear()
        .domain([minprice, maxprice + 125])
        .range([100, 550]);
    svg.append("g")
        .attr("id", "x-axis")
        .attr("transform", "translate(0," + 500 + ")")
        .call(d3.axisBottom(x))
        .call(g => g.append("text") // Adds the x-axis label to the x-axis
            .attr("class", "x label")
            .attr("text-anchor", "middle")
            .attr("font-size", "12px")
            .attr("x", 700/2)
            .attr("y", (40))
            .attr("fill", "black")
            .text("Avg. Monthly Price"));


    var histogram = d3.histogram()
        .value(function (price) { return price; })
        .domain(x.domain())
        .thresholds(x.ticks(40));

    var bins = histogram(price);

    var y = d3.scaleLinear()
        .domain([d3.max(bins, function (d) { return d.length; }), 0])
        .range([0, 450]);
    svg.append("g")
        .attr("id", "y-axis")
        .attr('transform', 'translate(100,50)')
        .call(d3.axisLeft(y))
        .call(g => g.append("text")
            .attr("text-anchor", "middle")
            .attr("font-size", "12px")
            .attr("x", -225)
            .attr("y", -50)
            .attr("fill", "black")
            .attr("transform", "rotate(-90)")
            .text("Number of Homes in bin"));

    drawAxes(x, y);

    svg.selectAll('.rect')
        .data(bins)
        .enter()
        .append('rect')
        .attr('x', function (d) { return x(d.x0 + 50) })
        .attr('y', function (d) { return y(d.length) + 49 })
        .attr('width', function (d) { return x(d.x1) - x(d.x0) })
        .attr('height', function (d) { return 450 - y(d.length) })
        .attr('fill', 'steelblue')
        .attr("stroke", "black")
        .on("mouseover", function (d) {
            let tempData = specData.filter(data => data["price"] >= d.x0 && data["price"] <= d.x1)
            tooltip.transition()
                .duration(200)
                .style("opacity", 1);

            tooltip.style("left", (d3.event.pageX + 30) + "px")
                .style("top", (d3.event.pageY - 180) + "px");

            let tSvg = tooltip.append("svg")
                .attr("height", "300px")
                .attr("width", "325px")

            tSvg.append("text")
                .attr("text-anchor", "middle")
                .attr("font-size", "16px")
                .attr("x", (325) / 2)
                .attr("y", (15))
                .attr("fill", "black")

            d3.json('data/neighbourhoods.geojson').then(function (mapdata) {

                d3.csv('data/listings.csv').then(function (pointData) {
                    let ids = tempData.map(row => row['listing_id'])
                    let filtPoints = pointData.filter(
                        function (e) {
                            return this.indexOf(e.id) >= 0;
                        },
                        ids
                    );

                    const albersProj = d3.geoAlbers()
                        .scale(65000)
                        .rotate([122.3321, 0])
                        .center([0, 47.6062])
                        .translate([325 / 2, 300 / 2]);

                    const geoPath = d3.geoPath()
                        .projection(albersProj)

                    let sea = tSvg.append("g").attr("id", "sea");
                    sea.selectAll('path')
                        .data(mapdata.features)
                        .enter()
                        .append('path')
                        .attr('fill', 'lightgray')
                        .attr('stroke', 'black')
                        .attr('d', geoPath)

                    let bnb = tSvg.append("g").attr("id", "bnb");
                    bnb.selectAll('.circle')
                        .data(filtPoints)
                        .enter()
                        .append('circle')
                        .attr('cx', function (d) {
                            let scaledPoints = albersProj([d['longitude'], d['latitude']])
                            return scaledPoints[0]
                        })
                        .attr('cy', function (d) {
                            let scaledPoints = albersProj([d['longitude'], d['latitude']])
                            return scaledPoints[1]
                        })
                        .attr('r', 4)
                        .attr('fill', 'steelblue')
                        .attr("stroke", "black")


                })

            })
        })
        .on("mouseout", function (d) {
            tooltip.transition()
                .duration(0)
                .style("opacity", 0)
            tooltip.selectAll("svg")
                .attr("height", "0px")
                .attr("width", "0px")
        });

    let months = ["2020-02", "2020-03", "2020-04", "2020-05", "2020-06", "2020-07", "2020-08", "2020-09", "2020-10", "2020-11", "2020-12", "2021-01", "2021-02"]

    let monthFilter = d3.select("#filterMonth")
        .append('select')
    
    monthFilter.selectAll('option')
        .data(months)
        .enter()
        .append('option')
        .attr('value', function (d) { return d })
        .html(function (d) { return d })

    monthFilter.on("change", function () {
        console.log("change")
        let newData = data;
        newData = newData.filter(data => data["date"] == this.value);
        newData = newData.filter(function (v) {
            return this[v.listing_id] ?
                !Object.assign(this[v.listing_id], v) :
                (this[v.listing_id] = v);
        }, {});
        let price = newData.map(row => row["price"])
        let extent = d3.extent(price);
        console.log(extent)
        x.domain([extent[0], extent[1] + 125])
        histogram = d3.histogram()
            .value(function (price) { return price; })
            .domain(x.domain())
            .thresholds(x.ticks(40));
        y.domain([d3.max(bins, function (d) { return d.length; }), 0])

        drawAxes(x, y)

        d3.select('#x-axis')
            .call(d3.axisBottom(x));

        d3.select('#y-axis')
            .call(d3.axisLeft(y));
        
        let bar = svg.selectAll(".rect").data(data)
        bar.exit().remove()

        bar.transition()
            .duration(1000)
            .attr("transform", function(d) { return "translate(" + x(d.x) + "," + y(d.y) + ")"; });

        bar.select("rect")
            .transition()
            .duration(1000)
            .attr("height", function(d) { return height - y(d.y); })
            .attr("fill", function(d) { return colorScale(d.y) });

    })
}

function drawAxes(scaleX, scaleY) {
    let xAxis = d3.axisBottom()
        .scale(scaleX)

    let yAxis = d3.axisLeft()
        .scale(scaleY)

}