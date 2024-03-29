//------------------------------------------------------------------------------------------
//variables
//var defs, brush,main_yZoom, textScale, x, selector, map, vectorLayer, saveFile;
//------------------------------------------------------------------------------------------
let inputCSVData=[]; //data that is originally read in from the CSV file
let selection;
let selectionInterval = d3.select("#timeInterval").node().value; //get original value of time interval drop down
let highlightMode = d3.select('input[name="high"]:checked')[0][0].value //get original value of highlight mode
let minimumDate; //minimun date within the CSV file
let maximumDate; //maximum date within the CSV file
let datesProvided = []; //range of date values on barchart
let legitColor = 'rgb(245,147,34)'; //color to represent Believes_legitimate: True
let notLegitColor = 'rgb(8,119,189)'; //color to represent Believes_legitimate: False
let networkData = []; //store the full network data results
let networkLinks = []; //store the full network link results
let networkDataFiltered = []; //updated nodes list based on drop down selection
let networkLinksFiltered = []; //updated links list based on drop down selection
let revisedDates = [];
let brush;
let legitC;
let ScreenWidth = $(window).width();
let ScreenHeight = $(window).height();
let latitudeOnNodeClick, longitudeOnNodeClick;

// Parse the date / time
var parseDate = d3.time.format(" %Y-%m-%dT%H:%M:%S.%LZ"); //format of time within CSV file

//bar chart--------------------------------------------------------------
//These correlate to the bar chart
let barMargin = {top: 1, right: 30, bottom: 50, left: 24};
let barWidth = ScreenWidth/1.05 - barMargin.left - barMargin.right;
let barHeight = ScreenHeight/4 - barMargin.top - barMargin.bottom;
let barWidthPadding = 5;
let scaleVal = "scale(1,0.6)"
//svg element for the bar chart
let svg = d3.select("#BarChart").append("svg")
    .attr("width", "48.6vw")
    .attr("height", "17.8vh")
    .append("g")
    .attr("transform", "translate(" + barMargin.left + "," + barMargin.top + ") "+scaleVal);

//svg element for the bar chart - compound
let svgc = d3.select("#BarChartCompound").append("svg")
    .attr("width", "49vw")
    .attr("height", "14vh")
    .append("g")
    .attr("transform", "translate(" + barMargin.left + "," + barMargin.top + ") "+scaleVal);

//-------------------------------------------------------------------------


function getTop14URLToURLCountArray_fromEpochToURLDict_inDateStringRange(lowDateString, highDateString, epochToURLDict) {
    /*
    if "any" passed to lowDateString, will use 0 for low epoch value
    if "any" passed to highDateString, will use 9999999999999 for high epoch value

    */
    
    // divides by 1000, since Date.parse will have 3 extra zeros
    const lowEpoch = lowDateString === "any" ? 0 : Date.parse(lowDateString) / 1000;
    const highEpoch = highDateString === "any" ? 9999999999999 : Date.parse(highDateString) / 1000;

    const urlToURLCountDict = getURLToURLCountDict_fromEpochToURLDict_inEpochRange(lowEpoch, highEpoch, epochToURLDict);
    
    const urlToURLCountDict_Array = Object.entries(urlToURLCountDict);
    
    // keep only the top 14 most frequent URLS (so sort descending order)
    urlToURLCountDict_Array.sort((a, b) => {
        return b[1] - a[1];
    })
    legitC = 0;
    return urlToURLCountDict_Array.slice(0, 14);
}

function getSortedEpochArrayFromEpochToURLDict(epochToURLDict) {
    const sortedEpochArray = Object.keys(epochToURLDict).map(item => parseInt(item)).sort();
    return sortedEpochArray;
}

function getURLToURLCountDict_fromEpochToURLDict_inEpochRange(lowEpoch, highEpoch, epochToURLDict) {
    const sortedEpochURLS = getSortedEpochArrayFromEpochToURLDict(epochToURLDict);

    let [lowIdx, highIdx] = getIndexesBetweenBrushLowAndHigh_Epochs(lowEpoch, highEpoch, sortedEpochURLS);
    //console.log("LOW IDX IN SORTED ARRAY:", lowIdx, "HIGH IDX IN SORTED ARRAY:", highIdx);
    
    let urlToURLCount = {};

    for (let i=lowIdx; i <= highIdx; i++) {
        let epochInRange = sortedEpochURLS[i];
        let urlArrayForCurrentEpoch = epochToURLDict[epochInRange]
        // console.log(epochInRange, urlArrayForCurrentEpoch);

        urlArrayForCurrentEpoch.forEach(url => {
            if (!(urlToURLCount.hasOwnProperty(url))) {
                urlToURLCount[url] = 1;
            } else {
                urlToURLCount[url] += 1;
            }
        });
    }
    
    // console.log(urlToURLCount);
    return urlToURLCount;
}

function createSmallBarChart_JSON(barChartOptions={selector:null, widthOfBarC:"16.8vw", heightOfBarC:"58vh"}) {
    // Creates canvas
    const {selector, widthOfBarC, heightOfBarC} = barChartOptions;
    if(selector===null) {
        throw "createSmallBarChart_JSON() requires a selector";
    }

    let canvas = d3.select(selector)
        .append("svg")
        .attr("width", widthOfBarC)
        .attr("height", heightOfBarC)
        .append("g")
        .attr("transform",`translate(10,10) `); //rotate(90)")   ${widthOfAxis/1.14}
        
}


