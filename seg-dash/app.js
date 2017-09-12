function remove_empty_bins(source_group) {
    return {
        all:function () {
            return source_group.all().filter(function(d) {
                //return Math.abs(d.value) > 0.00001; // if using floating-point numbers
                return Math.round(d.value) !== 0; // if integers only
            });
        }
    };
}

var chartcount = 0;
var charts = [];

function createChart(Dimension,userDim,w,h){
	

	// Configure charts
	var chartname = "chart" + chartcount.toString();
    var chartid = "#chart" + chartcount.toString();  
    var $div = $("<div>", {id: chartname,'data-dim': userDim});
	$("#charts").append($div); 

    var chart = dc.barChart(chartid); 

    var max =  Dimension.top(1)[0][userDim],
    	vartype = typeof(max);
    
	chart
	.margins({top: 20, right: 50, bottom: 30, left: 30}) 
	.width(w)
	.height(h)
	.yAxisLabel('Count Of Total')
	.dimension(Dimension)
	.on('filtered',function(c,f){
		$("#filters>li[data-dim='"+userDim+"']").remove()
		var filt = chart.filters()
		if(filt.length!=0){
			console.log('Added filter')
			var fi;
			if(typeof(filt[0])=='object'){fi = filt[0].map(function(d){ return _.round(d)}).toString()} else{fi = filt.toString()}
			var $li = $("<li>", {'data-dim': userDim, html: userDim+': '+fi});
			$('#filters').append($li)
		}
	})

	if(vartype == 'string'){
		var catCountGroup  = Dimension.group().reduceCount();
		var y_values = catCountGroup.all().map(function(d){return d.value}),
			maxy = _.max(y_values),
			miny = _.min(y_values);
		chart
		.renderLabel(true)
		.group(catCountGroup)
		.x(d3.scale.ordinal()) 
		.xUnits(dc.units.ordinal)
		.y(d3.scale.linear().domain([miny,maxy+250]))
		.colors(d3.scale.ordinal().domain(["OK","NA"])
                                .range(["#1F77B4","#e84747"]))
		.colorAccessor(function(d) { 
            if(d.key == '-1' || d.key == 'NA') 
                return "NA"
            return "OK";})
	} else {
		
		catCountGroup = Dimension.group().reduceCount();
		if(userDim == 'Avg_itemprice'){
			catCountGroup = Dimension.group(function(d) { return Math.round(d/100.0)*100 }).reduceCount()
		}

		var y_values = catCountGroup.all().map(function(d){return d.value}),
			maxy = _.max(y_values),
			miny = _.min(y_values);

		chart
		.centerBar(true)
		.elasticY(true)
		.group(catCountGroup)
		// .xUnits(dc.units.fp.precision(binwidth))
		.xUnits(function() {return 100;})
		.x(d3.scale.linear().domain([0,max]))
		.y(d3.scale.linear().domain([miny,maxy+150]))
		// .elasticX(true)
		
	}
	charts[chartcount] = chart;
	chartcount++;

	return {chart: chart, chartdim: userDim, dimension: Dimension} 
};

