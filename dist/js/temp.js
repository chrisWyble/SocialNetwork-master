//create pie chart
// let svgPie = d3.select("#PieChart").append("svg")
//     .attr("width",  "13vw")
//     .attr("height", "30vh")
//     .append("g");
    
// svgPie.append("g")
// 	.attr("class", "slices");
// svgPie.append("g")
// 	.attr("class", "labels");
// svgPie.append("g")
// 	.attr("class", "lines");

// let widthOfPie = "13vw",
//     heightOfPie = "30vh",
//     radius = Math.min(widthOfPie, heightOfPie) / 2.0;
    
// //svgPie.attr("transform", "translate(" + width / 2.0 + "," + height / 2.0 + ")"); 
    

// let pie = d3.layout.pie()
// 	.sort(null)
// 	.value(function(d) {
// 		return d.value;
// 	});

// let arc = d3.svg.arc()
// 	.outerRadius(radius * 0.8)
// 	.innerRadius(radius * 0.4);

// let outerArc = d3.svg.arc()
// 	.innerRadius(radius * 0.9)
// 	.outerRadius(radius * 0.9);

// let key = function(d){ return d.data.label; };

// let color = d3.scale.ordinal()
//     .domain(["Lorem ipsum", "dolor sit", "amet", "consectetur", "adipisicing", "elit", "sed", "do", "eiusmod", "tempor", "incididunt"])
//     .range(["#98abc5", "#8a89a6", "#7b6888", "#6b486b", "#a05d56", "#d0743c", "#ff8c00"]);
    
// function randomData (){
// let labels = color.domain();
//     return labels.map(function(label){
//         return { label: label, value: Math.random() }
//     });
// }

// change(randomData());
    
// d3.select(".randomize")
//     .on("click", function(){
//         change(randomData());
//     });

// function change(data) {

// 	/* ------- PIE SLICES -------*/
// 	let slice = svgPie.select(".slices").selectAll("path.slice")
// 		.data(pie(data), key);
        
// 	slice.enter()
// 		.insert("path")
// 		.style("fill", function(d) { return color(d.data.label); })
// 		.attr("class", "slice");

// 	slice		
// 		.transition().duration(1000)
// 		.attrTween("d", function(d) {
// 			this._current = this._current || d;
// 			let interpolate = d3.interpolate(this._current, d);
// 			this._current = interpolate(0);
// 			return function(t) {
// 				return arc(interpolate(t));
// 			};
// 		})

// 	slice.exit()
// 		.remove();

// 	/* ------- TEXT LABELS -------*/

// 	let text = svgPie.select(".labels").selectAll("text")
// 		.data(pie(data), key);

// 	text.enter()
// 		.append("text")
// 		.attr("dy", ".35em")
// 		.text(function(d) {
// 			return d.data.label;
// 		});
	
// 	function midAngle(d){
// 		return d.startAngle + (d.endAngle - d.startAngle)/2;
// 	}

// 	text.transition().duration(1000)
// 		.attrTween("transform", function(d) {
// 			this._current = this._current || d;
// 			let interpolate = d3.interpolate(this._current, d);
// 			this._current = interpolate(0);
// 			return function(t) {
// 				let d2 = interpolate(t);
// 				let pos = outerArc.centroid(d2);
// 				pos[0] = radius * (midAngle(d2) < Math.PI ? 1 : -1);
// 				return "translate("+ pos +")";
// 			};
// 		})
// 		.styleTween("text-anchor", function(d){
// 			this._current = this._current || d;
// 			let interpolate = d3.interpolate(this._current, d);
// 			this._current = interpolate(0);
// 			return function(t) {
// 				let d2 = interpolate(t);
// 				return midAngle(d2) < Math.PI ? "start":"end";
// 			};
// 		});

// 	text.exit()
// 		.remove();

// 	/* ------- SLICE TO TEXT POLYLINES -------*/