function updateSmallBarChart_JSON(urlArrays, barChartOptions={selector:null, widthOfBarC:"16.8vw", heightOfBarC:"58vh", lowColor:"rgb(245,147,34)", highColor:"rgb(245,147,34)", xAxisLabel:"Believes True"}) {
    /*
    Parameter: urlArrays
    Array of Array[urlString, urlCountInteger]
    top 14 or less only (but less than 14 subArrays can be passed in), and they are sorted in descending order

    [["twitter.com/rx", 814]
    ["freshdaily.news", 57],
    ["go.shr.lc/2wRHO", 35],
    ["twitter.com/i/w", 3],
    ["aweirdworld.net", 3]]


    urlString: d[0]
    urlCountInteger: d[1]

    Parameter: barChartOptions
    */
    const {selector, widthOfBarC, heightOfBarC, lowColor, highColor, xAxisLabel} = barChartOptions;
    if(selector===null) {
        throw "createSmallBarChart_JSON() requires a selector";
    }

    // Only widthOfBarC and height are viewport values. Otherwise the axis function will not work.

    let minimumURLCount = urlArrays[urlArrays.length-1][1]; // last item's urlCount (should be minimum)
    let maximumURLCount = urlArrays[0][1]; // first item's urlCount (should be maximum)

    
    let data = [...urlArrays];
    // if less than 14 urlArrays, then add a few empty urls and have nothing for url
    for (let i=0; i < 14 - data.length; i++) {
        data.push(["", 0]);
    }
    

    let heightOfAxis = (parseFloat(heightOfBarC) * (window.innerHeight)/100);
    let widthOfAxis = parseFloat(widthOfBarC ) * (window.innerWidth)/100;

    const countLowBound = minimumURLCount;
    const countHighBound = maximumURLCount;
    let colorScale = d3.scale.linear()
                    .domain([countLowBound,countHighBound])
                    .range([lowColor, highColor])

    //const barWidthLowBound = minimumURLCount;
    const barWidthHighBound = maximumURLCount;
    let widthScale = d3.scale.linear()
                    .domain([0, barWidthHighBound])
                    .range([0,widthOfAxis-widthOfAxis/7.83]); // width of the longest bar in this case
    

                
    let canvas = d3.select(`${selector} svg g`);


    // Remove old 'g' and 'text' before creating new ones
    canvas.selectAll("rect.color_bar").remove();
    canvas.selectAll("text.url_text").remove();
    canvas.selectAll("g.axis_bar").remove();
    


    

    // Creating Colored Rectangle Bars
    canvas.selectAll("rect")
        .data(data, d => d)
        .enter()
        .append("rect")
        .attr("class", "color_bar")
        .attr("width",  (d, i) => { 
            let urlCount = d[1];
            if (urlCount >= 150) {
                return urlCount/2.9;
            } else if (urlCount >= 75) {
                return urlCount/1.85;
            } else if (urlCount >= 50) {
                return urlCount/1.7;
            }else if (urlCount >= 25) {
                return urlCount/1.3;
            }else if (urlCount > 10) {
                return urlCount/1.1;
            } else if (urlCount > 6) {
                return urlCount; 
            } else {
                return urlCount * 1.2;
            }
            }) 
        .attr("height", 20)
        .attr("y", (d, i) => i * 28) // Shorthand for "y", function (d,i) { return i * 30;})
        .attr("fill", (d, i) => {
            return colorScale(d[1]);
        });

        //tooltip for hover text
        // let mouse = d3.mouse(this);
        // let elem = document.elementFromPoint(mouse[0], mouse[1]);
        // let tooltip = d3.select("rect")
        // .on("mouseover", function(){tooltip.style("fill","pink");})
        // .on("mouseout", function() {tooltip.style("fill","lime");});
    
    
    // Creating Axis
    let axisB1 = d3.svg.axis()
                .ticks(8)
                .scale(widthScale);

    canvas.append("g")
        .attr("class", "axis_bar")
        .attr("transform",`translate(0,${400})`) 
        .call(axisB1);

    
        
    // Creating URL text labels
    canvas.selectAll("text")
        .data(data, d => d)
        .enter()
        .append("text")
        .attr("class", "url_text")
        .style("font-family","Roboto")
        .attr("fill", "#000")
        .attr("y", (d, i) => {
            return i * 28 + 16;
        })
        .attr("x", 110)
        .text(d => {
            return d[0];
        });
        
        
    
    // Creating Chart X-Axis text label
    canvas.append("text")
        .attr("class", "x_axis_label")
        .attr("fill", lowColor)
        .attr("y", heightOfAxis - 10)
        .attr("x", 110)
        .text(xAxisLabel)
        .style("font-size", "18px")
        .style("font-family","Roboto")
    
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Smaller Bar Chart # 1 (TRUE)                            

function initializeSmallBarChartTRUE_JSON(data) {
    // set global variable to read in TRUE json
    window.TRUE_1_EPOCHS_TO_URLS = data;
}

function initializeSmallBarChartTRUE_afterSettingGlobal() {
    const top14URLToURLCountArray_TRUE = getTop14URLToURLCountArray_fromEpochToURLDict_inDateStringRange("any", "any", window.TRUE_1_EPOCHS_TO_URLS);
    
    const TRUE_BARCHART_OPTIONS = {selector:"#BarC_1", widthOfBarC:"16.8vw", heightOfBarC:"49vh", lowColor:"rgb(245,147,34)", highColor:"rgb(245,147,34)", };
    createSmallBarChart_JSON(TRUE_BARCHART_OPTIONS);
    updateSmallBarChart_JSON(top14URLToURLCountArray_TRUE, TRUE_BARCHART_OPTIONS);
}

d3.json("./dataForSmallBarChartsOnBrush/TRUEdataset2EpochsToURLS.json", (data) => {
    initializeSmallBarChartTRUE_JSON(data);
    initializeSmallBarChartTRUE_afterSettingGlobal();  
} );




//Smaller Bar Chart # 2 (FALSE)                                     
function initializeSmallBarChartFALSE_JSON(data) {
    // set global variable to read in FALSE json
    window.FALSE_1_EPOCHS_TO_URLS = data;
}

function initializeSmallBarChartFALSE_afterSettingGlobal() {
    const top14URLToURLCountArray_FALSE = getTop14URLToURLCountArray_fromEpochToURLDict_inDateStringRange("any", "any", window.FALSE_1_EPOCHS_TO_URLS);
    
    const FALSE_BARCHART_OPTIONS = {selector:"#BarC_2", widthOfBarC:"16.8vw", heightOfBarC:"49vh", lowColor:"rgb(8,119,189)", highColor:"rgb(8,119,189)", };
    createSmallBarChart_JSON(FALSE_BARCHART_OPTIONS);
    updateSmallBarChart_JSON(top14URLToURLCountArray_FALSE, FALSE_BARCHART_OPTIONS);
}


d3.json("./dataForSmallBarChartsOnBrush/FALSEdataset2EpochsToURLS.json", (data) => {
    initializeSmallBarChartFALSE_JSON(data);
    initializeSmallBarChartFALSE_afterSettingGlobal();  
} );



//pie chart--------------------------------------------------------------
// 


// read in True CSV File to update countOf_TrueDates global var
let countOf_TrueDates = 0; // this must be kept global or else it will break initializePieChart
// d3.csv("./dataForSmallBarCharts/TRUE_Dataset2.csv", function(data) {
//     // Gather the frequency of believes True data within dataset 2
//     for(let i = 0; i < data.length; i++ ) {
//         countOf_TrueDates += parseInt(data[i].Frequency);
//     }
//     console.log("Sum of TRUE ", countOf_TrueDates);
// })


// read in JSON file and save in global variable TRUEdataset2Epochs
let TRUEdataset2Epochs = null;
d3.json("./dataForPieChart/TRUEdataset2Epochs.json", function(data) {
    TRUEdataset2Epochs = data;
    countOf_TrueDates = data.length;
});

// read in JSON file and save in global variable FALSEdataset2Epochs
let FALSEdataset2Epochs = null;
d3.json("./dataForPieChart/FALSEdataset2Epochs.json", function(data) {
    FALSEdataset2Epochs = data;
});

function getIndexesBetweenBrushLowAndHigh_Epochs(lowEpoch, highEpoch, epochArray) {
    // Parameters:  low and high epoch integers
    // Should return count of items within epochArray

    //console.log("EPOCH ARGS", lowEpoch, highEpoch)

    let lowIdx = 0;
    let highIdx = epochArray.length - 1;

    while (epochArray[lowIdx] < lowEpoch) {
        lowIdx++;
    }

    while(epochArray[highIdx] > highEpoch) {
        highIdx--;
    }
    //console.log(lowIdx, highIdx, highIdx - lowIdx + 1);

    return [lowIdx, highIdx];
}

function countDatesBetweenBrushLowAndHigh_Epochs(lowEpoch, highEpoch, epochArray) {
    // Parameters:  low and high epoch integers
    // Should return count of items within epochArray

    //console.log("EPOCH ARGS", lowEpoch, highEpoch)

    let lowIdx = 0;
    let highIdx = epochArray.length - 1

    while (epochArray[lowIdx] < lowEpoch) {
        lowIdx++;
    }

    while(epochArray[highIdx] > highEpoch) {
        highIdx--;
    }
    //console.log(lowIdx, highIdx, highIdx - lowIdx + 1);

    return highIdx - lowIdx + 1;
}

function countDatesBetweenBrushLowAndHigh(low, high, epochArray) {
    // Parameters:  Brush's Low and High Date Strings
    // Should return count of items within the brush to update PieChart

    // The JS Date.parse epoch values have 3 zeros at end, so divide by 1000 to match json epoch values
    const lowEpoch = Date.parse(low) / 1000;
    const highEpoch = Date.parse(high) / 1000;

    //console.log("PIE ARGS", lowEpoch, highEpoch)

    return countDatesBetweenBrushLowAndHigh_Epochs(lowEpoch, highEpoch, epochArray);
}

function countDatesBetweenBrushLowAndHighForTrueAndFalse(low, high) {
    // Parameters: low and high Date strings from the Brush
    /*
    with formats
    let high= "Thu Sep 07 2017 10:06:35 GMT-0500 (Central Daylight Time)";
    let low ="Sat Aug 26 2017 14:06:35 GMT-0500 (Central Daylight Time)"
    */
    // also uses global epoch arrays that were loaded in from the json files
    // Returns: True and False Percents Object that can be passed directly into updatePieSVG
    //console.log("True Count")
    let trueCount = countDatesBetweenBrushLowAndHigh(low, high, TRUEdataset2Epochs);
    // console.log("False Count")
    let falseCount = countDatesBetweenBrushLowAndHigh(low, high, FALSEdataset2Epochs);
    let totalFrequency = trueCount + falseCount;
    return [{ label: "True", value: trueCount/totalFrequency }, { label: "False", value: falseCount/totalFrequency }]
}

function createPieSVG() {
    let svgPie = d3.select("#PieChart")
    .append("svg")
    .attr("width","12vw")
    .attr("height","30vh")
    .attr("class", "PieChart")
    .append("g")

    svgPie.append("g")
        .attr("class", "slices");
    svgPie.append("g")
        .attr("class", "labels");
    svgPie.append("g")
        .attr("class", "lines");


    svgPie.attr("transform", "translate(148,146) scale(0.44)");
}


function updatePieSVG(data) {
    // Parameter data format:  [{ label: "True", value: countOf_TrueDates/totalFrequency }, { label: "False", value: countOf_FalseDates/totalFrequency }]

    // console.log("Inside updatePieSVG")
    
    let svgPie = d3.select("#PieChart svg g")

    /* ------- PIE SLICES -------*/
    let widthOfPie = 960;
    let heightOfPie = 450;

    let radius = Math.min(widthOfPie, heightOfPie) / 2.0;
    
    let pie = d3.layout.pie()
    .sort(null)
    .value(function(d) {
        return d.value;
    });


    let arc = d3.svg.arc()
    .outerRadius(radius * 0.78)
    .innerRadius(radius * 0.64);

    let outerArc = d3.svg.arc()
        .innerRadius(radius * 0.9)
        .outerRadius(radius * 0.9);

    let key = function(d){  return d.data.label; };

    // console.log("Remove path")
    svgPie.selectAll('path').remove()


    let slice = svgPie.selectAll("path.slice")
        .data(pie(data), key);

    let color = d3.scale.ordinal()
    .domain(["True", "False"])
    .range(["rgb(245,147,34)","rgb(8,119,189)"]);

    slice.enter()
        .insert("path")
        .style("fill", function(d) { 
            return color(d.data.label);
        })
        .attr("class", "slice")
        .attr("class", "PieChart");

    // svgPie.selectAll("path")
    //     .style("fill", function(d) { 
    //         return color(d.data.label);
    //     })

    slice		
        .transition().duration(1000)
        .attrTween("d", function(d) {
            this._current = this._current || d;
            let interpolate = d3.interpolate(this._current, d);
            //this._current = interpolate(0);
            return function(t) {
                return arc(interpolate(t));
            };
        })

    slice.exit()
        .remove();

    /* ------- TEXT LABELS -------*/

    let text = svgPie.select(".labels").selectAll("text")
        .data(pie(data), key);

    text.enter()
    .append("text")
    .attr("dy", function(d) {
        if(d.data.label == "True") {
            return "-0.2em"
        } else {
            return "-.85em"
        }
    })
    .attr("dx", function(d) {
        if(d.data.label == "True") {
            return "-0.8em"
        } else {
            return "2.1em"
        }
    })
    .style({"font-size": function (d) {
            if (d.data.label == "True") {
                return "36px"    
            } else {
                return "30px"    
            }
        },
        "font-family":"Roboto"}) 
        
    .text(function(d) {
        if(d.data.label == "True") {
            return "Trusters"
        } else {
            return "Non-Trusters"
        }
    })
    .attr("fill", function(d) 
    {if(d.data.label == "True") 
    { return "rgb(245,147,34)"}
    return "rgb(8,119,189)"}
    );
    
    function midAngle(d){
        return d.startAngle + (d.endAngle - d.startAngle)/2;
    }

    text.transition().duration(1000)
        .attrTween("transform", function(d) {
            this._current = this._current || d;
            let interpolate = d3.interpolate(this._current, d);
            this._current = interpolate(0);
            return function(t) {
                let d2 = interpolate(t);
                let pos = outerArc.centroid(d2);
                pos[0] = radius * (midAngle(d2) < Math.PI ? 1 : -1);
                return "translate("+ pos +")";
            };
        })
        .styleTween("text-anchor", function(d){
            this._current = this._current || d;
            let interpolate = d3.interpolate(this._current, d);
            this._current = interpolate(0);
            return function(t) {
                let d2 = interpolate(t);
                return midAngle(d2) < Math.PI ? "start":"end";
            };
        });

    text.exit()
        .remove();

    /* ------- SLICE TO TEXT POLYLINES -------*/

    let polyline = svgPie.select(".lines").selectAll("polyline")
        .attr("class", "PieChart")
        .data(pie(data), key);
    
    polyline.enter()
        .append("polyline")
        .attr("class", "PieChart");

    polyline.transition().duration(1000)
        .attrTween("points", function(d){
            this._current = this._current || d;
            let interpolate = d3.interpolate(this._current, d);
            this._current = interpolate(0);
            return function(t) {
                let d2 = interpolate(t);
                let pos = outerArc.centroid(d2);
                pos[0] = radius * 0.95 * (midAngle(d2) < Math.PI ? 1 : -1);
                return [arc.centroid(d2), outerArc.centroid(d2), pos];
            };			
        });
    
    polyline.exit()
        .remove();
};



function initializePieChartJSON(data) {
    let countOf_FalseDates = 0;
    // We are keeping countOf_TrueDates global that is read in when we load TRUE csv file
    countOf_FalseDates = data.length;
    // console.log("Sum of FALSE ", countOf_FalseDates);


    // Sum the frequencies for believes T/F for dataset 2 and then graph 
    let totalFrequency = countOf_FalseDates + countOf_TrueDates;
    let freqData = [{ label: "True", value: countOf_TrueDates/totalFrequency }, { label: "False", value: countOf_FalseDates/totalFrequency }]

    createPieSVG();

    // Calling updatePieSVG during initialization with total frequency data
    updatePieSVG(freqData);
}
d3.json("./dataForPieChart/FALSEdataset2Epochs.json", initializePieChartJSON)



//Social network-----------------------------------------------------------
//These correlate to the network graph
let margin = {top:20, right: 120, bottom: 20, left: 120};
let width = ScreenWidth/1.5 - margin.right - margin.left;
let height = ScreenHeight/3.125 - margin.top - margin.bottom;
//zoom behavior
let zoom = d3.behavior.zoom()
    .scaleExtent([-5,10])
    .on("zoom", zoomed)
//svg element for the network graph
let svgSoical = d3.select("#SocialNetwork").append("svg")
    .attr("width", "64vw")
    .attr("height", "59vh")
    //.attr('x',10)
    //.style("border", "1px solid black") //boarder for Social Network
   // .style('position','absolute')
    .call(zoom)
    .append('svg:g');
//force variable for network graph
let force = d3.layout.force()
    //.gravity(0.1)
    //.distance(100)
    .linkDistance(60) //originally 60
    .charge(-40) //originally -100
    .size([width, height]);
force.drag().on("dragstart", function() { d3.event.sourceEvent.stopPropagation(); });
//tooltip for hover text
let tooltip = d3.select("body").append("div").attr("class", "toolTip").style("display","none");
tooltip.append("text").attr("x", 15).attr("dy", "1.2em").style(
        "text-anchor", "middle").attr("font-size", "12px").style("font-family","Roboto")
        .attr("font-weight", "bold");
//-------------------------------------------------------------------------


//Map View-----------------------------------------------------------------
let view = new ol.View({
    center: ol.proj.fromLonLat([-90.82,40.2]),
    zoom: 4,
    // style: new ol.viewport ({
    //     width: "5vw",
    // })
});
var map; //variable for map
var vectorLayer; //stores nodes for map
//-------------------------------------------------------------------------

//Table View---------------------------------------------------------------
let grid; //grid for table
let tableData = []; //array to store values for table
//size of sheet view
let elem = document.querySelector('#myGrid');
elem.style.height = (ScreenHeight/2.54) + "px";
//-------------------------------------------------------------------------


//------------------------------------------------------------------------------------------
//Main D3 loop
//------------------------------------------------------------------------------------------
initialize_map();
//d3.csv("bar-data.csv", function(error, data) {
d3.csv("dataset_2_with_urls_sentiments.csv", function(error, data) {
//d3.csv(saveFile,function(error, data) {
    data.forEach(function (d){
        //gather input values
        let datum = {}; //store each line into a datum
        //console.log(d.post_date)
        datum.date =parseDate.parse(d.post_date)//get the date
        //console.log("Date: " + datum.date)
        datum.believes_legitimate=d.believes_legitimate; //get the believes true/false value
        datum.userID = d.user_id; 
        datum.bio= d.user_bio;
        datum.userName = d.user_name;
        datum.tweetID = d.tweet_id;
        datum.retweet =  d.retweet_from;
        datum.user_location_cleaned = d.user_location_cleaned
        datum.longitude = +d.longitude;
        datum.latitude = +d.latitude;
        datum.tweet_text_body = d.tweet_text_body;
        datum.compound = d.compound;
        inputCSVData.push(datum); //add to array of inputs
        //console.log(inputCSVData);
    })

    //detect when a change to time interval drop down happens
    d3.selectAll("#timeInterval").on("change", function(){
        selectionInterval  = this.value; //store drop down value
        //d3.selectAll('svg').remove(); //clear previous svg
        d3.selectAll("#BarChart > *").remove();
        //recreate svg
        svg = d3.select("#BarChart").append("svg")
            .attr("width", "48.6vw")
            .attr("height", "17.8vh")
            .append("g")
            .attr("transform", "translate(" + barMargin.left + "," + barMargin.top + ")"+scaleVal);

        d3.selectAll("#BarChartCompound > *").remove();
        svgc = d3.select("#BarChartCompound").append("svg")
            .attr("width", "49vw")
            .attr("height", "14vh")
            .append("g")
            .attr("transform", "translate(" + barMargin.left + "," + barMargin.top + ")"+scaleVal);

        generateBarChart(gatherBarChartData(+selectionInterval)) //redraw bar chart
        // generateBarChartCompound(gatherBarChartDataCompound(+selectionInterval)) //redraw bar chart
        // generateCompoundBarChart(gatherBarChartData(+selectionInterval)) //redraw bar chart
        generateCompoundBarChart(gatherBarChartDataCompound(+selectionInterval)) //redraw bar chart
    });
    // console.log("inputCSVData array:")
    // console.log(inputCSVData)

    minimumDate = d3.min(inputCSVData, function(d){ return d.date});
    maximumDate = d3.max(inputCSVData, function(d){ return d.date});

    //console.log("MIN DATE: " + minimumDate)
    //console.log("MAX DATE: " + maximumDate)
    

    
    //create bar chart
    let barData = gatherBarChartData(+selectionInterval);
    //console.log(barData)
    generateBarChart(barData)


    //create bar chart - Compound
    let barDataC = gatherBarChartDataCompound(+selectionInterval);
    // let barDataC = gatherBarChartData(+selectionInterval);
    //console.log(barData)
    generateCompoundBarChart(barDataC) 


    //create network graph
    renderNetworkData(inputCSVData, -1, -1); //-1's indicate default values               TURN BACK ON!!!!!!!!!!!!!!!!!!!!!
    //console.log(networkData); // debug line to anaylize structure of networkData array
    //console.log(networkLinks); //debug line to show network links
    generateNetworkGraph(networkData,networkLinks);


    //make table
    makeTable(inputCSVData)
});




function gatherBarChartData(interval){
    let outputData = [];

    //generate blank data based on interval rate
    //first entry
    let timeDatum={};
    timeDatum.date = new Date()
    timeDatum.date = minimumDate;
    timeDatum.legitimate=0;
    timeDatum.notLegitimate=0;
    outputData.push(timeDatum)
    
    while(outputData[outputData.length-1].date<maximumDate){
        let newTimeDatum = {};
        newTimeDatum.date = new Date(outputData[outputData.length-1].date);
        let minutes = newTimeDatum.date.getMinutes();
        newTimeDatum.date.setMinutes(minutes+interval)
        newTimeDatum.legitimate=0;
        newTimeDatum.notLegitimate=0;
        outputData.push(newTimeDatum)
    }

    //revise blank data based on inputs
    inputCSVData.forEach(function (d){
        for(var i=0; i<outputData.length; ++i){
            if(d.date<=outputData[i].date){
                if(d.believes_legitimate == " True "){
                    outputData[i].legitimate++;
                }else{
                    outputData[i].notLegitimate++;
                }
                break;
            }
        }
    })

    return outputData;
}

//-------------------------
//Generate Bar Chart
//-------------------------
function generateBarChart(inData) {
    let subgroups = ["legitimate","notLegitimate"];
    
    //transpose the data into layers
    let layers = d3.layout.stack()(subgroups.map(
        function(tweet) {
            return inData.map(function(d) { console.log(d)
                return {x: (d.date), y:+d[tweet]};
            });
        }));
    //console.log(layers);

    //make an array of overall dates
    datesProvided = d3.map(layers[0],function(d){return d.x}).keys();
    //console.log(datesProvided)

    // Set x, y and colors
    x = d3.scale.ordinal()
        .domain(layers[0].map(function(d) { return d.x; }))
        .rangeRoundBands([0, barWidth-barWidthPadding],0.05); //.rangeBands(interval[, padding[, outerPadding]])
       //.rangePoints([0,barWidth-barWidthPadding]);
    let y = d3.scale.linear()
        .domain([0, d3.max(layers, function(d) {  return d3.max(d, function(d) { return d.y0 + d.y; });  })])
        .range([barHeight, 0]);

    let colors = [legitColor, notLegitColor];

    // Define and draw axes
    let yAxis = d3.svg.axis()
        .scale(y)
        .orient("left")
        .ticks(5)
        //.attr("transform", "translate(0,)")
        .tickSize(-barWidth, 0, 0)
        .tickFormat( function(d) { return d } );

    let xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom")
        .tickFormat(d3.time.format("%m-%d %H:%M"));

    svg.append("g")
        .attr("class", "y axis")
        .attr('transform', 'translate(' + 12 + ', 0)')
        .call(yAxis);

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + (barHeight) + ") scale(0.518,1)")
        //.attr('transform', 'translate(0, ' + 4 + ')')
        .call(xAxis)
        .selectAll("text")
        .style("display", function(d,i) {
            if(i % 14 === 0 && selectionInterval == 30) {
                return "block"
            } else if (i % 7 === 0 && selectionInterval == 60) {
                return "block"
            } else if (i % 1 === 0 && selectionInterval == 1440) {
                return "block"
            } 
            else {
                return "none" 
            }
        })
        .style("text-anchor", "end")
        .style("font-family","Roboto")
        .attr("dx", "-.8em")
        .attr("dy", "-.55em")
        .attr("transform", "rotate(-45)" );

    // Create groups for each series, rects for each segment 
    let groups = svg.selectAll("g.cost")
        .data(layers)
        .enter().append("g")
        .attr("class", "cost")
        .style("fill", function(d, i) { return colors[i]; });

    let rect = groups.selectAll("rect")
        .data(function(d) { return d; })
        .enter()
        .append("rect")
        .attr("x", function(d) { return x(d.x); })
        .attr("y", function(d) { return y(d.y0 + d.y); })
        .attr("height", function(d) { return y(d.y0) - y(d.y0 + d.y); })
        .attr("width", x.rangeBand())
        .attr('transform', 'scale(0.518,1)')
        .on("mouseover", function() { tooltip.style("display", null); })
        .on("mouseout", function() { tooltip.style("display", "none"); })
        .on("mousemove", function(d) {
            let xPosition = d3.mouse(this)[0] - 15;
            let yPosition = d3.mouse(this)[1] - 25;
            tooltip.attr("transform", "translate(" + xPosition + "," + yPosition + ")");
            tooltip.select("text").text(d.y); //might be able to get ride of this tooltip since brush is now on top of it
        });

    // Draw legend
    var legend = svg.append('g')
            .attr('class', 'legend')
            .attr('transform', 'translate(' + (barWidth - 1200) + ', 0)');

    legend.selectAll('rect')
        .data(colors)
        .enter()
        .append('rect')
        .attr('x', -138)
        .attr('y', function(d, i){
            return i * 18;
        })
        .attr('width', 12)
        .attr('height', 12)
        .style("fill", function(d, i) {return colors.slice().reverse()[i];});
        
    legend.selectAll('text')
        .data(colors)
        .enter()
        .append('text')
        .text(function(d, i) { 
            switch (i) {
//            case 0: return "Believes Not Legitimate";
//            case 1: return "Believes Legitimate";
            case 0: return "Non-Trusters";
            case 1: return "Trusters";
            case 2: return "Neutral";
            }
        })
        .style("font-family","Roboto")
        .attr('x', -120)
        .attr('y', function(d, i){
            return i * 18;
        })
        .attr('text-anchor', 'start')
        .attr('alignment-baseline', 'hanging');

    // Prep the tooltip bits, initial display is hidden
    let tooltip = svg.append("g")
        .attr("class", "tooltip")
        .style("display", "none");

    tooltip.append("rect")
        .attr("width", 30)
        .attr("height", 20)
        .attr("fill", "white")
        .style("opacity", 0.5);

    tooltip.append("text")
        .attr("x", 15)
        .attr("dy", "1.2em")
        .style("text-anchor", "middle")
        .attr("font-size", "12px")
        .attr("font-weight", "bold");

    // define brush control element and its events
    brush = d3.svg.brush()
        .x(x)
        .on("brushstart", brushstart)
        .on("brush", brushmove)
        .on("brushend", brushend);

    // create svg group with class brush and call brush on it
    let brushg = svg.append("g")
        .attr("class", "brush")
        .call(brush);

    // Adjust rect.background to have the same width as the svg
        brushg.select("rect.background")
        .attr("width", "46vw");


    // set brush extent to rect and define objects height
    brushg.selectAll("rect")
        .attr("height", barHeight);

}

