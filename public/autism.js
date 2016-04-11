var headers = {
    author: "Author",
    year_published: "Year published",
    country: "Country",
    time_period_studied: "Time period studied",
    age_range_studied: "Age range studied",
    number_of_children_in_population: "Number of children in population",
    criteria_used: "Criteria used",
    methodology_used: "Methodology used",
    asd_prevalence: "ASD prevalence (CI)",
    iq_lt_70: "IQ<70 (%)"
};

function convertTimePeriodStudied(rawTimePeriod) {
    var periodList = [];
    var rawSplitPeriods = rawTimePeriod.split(',');
    for(var i =0; i<rawSplitPeriods.length; i++) {
        var p = rawSplitPeriods[i];
        if(p.indexOf('-') === -1) {
            periodList.push([
                +p,
                +p
            ]);
        } else {
            var splitP = p.split('-');
            periodList.push([
                +splitP[0],
                +splitP[1]
            ]);
        }
    }
    return periodList;
}
function convertAgeRangeStudied(periodStudied, ageRange) {
    if(ageRange === 'N/A') {
        return ageRange;
    }

    var resultList = {};
    var rawSplitRanges = ageRange.split(',');
    for(var i =0; i<rawSplitRanges.length; i++) {
        var p = rawSplitRanges[i];
        var year;
        if(periodStudied.length > 1) {
            year = +p.replace(/^.*\((\d{4}).*$/, "$1");
            p = p.split('(')[0];
        } else {
            year = periodStudied[0][0];
        }
        if(p.indexOf(' to ') !== -1) {
            var ps = p.split(' to ');
            resultList[year] = [
                +ps[0],
                +ps[1]
            ];
        } else if(p.indexOf('<') !== -1) {
            resultList[year] = [
                0,
                +p.replace('<', '')
            ];
        } else {
            resultList[year] = [
                +p
            ];
        }
    }
    return resultList;
}

function convertNoOfChildren(periodStudied, numberOfChildren) {
    if(numberOfChildren === 'N/A') {
        return numberOfChildren;
    }
    
    var resultList = {};
    var rawSplitRanges = numberOfChildren.split('),');
    for(var i =0; i<rawSplitRanges.length; i++) {
        var p = rawSplitRanges[i];
        var year;
        if(periodStudied.length > 1) {
            year = +p.replace(/^.*\((\d{4}).*$/, "$1");
            p = p.split('(')[0];
        } else {
            year = periodStudied[0][0];
        }
        resultList[year] = +(p.replace(',', ''));
    }
    return resultList;
}

function convertAsdPrevalence(periodStudied, asdPrevalence) {
    var resultList = {};
    var rawSplitRanges = asdPrevalence.split(/\)[;,]/);
    for(var i =0; i<rawSplitRanges.length; i++) {
        var p = rawSplitRanges[i];
        var yearList;
        if(periodStudied.length > 1 && /\(\d{4}/.test(p)) {
            yearList = [+p.replace(/^.*\((\d{4}).*$/, "$1")];
            p = p.split(/\(\d{4}/)[0];
        } else {
            yearList = [];
            for(var j = 0; j < periodStudied.length; j++) {
                for(var u = 0; u < periodStudied[j].length; u++) {
                    yearList.push(periodStudied[j][u]);
                }
            }
        }
        if(p.indexOf('%') !== -1) {
            p = +p.trim().replace('%', '');
            p = [p,p];
        } else {
            var margins = [0,0];
            if(p.indexOf('(') !== -1) {
                margins = p.split('(')[1].split('-').map(function(e){ return +e.trim(); });
                p = p.split('(')[0];
            }

            if(p.indexOf('-') !== -1) {
                p = p.split('-').map(function(p) {
                    return (+p.trim().replace(/ .*$/, '')) / 10;
                });
            } else if(asdPrevalence.indexOf(' to ') !== -1) {
                p = asdPrevalence.split(' to ').map(function(p) {
                    return (+p.trim().replace(/ .*$/, '')) / 10;
                });
            } else {
                p = [(+p.trim().replace(/ .*$/, '')) / 10];
            }
        }
        for(var j = 0; j < yearList.length; j++) {
            var year = yearList[j];
            resultList[year] = p;
        }
    }
    return resultList;
}

function convertIq(iq) {
    if(iq.indexOf(',') !== -1) {
        return {
            type: 'list',
            values: iq.split(',').map(function(e){ return +e.trim(); })
        };
    } else if(iq.indexOf('-') !== -1) {
        return {
            type: 'range',
            values: iq.split('-').map(function(e){ return +e.trim(); })
        };
    } else if(iq === 'NR') {
        return {
            type: 'NR',
            values: [iq]
        };
    } else {
        return {
            type: 'value',
            values: [+iq]
        };
    }
}

var recordCounter = 1;
function setTypes(d) {
    var od;
    try {
        od = JSON.stringify(d, undefined, 4);
        d.year_published = +d.year_published;
        d.time_period_studied = convertTimePeriodStudied(d.time_period_studied);
        d.age_range_studied = convertAgeRangeStudied(d.time_period_studied, d.age_range_studied);
        d.number_of_children_in_population = convertNoOfChildren(d.time_period_studied, d.number_of_children_in_population);
        d.criteria_used = d.criteria_used.split(/, | and | or /);
        d.methodology_used = d.methodology_used.split(/, | and | or /);
        d.asd_prevalence = convertAsdPrevalence(d.time_period_studied, d.asd_prevalence);
        d.iq_lt_70 = convertIq(d.iq_lt_70);
        d.originalJson = JSON.parse(od);
        d.recordId = recordCounter++;
    } catch(e) {
        console.log(od);
        console.log(e);
        throw e;
    }
    return d;
}
function getTitle(d){
    var title = [];
    for(var p in d.originalJson){
        if(d.originalJson.hasOwnProperty(p) && headers[p]){
            title.push(headers[p] + ': ' + d.originalJson[p]);
        }
    }
    return title.join("\n");
}

d3.csv('autism.csv', setTypes, function(error, rows) {
    if(error) {
        throw error;
        return;
    }
    var svgHeight = 300;
        svgWidth = 800;
        marginX = 70;
        marginY = 70;
        height = svgHeight - marginX;
        width = svgWidth - marginY;
    var y = d3.scale.linear()
        .domain([
                d3.min(rows, function(d){
                    var min = 0;
                    for(var z in d.asd_prevalence) {
                        if(d.asd_prevalence.hasOwnProperty(z)) {
                            for(var i = 0; i < d.asd_prevalence[z].length; i++) {
                                min = Math.min(min, d.asd_prevalence[z][i]);
                             }
                        }
                    }
                    return min;
                }),
                d3.max(rows, function(d){
                    var max = 0;
                    for(var z in d.asd_prevalence) {
                        if(d.asd_prevalence.hasOwnProperty(z)) {
                            for(var i = 0; i < d.asd_prevalence[z].length; i++) {
                                max = Math.max(max, d.asd_prevalence[z][i]);
                             }
                        }
                    }
                    return max;
                }) + .5
     ])
     .range([height,0]);

    var x = d3.scale.linear()
        .domain([
             d3.min(rows, function(d){
                var min = 9000;
                for(var z in d.asd_prevalence) {
                    if(d.asd_prevalence.hasOwnProperty(z)) {
                        min = Math.min(min, +z);
                    }
                }
                return min;
            }) - 1,
             d3.max(rows, function(d){
                var max = 0;
                for(var z in d.asd_prevalence) {
                    if(d.asd_prevalence.hasOwnProperty(z)) {
                        max = Math.max(max, +z);
                    }
                }
                return max;
            }) + 1
     ])
     .range([0, width]);

    var svg = d3.select('svg');
    svg.attr('height', svgHeight)
       .attr('width', svgWidth);
    var chart = svg.append('g');
    var rowGroup = chart.selectAll('g')
        .data(rows)
        .enter().append('g')
        .attr('transform', 'translate(' + marginX/2 + ',' + marginY/2 + ')');

    var xAxis = d3.svg.axis()
        .orient('bottom')
        .tickFormat(d3.format('.0'))
        .scale(x);
    var yAxis = d3.svg.axis()
        .orient('right')
        .scale(y);

    svg.append('g')
        .attr('transform', 'translate(' + marginX/2 + ',' + (height + marginY/2) + ')')
        .call(xAxis);
    svg.append('g')
        .attr('transform', 'translate(' + (width + marginX/2) + ',' + marginY/2 + ')')
        .call(yAxis);

     rowGroup.selectAll('circle')
        .data(function(d){
            var splitData = [];
            for(var z in d.asd_prevalence) {
                if(d.asd_prevalence.hasOwnProperty(z)) {
                    for(var i = 0; i < d.asd_prevalence[z].length; i++) {
                         splitData.push({
                            data: d,
                            year: z,
                            asd_prevalence: d.asd_prevalence[z][i]
                         });
                     }
                }
            }
            return splitData;
        }).enter().append('circle')
            .attr('transform', function(d){
                 return 'translate(' + x(d.year) + ',' + y(d.asd_prevalence) + ')';
             })
            .attr('r', function(d){ return 3; })
            .attr('class', function(d){ return 'data-point-' + d.data.recordId; })
            .on('click', function(d){
                d = d.data;
                if(d.selected) {
                    d.selected = false;
                    d3.selectAll('.selected.data-point-' + d.recordId)
                        .classed('selected', false);
                    d3.select('.author-item-' + d.recordId)
                        .classed('selected', false);
                } else {
                    d.selected = true;
                    d3.selectAll('.data-point-' + d.recordId)
                        .classed('selected', true);
                    d3.select('.author-item-' + d.recordId)
                        .classed('selected', true);
                }
            })
            .on('mouseover', function(d){
                d = d.data;
                d3.selectAll('.data-point-' + d.recordId)
                    .classed('highlighted', true);
                d3.select('.author-item-' + d.recordId)
                    .classed('highlighted', true);
            })
            .on('mouseout', function(d){
                d = d.data;
                d3.selectAll('.data-point-' + d.recordId)
                    .classed('highlighted', false);
                d3.select('.author-item-' + d.recordId)
                    .classed('highlighted', false);
            })
            .append('title')
                .text(function(d){
                    return getTitle(d.data);
                });

    d3.select('body').insert('ul', '.csl-bib-body')
        .classed('study-blocks', true)
        .selectAll('li')
            .data(rows)
            .enter().append('li')
                .text(function(d){ return d.author; })
                .attr('class', function(d){ return 'author-item-' + d.recordId; })
                .attr('title', getTitle)
                .on('click', function(d){
                    if(d.selected) {
                        d.selected = false;
                        d3.selectAll('.selected.data-point-' + d.recordId)
                            .classed('selected', false);
                        d3.select(this).classed('selected', false);
                    } else {
                        d.selected = true;
                        d3.selectAll('.data-point-' + d.recordId)
                            .classed('selected', true);
                        d3.select(this).classed('selected', true);
                    }
                })
                .on('mouseover', function(d){
                    d3.selectAll('.data-point-' + d.recordId)
                        .classed('highlighted', true);
                })
                .on('mouseout', function(d){
                    d3.selectAll('.data-point-' + d.recordId)
                        .classed('highlighted', false);
                });
});