window.addEventListener("load", function() {
	d3.json("df2.json", function(data) {
		var w = 578,
			h = 380,

			obj       = data[0],
			vartypes  = _.values(obj).map(function(x) {return typeof(x);}),
			variables = _.zipObject(Object.keys(obj),vartypes);

		console.log(obj)

		// Create variable list
		$('#variableList').empty();
		$.each(variables, function(k, v) {
			$('#variableList').append($('<option></option>').html(k));
		});

	    var userDim = $("#variableList>option:selected").html(),
	    // var userDim = 'Age 11 - 15 Male',

	    ndx           	 = crossfilter(data);
	    dc.dataCount("#dc-data-count")
        .dimension(ndx)
        .group(ndx.groupAll());

	    function dim(userDim){
		    var Dimension        = ndx.dimension(function(d) {return d[userDim];})
			// missingDimension = ndx.dimension(function(d) {
			// 	return ((d[userDim]!= '-1' & d[userDim]!= 'NA') ? 'Include' : 'Exclude')
			// 	// console.log(a)
			// }),

			// zeroDimension = ndx.dimension(function(d) {
			// 	return ((d[userDim]!= '0' & d[userDim]!=0) ? 'Include' : 'Exclude');
			// 	// console.log(a)
			// });
			return Dimension
		}

		

		var Dimension = dim(userDim)
		
		var cha = createChart(Dimension,userDim,w,h),
		    charts = [];
		charts.push(cha)
		
		dc.renderAll();

		function create_or_show(userDim){
			$("#charts").children().hide(); // hide drawn charts
			var chartid = "chart" + chartcount.toString(),
				plotted_dims = charts.map(function(x){return x['chartdim']}); // get plotted dims
				console.log(plotted_dims)
			
			if(!plotted_dims.includes(userDim)){ //  check if dimension was plotted
				var Dimension = dim(userDim) // recalculate dimensions
				cha = createChart(Dimension,userDim,w,h);
				charts.push(cha);
				console.log('plotted new graph')
			} else {
				$("div[data-dim='"+userDim+"']").show()}
		}
		
		$('#variableList').change(function() {
			
			//  get user dimension
			userDim = $("#variableList>option:selected").html()
			create_or_show(userDim)

			// 
			Dimension = dim(userDim)

			ch = $("#missingValues>input:checked").val();
	  		if(ch == 'Exclude') {Dimension.filter(function(d) { return d!= '-1' && d!= 'NA'});}
	  		else {Dimension.filter(null)};

			ch = $("#zeroValues>input:checked").val();
	  		if(ch == 'Exclude') {Dimension.filter(function(d) { return d!= 0});}
	  		else {Dimension.filter(null)};
			
	  		// Dimension  = ndx.dimension(function(d) {return d[userDim];})
	  		// catCountGroup  = Dimension.group().reduceCount()
	  		dc.renderAll();
	  		
		});

		// Missinsg values filter
	  	$('#missingValues').change(function() {
	  		ch = $("#missingValues>input:checked").val();
	  		if(ch == 'Exclude') {Dimension = dim(userDim); Dimension.filter(function(d) { return d!= '-1' && d!= 'NA'});}
	  		else {Dimension.filter(null)};
	  		dc.redrawAll();
	  	})
	  	// Zero values filter
	  	$('#zeroValues').change(function() {
	  		ch = $("#zeroValues>input:checked").val();

	  		if(ch == 'Exclude') { Dimension = dim(userDim);Dimension.filter(function(d) { return d!= 0});}
	  		else {Dimension.filter(null)};
	  		dc.redrawAll();
	  	})

	  	function resetAll(){
	  		chartcount = 0;
			charts = [];
	  		$('#charts').children().remove()
	  		dc.filterAll()
	  		userDim = $("#variableList>option:selected").html()
			create_or_show(userDim)
			dc.renderAll()
	  	}

	  	$('#resetAll').click(function() {
	  		resetAll()
	  	})

	  	// Chart js
	  	function get_series(dat,fiel){
	  		var sum = 0,
				count = 0,
				missing = 0;
			_.map(dat,function(d){
				if(d[fiel]=='0'){
					count+=1
				} else if(d[fiel]=='1'){
					count+=1
					sum+=1
				} else{missing+=1;count+=1}
			});
			return {'yes':sum,'total':count,'missing':missing}
		}
	  	
		var dat = Dimension.top(Infinity),
			fiels = Object.keys(variables),
			fiels = _.filter(fiels,function(f){
				var uni = _.uniq(_.map(dat,function(d){return d[f]}))
				return _.isEmpty(_.xor(uni, [ "0", "1", "-1" ])) 
			}),
			dataa = _.map(fiels, function(f){
				return get_series(dat,f)
			});

		function create_js(labels,data){
			// var chartid = fiel.replace(/\s/g,'');
			var $div = $('<div>',{height:'1500px',display:'block'}).append($('<canvas>',{id:'chartjs'}));
			$('#chartjss').append($div);
			var ctx = $('#' + 'chartjs');
			console.log('#' + 'chartjs')
			var chartjs = new Chart(ctx, {
			    // The type of chart we want to create
			    type: 'horizontalBar',

			    // The data for our dataset
			    data: {
			        labels: labels,
			        datasets: [{
			            label: '',
			            backgroundColor: 'rgb(255, 99, 132)',
			            borderColor: 'rgb(255, 99, 132)',
			            data: data
			        }]
			    },

			    // Configuration options go here
			    options: {
			    	legend: false,
			    	responsive: true,
			    	maintainAspectRatio: false,
			    	scales:{
			            xAxes: [{
			            	position: 'top',
			                display: true,
			                ticks:{
			                	suggestedMax: 100,
			                	callback: function(value) {
					               return value + "%"
					            }
			                },
			                scaleLabel: {
					           display: true,
					           labelString: "Percentage"
					       }
			            }],
			            yAxes:[{
			            	ticks: {
				                fontSize: 10,
				                mirror:false
				            }
			            }]
			        }
			    }
			});

			return chartjs
		}
		var d = _.map(dataa,function(d){return Math.round(d.yes/(d.total-d.missing)*100)}),
			chartjs=create_js(fiels, d)


		// update chart
		function update_js(data) {
			chartjs.data.datasets.forEach(function(dataset, i) {
				dataset.backgroundColor = 'rgb(255, 99, 132)';
				dataset.data = data
			});
			chart.update();
		}
		
	});
});