//-------------------------
//Get Bar Chart Data Compound - Takes CSV and generates totals per day
//@input: interval value in minutes
//@output: array with dates (incrementing in specified interval) with believes count
//-------------------------
function gatherBarChartDataCompound(interval){
    let outputData = [];

    //generate blank data based on interval rate
    //first entry
    let timeDatum={};
    timeDatum.date = new Date()
    timeDatum.date = minimumDate;
    timeDatum.compoundValue=0;
    outputData.push(timeDatum)
    
    while(outputData[outputData.length-1].date<maximumDate){
        let newTimeDatum = {};
        newTimeDatum.date = new Date(outputData[outputData.length-1].date);
        let minutes = newTimeDatum.date.getMinutes();
        newTimeDatum.date.setMinutes(minutes+interval)
        newTimeDatum.compoundValue=0;
        outputData.push(newTimeDatum)
    }
    
    //revise blank data based on inputs
    inputCSVData.forEach(function (d){
        for(var i=0; i<outputData.length; ++i){
                if(d.date<=outputData[i].date){
                    outputData[i].compoundValue = d.compound;  
                }
                
            }
            //break;
        }
    )
    
    // console.log(outputData)
    // debugger;
    return outputData;
}

//-------------------------
//Generate Compound Bar Chart
//-------------------------
function generateCompoundBarChart(inData) {
    let subgroups = ["Positive","Negative"];
    //console.log(inData)
    //transpose the data into layers
    let layers = d3.layout.stack()(subgroups.map(
        function(tweet) {
            return inData.map(function(d) {
                return {x: (d.date), y:(d.compoundValue)};
            });
        }));
    //console.log(layers);

    //make an array of overall dates
    datesProvided = d3.map(layers[0],function(d){return d.x}).keys();
    //console.log(datesProvided)

    // Set x, y and colors
    x = d3.scale.ordinal()
        .domain(layers[0].map(function(d) { return d.x; }))
        .rangeRoundBands([0, barWidth-barWidthPadding],0.10); //.rangeBands(interval[, padding[, outerPadding]])
       //.rangePoints([0,barWidth-barWidthPadding]);
    let  y = d3.scale.linear()
        .domain([-1.2, 1.2])
        .range([barHeight-20, 0]);

    let colors = ["white", "white"];

    // Define and draw axes
    let yAxis = d3.svg.axis()
        .scale(y)
        .orient("left")
        .ticks(5)
        //.attr("transform", "translate(0,)")
        .tickSize(-barWidth, 0, 0)
        .tickFormat( function(d) { return d } );

    let xAxis = d3.svg.axis()
        //.attr("transform", "translate(0,-1)")
        .scale(x)
        .orient("bottom")
        .tickFormat(d3.time.format(" "));

    //     console.log(inData[0]["compoundValue"]);
    //     debugger;
    // svgc.append("path")
    //     .data( function(d,i) { return inData[i]["compoundValue"] })
    //     .attr("fill", "none")
    //     .attr("stroke", "steelblue")
    //     .attr("stroke-width", 1.5)
    //     .attr("d", d3.line()
    //     .x(function(d,i) { return x(i+15) })
    //     .y(function(d) { return y(inData[i]["compoundValue"]) })
    //     );
    let xShift = 0;

    svgc.append("g")
        .attr("class", "y axis")
        .attr('transform', 'translate(' + 24 + ', 0)')
        .call(yAxis);

    svgc.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(14," + (100) + ") scale(0.518,1)")
        //.attr('transform', 'translate(0, ' + 4 + ')')
        //.call(xAxis)
        .selectAll("text")
        .style("display", function(d,i) {
            if(i % 14 === 0 && selectionInterval == 30) {
                xShift=60;
                return "block"
            } else if (i % 7 === 0 && selectionInterval == 60) {
                xShift=30;
                return "block"
            } else if (i % 1 === 0 && selectionInterval == 1440) {
                xShift=0;
                return "block"
            } 
            else {
                return "none" 
            }
        })
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", "-.55em")
        .attr("transform", "rotate(-45)" );

    // Create groups for each series, rects for each segment 
    let groups = svgc.selectAll("g.compound")
        .data(layers)
        .enter().append("g")
        .attr("class", "compound")
        .style("fill", function(d, i) { return colors[i]; });



    let lineFunc = d3.svg.line()
        .x(function(d) { return d.x })
        .y(function(d) { return d.y })

    let dot = groups.selectAll("circle")
        .data(function(d) { return d; })
        .enter()
        .append("circle")
        .attr("cx", function(d) { return x(d.x)+32; })
        .attr("cy", function(d) {  return y(d.y*0.2); })
        .attr("r",0.0)
        //.attr("height", function(d) { return y(d.y*0.2); })
        .attr("width", x.rangeBand()*0.5)
        .attr('transform', 'scale(0.518,0.5) translate(' + xShift + ', 120)')
        .on("mouseover", function() { tooltip.style("display", null); })
        .on("mouseout", function() { tooltip.style("display", "none"); })
        .on("mousemove", function(d) {
            let xPosition = d3.mouse(this)[0] - 15;
            let yPosition = d3.mouse(this)[1] - 25;
            tooltip.attr("transform", "translate(" + xPosition + "," + yPosition + ")");
            tooltip.select("text").text(d.y); //might be able to get ride of this tooltip since brush is now on top of it
        })

        let line = d3.svg.line()
        .x(function(d) { return x(d.x)+32; })
        .y(function(d) { return y(d.y*0.2) })
        .interpolate("basis");

        groups.append("path")
        //.data(function(d) {console.log(d); return d; })
        //.enter()
        .attr("d",line)
        .attr('transform', 'scale(0.518,0.5) translate(' + xShift + ', 120)')
        .attr('stroke', 'rgb(8,119,189)')
        .attr('fill', 'none');
        

    // Draw legend
    var legend = svgc.append('g')
            .attr('class', 'legend')
            .attr('transform', 'translate(' + (barWidth - 1200) + ', 0)');

    legend.selectAll('rect')
        .data(colors)
        .enter()
        .append('rect')
        .attr('x', 0)
        .attr('y', function(d, i){
            return i * 18;
        })
        .attr('width', 12)
        .attr('height', 12)
        .style("fill", function(d, i) {return colors.slice().reverse()[i];});
        
    legend.selectAll('text')
        .data(colors)
        .enter()
        .append('text')
        .style("font-family","Roboto")
        .text(function(d, i) { 
            switch (i) {
            case 0: return "";
            case 1: return "";
            case 2: return "Neutral";
            }
        })
        .attr('x', 18)
        .attr('y', function(d, i){
            return i * 18;
        })
        .attr('text-anchor', 'start')
        .attr('alignment-baseline', 'hanging');

    // Prep the tooltip bits, initial display is hidden
    let tooltip = svgc.append("g")
        .attr("class", "tooltip")
        .style("display", "none");

    tooltip.append("rect")
        .attr("width", 30)
        .attr("height", 20)
        .attr("fill", "white")
        .style("opacity", 0.5);

    tooltip.append("text")
        .attr("x", 15)
        .attr("dy", "1.2em")
        .style("text-anchor", "middle")
        .attr("font-size", "12px")
        .attr("font-weight", "bold");

    // // define brush control element and its events
    // brush = d3.svg.brush()
    //     .x(x)
    //     .on("brushstart", brushstart)
    //     .on("brush", brushmove)
    //     .on("brushend", brushend);

    // // create svgc group with class brush and call brush on it
    // let brushg = svgc.append("g")
    //     .attr("class", "brush")
    //     .call(brush);

    // // Adjust rect.background to have the same width as the svgc
    //     brushg.select("rect.background")
    //     .attr("width", "46vw");


    // // set brush extent to rect and define objects height
    // brushg.selectAll("rect")
    //     .attr("height", barHeight);

}