//     let polyline = svgPie.select(".lines").selectAll("polyline")
//         .style("opacity", .3),
//         .style("stroke", black),
//         .style("stroke-width", "2px")
//         .style("fill", none)
// 		.data(pie(data), key);
	
// 	polyline.enter()
// 		.append("polyline");

// 	polyline.transition().duration(1000)
// 		.attrTween("points", function(d){
// 			this._current = this._current || d;
// 			let interpolate = d3.interpolate(this._current, d);
// 			this._current = interpolate(0);
// 			return function(t) {
// 				var d2 = interpolate(t);
// 				var pos = outerArc.centroid(d2);
// 				pos[0] = radius * 0.95 * (midAngle(d2) < Math.PI ? 1 : -1);
// 				return [arc.centroid(d2), outerArc.centroid(d2), pos];
// 			};			
// 		});
	
// 	polyline.exit()
// 		.remove();
// };



// Ridge line
// var marginOfRidge = {top: 60, right: 30, bottom: 20, left:110},
//     widthOfRidge = 460 - marginOfRidge.left - marginOfRidge.right,
//     heightOfRidge = 400 - marginOfRidge.top - marginOfRidge.bottom;

// // append the svg object to the body of the page
// var svgRidge = d3.select("#my_dataviz")
//     .append("svg")
//     .attr("width", widthOfRidge + marginOfRidge.left + marginOfRidge.right)
//     .attr("height", heightOfRidge + marginOfRidge.top + marginOfRidge.bottom)
//     .append("g")
//         .attr("transform",
//         "translate(" + marginOfRidge.left + "," + marginOfRidge.top + ")");

// //read data
// d3.csv("temp.csv", function(data) {

    
    
//   // Get the different categories and count them
// var categories = Object.keys( data[0] )
// var n = categories.length

//   // Add X axis
// var x = d3.scale.linear() 
//     .domain([-10, 140])
//     .range([ 0, widthOfRidge ]);
// svgRidge.append("g")
//     .attr("transform", "translate(0," + heightOfRidge + ")")
//     .call(d3.svg.axis(x));
//     debugger;
//   // Create a Y scale for densities
//     var y = d3.scale.linear()
//     .domain([0, 0.4])
//     .range([ heightOfRidge, 0]);
    
//     debugger;
//   // Create the Y axis for names
//     var yName = d3.scale.ordinal()
//     .domain(categories)
//     .range([0, heightOfRidge])
//     .rangeRoundBands(1)
//     svgRidge.append("g")
//         .call(d3.svg.axis(yName));

//   // Compute kernel density estimation for each column:
//   var kde = kernelDensityEstimator(kernelEpanechnikov(7), x.ticks(40)) // increase this 40 for more accurate density.
// var allDensity = []
// for (i = 0; i < n; i++) {
//     key = categories[i]
//     density = kde( data.map(function(d){  return d[key]; }) )
//     allDensity.push({key: key, density: density})
// }

//   // Add areas
// svgRidge.selectAll("areas")
//     .data(allDensity)
//     .enter()
//     .append("path")
//     .attr("transform", function(d){return("translate(0," + (yName(d.key)-heightOfRidge) +")" )})
//     .datum(function(d){return(d.density)})
//     .attr("fill", "#69b3a2")
//     .attr("stroke", "#000")
//     .attr("stroke-width", 1)
//     .attr("d",  d3.svg.line()
//         //.curveMonotoneX(d3.basis)                    THIS IS WHERE I'M AT
        
//         .x(function(d) { return x(d[0]); })
//         .y(function(d) { return y(d[1]); })
//     )
// })

// // This is what I need to compute kernel density estimation
// function kernelDensityEstimator(kernel, X) {
//     return function(V) {
//     return X.map(function(x) {
//         return [x, d3.mean(V, function(v) { return kernel(x - v); })];
//         });
//     };
// }

// function kernelEpanechnikov(k) {
//     return function(v) {
//         return Math.abs(v /= k) <= 1 ? 0.75 * (1 - v * v) / k : 0;
//     };
// }