//-------------------------
//Brush Functions
//-------------------------
function brushstart() {
    // console.log('brushstart event is triggered');
}

function brushmove() {
    // console.log('the brush event is currently triggered');
}
  
function brushend() {
    // console.log('NOTE: brushend event is triggered');
    /*console.log('Is the brush empty: ' + brush.empty());
    let brushExtent = brush.extent();
    console.log('Extent of brush: ' +  brushExtent[0] +" & " + brushExtent[1]);
    console.log(x.rangeBand())
    console.log(x.range())*/
    highlightMode = d3.select('input[name="high"]:checked')[0][0].value //get original value of highlight mode

    if(highlightMode == "refresh"){
        updateDates();
    }else{
        updateSizes();
    }
    
}

//---------------------------
//Highlight network based on brush
//---------------------------
function updateSizes(){
    //get date range
    if (brush.empty()){
        revisedDates = datesProvided; //if brush is empty set the new dates to the original dates
    } else {
        let brushExtent = brush.extent(); //store brush positions
        LOWresult = search4key(+brushExtent[0]);
        HIGHresult = search4key(+brushExtent[1]);
        // console.log("Date index: " + LOWresult + " to " + HIGHresult);
        revisedDates = newDates1(LOWresult, HIGHresult);
        //console.log(revisedDates)
    }
    let LOWDate = revisedDates[0];
    let HIGHDate = revisedDates[revisedDates.length-1];
    //console.log(LOWDate);
    //console.log(HIGHDate);

    console.log("BRUSH DATES:", LOWDate, HIGHDate)
    
    // Update Pie Chart's True and False Percentages based on Brush's low and high date strings
    // Format [{ label: "True", value: trueCount/totalFrequency }, { label: "False", value: falseCount/totalFrequency }]
    const trueAndFalsePercentsInDateRange = countDatesBetweenBrushLowAndHighForTrueAndFalse(LOWDate, HIGHDate)
    updatePieSVG(trueAndFalsePercentsInDateRange);

    // Update TRUE Small Bar Chart's Top 14 Urls based on Brush's low and high date strings
    let top14URLToURLCountArray_TRUE = getTop14URLToURLCountArray_fromEpochToURLDict_inDateStringRange(LOWDate, HIGHDate, window.TRUE_1_EPOCHS_TO_URLS);
    const TRUE_BARCHART_OPTIONS = {selector:"#BarC_1", widthOfBarC:"16.8vw", heightOfBarC:"58vh", lowColor:"rgb(245,147,34)", highColor:"rgb(245,147,34)", };
    updateSmallBarChart_JSON(top14URLToURLCountArray_TRUE, TRUE_BARCHART_OPTIONS);
    
    // Update FALSE Small Bar Chart's Top 14 Urls based on Brush's low and high date strings
    let top14URLToURLCountArray_FALSE = getTop14URLToURLCountArray_fromEpochToURLDict_inDateStringRange(LOWDate, HIGHDate, window.FALSE_1_EPOCHS_TO_URLS);
    const FALSE_BARCHART_OPTIONS = {selector:"#BarC_2", widthOfBarC:"16.8vw", heightOfBarC:"58vh", lowColor:"rgb(8,119,189)", highColor:"rgb(8,119,189)", };
    updateSmallBarChart_JSON(top14URLToURLCountArray_FALSE, FALSE_BARCHART_OPTIONS);
        

    d3.selectAll(".node").select('circle').transition()
        .style('fill', function(d,i){return reviseNetworkColor(d,LOWDate,HIGHDate,d.legitCount,d.notLegitCount);})
        .attr("r", function(d,i){return reviseCircleSize(d,LOWDate,HIGHDate);});
}



//---------------------------
//Update date range based on brush
//---------------------------
function updateDates(){
    if (brush.empty()){
        revisedDates = datesProvided; //if brush is empty set the new dates to the original dates
    } else {
        let brushExtent = brush.extent(); //store brush positions
        LOWresult = search4key(+brushExtent[0]);
        HIGHresult = search4key(+brushExtent[1]);
        //console.log("Date index: " + LOWresult + " to " + HIGHresult);
        revisedDates = newDates(LOWresult, HIGHresult);
    }

    console.log(revisedDates);
    //renderNetworkData(myArraryOfObjects);

    renderNetworkData(inputCSVData, revisedDates[0], revisedDates[revisedDates.length-1]);
    //console.log(networkData); // debug line to analyze structure of networkData array
    //clear graph
    d3.selectAll(".node").remove();
    d3.selectAll("path").remove();
    //redraw graph
    generateNetworkGraph(networkData,networkLinks);
    tableData = [];
    grid.setData(tableData);
    grid.resizeCanvas();
    grid.render();
    
    tableData = renderTableData(inputCSVData, revisedDates[0], revisedDates[revisedDates.length-1])
    getLocationData(tableData);
    console.log(tableData);
    grid.setData(tableData);
    grid.resizeCanvas();
    grid.render();
    
}

//-------------------------------------------------------------------
//This function will determine the node's color for network graph
//-------------------------------------------------------------------
function reviseNetworkColor(node,lowD,highD,legit,notLegit){
    //console.log("Input: " + l + " Selction: " + selection); //debug line to test incoming data
    //determine if node is within Date Range
    let flag = 0;
    for(let i=0; i<node.tweets.length;i++){
        if ((node.tweets[i].date >= lowD) && (node.tweets[i].date < highD)){
            flag=1;
            break;
        }
    }

    //determine color
    if(flag==1){ 
        return ((legit > notLegit) ? legitColor : notLegitColor);
    }else{
        return ((legit > notLegit) ? legitColor : notLegitColor);
    }

}

//-------------------------------------------------------------------
// Revise Circle Size
//-------------------------------------------------------------------
function reviseCircleSize(node,l,h) {
    //console.log(node.tweets)
    //determine if node is within Date Range
    let flag = 0;
    for(let i=0; i<node.tweets.length;i++){
        if ((node.tweets[i].date >= l) && (node.tweets[i].date < h)){
            flag=1;
            break;
        }
    }

    //determine size
    if(flag==1){ 
        return 8;
    }else{
        return 5;
    }
}


//-----------------------------
//Search thru range loop and find the matched position
//-----------------------------
function search4key(input){
    //console.log(input);
    //console.log(x.range());
    let tempRange = [];
    var key = 0;

    x.range().forEach(function(d){
        //console.log(d)
        tempRange[tempRange.length]=+d;
    })
    //console.log(tempRange)
    for(var i=0; i<tempRange.length; i++){
        if (input > tempRange[i]){
            key = i;
        }else{
            break
        }
    }
    return key;
}

//-----------------------------
//Function to make the array of selected dates
//-----------------------------
function newDates(low, high){
   /* let tempArray = [];
    for(var i=0; i<datesProvided.length; i++){
        if ((i>=low) && (i<=high)){
            tempArray.push(new Date(datesProvided[i]));
        }
    }

    //And one last value to account for range
    let tempDate = new Date(tempArray[tempArray.length-1])
    console.log("Temp Date:")
    console.log(tempDate)
    let moreMinutes = tempDate.getMinutes();
    console.log("Minutes: ")
    console.log(moreMinutes)
    console.log(selectionInterval)
    console.log((moreMinutes+(+selectionInterval)))
    tempDate.setMinutes((moreMinutes+(+selectionInterval)))
    console.log("New Temp Date")
    console.log(tempDate)
    tempArray.push(tempDate)

    return tempArray;*/
    let tempArray = [];
    for(var i=low; i<=high; i++){
        tempArray.push(new Date(datesProvided[i]));
    }

    //And one last value to account for range
    let tempDate = new Date(tempArray[tempArray.length-1])
    console.log("Temp Date:")
    console.log(tempDate)
    let moreMinutes = tempDate.getMinutes();
    console.log("Minutes: ")
    console.log(moreMinutes)
    console.log(selectionInterval)
    console.log((moreMinutes+(+selectionInterval)))
    tempDate.setMinutes((moreMinutes+(+selectionInterval)))
    console.log("New Temp Date")
    console.log(tempDate)
    tempArray.push(tempDate)

    return tempArray;
}
//-----------------------------
//Function to make the array of selected dates
//-----------------------------
function newDates1(low, high){
    let tempArray = [];
    for(var i=low; i<=high; i++){
        tempArray.push(new Date(datesProvided[i]));
    }

    //And one last value to account for range
    let tempDate = new Date(tempArray[tempArray.length-1])
    // console.log("Temp Date:")
    // console.log(tempDate)
    let moreMinutes = tempDate.getMinutes();
    // console.log("Minutes: ")
    // console.log(moreMinutes)
    // console.log(selectionInterval)
    // console.log((moreMinutes+(+selectionInterval)))
    tempDate.setMinutes((moreMinutes+(+selectionInterval)))
    // console.log("New Temp Date")
    // console.log(tempDate)
    tempArray.push(tempDate)

    return tempArray;
}

//-------------------------------------------------------------------
//this function will get data into acceptable format for social graph
//-------------------------------------------------------------------
function renderNetworkData(myInputData, lowD, highD){

    if(lowD != -1){
        lowD = new Date(lowD)
    }
    if(highD != -1){
        highD = new Date(highD)
    }
    //console.log(myInputData); //debug line - making sure input data has been recieved into function
    networkData = []; //ensure network data is blank
    networkLinks = []; //ensure network link is blank
    //console.log(myInputData)

    myInputData.forEach(function (d){
        let datum = {}; //blank object to parse data from each line into
        let tweetDatum = {};

        //storing the data we want from the csv into the datum object (user info)
        datum.userID = d.userID; 
        datum.bio= d.bio;
        datum.userName = d.userName;
        datum.legitCount = 0; //set initial total count to 0
        datum.notLegitCount = 0; //set initial total count to 0
        datum.tweets = [];
        //storing the data we want from the csv into the tweet object (tweet info)
        tweetDatum.tweetID = d.tweetId;
        tweetDatum.retweet =  d.retweet;
        tweetDatum.date = d.date;
        tweetDatum.believed = d.believes_legitimate;
        tweetDatum.longitude = +d.longitude;
        tweetDatum.latitude = +d.latitude;
        //update legit/notLegit count
        if (tweetDatum.believed == " True "){
            datum.legitCount++;
        }else{
            datum.notLegitCount++;
        }

        //-1 is the default values for all data
        if (((lowD == -1) && (highD == -1)) || ((tweetDatum.date >= lowD) && (tweetDatum.date <= highD))){
            //populate networkData array
            if(networkData.length == 0){
                //if data is empty (IE this is the first entry) add first element
                datum.tweets.push(tweetDatum);
                let newLength = networkData.push(datum);
                //userNames.push(datum.userName);
            } else {
                //search existing data to see if user has been entered yet
                let found = 0; //flag to see if user already exist
                for(var i=0;i<networkData.length;i++){
                    if (networkData[i].userID == datum.userID){
                        //if user already exist
                        found =1; //toggle flag
                        let newLength = networkData[i].tweets.push(tweetDatum) //push tweet data to the user
                                //update legit/notLegit count
                        if (tweetDatum.believed == " True "){
                            networkData[i].legitCount++;
                        }else{
                            networkData[i].notLegitCount++;
                        }
                        break;
                    }
                }
                //if not an existing user push data
                if (found == 0){
                    datum.tweets.push(tweetDatum);
                    let newLength = networkData.push(datum); 
                   // userNames.push(datum.userName);
                }
            }

            //if the data is retweeted create a link
            if (tweetDatum.retweet != " None "){
                let linkDatum = {}; //create a new object to store the link data
                linkDatum.source = null;
                linkDatum.target = null;

                //loop thru and find index of original tweet and retweet
                for(var i = 0; i<networkData.length; i++){
                    if (networkData[i].userID == tweetDatum.retweet){
                        linkDatum.source = i; //position of original tweet
                    }
                    if (networkData[i].userID == datum.userID){
                        linkDatum.target = i; //position of the retweet
                    }
                }

                //add link to array
                if ((linkDatum.source != null) && (linkDatum.target != null)){
                    let newLinkLength = networkLinks.push(linkDatum);
                }
            }
        }

    })
}

//-------------------------------------------------------------------
//This function will generate the tree diagram
//-------------------------------------------------------------------
function generateNetworkGraph(nodeData,linkData){
    force
        .nodes(nodeData)
       // .nodes(d3.values(networkData))
        .links(linkData)
        .on("tick",tick)
        .start();

    // build the arrow.
    svgSoical.append("svg:defs").selectAll("marker")
        .data(["end"])      // Different link/path types can be defined here
      .enter().append("svg:marker")    // This section adds in the arrows
        .attr("id", String)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 15)
        .attr("refY", -1.5)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
      .append("svg:path")
        .attr("d", "M0,-5L10,0L0,5");

    // add the links and the arrows
    path = svgSoical.append("svg:g").selectAll("path")
        .data(force.links())
      .enter().append("svg:path") 
    //    .attr("class", function(d) { return "link " + d.type; })
        .attr("class", "link")
        .attr("marker-end", "url(#end)");

    //define the nodes
    node = svgSoical.selectAll(".node")
            //.data(networkData)
            .data(force.nodes())
            .call(force.drag)
            .enter().append("g")
            .attr("class", "node")
            .on("click",function(d){
                let lat = d.tweets[0].latitude; 
                let long = d.tweets[0].longitude;
                if (lat !== 0 & long !== 0) {
                    console.log(lat,long);
                    zoomOnMap(long,lat);
                }
                //console.log(d.tweets[0].latitude, d.tweets[0].longitude); debugger;

                highlightUser(d.userName);
            })
            .on("mouseover", function(){tooltip.style("display",null);})
            .on("mouseout", function() {tooltip.style("display", "none");})
            .on("dblclick.zoom", function(d) {
                var dcx = (width/2-d.x*zoom.scale());
                var dcy = (height/2-d.y*zoom.scale());
                zoom.translate([dcx,dcy]);
                    svgSoical.attr("transform", "translate("+ dcx + "," + dcy  + ")scale(" + zoom.scale() + ")");
                })
            .on("mousemove",function(d) {
                //console.log(d)
                tooltip.style("left", d3.event.pageX+10+"px");
                tooltip.style("top", d3.event.pageY-25+"px");
                tooltip.style("display", "inline-block");
                tooltip.select("text").html("User: "+d.userName+'<br/>'+"Believes True: " + d.legitCount+'<br/>'+"Believes Not True: "+d.notLegitCount+ '<br/>' + "User Bio: " + d.bio);})
            .call(force.drag);

    //add the nodes
    node.append('circle')
        .attr('r', 5)
        .attr('fill', function(d,i){return getNetworkColor(d.legitCount,d.notLegitCount);});


} 

//-------------------------------------------------------------------
//This function will determine the node's color for network graph
//-------------------------------------------------------------------
function getNetworkColor(l,n){
    //console.log("Input: " + l + " Selction: " + selection); //debug line to test incoming data
    if (selection == "notLegit"){
        return ((l > n) ? 'grey' : notLegitColor);
    }else if (selection == "Legit"){
        return ((l > n) ? legitColor : 'grey');
    }else{
        return ((l > n) ? legitColor : notLegitColor);
    }
}

//-------------------------------------------------------------------
// Get Circle Size
//-------------------------------------------------------------------
function getCircleSize(l,n) {
    if (selection == "notLegit"){
        return ((l>n) ? 5 : 8);
    }else if (selection == "Legit"){
        return ((l>n) ? 8 : 5);
    }else{
        return 5;
    }
}

//-------------------------------------------------------------------
//Tick function - adds the curvy lines
//-------------------------------------------------------------------
function tick(){

    path.attr("d", function(d) {
        var dx = d.target.x - d.source.x,
            dy = d.target.y - d.source.y,
            dr = Math.sqrt(dx * dx + dy * dy);
        return "M" + 
            d.source.x + "," + 
            d.source.y + "A" + 
            dr + "," + dr + " 0 0,1 " + 
            d.target.x + "," + 
            d.target.y;
    });

    //enables nodes to be moved
    node
        .attr("transform", function(d) { 
        return "translate(" + d.x + "," + d.y + ")"; });
}

//----------------------
//--------Zoom Function
//----------------------
function zoomed() {
    svgSoical.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
}

//--------------------
//Drag Functions
//--------------------
function dragstarted(d) {
    d3.event.sourceEvent.stopPropagation();
  
    d3.select(this).classed("dragging", true);
    force.start();
}
  
function dragged(d) {
    d3.select(this).attr("cx", d.x = d3.event.x).attr("cy", d.y = d3.event.y);
}
  
function dragended(d) {
    d3.select(this).classed("dragging", false);
}

//-----------------------------
//Zoom on Map based on given coordinates
//-----------------------------
function zoomOnMap(lng,lat){
    map.getView().setCenter(ol.proj.transform([lng, lat], 'EPSG:4326', 'EPSG:3857'));
    map.getView().setZoom(10);
}

//-----------------------------
//Initialize Map
//-----------------------------
function initialize_map() {
    //navigator.geolocation.getCurrentPosition(onSuccess, onError);
    vectorLayer = new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: new ol.style.Style({
            image: new ol.style.Circle({
                radius: 10,
                fill: new ol.style.Fill({color: 'rgba(0, 0, 255, 0.1)'}),
                stroke: new ol.style.Stroke({color: 'rgb(8,119,189)', width: 0.5})
            })
        })
    });
    map = new ol.Map({
        target: "map",
        layers: [
            new ol.layer.Tile({
                source: new ol.source.OSM()
            }),
            vectorLayer
        ],
        view: view
    });


    //change mouse icon when hovering over a feature
    map.on('pointermove', function(event) {
        if (map.hasFeatureAtPixel(event.pixel)) {
          map.getViewport().style.cursor = 'pointer';
        } else {
          map.getViewport().style.cursor = 'inherit';
        }
    });

    //listener for click events
    map.on('click', function(event) {
        $('.slick-header-columns').children().eq(1).trigger('click');
        var feature = map.getFeaturesAtPixel(event.pixel)[0];
        if (feature) {
          console.log("Found the feature")
          console.log(feature)
          //console.log(feature.values_.name)
          highlightLocation(feature.values_._lat,feature.values_._lng)
          highlightMode = d3.select('input[name="high"]:checked')[0][0].value //get original value of highlight mode
          if(highlightMode == "refresh"){
            updateNetworkfromLocation(feature.values_._lat,feature.values_._lng)
          }else{
            refreshNetworkfromLocation(feature.values_._lat,feature.values_._lng)
          }
        } 
    });
}

//------------------------------
//
//------------------------------
function refreshNetworkfromLocation(inLat,inLng){
    //get date range
    if (brush.empty()){
        revisedDates = datesProvided; //if brush is empty set the new dates to the original dates
    } else {
        let brushExtent = brush.extent(); //store brush positions
        LOWresult = search4key(+brushExtent[0]);
        HIGHresult = search4key(+brushExtent[1]);
        console.log("Date index: " + LOWresult + " to " + HIGHresult);
        revisedDates = newDates1(LOWresult, HIGHresult);
        console.log(revisedDates)
    }
    let LOWDate = revisedDates[0];
    let HIGHDate = revisedDates[revisedDates.length-1];
    //console.log(LOWDate);
    //console.log(HIGHDate);
    d3.selectAll(".node").select('circle').transition()
        .style('fill', function(d,i){return refreshNetworkColor(d,LOWDate,HIGHDate,d.legitCount,d.notLegitCount, inLat, inLng);})
        .attr("r", function(d,i){return reviseCircleSize(d,LOWDate,HIGHDate);});
}

//------------------------------
//
//------------------------------
function refreshNetworkColor(node, lowD, highD, legit, notLegit, lat, lng ){
    
    //console.log("Input: " + l + " Selction: " + selection); //debug line to test incoming data
    //determine if node is within Date Range
    let flag = 0;
    for(let i=0; i<node.tweets.length;i++){
        
       // if ((node.tweets[i].date >= lowD) && (node.tweets[i].date < highD)){
           if( (+lat == +(node.tweets[i].latitude)) && (+lng == +(node.tweets[i].longitude))){
                flag=1;
                break;
           // }
        }
        console.log(node.tweets[i].date + " vs " + lowD)
        console.log((node.tweets[i].date >= lowD))

    }

    //determine color
    if(flag==1){ 
        return ((legit > notLegit) ? legitColor : notLegitColor);
    }else{
        return 'grey';
    }
}

//------------------------------
//Add Marker to map
//------------------------------
function add_map_point(lng, lat, count, name, legit) {

    legitC += 1;
    function legitFillFunc (legit) {
        if(legitC % 3 == 0) {
            return new ol.style.Fill({color: 'rgba(245, 147, 34, 0.2)'});
        }
        return new ol.style.Fill({color: 'rgba(8, 119, 189, 0.3)'});
        
    
    }
    function legitStrokeFunc (legit) {
        if(legitC % 3 == 0) {
            return new ol.style.Stroke({color: 'rgb(245, 147, 34)', width: 1});
        }
        return new ol.style.Stroke({color: 'rgb(8, 119, 189)', width: 1});
    
    }
    // TODO: Add hover of frequency data
    function radiusFunc (count) {
        if (count > 300 ) {
            return 100
        } else if (count > 75) {
            return count/1.19
        } else if (count >= 50) {
            return count/1.1
        } else if (count >= 25) {
            return count
        } else if (count >= 10) {
            return count*1.19
        } else if (count < 10 && count > 5) {
            return count*1.57
        } else if (count <= 5 && count > 2) {
            return count*1.85
        } else if (count == 2) {
            return count*2.75
        } else {
            return count * 5.5
        }
    }

    var textStyle = new ol.style.Style({
        // text: new ol.style.Text({
        //         text: count,
        //         scale: 1.2,
        //         fill: new ol.style.Fill({
        //         color: "#fff"
        //     }),
        //         stroke: new ol.style.Stroke({
        //         color: "0",
        //         width: 3
        //     })
        // }),
        image: new ol.style.Circle({
            radius: radiusFunc(count),
            fill: legitFillFunc(legit),
            stroke: legitStrokeFunc(legit)
        }),
    })

    var feature = new ol.Feature({
        geometry: new ol.geom.Point(ol.proj.fromLonLat([lng, lat])),
        name: name,
        _lng: lng,
        _lat: lat
    })

    feature.setStyle(textStyle);
    vectorLayer.getSource().addFeature(feature);
}


//------------------------------
//Get location Data
//  Assumption: If lat and lng data match previous entries then the user location is also the same
//------------------------------
function getLocationData(inData){
    let newTableData = [];
    // console.log(inData)
    // debugger;
    inData.forEach(function(d){
        let flag = 0;
        let datum = {};
        
        datum.count=1;
        datum.lng = +d.lng;
        datum.lat = +d.lat;
        datum.location = d.user_location;
        datum.believes_legitimate = 0

        for(var i=0; i<newTableData.length; i++){
            datum.believes_legitimate = false
            if((datum.lng==newTableData[i].lng) && (datum.lat==newTableData[i].lat)){
                flag = 1;
                newTableData[i].count += 1;
                if(inData[0].believes_legitimate === " True ") {
                    newTableData[i].believes_legitimate = true;
                    
                }
                // console.log(inData[0].believes_legitimate)
                // debugger;
                break;
            }
        }

        if (flag==0){
            newTableData.push(datum);
        }
    })

    //console.log(newTableData);

    //clear map
    vectorLayer.getSource().clear();
    
   // console.log(newTableData)
    //add new data points
    newTableData.forEach(function(d){
        if((d.lng !== 0 || d.lat !== 0) && (d.count).toString() !== "125") {
            add_map_point(d.lng,d.lat,(d.count).toString(),d.location,d.believes_legitimate);
        }
    })
}

//-----------------------------
//Function to make the table
//-----------------------------
function makeTable(inData){
    //var grid;
    tableData = [];

    let columns = [
        {id: "user_name", name: "User Name", field: "user_name", sortable: true},
        {id: "user_location", name: "User Location", field: "user_location", sortable: true},
        {id: "post_date", name: "Post Date", field: "post_date", sortable: true},
        {id: "user_bio", name: "User Bio", field: "user_bio", sortable: true, width: 400},
        {id: "believes_legitimate", name: "Truster", field: "believes_legitimate", sortable: true, width: 110},
        {id: "tweet_text_body", name: "Tweet Text", field: "tweet_text_body", sortable: true, width: 1250, headerCssClass: 'tweets', cssClass: 'left-align'},
        {id: "lat", name: "lat", field: "lat", sortable: true, width: 0},
        {id: "lng", name: "lng", field: "lng", sortable: true, width: 0}
    ];

    let options = {
        enableCellNavigation: true,
        enableColumnReorder: false,
        cellHighlightClass: "current-user",
        cellFlashingCssClass: "current-user",
        multiColumnSort: true
    };

    //console.log(inData);

    inData.forEach(function(d){
        let datum = {};
        datum.user_name = d.userName;
        datum.user_location = d.user_location_cleaned;
        datum.lng = +d.longitude;
        datum.lat = +d.latitude;
        //datum.location = d.user_location_cleaned; //why do I have this line? seems like the datum.user_location is taking care of this
        datum.post_date = d.date;
        datum.user_bio = d.bio;
        datum.believes_legitimate = d.believes_legitimate;
        datum.tweet_text_body = d.tweet_text_body;
        tableData.push(datum);
    })
    //console.log(tableData)

    grid = new Slick.Grid("#myGrid", tableData, columns, options);
    
    grid.onSort.subscribe(function (e, args) {
        var cols = args.sortCols;
  
        tableData.sort(function (dataRow1, dataRow2) {
          for (var i = 0, l = cols.length; i < l; i++) {
            var field = cols[i].sortCol.field;
            var sign = cols[i].sortAsc ? 1 : -1;
            var value1 = dataRow1[field], value2 = dataRow2[field];
            var result = (value1 == value2 ? 0 : (value1 > value2 ? 1 : -1)) * sign;
            if (result != 0) {
              return result;
            }
          }
          return 0;
        });
        grid.invalidate();
        grid.style("font-family","Roboto");
        grid.resizeCanvas();
        grid.render();
        
    });

    grid.onClick.subscribe(function(e, args) {
        console.log('clicked: ');
        console.log(args);
        var item = args.grid.getData()[args.row];
        console.log(item);
        
        //highlight row
        let highlightedRows = {};
        highlightedRows[args.row] = {
            user_name:  "current-user",
            user_location: "current-user",
            post_date: "current-user",
            user_bio: "current-user",
            believes_legitimate: "current-user",
            tweet_text_body: "current-user"
        };
        //grid.scrollRowToTop(rows[0]); //scroll first row with user name to the top
        grid.setCellCssStyles("city_highlight",highlightedRows ) //set CSS 
        grid.resizeCanvas();
        grid.render(); //update table
        

        //update other views
        zoomOnMap(item.lng,item.lat);
        updateNetworkfromName(item.user_name);
      });

    //generate points on map
    //console.log(tableData)
    getLocationData(tableData)
}


//-----------------------------
//Render new data for table based on date ranges
//-----------------------------
function renderTableData(myInputData, lowD, highD){
    let outputTableData = [];
    console.log(lowD)
    console.log(highD)
    console.log(myInputData)
     myInputData.forEach(function (d){
         let datum = {}; //blank object to parse data from each line into
         datum.post_date = d.date;
 
         //-1 is the default values for all data
         if (((lowD == -1) && (highD == -1)) || ((datum.post_date >= lowD) && (datum.post_date < highD))){
             //populate networkData array
             datum.user_name = d.userName;
             datum.user_location = d.user_location_cleaned;
             datum.user_bio = d.bio;
             datum.believes_legitimate = d.believes_legitimate;
             datum.tweet_text_body = d.tweet_text_body;
             datum.lat = d.latitude;
             datum.lng = d.longitude;
             outputTableData.push(datum);
         }
     })
 
     return outputTableData;
 }

//-----------------------------
//Search thru range loop and find the matched position
//-----------------------------
function search4location(inLat,inLng){
    //console.log(input + " " + typeof input)
    //console.log(tableData)
    let key = 0;
    let outputRows = [];

    for(key = 0; key < grid.getDataLength(); key++){
        if((inLat==grid.getDataItem(key).lat) && (inLng==grid.getDataItem(key).lng)){
            outputRows.push(key)
        }
       /* if(((grid.getDataItem(key).user_location).localeCompare(input))== 0){
            console.log("Found it. Key = " + key)
            break;
        }*/
    }

    return outputRows;
}

//-------------------
//--Highlight Location
//-------------------
function highlightLocation(inLat,InLng){
    // $('.slick-header-columns').children().eq(1).trigger('click');
     cellChanges = {}; 
     let rows = search4location(inLat,InLng);
     rows.forEach(function(d){
         cellChanges[d]={
             user_name:  "current-user",
             user_location: "current-user",
             post_date: "current-user",
             user_bio: "current-user",
             believes_legitimate: "current-user",
             tweet_text_body: "current-user"
         };
     })
 
 
 
     grid.scrollRowToTop(rows[0]);
     grid.setCellCssStyles("city_highlight",cellChanges)
     grid.resizeCanvas();
     grid.render();
     
     //console.log(row);
     //grid.getColumns().forEach(function(col){
         //grid.flashCell(row, grid.getColumnIndex(col.id),100);
         
     //})
 
 }

//-----------------------------
//Format Array for highlighting in table
//-----------------------------
function format4highlight(inputArray){
    let changes = {}; 

    //for each row select which columns will be highlight and what style 
    //CSS file controls actual color output
    inputArray.forEach(function(d){
        changes[d]={
            user_name:  "current-user",
            user_location: "current-user",
            post_date: "current-user",
            user_bio: "current-user",
            believes_legitimate: "current-user",
            tweet_text_body: "current-user"
        };
    })

    return changes;
}

//-----------------------------
//Search thru range loop and find the matched position
//-----------------------------
function search4row(userName){
    let outputRows = [];
    let key = 0;

    for(key = 0; key < grid.getDataLength(); key++){
        if(((grid.getDataItem(key).user_name).localeCompare(userName))== 0){
            outputRows.push(key); //if user found save row number
        }
    }

    return outputRows;
}

//-----------------------------
//Highligh user in table
//-----------------------------
function highlightUser(name){
    //sort table by names
    $('.slick-header-columns').children().eq(0).trigger('click');

    let rows = search4row(name); //search for rows with the same user name
    let highlightedRows = format4highlight(rows); //format array for highlighting
    grid.scrollRowToTop(rows[0]); //scroll first row with user name to the top
    grid.setCellCssStyles("city_highlight",highlightedRows) //set CSS 
    grid.resizeCanvas();
    grid.render(); //update table
    

    //grid.scrollRowIntoView(row);
    //console.log(row);
    /*grid.getColumns().forEach(function(col){
        grid.flashCell(row, grid.getColumnIndex(col.id),100);
    })*/
}

//-------------------------------------------------------------------
//Update function based off location select on map
//-------------------------------------------------------------------
function updateNetworkfromLocation(_lats,_lngs){
    console.log("Updating network from location")
    console.log(networkData)
    //console.log(_lats + " " + _lngs)
    let locNames =[];
    let flag=0;
    networkDataFiltered = [] //reset array
    networkLinksFiltered = [] //reset array

    //gather list of names at given coords
    inputCSVData.forEach(function(d){
        if( (+(d.latitude)==+(_lats)) && (+(d.longitude)==+(_lngs)) ){
            //console.log("Found: " + d.user_name)
            flag=0;
            //only add if its a unique name
            for(let i=0;i<locNames.length;i++){
                if (!((d.userName).localeCompare((locNames[i])))){
                    flag=1; //toggle flag if name is already in list
                }
            }
            //add if flag is unchanged
            if (flag==0){
                locNames.push(d.userName)
            }
            
        }
    })

    //change names to user ID
    let userIDs = [];

    console.log(inputCSVData)
    console.log(locNames)

    locNames.forEach(function(d){
        inputCSVData.forEach(function(e){
            if (!((e.userName).localeCompare((d)))){
                userIDs.push(e.userID);
            }
        })
    })
    console.log(userIDs)


    inputCSVData.forEach(function (d){
        let datum = {}; //blank object to parse data from each line into
        let tweetDatum = {};

        //storing the data we want from the csv into the datum object (user info)
        datum.userID = d.userID; 
        datum.bio= d.bio;
        datum.userName = d.userName;
        datum.legitCount = 0; //set initial total count to 0
        datum.notLegitCount = 0; //set initial total count to 0
        datum.tweets = [];
        //storing the data we want from the csv into the tweet object (tweet info)
        tweetDatum.tweetID = d.tweetID;
        tweetDatum.retweet =  d.retweet;
        tweetDatum.date = d.date;
        //let tempDate = d.date
        tweetDatum.believed = d.believes_legitimate;
        //update legit/notLegit count
        if (tweetDatum.believed == " True "){
            datum.legitCount++;
        }else{
            datum.notLegitCount++;
        }

        //console.log(revisedDates)

        //is temp date in range of revised Dates
        let dateFlag = 0;
        if(((tweetDatum.date >= revisedDates[0]) && (tweetDatum.date < revisedDates[revisedDates.length-1]))){
            dateFlag=1;//toggle flag
        }
        /*if(!(revisedDates.length == 0)){
            revisedDates.forEach(function(e){
                if (!((tweetDatum.date).localeCompare(e)==0)){
                    dateFlag=1; //toggle flag 
                }
            })
        }*/
        //console.log("Date Flag: " + dateFlag)
        //console.log(revisedDates.length)

        //is user one of them at our location
        let userFlag = 0;
        userIDs.forEach(function(f){
            if (+datum.userID==+f){
                userFlag=1; //toggle flag 
            }else if(+tweetDatum.retweet==+f){
                userFlag=1; //toggle flag 
            }
        })
        console.log(userFlag)
        
        if(userFlag==1){
            if ((revisedDates.length == 0) || (dateFlag==1)){
                //populate networkData array
                if(networkDataFiltered.length == 0){
                    //if data is empty (IE this is the first entry) add first element
                    datum.tweets.push(tweetDatum);
                    let newLength = networkDataFiltered.push(datum);
                    //userNames.push(datum.userName); //already have a list of user names in locNames array
                } else {
                    //search existing data to see if user has been entered yet
                    let found = 0; //flag to see if user already exist
                    for(var i=0;i<networkDataFiltered.length;i++){
                        if (+networkDataFiltered[i].userID == +datum.userID){
                            //if user already exist
                            found =1; //toggle flag
                            let newLength = networkDataFiltered[i].tweets.push(tweetDatum) //push tweet data to the user
                                    //update legit/notLegit count
                            if (tweetDatum.believed == " True "){
                                networkDataFiltered[i].legitCount++;
                            }else{
                                networkDataFiltered[i].notLegitCount++;
                            }
                            break;
                        }
                    }
                    //if not an existing user push data
                    if (found == 0){
                        datum.tweets.push(tweetDatum);
                        let newLength = networkDataFiltered.push(datum); 
                        //userNames.push(datum.userName); //already have a list of user names in locNames array
                    }
                }
    
                //if the data is retweeted create a link
                if (tweetDatum.retweet != " None "){
                    let linkDatum = {}; //create a new object to store the link data
                    linkDatum.source = null;
                    linkDatum.target = null;
    
                    //loop thru and find index of original tweet and retweet
                    for(var i = 0; i<networkDataFiltered.length; i++){
                        if (networkDataFiltered[i].userID == tweetDatum.retweet){
                            linkDatum.source = i; //position of original tweet
                        }
                        if (networkDataFiltered[i].userID == datum.userID){
                            linkDatum.target = i; //position of the retweet
                        }
                    }
    
                    //add link to array
                    if ((linkDatum.source != null) && (linkDatum.target != null)){
                        let newLinkLength = networkLinksFiltered.push(linkDatum);
                    }
                }
            }
        }
    })
    console.log(networkDataFiltered)
    console.log(networkLinksFiltered)
    //clear graph
    d3.selectAll(".node").remove();
    d3.selectAll("path").remove();
    //redraw graph
    generateNetworkGraph(networkDataFiltered,networkLinksFiltered);
}